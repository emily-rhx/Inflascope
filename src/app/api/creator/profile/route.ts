import { and, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { collaborationPreferences, creatorContacts, creatorNiches, creatorProfiles, niches, socialAccounts, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { formString, isSameOrigin } from "@/lib/security";
import { firstZodError, creatorProfileSchema } from "@/lib/validation";

function optionalNumber(value: string) { return value.trim() === "" ? undefined : Number(value); }
function clean(value: string, max: number) { return value.trim().slice(0, max); }

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return new Response("Invalid request origin", { status: 403 });
  const user = await getCurrentUser();
  if (!user || user.role !== "creator") return new Response("Unauthorised", { status: 401 });
  const form = await request.formData();
  const intent = formString(form, "intent");
  const [profile] = await db.select().from(creatorProfiles).where(eq(creatorProfiles.userId, user.id)).limit(1);
  if (!profile) return new Response("Profile not found", { status: 404 });

  if (intent === "availability") {
    await db.update(creatorProfiles).set({ availability: !profile.availability, lastUpdatedAt: new Date() }).where(eq(creatorProfiles.id, profile.id));
    return NextResponse.redirect(new URL("/creator/dashboard?updated=availability", request.url), 303);
  }
  if (intent === "unpublish") {
    await db.update(creatorProfiles).set({ status: "hidden", availability: false, lastUpdatedAt: new Date() }).where(eq(creatorProfiles.id, profile.id));
    return NextResponse.redirect(new URL("/creator/dashboard?updated=unpublished", request.url), 303);
  }
  if (intent === "delete") {
    await db.update(users).set({ deletionRequestedAt: new Date(), updatedAt: new Date() }).where(eq(users.id, user.id));
    return NextResponse.redirect(new URL("/creator/dashboard?updated=deletion", request.url), 303);
  }

  const formatValues = form.getAll("formats").filter((item): item is string => typeof item === "string");
  const nicheSlugs = form.getAll("nicheSlugs").filter((item): item is string => typeof item === "string");
  const rawPrice = optionalNumber(formString(form, "minimumStartingPrice"));
  const input = {
    displayName: clean(formString(form, "displayName"), 80), photoUrl: clean(formString(form, "photoUrl"), 500), city: clean(formString(form, "city"), 80), region: clean(formString(form, "region"), 80), country: clean(formString(form, "country"), 80),
    shortIntro: clean(formString(form, "shortIntro"), 220), biography: clean(formString(form, "biography"), 2500), contentStyle: clean(formString(form, "contentStyle"), 800), brandInterests: clean(formString(form, "brandInterests"), 800), excludedSectors: clean(formString(form, "excludedSectors"), 500), languages: clean(formString(form, "languages"), 200), mainAudienceCountry: clean(formString(form, "mainAudienceCountry"), 80), audienceSummary: clean(formString(form, "audienceSummary"), 500),
    instagramHandle: clean(formString(form, "instagramHandle").replace(/^@/, ""), 80), instagramFollowers: optionalNumber(formString(form, "instagramFollowers")), tiktokHandle: clean(formString(form, "tiktokHandle").replace(/^@/, ""), 80), tiktokFollowers: optionalNumber(formString(form, "tiktokFollowers")),
    considersGifting: form.has("considersGifting"), considersPaid: form.has("considersPaid"), availability: form.has("availability"), formats: formatValues,
    minimumStartingPrice: rawPrice === undefined ? undefined : Math.round(rawPrice * 100), typicalTurnaround: clean(formString(form, "typicalTurnaround"), 100),
    businessEmail: clean(formString(form, "businessEmail"), 254), websiteUrl: clean(formString(form, "websiteUrl"), 500), shareEmail: form.has("shareEmail"), shareInstagram: form.has("shareInstagram"), shareTiktok: form.has("shareTiktok"), shareWebsite: form.has("shareWebsite"), nicheSlugs,
    rightsConfirmed: form.has("rightsConfirmed"), accountControlConfirmed: form.has("accountControlConfirmed"), visibilityConfirmed: form.has("visibilityConfirmed"),
  };

  if (intent === "submit") {
    if (!user.emailVerifiedAt) return NextResponse.redirect(new URL("/creator/onboarding?error=verify", request.url), 303);
    const parsed = creatorProfileSchema.safeParse(input);
    if (!parsed.success) return NextResponse.redirect(new URL(`/creator/onboarding?error=${encodeURIComponent(firstZodError(parsed.error))}`, request.url), 303);
    if (!parsed.data.considersGifting && !parsed.data.considersPaid) return NextResponse.redirect(new URL("/creator/onboarding?error=Choose%20at%20least%20one%20collaboration%20preference", request.url), 303);
  } else if (input.displayName.length < 2) {
    return NextResponse.redirect(new URL("/creator/onboarding?error=Add%20a%20display%20name%20before%20saving", request.url), 303);
  }

  const profileData = { displayName: input.displayName, photoUrl: input.photoUrl || null, city: input.city || null, region: input.region || null, country: input.country || null, shortIntro: input.shortIntro || null, biography: input.biography || null, contentStyle: input.contentStyle || null, brandInterests: input.brandInterests || null, excludedSectors: input.excludedSectors || null, languages: input.languages || null, mainAudienceCountry: input.mainAudienceCountry || null, audienceSummary: input.audienceSummary || null, availability: input.availability };
  const payload = {
    profile: profileData,
    socials: [input.instagramHandle && { platform: "instagram", handle: input.instagramHandle, followerCount: input.instagramFollowers ?? null }, input.tiktokHandle && { platform: "tiktok", handle: input.tiktokHandle, followerCount: input.tiktokFollowers ?? null }].filter(Boolean),
    preference: { considersGifting: input.considersGifting, considersPaid: input.considersPaid, formats: input.formats, minimumStartingPrice: input.minimumStartingPrice ?? null, typicalTurnaround: input.typicalTurnaround || null },
    contact: { businessEmail: input.businessEmail || null, instagramUrl: input.instagramHandle ? `https://instagram.com/${input.instagramHandle}` : null, tiktokUrl: input.tiktokHandle ? `https://tiktok.com/@${input.tiktokHandle}` : null, websiteUrl: input.websiteUrl || null, shareEmail: input.shareEmail, shareInstagram: input.shareInstagram, shareTiktok: input.shareTiktok, shareWebsite: input.shareWebsite },
    nicheSlugs: input.nicheSlugs,
  };

  if (profile.status === "approved" || profile.status === "hidden") {
    await db.update(creatorProfiles).set({ pendingChanges: payload, lastUpdatedAt: new Date() }).where(eq(creatorProfiles.id, profile.id));
    return NextResponse.redirect(new URL(`/creator/dashboard?updated=${intent === "submit" ? "submitted-changes" : "draft-changes"}`, request.url), 303);
  }

  await db.transaction(async (tx) => {
    await tx.update(creatorProfiles).set({ ...profileData, status: intent === "submit" ? "pending_review" : profile.status === "changes_requested" ? "changes_requested" : "draft", submittedAt: intent === "submit" ? new Date() : profile.submittedAt, reviewFeedback: intent === "submit" ? null : profile.reviewFeedback, lastUpdatedAt: new Date() }).where(eq(creatorProfiles.id, profile.id));
    await tx.delete(socialAccounts).where(eq(socialAccounts.creatorId, profile.id));
    const socials = payload.socials as { platform: "instagram" | "tiktok"; handle: string; followerCount: number | null }[];
    if (socials.length) await tx.insert(socialAccounts).values(socials.map((social) => ({ creatorId: profile.id, platform: social.platform, handle: social.handle, followerCount: social.followerCount, profileUrl: social.platform === "instagram" ? `https://instagram.com/${social.handle}` : `https://tiktok.com/@${social.handle}`, accountControlConfirmed: input.accountControlConfirmed })));
    await tx.insert(collaborationPreferences).values({ creatorId: profile.id, ...payload.preference, startingPrices: {} }).onConflictDoUpdate({ target: collaborationPreferences.creatorId, set: { ...payload.preference, updatedAt: new Date() } });
    await tx.insert(creatorContacts).values({ creatorId: profile.id, ...payload.contact }).onConflictDoUpdate({ target: creatorContacts.creatorId, set: { ...payload.contact, updatedAt: new Date() } });
    await tx.delete(creatorNiches).where(eq(creatorNiches.creatorId, profile.id));
    if (input.nicheSlugs.length) {
      const selected = await tx.select().from(niches).where(inArray(niches.slug, input.nicheSlugs));
      if (selected.length) await tx.insert(creatorNiches).values(selected.map((niche, index) => ({ creatorId: profile.id, nicheId: niche.id, isPrimary: index === 0 })));
    }
  });
  return NextResponse.redirect(new URL(`/creator/dashboard?updated=${intent === "submit" ? "submitted" : "saved"}`, request.url), 303);
}