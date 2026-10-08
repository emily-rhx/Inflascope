import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { billingEvents, brandProfiles, subscriptions } from "@/db/schema";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

function dateFromUnix(value: number | null | undefined) { return value ? new Date(value * 1000) : null; }
function localStatus(status: Stripe.Subscription.Status): "incomplete" | "trialing" | "active" | "past_due" | "canceled" | "unpaid" | "expired" {
  if (status === "incomplete") return "incomplete";
  if (status === "trialing") return "trialing";
  if (status === "active") return "active";
  if (status === "past_due") return "past_due";
  if (status === "canceled") return "canceled";
  if (status === "unpaid") return "unpaid";
  return "expired";
}

async function syncSubscription(subscription: Stripe.Subscription) {
  const brandId = subscription.metadata.brandId;
  if (!brandId) return;
  const item = subscription.items.data[0];
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const status = localStatus(subscription.status);
  const values = {
    brandId,
    provider: "stripe",
    providerCustomerId: customerId,
    providerSubscriptionId: subscription.id,
    providerPriceId: item?.price.id || null,
    status,
    trialStartsAt: dateFromUnix(subscription.trial_start),
    trialEndsAt: dateFromUnix(subscription.trial_end),
    currentPeriodStartsAt: dateFromUnix(item?.current_period_start),
    currentPeriodEndsAt: dateFromUnix(item?.current_period_end),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    canceledAt: dateFromUnix(subscription.canceled_at),
    updatedAt: new Date(),
  };
  await db.insert(subscriptions).values(values).onConflictDoUpdate({ target: subscriptions.providerSubscriptionId, set: values });
  await db.update(brandProfiles).set({ firstTrialUsedAt: subscription.trial_start ? new Date(subscription.trial_start * 1000) : undefined, pendingCheckoutSessionId: null, pendingCheckoutExpiresAt: null, updatedAt: new Date() }).where(eq(brandProfiles.id, brandId));
}

export async function POST(request: Request) {
  if (!process.env.STRIPE_WEBHOOK_SECRET || !process.env.STRIPE_SECRET_KEY) return new Response("Billing webhook is not configured", { status: 503 });
  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });
  let event: Stripe.Event;
  try { event = getStripe().webhooks.constructEvent(await request.text(), signature, process.env.STRIPE_WEBHOOK_SECRET); }
  catch { return new Response("Invalid signature", { status: 400 }); }
  const inserted = await db.insert(billingEvents).values({ providerEventId: event.id, eventType: event.type }).onConflictDoNothing().returning({ id: billingEvents.id });
  if (!inserted.length) return Response.json({ received: true, duplicate: true });
  try {
    if (["customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"].includes(event.type)) await syncSubscription(event.data.object as Stripe.Subscription);
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (typeof session.subscription === "string") await syncSubscription(await getStripe().subscriptions.retrieve(session.subscription));
    }
    return Response.json({ received: true });
  } catch (error) {
    await db.delete(billingEvents).where(eq(billingEvents.providerEventId, event.id));
    console.error("Stripe webhook processing failed", error);
    return new Response("Webhook processing failed", { status: 500 });
  }
}