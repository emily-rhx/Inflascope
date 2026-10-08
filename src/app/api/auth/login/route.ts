import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession } from "@/lib/auth";
import { checkRateLimit, requestFingerprint } from "@/lib/rate-limit";
import { formString, isSameOrigin } from "@/lib/security";
import { safeNextPath } from "@/lib/utils";
import { loginSchema } from "@/lib/validation";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return new Response("Invalid request origin", { status: 403 });
  const form = await request.formData();
  const parsed = loginSchema.safeParse({ email: formString(form, "email"), password: formString(form, "password") });
  const next = safeNextPath(formString(form, "next"), "");
  if (!parsed.success) return NextResponse.redirect(new URL(`/login?error=invalid${next ? `&next=${encodeURIComponent(next)}` : ""}`, request.url), 303);
  const allowed = await checkRateLimit(requestFingerprint(request, parsed.data.email), "login", 8, 15);
  if (!allowed) return NextResponse.redirect(new URL("/login?error=rate", request.url), 303);
  const [user] = await db.select().from(users).where(eq(users.email, parsed.data.email)).limit(1);
  const valid = user?.isActive ? await compare(parsed.data.password, user.passwordHash) : false;
  if (!user || !valid) return NextResponse.redirect(new URL(`/login?error=invalid${next ? `&next=${encodeURIComponent(next)}` : ""}`, request.url), 303);
  await createSession(user.id);
  const destination = next || `/${user.role}/dashboard`;
  return NextResponse.redirect(new URL(destination, request.url), 303);
}