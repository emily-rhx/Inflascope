BEGIN;

CREATE TYPE "user_role" AS ENUM ('creator', 'brand', 'admin');
CREATE TYPE "creator_status" AS ENUM ('draft', 'pending_review', 'changes_requested', 'approved', 'hidden', 'suspended', 'rejected');
CREATE TYPE "social_platform" AS ENUM ('instagram', 'tiktok');
CREATE TYPE "portfolio_type" AS ENUM ('image', 'video');
CREATE TYPE "evidence_status" AS ENUM ('not_reviewed', 'reviewed', 'rejected');
CREATE TYPE "subscription_status" AS ENUM ('incomplete', 'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'expired');
CREATE TYPE "moderation_action" AS ENUM ('submitted', 'approved', 'changes_requested', 'rejected', 'hidden', 'suspended', 'ownership_checked', 'evidence_reviewed', 'portfolio_approved', 'role_changed', 'deletion_requested');

CREATE TABLE "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email" text NOT NULL,
  "password_hash" text NOT NULL,
  "role" "user_role" NOT NULL,
  "display_name" text NOT NULL,
  "email_verified_at" timestamp with time zone,
  "is_active" boolean DEFAULT true NOT NULL,
  "deletion_requested_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "token_hash" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "email_verification_tokens" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "token_hash" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "used_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "password_reset_tokens" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "token_hash" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "used_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "creator_profiles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "slug" text NOT NULL,
  "display_name" text NOT NULL,
  "photo_url" text,
  "city" text,
  "region" text,
  "country" text,
  "short_intro" text,
  "biography" text,
  "content_style" text,
  "brand_interests" text,
  "excluded_sectors" text,
  "languages" text,
  "main_audience_country" text,
  "audience_summary" text,
  "status" "creator_status" DEFAULT 'draft' NOT NULL,
  "availability" boolean DEFAULT true NOT NULL,
  "account_ownership_checked" boolean DEFAULT false NOT NULL,
  "ownership_checked_at" timestamp with time zone,
  "is_example" boolean DEFAULT false NOT NULL,
  "review_feedback" text,
  "pending_changes" jsonb,
  "submitted_at" timestamp with time zone,
  "approved_at" timestamp with time zone,
  "last_updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "niches" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "parent_id" uuid,
  "active" boolean DEFAULT true NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL
);

CREATE TABLE "creator_niches" (
  "creator_id" uuid NOT NULL,
  "niche_id" uuid NOT NULL,
  "is_primary" boolean DEFAULT false NOT NULL,
  CONSTRAINT "creator_niches_creator_id_niche_id_pk" PRIMARY KEY ("creator_id", "niche_id")
);

