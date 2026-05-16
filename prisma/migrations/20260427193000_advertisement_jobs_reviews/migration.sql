CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
  CREATE TYPE "AdvertisementJobStatus" AS ENUM (
    'INQUIRY_OPEN',
    'DECLINED',
    'IN_PROGRESS',
    'SELLER_MARKED_COMPLETE',
    'COMPLETED',
    'CANCELLED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "advertisement_jobs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "advertisement_id" UUID NOT NULL,
  "conversation_id" UUID NOT NULL,
  "advertiser_user_id" UUID NOT NULL,
  "customer_user_id" UUID NOT NULL,
  "status" "AdvertisementJobStatus" NOT NULL DEFAULT 'INQUIRY_OPEN',
  "inquiry_message" VARCHAR(1000),
  "accepted_at" TIMESTAMP(3),
  "declined_at" TIMESTAMP(3),
  "advertiser_marked_complete_at" TIMESTAMP(3),
  "customer_approved_at" TIMESTAMP(3),
  "customer_declined_completion_at" TIMESTAMP(3),
  "completion_decline_reason" VARCHAR(1000),
  "completed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "advertisement_jobs_advertisement_id_fkey"
    FOREIGN KEY ("advertisement_id") REFERENCES "advertisements"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "advertisement_jobs_conversation_id_fkey"
    FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "advertisement_jobs_advertiser_user_id_fkey"
    FOREIGN KEY ("advertiser_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "advertisement_jobs_customer_user_id_fkey"
    FOREIGN KEY ("customer_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "advertisement_jobs_ad_conversation_customer_key"
  ON "advertisement_jobs"("advertisement_id", "conversation_id", "customer_user_id");

CREATE INDEX IF NOT EXISTS "advertisement_jobs_advertisement_status_updated_idx"
  ON "advertisement_jobs"("advertisement_id", "status", "updated_at");

CREATE INDEX IF NOT EXISTS "advertisement_jobs_advertiser_status_updated_idx"
  ON "advertisement_jobs"("advertiser_user_id", "status", "updated_at");

CREATE INDEX IF NOT EXISTS "advertisement_jobs_customer_status_updated_idx"
  ON "advertisement_jobs"("customer_user_id", "status", "updated_at");

CREATE INDEX IF NOT EXISTS "advertisement_jobs_conversation_idx"
  ON "advertisement_jobs"("conversation_id");

CREATE TABLE IF NOT EXISTS "advertisement_reviews" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "job_id" UUID NOT NULL,
  "advertisement_id" UUID NOT NULL,
  "advertiser_user_id" UUID NOT NULL,
  "reviewer_user_id" UUID NOT NULL,
  "stars" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "advertisement_reviews_job_id_fkey"
    FOREIGN KEY ("job_id") REFERENCES "advertisement_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "advertisement_reviews_advertisement_id_fkey"
    FOREIGN KEY ("advertisement_id") REFERENCES "advertisements"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "advertisement_reviews_advertiser_user_id_fkey"
    FOREIGN KEY ("advertiser_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "advertisement_reviews_reviewer_user_id_fkey"
    FOREIGN KEY ("reviewer_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "advertisement_reviews_stars_check"
    CHECK ("stars" >= 1 AND "stars" <= 5)
);

CREATE UNIQUE INDEX IF NOT EXISTS "advertisement_reviews_job_id_key"
  ON "advertisement_reviews"("job_id");

CREATE UNIQUE INDEX IF NOT EXISTS "advertisement_reviews_job_reviewer_key"
  ON "advertisement_reviews"("job_id", "reviewer_user_id");

CREATE INDEX IF NOT EXISTS "advertisement_reviews_advertisement_created_idx"
  ON "advertisement_reviews"("advertisement_id", "created_at");

CREATE INDEX IF NOT EXISTS "advertisement_reviews_advertiser_created_idx"
  ON "advertisement_reviews"("advertiser_user_id", "created_at");

CREATE INDEX IF NOT EXISTS "advertisement_reviews_reviewer_created_idx"
  ON "advertisement_reviews"("reviewer_user_id", "created_at");
