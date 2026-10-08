import { hash } from "bcryptjs";
import { and, eq, gt, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { passwordResetTokens, sessions, users } from "@/db/schema";
import { tokenDigest } from "@/lib/auth";
import { checkRateLimit, requestFingerprint } from "@/lib/rate-limit";
import { formString, isSameOrigin } from "@/lib/security";
import { resetPasswordSchema } from "@/lib/validation";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return new Response("Invalid request origin", { status: 403 });
  const form = await request.formData();
  const parsed = resetPasswordSchema.safeParse({ token: formString(form, "token"), password: formString(form, "password") });
  if (!parsed.success) return NextResponse.redirect(new URL(`/reset-password?token=${encodeURIComponent(formString(form, "token"))}&error=invalid`, request.url), 303);
  const allowed = await checkRateLimit(requestFingerprint(request), "password-update", 5, 30);
  if (!allowed) return NextResponse.redirect(new URL("/reset-password?error=rate", request.url), 303);
  const [record] = await db.select().from(passwordResetTokens).where(and(eq(passwordResetTokens.tokenHash, tokenDigest(parsed.data.token)), gt(passwordResetTokens.expiresAt, new Date()), isNull(passwordResetTokens.usedAt))).limit(1);
  if (!record) return NextResponse.redirect(new URL("/reset-password?error=expired", request.url), 303);
  const passwordHash = await hash(parsed.data.password, 12);
  await db.transaction(async (tx) => {
    await tx.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, record.userId));
    await tx.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, record.id));
    await tx.delete(sessions).where(eq(sessions.userId, record.userId));
  });
  return NextResponse.redirect(new URL("/login?reset=1", request.url), 303);
}