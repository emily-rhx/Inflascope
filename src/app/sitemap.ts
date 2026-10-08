import type { MetadataRoute } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { creatorProfiles, niches } from "@/db/schema";

export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const [creators, categories] = await Promise.all([db.select({ slug: creatorProfiles.slug, updated: creatorProfiles.lastUpdatedAt }).from(creatorProfiles).where(eq(creatorProfiles.status, "approved")), db.select({ slug: niches.slug }).from(niches).where(eq(niches.active, true))]);
  const staticRoutes = ["", "/creators", "/how-it-works", "/pricing", "/contact"].map((path) => ({ url: `${base}${path}`, changeFrequency: path === "/creators" ? "daily" as const : "monthly" as const, priority: path === "" ? 1 : .8 }));
  return [...staticRoutes, ...categories.map((category) => ({ url: `${base}/categories/${category.slug}`, changeFrequency: "weekly" as const, priority: .7 })), ...creators.map((creator) => ({ url: `${base}/creators/${creator.slug}`, lastModified: creator.updated, changeFrequency: "weekly" as const, priority: .7 }))];
}