import { randomBytes } from "crypto";
import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { emailVerificationTokens } from "@/db/schema";
import { getCurrentUser, tokenDigest } from "@/lib/auth";
import { emailDeliveryConfigured, sendAccountEmail } from "@/lib/email";
import { checkRateLimit, requestFingerprint } from "@/lib/rate-limit";
import { isSameOrigin } from "@/lib/security";

const verificationUrl = (request: Request, parameters: string) =>
  NextResponse.redirect(new URL(`/verify-email?${parameters}`, request.url), 303);

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return new Response("Invalid request origin", { status: 403 });

  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/login?next=/verify-email", request.url), 303);
  if (user.emailVerifiedAt) return verificationUrl(request, "verified=1");
  if (!emailDeliveryConfigured()) return verificationUrl(request, "error=config");

  const allowed = await checkRateLimit(
    requestFingerprint(request, user.email),
    "resend-verification",
    3,
    30,
  );
  if (!allowed) return verificationUrl(request, "error=rate");

  const token = randomBytes(32).toString("base64url");
  const [record] = await db.transaction(async (tx) => {
    await tx
      .update(emailVerificationTokens)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(emailVerificationTokens.userId, user.id),
          isNull(emailVerificationTokens.usedAt),
        ),
      );

    return tx
      .insert(emailVerificationTokens)
      .values({
        userId: user.id,
        tokenHash: tokenDigest(token),
        expiresAt: new Date(Date.now() + 24 * 60 * 60_000),
      })
      .returning({ id: emailVerificationTokens.id });
  });

  const delivery = await sendAccountEmail({ to: user.email, token, kind: "verify" });
  if (!delivery.sent) {
    await db
      .update(emailVerificationTokens)
      .set({ usedAt: new Date() })
      .where(eq(emailVerificationTokens.id, record.id));
    return verificationUrl(request, "error=send");
  }

  return verificationUrl(request, "sent=1");
}
