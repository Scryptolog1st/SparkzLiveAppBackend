-- Phase 6: add optional video metadata to streams

ALTER TABLE "streams"
  ADD COLUMN IF NOT EXISTS "video_provider" TEXT,
  ADD COLUMN IF NOT EXISTS "video_room_name" TEXT;

CREATE INDEX IF NOT EXISTS "streams_video_provider_idx" ON "streams"("video_provider");
