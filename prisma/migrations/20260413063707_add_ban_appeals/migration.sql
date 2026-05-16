CREATE TYPE "BanAppealStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'APPROVED', 'DENIED');

CREATE TABLE "ban_appeals" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "platform_ban_moderation_action_id" UUID NULL,
  "ban_issued_at_snapshot" TIMESTAMP(3) NULL,
  "ban_expires_at_snapshot" TIMESTAMP(3) NULL,
  "ban_reason_snapshot" VARCHAR(300) NULL,
  "appeal_message" VARCHAR(4000) NOT NULL,
  "contact_note" VARCHAR(500) NULL,
  "status" "BanAppealStatus" NOT NULL DEFAULT 'PENDING',
  "admin_notes" VARCHAR(2000) NULL,
  "decision_notes" VARCHAR(2000) NULL,
  "reviewed_by_admin_user_id" UUID NULL,
  "reviewed_at" TIMESTAMP(3) NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ban_appeals_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ban_appeals_user_id_created_at_idx"
  ON "ban_appeals"("user_id", "created_at");

CREATE INDEX "ban_appeals_status_created_at_idx"
  ON "ban_appeals"("status", "created_at");

CREATE INDEX "ban_appeals_platform_ban_moderation_action_id_idx"
  ON "ban_appeals"("platform_ban_moderation_action_id");

CREATE INDEX "ban_appeals_reviewed_by_admin_user_id_reviewed_at_idx"
  ON "ban_appeals"("reviewed_by_admin_user_id", "reviewed_at");

CREATE UNIQUE INDEX "ban_appeals_one_open_per_ban_action_idx"
  ON "ban_appeals"("platform_ban_moderation_action_id")
  WHERE "platform_ban_moderation_action_id" IS NOT NULL
    AND "status" IN ('PENDING', 'IN_REVIEW');

CREATE UNIQUE INDEX "ban_appeals_one_open_without_ban_action_idx"
  ON "ban_appeals"("user_id")
  WHERE "platform_ban_moderation_action_id" IS NULL
    AND "status" IN ('PENDING', 'IN_REVIEW');

ALTER TABLE "ban_appeals"
  ADD CONSTRAINT "ban_appeals_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ban_appeals"
  ADD CONSTRAINT "ban_appeals_reviewed_by_admin_user_id_fkey"
  FOREIGN KEY ("reviewed_by_admin_user_id") REFERENCES "admin_users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ban_appeals"
  ADD CONSTRAINT "ban_appeals_platform_ban_moderation_action_id_fkey"
  FOREIGN KEY ("platform_ban_moderation_action_id") REFERENCES "moderation_actions"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;