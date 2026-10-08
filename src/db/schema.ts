import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["creator", "brand", "admin"]);
export const creatorStatusEnum = pgEnum("creator_status", [
  "draft",
  "pending_review",
  "changes_requested",
  "approved",
  "hidden",
  "suspended",
  "rejected",
]);
export const platformEnum = pgEnum("social_platform", ["instagram", "tiktok"]);
export const portfolioTypeEnum = pgEnum("portfolio_type", ["image", "video"]);
export const evidenceStatusEnum = pgEnum("evidence_status", ["not_reviewed", "reviewed", "rejected"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "incomplete",
  "trialing",
  "active",
  "past_due",
  "canceled",
  "unpaid",
  "expired",
]);
export const moderationActionEnum = pgEnum("moderation_action", [
  "submitted",
  "approved",
  "changes_requested",
  "rejected",
  "hidden",
  "suspended",
  "ownership_checked",
  "evidence_reviewed",
  "portfolio_approved",
  "role_changed",
  "deletion_requested",
]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: userRoleEnum("role").notNull(),
    displayName: text("display_name").notNull(),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    isActive: boolean("is_active").notNull().default(true),
    deletionRequestedAt: timestamp("deletion_requested_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("users_email_unique").on(table.email), index("users_role_idx").on(table.role)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("sessions_token_hash_unique").on(table.tokenHash), index("sessions_user_idx").on(table.userId)],
);

export const emailVerificationTokens = pgTable(
  "email_verification_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("email_verification_token_unique").on(table.tokenHash)],
);

export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("password_reset_token_unique").on(table.tokenHash)],
);

export const creatorProfiles = pgTable(
  "creator_profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    displayName: text("display_name").notNull(),
    photoUrl: text("photo_url"),
    city: text("city"),
    region: text("region"),
    country: text("country"),
    shortIntro: text("short_intro"),
    biography: text("biography"),
    contentStyle: text("content_style"),
    brandInterests: text("brand_interests"),
    excludedSectors: text("excluded_sectors"),
    languages: text("languages"),
    mainAudienceCountry: text("main_audience_country"),
    audienceSummary: text("audience_summary"),
    status: creatorStatusEnum("status").notNull().default("draft"),
    availability: boolean("availability").notNull().default(true),
    accountOwnershipChecked: boolean("account_ownership_checked").notNull().default(false),
    ownershipCheckedAt: timestamp("ownership_checked_at", { withTimezone: true }),
    isExample: boolean("is_example").notNull().default(false),
    reviewFeedback: text("review_feedback"),
    pendingChanges: jsonb("pending_changes").$type<Record<string, unknown> | null>(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    lastUpdatedAt: timestamp("last_updated_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("creator_profiles_user_unique").on(table.userId),
    uniqueIndex("creator_profiles_slug_unique").on(table.slug),
    index("creator_profiles_status_idx").on(table.status),
    index("creator_profiles_country_idx").on(table.country),
    index("creator_profiles_updated_idx").on(table.lastUpdatedAt),
  ],
);

export const niches = pgTable(
  "niches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    parentId: uuid("parent_id"),
    active: boolean("active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [uniqueIndex("niches_slug_unique").on(table.slug)],
);

export const creatorNiches = pgTable(
  "creator_niches",
  {
    creatorId: uuid("creator_id").notNull().references(() => creatorProfiles.id, { onDelete: "cascade" }),
    nicheId: uuid("niche_id").notNull().references(() => niches.id, { onDelete: "cascade" }),
    isPrimary: boolean("is_primary").notNull().default(false),
  },
  (table) => [primaryKey({ columns: [table.creatorId, table.nicheId] }), index("creator_niches_niche_idx").on(table.nicheId)],
);

export const socialAccounts = pgTable(
  "social_accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    creatorId: uuid("creator_id").notNull().references(() => creatorProfiles.id, { onDelete: "cascade" }),
    platform: platformEnum("platform").notNull(),
    handle: text("handle").notNull(),
    profileUrl: text("profile_url"),
    followerCount: integer("follower_count"),
    accountControlConfirmed: boolean("account_control_confirmed").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("social_creator_platform_unique").on(table.creatorId, table.platform), index("social_followers_idx").on(table.followerCount)],
);

export const portfolioAssets = pgTable(
  "portfolio_assets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    creatorId: uuid("creator_id").notNull().references(() => creatorProfiles.id, { onDelete: "cascade" }),
    type: portfolioTypeEnum("type").notNull(),
    url: text("url").notNull(),
    thumbnailUrl: text("thumbnail_url"),
    altText: text("alt_text").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    approved: boolean("approved").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("portfolio_creator_idx").on(table.creatorId)],
);

