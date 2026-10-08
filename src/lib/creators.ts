import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  collaborationPreferences,
  creatorContacts,
  creatorNiches,
  creatorProfiles,
  engagementMetrics,
  niches,
  portfolioAssets,
  savedCreators,
  socialAccounts,
} from "@/db/schema";

export type CreatorCardData = {
  id: string;
  slug: string;
  displayName: string;
  photoUrl: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  shortIntro: string | null;
  availability: boolean;
  isExample: boolean;
  lastUpdatedAt: Date;
  socials: { platform: "instagram" | "tiktok"; followerCount: number | null }[];
  niches: { name: string; slug: string; primary: boolean }[];
  preference: {
    considersGifting: boolean;
    considersPaid: boolean;
    minimumStartingPrice: number | null;
    formats: string[];
  } | null;
};

export type CreatorSearch = {
  q?: string;
  niche?: string;
  platform?: string;
  country?: string;
  location?: string;
  instagramMin?: number;
  instagramMax?: number;
  tiktokMin?: number;
  tiktokMax?: number;
  gifting?: boolean;
  paid?: boolean;
  ugc?: boolean;
  available?: boolean;
  format?: string;
  maxPrice?: number;
  audienceCountry?: string;
  sort?: string;
  page?: number;
};

async function hydrateCreatorCards(profileRows: (typeof creatorProfiles.$inferSelect)[]) {
  if (!profileRows.length) return [] as CreatorCardData[];
  const ids = profileRows.map((profile) => profile.id);
  const [socialRows, preferenceRows, nicheRows] = await Promise.all([
    db
      .select({ creatorId: socialAccounts.creatorId, platform: socialAccounts.platform, followerCount: socialAccounts.followerCount })
      .from(socialAccounts)
      .where(inArray(socialAccounts.creatorId, ids)),
    db.select().from(collaborationPreferences).where(inArray(collaborationPreferences.creatorId, ids)),
    db
      .select({ creatorId: creatorNiches.creatorId, name: niches.name, slug: niches.slug, primary: creatorNiches.isPrimary })
      .from(creatorNiches)
      .innerJoin(niches, eq(creatorNiches.nicheId, niches.id))
      .where(inArray(creatorNiches.creatorId, ids)),
  ]);
  return profileRows.map((profile) => {
    const preference = preferenceRows.find((item) => item.creatorId === profile.id);
    return {
      id: profile.id,
      slug: profile.slug,
      displayName: profile.displayName,
      photoUrl: profile.photoUrl,
      city: profile.city,
      region: profile.region,
      country: profile.country,
      shortIntro: profile.shortIntro,
      availability: profile.availability,
      isExample: profile.isExample,
      lastUpdatedAt: profile.lastUpdatedAt,
      socials: socialRows.filter((item) => item.creatorId === profile.id),
      niches: nicheRows.filter((item) => item.creatorId === profile.id).map(({ name, slug, primary }) => ({ name, slug, primary })),
      preference: preference
        ? {
            considersGifting: preference.considersGifting,
            considersPaid: preference.considersPaid,
            minimumStartingPrice: preference.minimumStartingPrice,
            formats: preference.formats,
          }
        : null,
    } satisfies CreatorCardData;
  });
}

