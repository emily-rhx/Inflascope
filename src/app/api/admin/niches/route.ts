import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { niches } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { formString, isSameOrigin } from "@/lib/security";
import { slugify } from "@/lib/utils";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return new Response("Invalid request origin", { status: 403 });
  const user = await getCurrentUser(); if (!user || user.role !== "admin") return new Response("Forbidden", { status: 403 });
  const form = await request.formData(); const action = formString(form, "action");
  if (action === "toggle") {
    const id = formString(form, "id"); const active = formString(form, "active") === "true";
    await db.update(niches).set({ active: !active }).where(eq(niches.id, id));
  } else {
    const name = formString(form, "name").trim().slice(0, 80); const slug = slugify(name);
    if (name.length < 2 || !slug) return NextResponse.redirect(new URL("/admin/dashboard?error=niche#niches", request.url), 303);
    await db.insert(niches).values({ name, slug }).onConflictDoNothing();
  }
  return NextResponse.redirect(new URL("/admin/dashboard?updated=niche#niches", request.url), 303);
}