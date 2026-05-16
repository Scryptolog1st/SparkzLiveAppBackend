ALTER TYPE "LedgerEntryType" ADD VALUE IF NOT EXISTS 'ADVERTISEMENT_BOOST_DEBIT';
ALTER TYPE "AdvertisementBillingEventType" ADD VALUE IF NOT EXISTS 'BOOST';

ALTER TABLE "advertisement_settings"
  ADD COLUMN IF NOT EXISTS "boost_enabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "boost_duration_hours" INTEGER NOT NULL DEFAULT 24,
  ADD COLUMN IF NOT EXISTS "boost_diamond_price" INTEGER NOT NULL DEFAULT 100;

ALTER TABLE "advertisements"
  ADD COLUMN IF NOT EXISTS "boosted_until" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "last_boosted_at" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "advertisements_status_boosted_until_idx"
  ON "advertisements"("status", "boosted_until");