CREATE TABLE "social_accounts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "creator_id" uuid NOT NULL,
  "platform" "social_platform" NOT NULL,
  "handle" text NOT NULL,
  "profile_url" text,
  "follower_count" integer,
  "account_control_confirmed" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "portfolio_assets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "creator_id" uuid NOT NULL,
  "type" "portfolio_type" NOT NULL,
  "url" text NOT NULL,
  "thumbnail_url" text,
  "alt_text" text NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "approved" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "engagement_metrics" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "creator_id" uuid NOT NULL,
  "platform" "social_platform" NOT NULL,
  "follower_count" integer,
  "average_views" integer,
  "average_reach" integer,
  "engagement_rate" numeric(6,2),
  "engagement_rate_basis" text,
  "reporting_period" text,
  "measured_at" timestamp with time zone,
  "audience_location_summary" text,
  "audience_age_summary" text,
  "evidence_path" text,
  "evidence_status" "evidence_status" DEFAULT 'not_reviewed' NOT NULL,
  "reviewed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "collaboration_preferences" (
  "creator_id" uuid PRIMARY KEY NOT NULL,
  "considers_gifting" boolean DEFAULT false NOT NULL,
  "considers_paid" boolean DEFAULT false NOT NULL,
  "formats" text[] DEFAULT '{}' NOT NULL,
  "starting_prices" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "minimum_starting_price" integer,
  "typical_turnaround" text,
  "gifting_note" text,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "creator_contacts" (
  "creator_id" uuid PRIMARY KEY NOT NULL,
  "business_email" text,
  "instagram_url" text,
  "tiktok_url" text,
  "website_url" text,
  "share_email" boolean DEFAULT false NOT NULL,
  "share_instagram" boolean DEFAULT false NOT NULL,
  "share_tiktok" boolean DEFAULT false NOT NULL,
  "share_website" boolean DEFAULT false NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "brand_profiles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "business_name" text NOT NULL,
  "website_url" text,
  "country" text,
  "contact_name" text,
  "first_trial_used_at" timestamp with time zone,
  "pending_checkout_session_id" text,
  "pending_checkout_expires_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "subscriptions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "brand_id" uuid NOT NULL,
  "provider" text DEFAULT 'stripe' NOT NULL,
  "provider_customer_id" text,
  "provider_subscription_id" text,
  "provider_price_id" text,
  "status" "subscription_status" DEFAULT 'incomplete' NOT NULL,
  "trial_starts_at" timestamp with time zone,
  "trial_ends_at" timestamp with time zone,
  "current_period_starts_at" timestamp with time zone,
  "current_period_ends_at" timestamp with time zone,
  "cancel_at_period_end" boolean DEFAULT false NOT NULL,
  "canceled_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "saved_creators" (
  "brand_id" uuid NOT NULL,
  "creator_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "saved_creators_brand_id_creator_id_pk" PRIMARY KEY ("brand_id", "creator_id")
);

CREATE TABLE "moderation_actions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "creator_id" uuid,
  "admin_user_id" uuid NOT NULL,
  "action" "moderation_action" NOT NULL,
  "notes" text,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "profile_reports" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "creator_id" uuid NOT NULL,
  "reporter_email" text,
  "reason" text NOT NULL,
  "resolved_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "billing_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "provider_event_id" text NOT NULL,
  "event_type" text NOT NULL,
  "processed_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "support_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid,
  "name" text NOT NULL,
  "email" text NOT NULL,
  "topic" text NOT NULL,
  "message" text NOT NULL,
  "resolved_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "rate_limit_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "fingerprint" text NOT NULL,
  "action" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade;
ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade;
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade;
ALTER TABLE "creator_profiles" ADD CONSTRAINT "creator_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade;
ALTER TABLE "creator_niches" ADD CONSTRAINT "creator_niches_creator_id_creator_profiles_id_fk" FOREIGN KEY ("creator_id") REFERENCES "creator_profiles"("id") ON DELETE cascade;
ALTER TABLE "creator_niches" ADD CONSTRAINT "creator_niches_niche_id_niches_id_fk" FOREIGN KEY ("niche_id") REFERENCES "niches"("id") ON DELETE cascade;
ALTER TABLE "social_accounts" ADD CONSTRAINT "social_accounts_creator_id_creator_profiles_id_fk" FOREIGN KEY ("creator_id") REFERENCES "creator_profiles"("id") ON DELETE cascade;
ALTER TABLE "portfolio_assets" ADD CONSTRAINT "portfolio_assets_creator_id_creator_profiles_id_fk" FOREIGN KEY ("creator_id") REFERENCES "creator_profiles"("id") ON DELETE cascade;
ALTER TABLE "engagement_metrics" ADD CONSTRAINT "engagement_metrics_creator_id_creator_profiles_id_fk" FOREIGN KEY ("creator_id") REFERENCES "creator_profiles"("id") ON DELETE cascade;
ALTER TABLE "collaboration_preferences" ADD CONSTRAINT "collaboration_preferences_creator_id_creator_profiles_id_fk" FOREIGN KEY ("creator_id") REFERENCES "creator_profiles"("id") ON DELETE cascade;
ALTER TABLE "creator_contacts" ADD CONSTRAINT "creator_contacts_creator_id_creator_profiles_id_fk" FOREIGN KEY ("creator_id") REFERENCES "creator_profiles"("id") ON DELETE cascade;
ALTER TABLE "brand_profiles" ADD CONSTRAINT "brand_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade;
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_brand_id_brand_profiles_id_fk" FOREIGN KEY ("brand_id") REFERENCES "brand_profiles"("id") ON DELETE cascade;
ALTER TABLE "saved_creators" ADD CONSTRAINT "saved_creators_brand_id_brand_profiles_id_fk" FOREIGN KEY ("brand_id") REFERENCES "brand_profiles"("id") ON DELETE cascade;
ALTER TABLE "saved_creators" ADD CONSTRAINT "saved_creators_creator_id_creator_profiles_id_fk" FOREIGN KEY ("creator_id") REFERENCES "creator_profiles"("id") ON DELETE cascade;
ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_creator_id_creator_profiles_id_fk" FOREIGN KEY ("creator_id") REFERENCES "creator_profiles"("id") ON DELETE set null;
ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_admin_user_id_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "users"("id") ON DELETE restrict;
ALTER TABLE "profile_reports" ADD CONSTRAINT "profile_reports_creator_id_creator_profiles_id_fk" FOREIGN KEY ("creator_id") REFERENCES "creator_profiles"("id") ON DELETE cascade;
ALTER TABLE "support_requests" ADD CONSTRAINT "support_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE set null;

