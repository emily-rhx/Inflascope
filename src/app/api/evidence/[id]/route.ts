import { eq } from "drizzle-orm";
import { db } from "@/db";
import { creatorProfiles, engagementMetrics } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { readPrivateImage } from "@/lib/storage";

export const runtime = "nodejs";
type Props = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Props) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorised", { status: 401 });
  const { id } = await params;
  const [record] = await db.select({ path: engagementMetrics.evidencePath, ownerId: creatorProfiles.userId }).from(engagementMetrics).innerJoin(creatorProfiles, eq(engagementMetrics.creatorId, creatorProfiles.id)).where(eq(engagementMetrics.id, id)).limit(1);
  if (!record || !record.path) return new Response("Not found", { status: 404 });
  if (user.role !== "admin" && user.id !== record.ownerId) return new Response("Forbidden", { status: 403 });
  try {
    const image = await readPrivateImage(record.path);
    return new Response(image.bytes as BodyInit, { headers: { "Content-Type": image.contentType, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}