import { z } from "zod";

const email = z.string().trim().toLowerCase().email("Enter a valid email address").max(254);
const password = z.string().min(8, "Use at least 8 characters").max(72).regex(/[a-zA-Z]/, "Include a letter").regex(/[0-9]/, "Include a number");

export const signupSchema = z.object({
  email,
  password,
  displayName: z.string().trim().min(2).max(80),
  role: z.enum(["creator", "brand"]),
  businessName: z.string().trim().max(120).optional(),
  over18: z.literal("on").optional(),
  terms: z.literal("on"),
});

export const loginSchema = z.object({ email, password: z.string().min(1).max(72) });
export const forgotPasswordSchema = z.object({ email });
export const resetPasswordSchema = z.object({ token: z.string().min(32).max(200), password });

export const creatorProfileSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  photoUrl: z.string().trim().url().or(z.literal("")),
  city: z.string().trim().max(80),
  region: z.string().trim().max(80),
  country: z.string().trim().min(2).max(80),
  shortIntro: z.string().trim().min(20).max(220),
  biography: z.string().trim().min(50).max(2500),
  contentStyle: z.string().trim().max(800),
  brandInterests: z.string().trim().max(800),
  excludedSectors: z.string().trim().max(500),
  languages: z.string().trim().max(200),
  mainAudienceCountry: z.string().trim().max(80),
  audienceSummary: z.string().trim().max(500),
  instagramHandle: z.string().trim().max(80),
  instagramFollowers: z.coerce.number().int().min(0).max(1_000_000_000).optional(),
  tiktokHandle: z.string().trim().max(80),
  tiktokFollowers: z.coerce.number().int().min(0).max(1_000_000_000).optional(),
  considersGifting: z.boolean(),
  considersPaid: z.boolean(),
  availability: z.boolean(),
  formats: z.array(z.enum(["Photos", "Stories", "Instagram Reels", "TikToks", "Brand-owned content"])),
  minimumStartingPrice: z.coerce.number().int().min(0).max(10_000_00).optional(),
  typicalTurnaround: z.string().trim().max(100),
  businessEmail: email.or(z.literal("")),
  websiteUrl: z.string().trim().url().or(z.literal("")),
  shareEmail: z.boolean(),
  shareInstagram: z.boolean(),
  shareTiktok: z.boolean(),
  shareWebsite: z.boolean(),
  nicheSlugs: z.array(z.string().max(60)).min(1).max(5),
  rightsConfirmed: z.literal(true),
  accountControlConfirmed: z.literal(true),
  visibilityConfirmed: z.literal(true),
});

export const reportSchema = z.object({
  creatorId: z.string().uuid(),
  email: email.optional().or(z.literal("")),
  reason: z.string().trim().min(10).max(1000),
});

export function firstZodError(error: z.ZodError) {
  return error.issues[0]?.message || "Please check the form and try again";
}