CREATE UNIQUE INDEX "users_email_unique" ON "users" ("email");
CREATE INDEX "users_role_idx" ON "users" ("role");
CREATE UNIQUE INDEX "sessions_token_hash_unique" ON "sessions" ("token_hash");
CREATE INDEX "sessions_user_idx" ON "sessions" ("user_id");
CREATE UNIQUE INDEX "email_verification_token_unique" ON "email_verification_tokens" ("token_hash");
CREATE UNIQUE INDEX "password_reset_token_unique" ON "password_reset_tokens" ("token_hash");
CREATE UNIQUE INDEX "creator_profiles_user_unique" ON "creator_profiles" ("user_id");
CREATE UNIQUE INDEX "creator_profiles_slug_unique" ON "creator_profiles" ("slug");
CREATE INDEX "creator_profiles_status_idx" ON "creator_profiles" ("status");
CREATE INDEX "creator_profiles_country_idx" ON "creator_profiles" ("country");
CREATE INDEX "creator_profiles_updated_idx" ON "creator_profiles" ("last_updated_at");
CREATE UNIQUE INDEX "niches_slug_unique" ON "niches" ("slug");
CREATE INDEX "creator_niches_niche_idx" ON "creator_niches" ("niche_id");
CREATE UNIQUE INDEX "social_creator_platform_unique" ON "social_accounts" ("creator_id", "platform");
CREATE INDEX "social_followers_idx" ON "social_accounts" ("follower_count");
CREATE INDEX "portfolio_creator_idx" ON "portfolio_assets" ("creator_id");
CREATE INDEX "engagement_creator_idx" ON "engagement_metrics" ("creator_id");
CREATE UNIQUE INDEX "brand_profiles_user_unique" ON "brand_profiles" ("user_id");
CREATE UNIQUE INDEX "subscription_provider_id_unique" ON "subscriptions" ("provider_subscription_id");
CREATE INDEX "subscription_brand_idx" ON "subscriptions" ("brand_id");
CREATE INDEX "subscription_status_idx" ON "subscriptions" ("status");
CREATE INDEX "saved_creators_brand_idx" ON "saved_creators" ("brand_id");
CREATE INDEX "moderation_creator_idx" ON "moderation_actions" ("creator_id");
CREATE INDEX "moderation_admin_idx" ON "moderation_actions" ("admin_user_id");
CREATE INDEX "reports_creator_idx" ON "profile_reports" ("creator_id");
CREATE UNIQUE INDEX "billing_event_provider_unique" ON "billing_events" ("provider_event_id");
CREATE INDEX "support_requests_created_idx" ON "support_requests" ("created_at");
CREATE INDEX "rate_limit_lookup_idx" ON "rate_limit_events" ("fingerprint", "action", "created_at");

COMMIT;
