import { desc, eq, isNotNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { brandProfiles, subscriptions } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { isSameOrigin } from "@/lib/security";
import { getStripe } from "@/lib/stripe";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return new Response("Invalid request origin", { status: 403 });
  const user = await getCurrentUser();
  if (!user || user.role !== "brand") return NextResponse.redirect(new URL("/login", request.url), 303);
  if (!process.env.STRIPE_SECRET_KEY) return NextResponse.redirect(new URL("/brand/dashboard?billing=config#billing", request.url), 303);
  const [row] = await db.select({ customerId: subscriptions.providerCustomerId }).from(brandProfiles).innerJoin(subscriptions, eq(subscriptions.brandId, brandProfiles.id)).where(eq(brandProfiles.userId, user.id)).orderBy(desc(subscriptions.updatedAt)).limit(1);
  if (!row?.customerId) return NextResponse.redirect(new URL("/brand/dashboard?billing=no-portal#billing", request.url), 303);
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin).replace(/\/$/, "");
  const portal = await getStripe().billingPortal.sessions.create({ customer: row.customerId, return_url: `${baseUrl}/brand/dashboard#billing` });
  return NextResponse.redirect(portal.url, 303);
}