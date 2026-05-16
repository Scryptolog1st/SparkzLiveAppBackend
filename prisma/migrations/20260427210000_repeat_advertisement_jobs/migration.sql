ALTER TABLE "advertisement_jobs"
  ADD COLUMN IF NOT EXISTS "request_sequence" INTEGER NOT NULL DEFAULT 1;

DROP INDEX IF EXISTS "advertisement_jobs_ad_conversation_customer_key";
DROP INDEX IF EXISTS "advertisement_jobs_advertisement_id_conversation_id_customer_user_id_key";

CREATE UNIQUE INDEX IF NOT EXISTS "advertisement_jobs_ad_conversation_customer_sequence_key"
  ON "advertisement_jobs"("advertisement_id", "conversation_id", "customer_user_id", "request_sequence");

CREATE INDEX IF NOT EXISTS "advertisement_jobs_ad_conversation_customer_status_idx"
  ON "advertisement_jobs"("advertisement_id", "conversation_id", "customer_user_id", "status");
