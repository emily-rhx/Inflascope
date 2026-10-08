import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { brandProfiles } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { formString, isSameOrigin } from "@/lib/security";
import { z } from "zod";

const schema = z.object({ businessName: z.string().trim().min(2).max(120), contactName: z.string().trim().min(2).max(80), websiteUrl: z.string().trim().url().or(z.literal("")), country: z.string().trim().max(80) });
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return new Response("Invalid request origin", { status: 403 });
  const user = await getCurrentUser();
  if (!user || user.role !== "brand") return new Response("Unauthorised", { status: 401 });
  const form = await request.formData();
  const parsed = schema.safeParse({ businessName: formString(form, "businessName"), contactName: formString(form, "contactName"), websiteUrl: formString(form, "websiteUrl"), country: formString(form, "country") });
  if (!parsed.success) return NextResponse.redirect(new URL("/brand/dashboard?error=profile", request.url), 303);
  await db.update(brandProfiles).set({ ...parsed.data, websiteUrl: parsed.data.websiteUrl || null, country: parsed.data.country || null, updatedAt: new Date() }).where(eq(brandProfiles.userId, user.id));
  return NextResponse.redirect(new URL("/brand/dashboard?updated=profile", request.url), 303);
}