DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BadgeStatus') THEN
    CREATE TYPE "BadgeStatus" AS ENUM ('DRAFT', 'ACTIVE', 'DISABLED');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "badges" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" VARCHAR(120) NOT NULL,
  "slug" VARCHAR(140) NOT NULL,
  "description" VARCHAR(1000),
  "asset_url" VARCHAR(1000),
  "asset_mime_type" VARCHAR(255),
  "asset_original_name" VARCHAR(255),
  "asset_size" INTEGER,
  "status" "BadgeStatus" NOT NULL DEFAULT 'DRAFT',
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "characteristics_json" JSONB,
  "metadata_json" JSONB,
  "created_by_admin_user_id" UUID,
  "updated_by_admin_user_id" UUID,
  "deleted_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "badges_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "badges_slug_key" ON "badges"("slug");
CREATE INDEX IF NOT EXISTS "badges_status_sort_order_idx" ON "badges"("status", "sort_order");
CREATE INDEX IF NOT EXISTS "badges_deleted_at_idx" ON "badges"("deleted_at");

CREATE TABLE IF NOT EXISTS "user_badges" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "badge_id" UUID NOT NULL,
  "assigned_by_admin_user_id" UUID,
  "revoked_by_admin_user_id" UUID,
  "starts_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMP(3),
  "revoked_at" TIMESTAMP(3),
  "revoked_reason" VARCHAR(500),
  "note" VARCHAR(500),
  "metadata_json" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_badges_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "user_badges_user_id_starts_at_idx" ON "user_badges"("user_id", "starts_at");
CREATE INDEX IF NOT EXISTS "user_badges_badge_id_idx" ON "user_badges"("badge_id");
CREATE INDEX IF NOT EXISTS "user_badges_revoked_at_idx" ON "user_badges"("revoked_at");
CREATE INDEX IF NOT EXISTS "user_badges_expires_at_idx" ON "user_badges"("expires_at");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_badges_user_id_fkey'
  ) THEN
    ALTER TABLE "user_badges"
    ADD CONSTRAINT "user_badges_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_badges_badge_id_fkey'
  ) THEN
    ALTER TABLE "user_badges"
    ADD CONSTRAINT "user_badges_badge_id_fkey"
    FOREIGN KEY ("badge_id") REFERENCES "badges"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

INSERT INTO "admin_role_permissions" ("role", "permission", "enabled", "created_at", "updated_at")
VALUES
  ('SUPER_ADMIN', 'user_badges.view', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('SUPER_ADMIN', 'user_badges.manage', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('ADMIN', 'user_badges.view', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('ADMIN', 'user_badges.manage', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('ANALYST', 'user_badges.view', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("role", "permission") DO UPDATE
SET "enabled" = EXCLUDED."enabled",
    "updated_at" = CURRENT_TIMESTAMP;
