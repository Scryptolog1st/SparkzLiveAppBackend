-- In-app alerts system.
-- This migration is applied by the normal docker compose deployment.
-- DO NOT run Prisma CLI commands in this patch.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InAppAlertStatus') THEN
    CREATE TYPE "InAppAlertStatus" AS ENUM ('DRAFT', 'ACTIVE', 'DISABLED', 'EXPIRED');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InAppAlertCadence') THEN
    CREATE TYPE "InAppAlertCadence" AS ENUM (
      'ONCE_EVER',
      'ONCE_DAILY',
      'EVERY_APP_START',
      'CRON',
      'EVENT_TRIGGERED',
      'EVENT_ONCE'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InAppAlertDeliveryAction') THEN
    CREATE TYPE "InAppAlertDeliveryAction" AS ENUM ('SHOWN', 'ACKNOWLEDGED', 'DISMISSED');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "in_app_alerts" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "title" VARCHAR(140) NOT NULL,
  "body" TEXT NOT NULL,
  "footer_text" VARCHAR(500),
  "confirm_button_label" VARCHAR(60) NOT NULL DEFAULT 'OK',
  "status" "InAppAlertStatus" NOT NULL DEFAULT 'DRAFT',
  "priority" INTEGER NOT NULL DEFAULT 0,
  "start_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "end_at" TIMESTAMPTZ,
  "cadence" "InAppAlertCadence" NOT NULL DEFAULT 'ONCE_EVER',
  "cron_expression" VARCHAR(120),
  "event_trigger_key" VARCHAR(120),
  "target_all_users" BOOLEAN NOT NULL DEFAULT TRUE,
  "target_roles" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "target_user_ids" UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  "target_platforms" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "min_app_version" VARCHAR(40),
  "max_app_version" VARCHAR(40),
  "metadata_json" JSONB,
  "created_by_admin_user_id" UUID,
  "updated_by_admin_user_id" UUID,
  "deleted_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "in_app_alerts_end_after_start_chk"
    CHECK ("end_at" IS NULL OR "end_at" >= "start_at"),
  CONSTRAINT "in_app_alerts_created_by_admin_fk"
    FOREIGN KEY ("created_by_admin_user_id")
    REFERENCES "admin_users"("id")
    ON DELETE SET NULL,
  CONSTRAINT "in_app_alerts_updated_by_admin_fk"
    FOREIGN KEY ("updated_by_admin_user_id")
    REFERENCES "admin_users"("id")
    ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS "in_app_alert_deliveries" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "alert_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "event_trigger_key" VARCHAR(120),
  "first_shown_at" TIMESTAMPTZ,
  "last_shown_at" TIMESTAMPTZ,
  "impression_count" INTEGER NOT NULL DEFAULT 0,
  "acknowledged_at" TIMESTAMPTZ,
  "dismissed_at" TIMESTAMPTZ,
  "last_action" "InAppAlertDeliveryAction",
  "metadata_json" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "in_app_alert_deliveries_alert_fk"
    FOREIGN KEY ("alert_id")
    REFERENCES "in_app_alerts"("id")
    ON DELETE CASCADE,
  CONSTRAINT "in_app_alert_deliveries_user_fk"
    FOREIGN KEY ("user_id")
    REFERENCES "users"("id")
    ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "in_app_alert_deliveries_alert_user_uidx"
  ON "in_app_alert_deliveries" ("alert_id", "user_id");

CREATE INDEX IF NOT EXISTS "in_app_alerts_status_window_idx"
  ON "in_app_alerts" ("status", "start_at", "end_at")
  WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "in_app_alerts_event_trigger_idx"
  ON "in_app_alerts" ("event_trigger_key", "status", "priority")
  WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "in_app_alerts_priority_idx"
  ON "in_app_alerts" ("priority" DESC, "created_at" DESC)
  WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "in_app_alert_deliveries_user_last_shown_idx"
  ON "in_app_alert_deliveries" ("user_id", "last_shown_at");

CREATE INDEX IF NOT EXISTS "in_app_alert_deliveries_alert_ack_idx"
  ON "in_app_alert_deliveries" ("alert_id", "acknowledged_at");

CREATE INDEX IF NOT EXISTS "in_app_alert_deliveries_alert_dismiss_idx"
  ON "in_app_alert_deliveries" ("alert_id", "dismissed_at");
