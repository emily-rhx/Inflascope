import { randomBytes } from "crypto";
import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { brandProfiles, collaborationPreferences, creatorContacts, creatorProfiles, emailVerificationTokens, socialAccounts, users } from "@/db/schema";
import { createSession, tokenDigest } from "@/lib/auth";
import { sendAccountEmail } from "@/lib/email";
import { checkRateLimit, requestFingerprint } from "@/lib/rate-limit";
import { formString, isSameOrigin } from "@/lib/security";
import { slugify } from "@/lib/utils";
import { creatorSignupDetailsSchema, firstZodError, signupSchema } from "@/lib/validation";

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
  const creatorDetails = parsed.data.role === "creator" ? creatorSignupDetailsSchema.safeParse({
    phone: formString(form, "phone"),
    phonePrivate: formString(form, "phonePrivate") === "on",
    preferredContact: formString(form, "preferredContact"),
    socialPlatform: formString(form, "socialPlatform"),
    socialHandle: formString(form, "socialHandle"),
    location: formString(form, "location"),
    platform: formString(form, "platform"),
    followers: formString(form, "followers"),
    bio: formString(form, "bio"),
    contentCategories: form.getAll("contentCategories").map(String),
    collabs: form.getAll("collabs").map(String),
    marketingConsent: formString(form, "marketingConsent") === "on",
  }) : null;
  if (creatorDetails && !creatorDetails.success) return NextResponse.redirect(new URL(`${back}?error=${encodeURIComponent(firstZodError(creatorDetails.error))}`, request.url), 303);
  const allowed = await checkRateLimit(requestFingerprint(request, parsed.data.email), "signup", 5, 30);
  if (!allowed) return NextResponse.redirect(new URL(`${back}?error=${encodeURIComponent("Too many attempts. Please try again later.")}`, request.url), 303);
  const passwordHash = await hash(parsed.data.password, 12);
  const verifyToken = randomBytes(32).toString("base64url");
  try {
    const user = await db.transaction(async (tx) => {
      const [created] = await tx.insert(users).values({ email: parsed.data.email, passwordHash, role: parsed.data.role, displayName: parsed.data.displayName }).returning();
      if (parsed.data.role === "creator") {
        const slug = `${slugify(parsed.data.displayName) || "creator"}-${created.id.slice(0, 6)}`;
        const details = creatorDetails!.data;
        const [profile] = await tx.insert(creatorProfiles).values({
          userId: created.id,
          slug,
          displayName: parsed.data.displayName,
          city: details.location,
          shortIntro: details.bio,
          brandInterests: details.contentCategories.join(", "),
          status: "draft",
          pendingChanges: {
            phone: details.phone,
            phonePrivate: details.phonePrivate,
            preferredContact: details.preferredContact,
            socialPlatform: details.socialPlatform,
            socialHandle: details.socialHandle,
            mainPlatform: details.platform,
            followers: details.followers,
            contentCategories: details.contentCategories,
            collaborationPreferences: details.collabs,
            marketingConsent: details.marketingConsent,
            capturedDuringSignup: true,
          },
        }).returning();
        await tx.insert(collaborationPreferences).values({
          creatorId: profile.id,
          considersGifting: details.collabs.includes("Gifting"),
          considersPaid: details.collabs.includes("Paid projects"),
          formats: details.collabs.includes("Organic social UGC") ? ["Brand-owned content"] : [],
        });
        const socialContact = details.preferredContact === "social";
        const cleanHandle = details.socialHandle.replace(/^@/, "");
        await tx.insert(creatorContacts).values({
          creatorId: profile.id,
          businessEmail: parsed.data.email,
          instagramUrl: details.socialPlatform === "Instagram" && cleanHandle ? `https://instagram.com/${cleanHandle}` : null,
          tiktokUrl: details.socialPlatform === "TikTok" && cleanHandle ? `https://tiktok.com/@${cleanHandle}` : null,
          shareEmail: details.preferredContact === "email",
          shareInstagram: socialContact && details.socialPlatform === "Instagram",
          shareTiktok: socialContact && details.socialPlatform === "TikTok",
        });
        const mainPlatform = details.platform.toLowerCase();
        if ((mainPlatform === "instagram" || mainPlatform === "tiktok") && cleanHandle) await tx.insert(socialAccounts).values({ creatorId: profile.id, platform: mainPlatform, handle: cleanHandle, followerCount: details.followers });
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
