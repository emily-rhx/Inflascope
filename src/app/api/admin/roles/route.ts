import { count, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { moderationActions, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { formString, isSameOrigin } from "@/lib/security";
import { z } from "zod";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return new Response("Invalid request origin", { status: 403 });
  const admin = await getCurrentUser(); if (!admin || admin.role !== "admin") return new Response("Forbidden", { status: 403 });
  const form = await request.formData(); const userId = formString(form, "userId"); const role = formString(form, "role");
  if (!z.string().uuid().safeParse(userId).success || !["creator", "brand", "admin"].includes(role)) return new Response("Invalid role change", { status: 400 });
  const [target] = await db.select().from(users).where(eq(users.id, userId)).limit(1); if (!target) return new Response("User not found", { status: 404 });
  if (target.role === "admin" && role !== "admin") { const [{ total }] = await db.select({ total: count() }).from(users).where(eq(users.role, "admin")); if (total <= 1) return NextResponse.redirect(new URL("/admin/dashboard?error=last-admin#accounts", request.url), 303); }
  await db.transaction(async (tx) => { await tx.update(users).set({ role: role as "creator" | "brand" | "admin", updatedAt: new Date() }).where(eq(users.id, userId)); await tx.insert(moderationActions).values({ adminUserId: admin.id, action: "role_changed", notes: `${target.email}: ${target.role} to ${role}`, metadata: { targetUserId: userId, from: target.role, to: role } }); });
  return NextResponse.redirect(new URL("/admin/dashboard?updated=role#accounts", request.url), 303);
}