import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { supportRequests } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { checkRateLimit, requestFingerprint } from "@/lib/rate-limit";
import { formString, isSameOrigin } from "@/lib/security";

const schema = z.object({ name: z.string().trim().min(2).max(80), email: z.string().trim().toLowerCase().email().max(254), topic: z.string().trim().min(2).max(80), message: z.string().trim().min(20).max(3000) });
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return new Response("Invalid request origin", { status: 403 });
  const form = await request.formData(); const input = { name: formString(form, "name"), email: formString(form, "email"), topic: formString(form, "topic"), message: formString(form, "message") };
  const parsed = schema.safeParse(input); if (!parsed.success) return NextResponse.redirect(new URL("/contact?error=1", request.url), 303);
  if (!await checkRateLimit(requestFingerprint(request, parsed.data.email), "support", 4, 60)) return new Response("Too many requests", { status: 429 });
  const user = await getCurrentUser(); await db.insert(supportRequests).values({ ...parsed.data, userId: user?.id || null });
  return NextResponse.redirect(new URL("/contact?sent=1", request.url), 303);
}