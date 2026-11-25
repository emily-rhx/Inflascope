import { randomBytes } from "crypto";
import { and, count, eq, gt, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { emailVerificationTokens, passwordResetTokens, users } from "@/db/schema";
import { tokenDigest } from "@/lib/auth";
import { sendAccountEmail } from "@/lib/email";

const FIRST_ADMIN_EMAIL = "info@inflascope.co.uk";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") || "";
  const [claim] = await db
    .select({ tokenId: emailVerificationTokens.id, userId: users.id, email: users.email })
    .from(emailVerificationTokens)
    .innerJoin(users, eq(emailVerificationTokens.userId, users.id))
    .where(and(eq(emailVerificationTokens.tokenHash, tokenDigest(token)), gt(emailVerificationTokens.expiresAt, new Date()), isNull(emailVerificationTokens.usedAt)))
    .limit(1);
  if (!claim || claim.email !== FIRST_ADMIN_EMAIL) return NextResponse.redirect(new URL("/login?error=invalid-admin-invitation", request.url));

  const [{ total }] = await db.select({ total: count() }).from(users).where(eq(users.role, "admin"));
  if (Number(total) > 0) return NextResponse.redirect(new URL("/login?error=admin-exists", request.url));

  const resetToken = randomBytes(32).toString("base64url");
  await db.transaction(async (tx) => {
    await tx.update(users).set({ role: "admin", isActive: true, emailVerifiedAt: new Date(), updatedAt: new Date() }).where(eq(users.id, claim.userId));
    await tx.update(emailVerificationTokens).set({ usedAt: new Date() }).where(eq(emailVerificationTokens.id, claim.tokenId));
    await tx.insert(passwordResetTokens).values({ userId: claim.userId, tokenHash: tokenDigest(resetToken), expiresAt: new Date(Date.now() + 60 * 60_000) });
  });
  await sendAccountEmail({ to: claim.email, token: resetToken, kind: "reset" });
  return NextResponse.redirect(new URL("/forgot-password?sent=1&admin=1", request.url));
}
