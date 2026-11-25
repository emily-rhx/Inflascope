import { count, eq } from "drizzle-orm";
import { db } from "@/db";
import { creatorProfiles } from "@/db/schema";

export const BRAND_LAUNCH_CREATOR_TARGET = 200;

export async function getApprovedCreatorCount() {
  const [result] = await db
    .select({ total: count() })
    .from(creatorProfiles)
    .where(eq(creatorProfiles.status, "approved"));

  return Number(result?.total ?? 0);
}

export async function brandAccountsOpen() {
  return (await getApprovedCreatorCount()) >= BRAND_LAUNCH_CREATOR_TARGET;
}
