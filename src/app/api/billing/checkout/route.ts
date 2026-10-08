import { and, desc, eq, gt, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { brandProfiles, subscriptions } from "@/db/schema";
import { getBrandMembership } from "@/lib/access";
import { getCurrentUser } from "@/lib/auth";
import { isSameOrigin } from "@/lib/security";
import { getStripe, stripeConfigured } from "@/lib/stripe";
import { addCalendarMonth } from "@/lib/utils";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return new Response("Invalid request origin", { status: 403 });
  const user = await getCurrentUser();
  if (!user || user.role !== "brand") return NextResponse.redirect(new URL("/login", request.url), 303);
  if (!user.emailVerifiedAt) return NextResponse.redirect(new URL("/brand/dashboard?billing=verify#billing", request.url), 303);
  if (!stripeConfigured()) return NextResponse.redirect(new URL("/brand/dashboard?billing=config#billing", request.url), 303);
  const [brand] = await db.select().from(brandProfiles).where(eq(brandProfiles.userId, user.id)).limit(1);
  if (!brand) return new Response("Brand profile not found", { status: 404 });
  const membership = await getBrandMembership(user.id);
  if (membership.hasAccess) return NextResponse.redirect(new URL("/brand/dashboard?billing=active#billing", request.url), 303);
  const stripe = getStripe();
  if (brand.pendingCheckoutSessionId && brand.pendingCheckoutExpiresAt && brand.pendingCheckoutExpiresAt > new Date()) {
    try {
      const existing = await stripe.checkout.sessions.retrieve(brand.pendingCheckoutSessionId);
      if (existing.status === "open" && existing.url) return NextResponse.redirect(existing.url, 303);
    } catch { /* create a fresh session */ }
  }
  const prior = await db.select({ id: subscriptions.id }).from(subscriptions).where(eq(subscriptions.brandId, brand.id)).limit(1);
  const trialEligible = !brand.firstTrialUsedAt && prior.length === 0;
  const trialEnd = addCalendarMonth(new Date());
  const [latestCustomer] = await db.select({ customerId: subscriptions.providerCustomerId }).from(subscriptions).where(and(eq(subscriptions.brandId, brand.id), inArray(subscriptions.status, ["active", "trialing", "past_due", "canceled", "expired"]))).orderBy(desc(subscriptions.updatedAt)).limit(1);
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin).replace(/\/$/, "");
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
    payment_method_collection: "always",
    customer: latestCustomer?.customerId || undefined,
    customer_email: latestCustomer?.customerId ? undefined : user.email,
    client_reference_id: brand.id,
    metadata: { brandId: brand.id, userId: user.id },
    subscription_data: {
      metadata: { brandId: brand.id, userId: user.id },
      ...(trialEligible ? { trial_end: Math.floor(trialEnd.getTime() / 1000), trial_settings: { end_behavior: { missing_payment_method: "cancel" } } } : {}),
    },
    custom_text: { submit: { message: trialEligible ? `Full access is free until ${trialEnd.toLocaleDateString("en-GB")}, then £8.99 monthly unless cancelled.` : "You will be charged £8.99 monthly until cancelled." } },
    success_url: `${baseUrl}/brand/dashboard?checkout=returned#billing`,
    cancel_url: `${baseUrl}/brand/dashboard?checkout=cancelled#billing`,
    allow_promotion_codes: false,
  });
  if (!session.url) return NextResponse.redirect(new URL("/brand/dashboard?billing=failed#billing", request.url), 303);
  await db.update(brandProfiles).set({ pendingCheckoutSessionId: session.id, pendingCheckoutExpiresAt: new Date(session.expires_at * 1000), updatedAt: new Date() }).where(eq(brandProfiles.id, brand.id));
  return NextResponse.redirect(session.url, 303);
}