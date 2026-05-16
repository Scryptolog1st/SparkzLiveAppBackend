-- Migration: add advertisements, revisions, media, settings, and billing events
-- Folder:
-- prisma/migrations/20260427003000_add_advertisements/migration.sql

ALTER TYPE "LedgerEntryType" ADD VALUE IF NOT EXISTS 'ADVERTISEMENT_DEBIT';
ALTER TYPE "LedgerEntryType" ADD VALUE IF NOT EXISTS 'ADVERTISEMENT_RENEWAL_DEBIT';
ALTER TYPE "LedgerEntryType" ADD VALUE IF NOT EXISTS 'ADVERTISEMENT_REVERSAL';

DO $$ BEGIN
  CREATE TYPE "AdvertisementStatus" AS ENUM (
    'DRAFT',
    'PENDING_REVIEW',
    'DENIED',
    'LIVE',
    'CANCELLED_ENDING',
    'INACTIVE',
    'EXPIRED',
    'PAYMENT_FAILED',
    'ADMIN_PAUSED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "AdvertisementRevisionStatus" AS ENUM (
    'PENDING_REVIEW',
    'APPROVED',
    'DENIED',
    'SUPERSEDED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "AdvertisementMediaType" AS ENUM (
    'IMAGE',
    'VIDEO'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "AdvertisementPaymentCurrency" AS ENUM (
    'DIAMONDS',
    'COINS'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "AdvertisementBillingEventType" AS ENUM (
    'INITIAL_CHARGE',
    'RENEWAL',
    'REPUBLISH',
    'RETRY_PAYMENT',
    'REFUND',
    'ADMIN_ADJUSTMENT'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "AdvertisementBillingEventStatus" AS ENUM (
    'SUCCEEDED',
    'FAILED',
    'SKIPPED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "advertisement_settings" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "monthly_diamond_price" INTEGER NOT NULL DEFAULT 250,
  "coin_to_diamond_rate" INTEGER NOT NULL DEFAULT 2,
  "allowed_duration_options" TEXT[] NOT NULL DEFAULT ARRAY['1','3','6','12','ONGOING']::TEXT[],
  "allowed_payment_currencies" TEXT[] NOT NULL DEFAULT ARRAY['DIAMONDS','COINS']::TEXT[],
  "rules" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "max_media_items" INTEGER NOT NULL DEFAULT 8,
  "max_video_seconds" INTEGER NOT NULL DEFAULT 30,
  "max_title_length" INTEGER NOT NULL DEFAULT 90,
  "max_short_description_length" INTEGER NOT NULL DEFAULT 180,
  "max_description_length" INTEGER NOT NULL DEFAULT 1600,
  "max_service_details_length" INTEGER NOT NULL DEFAULT 1600,
  "updated_by_admin_user_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "advertisement_settings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "advertisements" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "owner_user_id" UUID NOT NULL,
  "status" "AdvertisementStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
  "current_revision_id" UUID,
  "latest_submitted_revision_id" UUID,
  "payment_currency" "AdvertisementPaymentCurrency" NOT NULL DEFAULT 'DIAMONDS',
  "monthly_diamond_price" INTEGER NOT NULL DEFAULT 250,
  "monthly_coin_price" INTEGER NOT NULL DEFAULT 500,
  "requested_duration_cycles" INTEGER,
  "remaining_cycles" INTEGER,
  "billing_anchor_day" INTEGER,
  "current_cycle_started_at" TIMESTAMP(3),
  "current_cycle_ends_at" TIMESTAMP(3),
  "next_billing_at" TIMESTAMP(3),
  "last_billed_at" TIMESTAMP(3),
  "cancel_at_cycle_end" BOOLEAN NOT NULL DEFAULT false,
  "cancelled_at" TIMESTAMP(3),
  "admin_paused_at" TIMESTAMP(3),
  "admin_paused_by_admin_user_id" UUID,
  "admin_pause_reason" VARCHAR(500),
  "latest_denial_reason" VARCHAR(1000),
  "last_payment_failure_reason" VARCHAR(1000),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "advertisements_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "advertisement_revisions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "advertisement_id" UUID NOT NULL,
  "submitted_by_user_id" UUID NOT NULL,
  "reviewed_by_admin_user_id" UUID,
  "status" "AdvertisementRevisionStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
  "version" INTEGER NOT NULL DEFAULT 1,
  "title" VARCHAR(90) NOT NULL,
  "category" VARCHAR(80) NOT NULL,
  "short_description" VARCHAR(180) NOT NULL,
  "description" VARCHAR(1600) NOT NULL,
  "service_details" VARCHAR(1600),
  "contact_label" VARCHAR(80),
  "contact_url" VARCHAR(1000),
  "denial_reason" VARCHAR(1000),
  "reviewed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "advertisement_revisions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "advertisement_media" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "revision_id" UUID NOT NULL,
  "media_type" "AdvertisementMediaType" NOT NULL,
  "url" VARCHAR(1000) NOT NULL,
  "thumbnail_url" VARCHAR(1000),
  "storage_key" VARCHAR(1000),
  "original_file_name" VARCHAR(255),
  "mime_type" VARCHAR(120),
  "size_bytes" INTEGER,
  "duration_seconds" INTEGER,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_cover" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "advertisement_media_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "advertisement_billing_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "advertisement_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "event_type" "AdvertisementBillingEventType" NOT NULL,
  "status" "AdvertisementBillingEventStatus" NOT NULL,
  "payment_currency" "AdvertisementPaymentCurrency" NOT NULL,
  "diamond_amount" INTEGER NOT NULL DEFAULT 0,
  "coin_amount" INTEGER NOT NULL DEFAULT 0,
  "wallet_ledger_id" UUID,
  "failure_reason" VARCHAR(1000),
  "billing_cycle_started_at" TIMESTAMP(3),
  "billing_cycle_ends_at" TIMESTAMP(3),
  "metadata_json" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "advertisement_billing_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "advertisements_owner_status_idx" ON "advertisements"("owner_user_id", "status");
CREATE INDEX IF NOT EXISTS "advertisements_status_next_billing_idx" ON "advertisements"("status", "next_billing_at");
CREATE INDEX IF NOT EXISTS "advertisements_status_cycle_end_idx" ON "advertisements"("status", "current_cycle_ends_at");
CREATE INDEX IF NOT EXISTS "advertisements_current_revision_idx" ON "advertisements"("current_revision_id");
CREATE INDEX IF NOT EXISTS "advertisements_latest_submitted_revision_idx" ON "advertisements"("latest_submitted_revision_id");
CREATE INDEX IF NOT EXISTS "advertisement_revisions_ad_status_idx" ON "advertisement_revisions"("advertisement_id", "status");
CREATE INDEX IF NOT EXISTS "advertisement_revisions_status_created_idx" ON "advertisement_revisions"("status", "created_at");
CREATE INDEX IF NOT EXISTS "advertisement_revisions_submitted_by_idx" ON "advertisement_revisions"("submitted_by_user_id", "created_at");
CREATE INDEX IF NOT EXISTS "advertisement_media_revision_sort_idx" ON "advertisement_media"("revision_id", "sort_order");
CREATE INDEX IF NOT EXISTS "advertisement_billing_events_ad_created_idx" ON "advertisement_billing_events"("advertisement_id", "created_at");
CREATE INDEX IF NOT EXISTS "advertisement_billing_events_user_created_idx" ON "advertisement_billing_events"("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "advertisement_billing_events_wallet_ledger_idx" ON "advertisement_billing_events"("wallet_ledger_id");

ALTER TABLE "advertisements"
  ADD CONSTRAINT "advertisements_owner_user_id_fkey"
  FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "advertisements"
  ADD CONSTRAINT "advertisements_admin_paused_by_admin_user_id_fkey"
  FOREIGN KEY ("admin_paused_by_admin_user_id") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "advertisement_revisions"
  ADD CONSTRAINT "advertisement_revisions_advertisement_id_fkey"
  FOREIGN KEY ("advertisement_id") REFERENCES "advertisements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "advertisement_revisions"
  ADD CONSTRAINT "advertisement_revisions_submitted_by_user_id_fkey"
  FOREIGN KEY ("submitted_by_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "advertisement_revisions"
  ADD CONSTRAINT "advertisement_revisions_reviewed_by_admin_user_id_fkey"
  FOREIGN KEY ("reviewed_by_admin_user_id") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "advertisement_media"
  ADD CONSTRAINT "advertisement_media_revision_id_fkey"
  FOREIGN KEY ("revision_id") REFERENCES "advertisement_revisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "advertisement_billing_events"
  ADD CONSTRAINT "advertisement_billing_events_advertisement_id_fkey"
  FOREIGN KEY ("advertisement_id") REFERENCES "advertisements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "advertisement_billing_events"
  ADD CONSTRAINT "advertisement_billing_events_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "advertisement_billing_events"
  ADD CONSTRAINT "advertisement_billing_events_wallet_ledger_id_fkey"
  FOREIGN KEY ("wallet_ledger_id") REFERENCES "wallet_ledger"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "advertisement_settings" ("id")
VALUES ('default')
ON CONFLICT ("id") DO NOTHING;
