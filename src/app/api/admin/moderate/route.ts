import { eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { collaborationPreferences, creatorContacts, creatorNiches, creatorProfiles, engagementMetrics, moderationActions, niches, portfolioAssets, socialAccounts } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { formString, isSameOrigin } from "@/lib/security";
import { REVIEW_SECTIONS, serialiseSectionFeedback, type ReviewSectionKey } from "@/lib/review-feedback";
import { safeNextPath } from "@/lib/utils";
import { z } from "zod";

type PendingPayload = {
  profile?: Record<string, unknown>;
  socials?: { platform: "instagram" | "tiktok"; handle: string; followerCount: number | null }[];
  preference?: { considersGifting: boolean; considersPaid: boolean; formats: string[]; minimumStartingPrice: number | null; typicalTurnaround: string | null };
  contact?: { businessEmail: string | null; instagramUrl: string | null; tiktokUrl: string | null; websiteUrl: string | null; shareEmail: boolean; shareInstagram: boolean; shareTiktok: boolean; shareWebsite: boolean };
  nicheSlugs?: string[];
};

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return new Response("Invalid request origin", { status: 403 });
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "admin") return new Response("Forbidden", { status: 403 });
  const form = await request.formData();
  const creatorId = formString(form, "creatorId");
  const action = formString(form, "action");
  const notes = formString(form, "notes").trim().slice(0, 1500);
  const returnTo = safeNextPath(formString(form, "returnTo"), "/admin/dashboard#applications");
  if (!z.string().uuid().safeParse(creatorId).success) return new Response("Invalid creator", { status: 400 });
  const [profile] = await db.select().from(creatorProfiles).where(eq(creatorProfiles.id, creatorId)).limit(1);
  if (!profile) return new Response("Profile not found", { status: 404 });
  const redirectWith = (key: string, value: string) => {
    const destination = new URL(returnTo, request.url);
    destination.searchParams.set(key, value);
    return NextResponse.redirect(destination, 303);
  };
  const redirect = (value = action) => redirectWith("updated", value);
  const errorRedirect = (error: string) => redirectWith("error", error);

  if (action === "ownership_checked") {
    await db.transaction(async (tx) => {
      await tx.update(creatorProfiles).set({ accountOwnershipChecked: true, ownershipCheckedAt: new Date() }).where(eq(creatorProfiles.id, creatorId));
      await tx.insert(moderationActions).values({ creatorId, adminUserId: admin.id, action: "ownership_checked", notes: notes || "Manual account-control check recorded" });
    });
    return redirect();
  }
  if (action === "approve") {
    if (!profile.accountOwnershipChecked) return errorRedirect("ownership");
    const pending = (profile.pendingChanges || null) as PendingPayload | null;
    await db.transaction(async (tx) => {
      if (pending) {
        if (pending.profile) await tx.update(creatorProfiles).set({ ...pending.profile, pendingChanges: null, lastUpdatedAt: new Date() }).where(eq(creatorProfiles.id, creatorId));
        if (pending.socials) {
          await tx.delete(socialAccounts).where(eq(socialAccounts.creatorId, creatorId));
          if (pending.socials.length) await tx.insert(socialAccounts).values(pending.socials.map((social) => ({ creatorId, ...social, profileUrl: social.platform === "instagram" ? `https://instagram.com/${social.handle}` : `https://tiktok.com/@${social.handle}`, accountControlConfirmed: true })));
        }
        if (pending.preference) await tx.insert(collaborationPreferences).values({ creatorId, ...pending.preference, startingPrices: {} }).onConflictDoUpdate({ target: collaborationPreferences.creatorId, set: { ...pending.preference, updatedAt: new Date() } });
        if (pending.contact) await tx.insert(creatorContacts).values({ creatorId, ...pending.contact }).onConflictDoUpdate({ target: creatorContacts.creatorId, set: { ...pending.contact, updatedAt: new Date() } });
        if (pending.nicheSlugs) {
          await tx.delete(creatorNiches).where(eq(creatorNiches.creatorId, creatorId));
          const selected = pending.nicheSlugs.length ? await tx.select().from(niches).where(inArray(niches.slug, pending.nicheSlugs)) : [];
          if (selected.length) await tx.insert(creatorNiches).values(selected.map((niche, index) => ({ creatorId, nicheId: niche.id, isPrimary: index === 0 })));
        }
      }
      await tx.update(creatorProfiles).set({ status: "approved", approvedAt: profile.approvedAt || new Date(), reviewFeedback: null, pendingChanges: null, lastUpdatedAt: new Date() }).where(eq(creatorProfiles.id, creatorId));
      await tx.update(portfolioAssets).set({ approved: true }).where(eq(portfolioAssets.creatorId, creatorId));
      await tx.insert(moderationActions).values({ creatorId, adminUserId: admin.id, action: "approved", notes: notes || (pending ? "Approved staged profile changes" : "Approved creator profile") });
    });
    return redirect();
  }
  if (action === "changes_requested") {
    const selected = form.getAll("reviewSections").map(String).filter((section): section is ReviewSectionKey => section in REVIEW_SECTIONS);
    const sectionFeedback = selected.map((section) => ({ section, label: REVIEW_SECTIONS[section], note: formString(form, `note_${section}`).trim().slice(0, 1500) }));
    if (sectionFeedback.some((item) => !item.note)) return errorRedirect("section-notes");
    const feedback = sectionFeedback.length ? serialiseSectionFeedback(sectionFeedback) : notes;
    if (!feedback) return errorRedirect("notes");
    const logNotes = sectionFeedback.length ? sectionFeedback.map((item) => `${item.label}: ${item.note}`).join(" | ") : notes;
    await db.transaction(async (tx) => {
      await tx.update(creatorProfiles).set({ status: profile.status === "approved" ? "approved" : "changes_requested", reviewFeedback: feedback }).where(eq(creatorProfiles.id, creatorId));
      await tx.insert(moderationActions).values({ creatorId, adminUserId: admin.id, action: "changes_requested", notes: logNotes });
    });
    return redirect();
  }
  if (["rejected", "hidden", "suspended"].includes(action)) {
    const status = action as "rejected" | "hidden" | "suspended";
    await db.transaction(async (tx) => {
      await tx.update(creatorProfiles).set({ status, reviewFeedback: notes || null, availability: status === "rejected" ? profile.availability : false }).where(eq(creatorProfiles.id, creatorId));
      await tx.insert(moderationActions).values({ creatorId, adminUserId: admin.id, action: status, notes: notes || null });
    });
    return redirect();
  }
  if (action === "portfolio_approved") {
    const assetId = formString(form, "assetId");
    if (!z.string().uuid().safeParse(assetId).success) return new Response("Invalid portfolio asset", { status: 400 });
    const [asset] = await db.select().from(portfolioAssets).where(eq(portfolioAssets.id, assetId)).limit(1);
    if (!asset || asset.creatorId !== creatorId) return new Response("Portfolio asset not found", { status: 404 });
    await db.transaction(async (tx) => {
      await tx.update(portfolioAssets).set({ approved: true }).where(eq(portfolioAssets.id, assetId));
      await tx.insert(moderationActions).values({ creatorId, adminUserId: admin.id, action: "portfolio_approved", notes: notes || "Portfolio asset approved", metadata: { assetId } });
    });
    return redirect();
  }
  if (action === "evidence_reviewed") {
    const evidenceId = formString(form, "evidenceId");
    if (!z.string().uuid().safeParse(evidenceId).success) return new Response("Invalid evidence", { status: 400 });
    await db.transaction(async (tx) => {
      await tx.update(engagementMetrics).set({ evidenceStatus: "reviewed", reviewedAt: new Date() }).where(eq(engagementMetrics.id, evidenceId));
      await tx.insert(moderationActions).values({ creatorId, adminUserId: admin.id, action: "evidence_reviewed", notes: notes || "Analytics evidence reviewed", metadata: { evidenceId } });
    });
    return redirect();
  }
  return new Response("Unsupported moderation action", { status: 400 });
}
