-- Add first-class gift categories and stream categories.
-- This migration creates category tables, links gifts/streams optionally,
-- and seeds default enabled categories.
-- No data is deleted.

CREATE TABLE IF NOT EXISTS "gift_categories" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" varchar(80) NOT NULL,
  "slug" varchar(80) NOT NULL UNIQUE,
  "description" varchar(240),
  "sort_order" integer NOT NULL DEFAULT 0,
  "is_enabled" boolean NOT NULL DEFAULT true,
  "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "gift_categories_is_enabled_sort_order_idx"
ON "gift_categories"("is_enabled", "sort_order");

CREATE INDEX IF NOT EXISTS "gift_categories_sort_order_idx"
ON "gift_categories"("sort_order");

CREATE TABLE IF NOT EXISTS "stream_categories" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" varchar(80) NOT NULL,
  "slug" varchar(80) NOT NULL UNIQUE,
  "description" varchar(240),
  "sort_order" integer NOT NULL DEFAULT 0,
  "is_enabled" boolean NOT NULL DEFAULT true,
  "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "stream_categories_is_enabled_sort_order_idx"
ON "stream_categories"("is_enabled", "sort_order");

CREATE INDEX IF NOT EXISTS "stream_categories_sort_order_idx"
ON "stream_categories"("sort_order");

INSERT INTO "gift_categories" ("name", "slug", "description", "sort_order", "is_enabled")
VALUES
  ('Featured', 'featured', 'Default featured gifts.', 0, true),
  ('Popular', 'popular', 'Popular gifts.', 10, true),
  ('Luxury', 'luxury', 'Premium large gifts.', 20, true),
  ('Battle', 'battle', 'Battle-friendly gifts.', 30, true)
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "stream_categories" ("name", "slug", "description", "sort_order", "is_enabled")
VALUES
  ('Chatting', 'chatting', 'General live conversations.', 0, true),
  ('Music', 'music', 'Music streams.', 10, true),
  ('Gaming', 'gaming', 'Gaming streams.', 20, true),
  ('Lifestyle', 'lifestyle', 'Lifestyle streams.', 30, true),
  ('Battles', 'battles', 'PK and battle streams.', 40, true)
ON CONFLICT ("slug") DO NOTHING;

ALTER TABLE "gifts"
ADD COLUMN IF NOT EXISTS "gift_category_id" uuid;

ALTER TABLE "streams"
ADD COLUMN IF NOT EXISTS "stream_category_id" uuid;

UPDATE "gifts"
SET "gift_category_id" = (
  SELECT "id" FROM "gift_categories" WHERE "slug" = 'featured' LIMIT 1
)
WHERE "gift_category_id" IS NULL;

CREATE INDEX IF NOT EXISTS "gifts_gift_category_id_idx"
ON "gifts"("gift_category_id");

CREATE INDEX IF NOT EXISTS "streams_stream_category_id_idx"
ON "streams"("stream_category_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'gifts_gift_category_id_fkey'
  ) THEN
    ALTER TABLE "gifts"
    ADD CONSTRAINT "gifts_gift_category_id_fkey"
    FOREIGN KEY ("gift_category_id") REFERENCES "gift_categories"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'streams_stream_category_id_fkey'
  ) THEN
    ALTER TABLE "streams"
    ADD CONSTRAINT "streams_stream_category_id_fkey"
    FOREIGN KEY ("stream_category_id") REFERENCES "stream_categories"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
