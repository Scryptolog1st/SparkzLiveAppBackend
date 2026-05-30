ALTER TABLE "streams"
ADD COLUMN "active_publisher_user_id" UUID,
ADD COLUMN "active_publisher_device_id" VARCHAR(120),
ADD COLUMN "active_publisher_identity" VARCHAR(255),
ADD COLUMN "active_publisher_session_id" VARCHAR(160),
ADD COLUMN "active_publisher_token_version" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "active_publisher_transferred_at" TIMESTAMP(3);

CREATE INDEX "streams_active_publisher_user_id_idx" ON "streams"("active_publisher_user_id");
CREATE INDEX "streams_active_publisher_session_id_idx" ON "streams"("active_publisher_session_id");
