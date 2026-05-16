ALTER TABLE "users"
ADD COLUMN "notification_push_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "notification_live_alerts_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "notification_marketing_enabled" BOOLEAN NOT NULL DEFAULT false;