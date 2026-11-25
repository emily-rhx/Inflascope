import { randomBytes } from "crypto";
import { hash } from "bcryptjs";
import { count, eq } from "drizzle-orm";
import { db } from "@/db";
import { emailVerificationTokens, users } from "@/db/schema";
import { tokenDigest } from "@/lib/auth";
import { sendFirstAdminClaimEmail } from "@/lib/email";
import { isSameOrigin } from "@/lib/security";

const FIRST_ADMIN_EMAIL = "info@inflascope.co.uk";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return new Response("Invalid request origin", { status: 403 });
  const [{ total }] = await db.select({ total: count() }).from(users).where(eq(users.role, "admin"));
  if (Number(total) > 0) return Response.json({ created: false, reason: "admin_exists" }, { status: 409 });

  const token = randomBytes(32).toString("base64url");
  const [existing] = await db.select().from(users).where(eq(users.email, FIRST_ADMIN_EMAIL)).limit(1);
  const account = existing || (await db.insert(users).values({ email: FIRST_ADMIN_EMAIL, passwordHash: await hash(randomBytes(48).toString("base64url"), 12), role: "creator", displayName: "Inflascope Admin" }).returning())[0];
  await db.insert(emailVerificationTokens).values({ userId: account.id, tokenHash: tokenDigest(token), expiresAt: new Date(Date.now() + 60 * 60_000) });

  const delivery = await sendFirstAdminClaimEmail({ to: account.email, token });
  return Response.json({ invitationSent: delivery.sent });
}
