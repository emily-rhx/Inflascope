import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { creatorProfiles, profileReports } from "@/db/schema";
import { checkRateLimit, requestFingerprint } from "@/lib/rate-limit";
import { formString, isSameOrigin } from "@/lib/security";
import { reportSchema } from "@/lib/validation";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return new Response("Invalid request origin", { status: 403 });
  const form = await request.formData(); const parsed = reportSchema.safeParse({ creatorId: formString(form, "creatorId"), email: formString(form, "email"), reason: formString(form, "reason") });
  if (!parsed.success) return new Response("Invalid report", { status: 400 });
  if (!await checkRateLimit(requestFingerprint(request, parsed.data.email || ""), "profile-report", 4, 60)) return new Response("Too many reports", { status: 429 });
  const [creator] = await db.select({ slug: creatorProfiles.slug }).from(creatorProfiles).where(and(eq(creatorProfiles.id, parsed.data.creatorId), eq(creatorProfiles.status, "approved"))).limit(1);
  if (!creator) return new Response("Profile not found", { status: 404 });
  await db.insert(profileReports).values({ creatorId: parsed.data.creatorId, reporterEmail: parsed.data.email || null, reason: parsed.data.reason });
  return NextResponse.redirect(new URL(`/creators/${creator.slug}?reported=1`, request.url), 303);
}