CREATE TYPE "PushPlatform" AS ENUM ('ANDROID', 'IOS', 'UNKNOWN');

CREATE TABLE "push_device_tokens" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "expo_push_token" TEXT NOT NULL,
  "platform" "PushPlatform" NOT NULL DEFAULT 'UNKNOWN',
  "device_id" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "last_registered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_sent_at" TIMESTAMP(3),
  "last_error" TEXT,
  "disabled_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "push_device_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "push_device_tokens_expo_push_token_key"
  ON "push_device_tokens"("expo_push_token");

CREATE INDEX "push_device_tokens_user_id_is_active_idx"
  ON "push_device_tokens"("user_id", "is_active");

CREATE INDEX "push_device_tokens_user_id_platform_idx"
  ON "push_device_tokens"("user_id", "platform");

ALTER TABLE "push_device_tokens"
  ADD CONSTRAINT "push_device_tokens_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;