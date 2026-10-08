import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { creatorProfiles, savedCreators } from "@/db/schema";
import { getBrandMembership } from "@/lib/access";
import { getCurrentUser } from "@/lib/auth";
import { formString, isSameOrigin } from "@/lib/security";
import { safeNextPath } from "@/lib/utils";
import { z } from "zod";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return new Response("Invalid request origin", { status: 403 });
  const user = await getCurrentUser();
  if (!user || user.role !== "brand") return NextResponse.redirect(new URL("/login", request.url), 303);
  const membership = await getBrandMembership(user.id);
  if (!membership.hasAccess || !membership.brandId) return NextResponse.redirect(new URL("/brand/dashboard?error=membership#billing", request.url), 303);
  const form = await request.formData();
  const parsed = z.string().uuid().safeParse(formString(form, "creatorId"));
  const returnTo = safeNextPath(formString(form, "returnTo"), "/creators");
  if (!parsed.success) return NextResponse.redirect(new URL(returnTo, request.url), 303);
  const [creator] = await db.select({ id: creatorProfiles.id }).from(creatorProfiles).where(and(eq(creatorProfiles.id, parsed.data), eq(creatorProfiles.status, "approved"))).limit(1);
  if (!creator) return NextResponse.redirect(new URL(returnTo, request.url), 303);
  if (formString(form, "intent") === "remove") await db.delete(savedCreators).where(and(eq(savedCreators.brandId, membership.brandId), eq(savedCreators.creatorId, creator.id)));
  else await db.insert(savedCreators).values({ brandId: membership.brandId, creatorId: creator.id }).onConflictDoNothing();
  return NextResponse.redirect(new URL(returnTo, request.url), 303);
}