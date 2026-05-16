ALTER TABLE "advertisement_settings"
  ADD COLUMN IF NOT EXISTS "promo_free_ad_creation" BOOLEAN NOT NULL DEFAULT false;