export const engagementMetrics = pgTable(
  "engagement_metrics",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    creatorId: uuid("creator_id").notNull().references(() => creatorProfiles.id, { onDelete: "cascade" }),
    platform: platformEnum("platform").notNull(),
    followerCount: integer("follower_count"),
    averageViews: integer("average_views"),
    averageReach: integer("average_reach"),
    engagementRate: numeric("engagement_rate", { precision: 6, scale: 2 }),
    engagementRateBasis: text("engagement_rate_basis"),
    reportingPeriod: text("reporting_period"),
    measuredAt: timestamp("measured_at", { withTimezone: true }),
    audienceLocationSummary: text("audience_location_summary"),
    audienceAgeSummary: text("audience_age_summary"),
    evidencePath: text("evidence_path"),
    evidenceStatus: evidenceStatusEnum("evidence_status").notNull().default("not_reviewed"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("engagement_creator_idx").on(table.creatorId)],
);

export const collaborationPreferences = pgTable(
  "collaboration_preferences",
  {
    creatorId: uuid("creator_id").primaryKey().references(() => creatorProfiles.id, { onDelete: "cascade" }),
    considersGifting: boolean("considers_gifting").notNull().default(false),
    considersPaid: boolean("considers_paid").notNull().default(false),
    formats: text("formats").array().notNull().default([]),
    startingPrices: jsonb("starting_prices").$type<Record<string, number>>().notNull().default({}),
    minimumStartingPrice: integer("minimum_starting_price"),
    typicalTurnaround: text("typical_turnaround"),
    giftingNote: text("gifting_note"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

export const creatorContacts = pgTable(
  "creator_contacts",
  {
    creatorId: uuid("creator_id").primaryKey().references(() => creatorProfiles.id, { onDelete: "cascade" }),
    businessEmail: text("business_email"),
    instagramUrl: text("instagram_url"),
    tiktokUrl: text("tiktok_url"),
    websiteUrl: text("website_url"),
    shareEmail: boolean("share_email").notNull().default(false),
    shareInstagram: boolean("share_instagram").notNull().default(false),
    shareTiktok: boolean("share_tiktok").notNull().default(false),
    shareWebsite: boolean("share_website").notNull().default(false),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

export const brandProfiles = pgTable(
  "brand_profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    businessName: text("business_name").notNull(),
    websiteUrl: text("website_url"),
    country: text("country"),
    contactName: text("contact_name"),
    firstTrialUsedAt: timestamp("first_trial_used_at", { withTimezone: true }),
    pendingCheckoutSessionId: text("pending_checkout_session_id"),
    pendingCheckoutExpiresAt: timestamp("pending_checkout_expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("brand_profiles_user_unique").on(table.userId)],
);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    brandId: uuid("brand_id").notNull().references(() => brandProfiles.id, { onDelete: "cascade" }),
    provider: text("provider").notNull().default("stripe"),
    providerCustomerId: text("provider_customer_id"),
    providerSubscriptionId: text("provider_subscription_id"),
    providerPriceId: text("provider_price_id"),
    status: subscriptionStatusEnum("status").notNull().default("incomplete"),
    trialStartsAt: timestamp("trial_starts_at", { withTimezone: true }),
    trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
    currentPeriodStartsAt: timestamp("current_period_starts_at", { withTimezone: true }),
    currentPeriodEndsAt: timestamp("current_period_ends_at", { withTimezone: true }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    canceledAt: timestamp("canceled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("subscription_provider_id_unique").on(table.providerSubscriptionId),
    index("subscription_brand_idx").on(table.brandId),
    index("subscription_status_idx").on(table.status),
  ],
);

export const savedCreators = pgTable(
  "saved_creators",
  {
    brandId: uuid("brand_id").notNull().references(() => brandProfiles.id, { onDelete: "cascade" }),
    creatorId: uuid("creator_id").notNull().references(() => creatorProfiles.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.brandId, table.creatorId] }), index("saved_creators_brand_idx").on(table.brandId)],
);

export const moderationActions = pgTable(
  "moderation_actions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    creatorId: uuid("creator_id").references(() => creatorProfiles.id, { onDelete: "set null" }),
    adminUserId: uuid("admin_user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
    action: moderationActionEnum("action").notNull(),
    notes: text("notes"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("moderation_creator_idx").on(table.creatorId), index("moderation_admin_idx").on(table.adminUserId)],
);

export const profileReports = pgTable(
  "profile_reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    creatorId: uuid("creator_id").notNull().references(() => creatorProfiles.id, { onDelete: "cascade" }),
    reporterEmail: text("reporter_email"),
    reason: text("reason").notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("reports_creator_idx").on(table.creatorId)],
);

export const billingEvents = pgTable(
  "billing_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    providerEventId: text("provider_event_id").notNull(),
    eventType: text("event_type").notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("billing_event_provider_unique").on(table.providerEventId)],
);

export const supportRequests = pgTable(
  "support_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    topic: text("topic").notNull(),
    message: text("message").notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("support_requests_created_idx").on(table.createdAt)],
);

export const rateLimitEvents = pgTable(
  "rate_limit_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    fingerprint: text("fingerprint").notNull(),
    action: text("action").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("rate_limit_lookup_idx").on(table.fingerprint, table.action, table.createdAt)],
);