export async function searchCreators(search: CreatorSearch, canUseAdvancedFilters: boolean) {
  const profiles = await db.select().from(creatorProfiles).where(eq(creatorProfiles.status, "approved"));
  let cards = await hydrateCreatorCards(profiles);
  const query = search.q?.trim().toLowerCase();
  if (query) {
    cards = cards.filter((card) =>
      [card.displayName, card.shortIntro, card.city, card.region, card.country, ...card.niches.map((niche) => niche.name)]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }
  if (search.niche) cards = cards.filter((card) => card.niches.some((niche) => niche.slug === search.niche));
  if (search.platform && ["instagram", "tiktok"].includes(search.platform)) {
    cards = cards.filter((card) => card.socials.some((social) => social.platform === search.platform));
  }
  if (canUseAdvancedFilters) {
    if (search.country) cards = cards.filter((card) => card.country?.toLowerCase() === search.country?.toLowerCase());
    if (search.location) {
      const location = search.location.toLowerCase();
      cards = cards.filter((card) => [card.city, card.region].some((part) => part?.toLowerCase().includes(location)));
    }
    const inPlatformRange = (card: CreatorCardData, platform: "instagram" | "tiktok", min?: number, max?: number) => {
      if (min === undefined && max === undefined) return true;
      const account = card.socials.find((social) => social.platform === platform);
      if (!account || account.followerCount == null) return false;
      return (min === undefined || account.followerCount >= min) && (max === undefined || account.followerCount <= max);
    };
    if (search.instagramMin !== undefined || search.instagramMax !== undefined) cards = cards.filter((card) => inPlatformRange(card, "instagram", search.instagramMin, search.instagramMax));
    if (search.tiktokMin !== undefined || search.tiktokMax !== undefined) cards = cards.filter((card) => inPlatformRange(card, "tiktok", search.tiktokMin, search.tiktokMax));
    if (search.gifting) cards = cards.filter((card) => card.preference?.considersGifting);
    if (search.paid) cards = cards.filter((card) => card.preference?.considersPaid);
    if (search.ugc) cards = cards.filter((card) => card.preference?.formats.includes("Brand-owned content"));
    if (search.available) cards = cards.filter((card) => card.availability);
    if (search.format) cards = cards.filter((card) => card.preference?.formats.includes(search.format!));
    if (search.maxPrice !== undefined) cards = cards.filter((card) => card.preference?.minimumStartingPrice !== null && card.preference?.minimumStartingPrice !== undefined && card.preference.minimumStartingPrice <= search.maxPrice!);
    if (search.audienceCountry) {
      const matching = new Set(
        profiles.filter((profile) => profile.mainAudienceCountry?.toLowerCase() === search.audienceCountry?.toLowerCase()).map((profile) => profile.id),
      );
      cards = cards.filter((card) => matching.has(card.id));
    }
  }
  const sort = search.sort || "relevance";
  if (sort === "newest") cards.sort((a, b) => b.lastUpdatedAt.getTime() - a.lastUpdatedAt.getTime());
  if (sort === "updated") cards.sort((a, b) => b.lastUpdatedAt.getTime() - a.lastUpdatedAt.getTime());
  if (sort === "price") {
    cards.sort((a, b) => {
      const aPrice = a.preference?.minimumStartingPrice;
      const bPrice = b.preference?.minimumStartingPrice;
      if (aPrice == null && bPrice == null) return 0;
      if (aPrice == null) return 1;
      if (bPrice == null) return -1;
      return aPrice - bPrice;
    });
  }
  const total = cards.length;
  const pageSize = 9;
  const page = Math.max(1, search.page || 1);
  return { results: cards.slice((page - 1) * pageSize, page * pageSize), total, page, pageSize, pages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getFeaturedCreators(limit = 3) {
  const profiles = await db
    .select()
    .from(creatorProfiles)
    .where(eq(creatorProfiles.status, "approved"))
    .orderBy(desc(creatorProfiles.lastUpdatedAt))
    .limit(limit);
  return hydrateCreatorCards(profiles);
}

export async function getAllNiches() {
  return db.select().from(niches).where(eq(niches.active, true)).orderBy(asc(niches.sortOrder), asc(niches.name));
}

export async function getPublicCreator(slug: string) {
  const [profile] = await db
    .select()
    .from(creatorProfiles)
    .where(eq(creatorProfiles.slug, slug))
    .limit(1);
  if (!profile || profile.status !== "approved") return null;
  const [cards, assets] = await Promise.all([
    hydrateCreatorCards([profile]),
    db
      .select({ id: portfolioAssets.id, type: portfolioAssets.type, url: portfolioAssets.url, thumbnailUrl: portfolioAssets.thumbnailUrl, altText: portfolioAssets.altText, sortOrder: portfolioAssets.sortOrder })
      .from(portfolioAssets)
      .where(and(eq(portfolioAssets.creatorId, profile.id), eq(portfolioAssets.approved, true)))
      .orderBy(asc(portfolioAssets.sortOrder)),
  ]);
  return { profile, card: cards[0], assets };
}

export async function getMemberCreatorDetails(creatorId: string) {
  const [contacts, metrics, preferences] = await Promise.all([
    db.select().from(creatorContacts).where(eq(creatorContacts.creatorId, creatorId)).limit(1),
    db
      .select({
        id: engagementMetrics.id,
        platform: engagementMetrics.platform,
        followerCount: engagementMetrics.followerCount,
        averageViews: engagementMetrics.averageViews,
        averageReach: engagementMetrics.averageReach,
        engagementRate: engagementMetrics.engagementRate,
        engagementRateBasis: engagementMetrics.engagementRateBasis,
        reportingPeriod: engagementMetrics.reportingPeriod,
        measuredAt: engagementMetrics.measuredAt,
        audienceLocationSummary: engagementMetrics.audienceLocationSummary,
        audienceAgeSummary: engagementMetrics.audienceAgeSummary,
        evidenceStatus: engagementMetrics.evidenceStatus,
      })
      .from(engagementMetrics)
      .where(eq(engagementMetrics.creatorId, creatorId)),
    db.select().from(collaborationPreferences).where(eq(collaborationPreferences.creatorId, creatorId)).limit(1),
  ]);
  const contact = contacts[0];
  return {
    preference: preferences[0] ?? null,
    contact: contact
      ? {
          businessEmail: contact.shareEmail ? contact.businessEmail : null,
          instagramUrl: contact.shareInstagram ? contact.instagramUrl : null,
          tiktokUrl: contact.shareTiktok ? contact.tiktokUrl : null,
          websiteUrl: contact.shareWebsite ? contact.websiteUrl : null,
        }
      : null,
    metrics,
  };
}

export async function getSavedCreatorIds(brandId: string | null) {
  if (!brandId) return new Set<string>();
  const rows = await db.select({ creatorId: savedCreators.creatorId }).from(savedCreators).where(eq(savedCreators.brandId, brandId));
  return new Set(rows.map((row) => row.creatorId));
}

export async function getSavedCreatorsForBrand(brandId: string) {
  const rows = await db.select({ creatorId: savedCreators.creatorId }).from(savedCreators).where(eq(savedCreators.brandId, brandId));
  if (!rows.length) return [];
  const profiles = await db.select().from(creatorProfiles).where(inArray(creatorProfiles.id, rows.map((row) => row.creatorId)));
  return hydrateCreatorCards(profiles.filter((profile) => profile.status === "approved"));
}
