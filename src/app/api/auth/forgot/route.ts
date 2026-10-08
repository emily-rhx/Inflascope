import { randomBytes } from "crypto";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { passwordResetTokens, users } from "@/db/schema";
import { tokenDigest } from "@/lib/auth";
import { sendAccountEmail } from "@/lib/email";
import { checkRateLimit, requestFingerprint } from "@/lib/rate-limit";
import { formString, isSameOrigin } from "@/lib/security";
import { forgotPasswordSchema } from "@/lib/validation";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return new Response("Invalid request origin", { status: 403 });
  const form = await request.formData();
  const parsed = forgotPasswordSchema.safeParse({ email: formString(form, "email") });
  if (!parsed.success) return NextResponse.redirect(new URL("/forgot-password?sent=1", request.url), 303);
  const allowed = await checkRateLimit(requestFingerprint(request, parsed.data.email), "password-reset", 4, 30);
  if (allowed) {
    const [user] = await db.select().from(users).where(eq(users.email, parsed.data.email)).limit(1);
    if (user) {
      const token = randomBytes(32).toString("base64url");
      await db.insert(passwordResetTokens).values({ userId: user.id, tokenHash: tokenDigest(token), expiresAt: new Date(Date.now() + 60 * 60_000) });
      await sendAccountEmail({ to: user.email, token, kind: "reset" });
    }
  }
  return NextResponse.redirect(new URL("/forgot-password?sent=1", request.url), 303);
}