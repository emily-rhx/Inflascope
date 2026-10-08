import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { brandProfiles, subscriptions } from "@/db/schema";

export type Membership = {
  brandId: string | null;
  hasAccess: boolean;
  status: string;
  trialEndsAt: Date | null;
  currentPeriodEndsAt: Date | null;
  cancelAtPeriodEnd: boolean;
  providerCustomerId: string | null;
  subscriptionId: string | null;
};

export async function getBrandMembership(userId: string): Promise<Membership> {
  const [brand] = await db.select().from(brandProfiles).where(eq(brandProfiles.userId, userId)).limit(1);
  if (!brand) return { brandId: null, hasAccess: false, status: "none", trialEndsAt: null, currentPeriodEndsAt: null, cancelAtPeriodEnd: false, providerCustomerId: null, subscriptionId: null };
  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.brandId, brand.id), inArray(subscriptions.status, ["trialing", "active", "past_due", "canceled"])))
    .orderBy(desc(subscriptions.updatedAt))
    .limit(1);
  if (!subscription) return { brandId: brand.id, hasAccess: false, status: "none", trialEndsAt: null, currentPeriodEndsAt: null, cancelAtPeriodEnd: false, providerCustomerId: null, subscriptionId: null };
  const now = Date.now();
  const hasAccess =
    (subscription.status === "trialing" && !!subscription.trialEndsAt && subscription.trialEndsAt.getTime() > now) ||
    (["active", "past_due", "canceled"].includes(subscription.status) && !!subscription.currentPeriodEndsAt && subscription.currentPeriodEndsAt.getTime() > now);
  return {
    brandId: brand.id,
    hasAccess,
    status: subscription.status,
    trialEndsAt: subscription.trialEndsAt,
    currentPeriodEndsAt: subscription.currentPeriodEndsAt,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    providerCustomerId: subscription.providerCustomerId,
    subscriptionId: subscription.id,
  };
}
