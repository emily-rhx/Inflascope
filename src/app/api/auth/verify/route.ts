import { and, eq, gt, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { emailVerificationTokens, users } from "@/db/schema";
import { tokenDigest } from "@/lib/auth";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") || "";
  const [record] = await db.select().from(emailVerificationTokens).where(and(eq(emailVerificationTokens.tokenHash, tokenDigest(token)), gt(emailVerificationTokens.expiresAt, new Date()), isNull(emailVerificationTokens.usedAt))).limit(1);
  if (!record) return NextResponse.redirect(new URL("/verify-email?error=expired", request.url));
  await db.transaction(async (tx) => {
    await tx.update(users).set({ emailVerifiedAt: new Date(), updatedAt: new Date() }).where(eq(users.id, record.userId));
    await tx.update(emailVerificationTokens).set({ usedAt: new Date() }).where(eq(emailVerificationTokens.id, record.id));
  });
  return NextResponse.redirect(new URL("/verify-email?verified=1", request.url));
}