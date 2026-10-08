import { randomBytes } from "crypto";
import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { brandProfiles, creatorProfiles, emailVerificationTokens, users } from "@/db/schema";
import { createSession, tokenDigest } from "@/lib/auth";
import { sendAccountEmail } from "@/lib/email";
import { checkRateLimit, requestFingerprint } from "@/lib/rate-limit";
import { formString, isSameOrigin } from "@/lib/security";
import { slugify } from "@/lib/utils";
import { firstZodError, signupSchema } from "@/lib/validation";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return new Response("Invalid request origin", { status: 403 });
  const form = await request.formData();
  const input = { email: formString(form, "email"), password: formString(form, "password"), displayName: formString(form, "displayName"), role: formString(form, "role"), businessName: formString(form, "businessName") || undefined, over18: formString(form, "over18") || undefined, terms: formString(form, "terms") };
  const back = input.role === "brand" ? "/signup/brand" : "/signup/creator";
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success || parsed.data.over18 !== "on") {
    const message = parsed.success ? "You must confirm you are 18 or over" : firstZodError(parsed.error);
    return NextResponse.redirect(new URL(`${back}?error=${encodeURIComponent(message)}`, request.url), 303);
  }
  if (parsed.data.role === "brand" && !parsed.data.businessName) return NextResponse.redirect(new URL(`${back}?error=${encodeURIComponent("Enter your business name")}`, request.url), 303);
  const allowed = await checkRateLimit(requestFingerprint(request, parsed.data.email), "signup", 5, 30);
  if (!allowed) return NextResponse.redirect(new URL(`${back}?error=${encodeURIComponent("Too many attempts. Please try again later.")}`, request.url), 303);
  const passwordHash = await hash(parsed.data.password, 12);
  const verifyToken = randomBytes(32).toString("base64url");
  try {
    const user = await db.transaction(async (tx) => {
      const [created] = await tx.insert(users).values({ email: parsed.data.email, passwordHash, role: parsed.data.role, displayName: parsed.data.displayName }).returning();
      if (parsed.data.role === "creator") {
        const slug = `${slugify(parsed.data.displayName) || "creator"}-${created.id.slice(0, 6)}`;
        await tx.insert(creatorProfiles).values({ userId: created.id, slug, displayName: parsed.data.displayName, status: "draft" });
      } else {
        await tx.insert(brandProfiles).values({ userId: created.id, businessName: parsed.data.businessName!, contactName: parsed.data.displayName });
      }
      await tx.insert(emailVerificationTokens).values({ userId: created.id, tokenHash: tokenDigest(verifyToken), expiresAt: new Date(Date.now() + 24 * 60 * 60_000) });
      return created;
    });
    await createSession(user.id);
    const delivery = await sendAccountEmail({ to: user.email, token: verifyToken, kind: "verify" });
    return NextResponse.redirect(new URL(`/verify-email?sent=${delivery.sent ? "1" : "0"}`, request.url), 303);
  } catch (error) {
    const duplicate = error instanceof Error && (error.message.includes("users_email_unique") || error.message.includes("duplicate key"));
    return NextResponse.redirect(new URL(`${back}?error=${encodeURIComponent(duplicate ? "An account with that email already exists" : "We could not create your account. Please try again.")}`, request.url), 303);
  }
}