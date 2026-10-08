import { and, count, eq, gt, lt } from "drizzle-orm";
import { db } from "@/db";
import { rateLimitEvents } from "@/db/schema";

export async function checkRateLimit(fingerprint: string, action: string, limit = 8, windowMinutes = 15) {
  const since = new Date(Date.now() - windowMinutes * 60_000);
  const [{ total }] = await db
    .select({ total: count() })
    .from(rateLimitEvents)
    .where(and(eq(rateLimitEvents.fingerprint, fingerprint.slice(0, 180)), eq(rateLimitEvents.action, action), gt(rateLimitEvents.createdAt, since)));
  if (total >= limit) return false;
  await db.insert(rateLimitEvents).values({ fingerprint: fingerprint.slice(0, 180), action });
  if (Math.random() < 0.02) {
    await db.delete(rateLimitEvents).where(lt(rateLimitEvents.createdAt, new Date(Date.now() - 48 * 60 * 60_000)));
  }
  return true;
}

export function requestFingerprint(request: Request, email = "") {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return `${forwarded || "unknown"}:${email.toLowerCase().slice(0, 100)}`;
}
