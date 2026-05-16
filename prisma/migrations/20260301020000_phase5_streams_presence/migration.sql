-- Phase 5: streams + participants + enums

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "StreamStatus" AS ENUM ('LIVE', 'ENDED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "StreamVisibility" AS ENUM ('PUBLIC', 'FOLLOWERS', 'PRIVATE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "StreamRole" AS ENUM ('HOST', 'GUEST', 'MODERATOR', 'VIEWER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "streams" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "host_user_id" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "status" "StreamStatus" NOT NULL,
  "visibility" "StreamVisibility" NOT NULL,
  "tags_json" JSONB NOT NULL DEFAULT '[]',
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ended_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "streams_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "streams_host_user_id_idx" ON "streams"("host_user_id");
CREATE INDEX IF NOT EXISTS "streams_status_idx" ON "streams"("status");
CREATE INDEX IF NOT EXISTS "streams_started_at_idx" ON "streams"("started_at");

ALTER TABLE "streams" DROP CONSTRAINT IF EXISTS "streams_host_user_id_fkey";
ALTER TABLE "streams" ADD CONSTRAINT "streams_host_user_id_fkey"
FOREIGN KEY ("host_user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE IF NOT EXISTS "stream_participants" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "stream_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "role" "StreamRole" NOT NULL,
  "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "left_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "stream_participants_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "stream_participants_stream_id_idx" ON "stream_participants"("stream_id");
CREATE INDEX IF NOT EXISTS "stream_participants_user_id_idx" ON "stream_participants"("user_id");
CREATE INDEX IF NOT EXISTS "stream_participants_left_at_idx" ON "stream_participants"("left_at");

-- unique active participation (one open row per user per stream)
DO $$ BEGIN
  CREATE UNIQUE INDEX "stream_participants_active_unique" ON "stream_participants"("stream_id","user_id") WHERE "left_at" IS NULL;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "stream_participants" DROP CONSTRAINT IF EXISTS "stream_participants_stream_id_fkey";
ALTER TABLE "stream_participants" ADD CONSTRAINT "stream_participants_stream_id_fkey"
FOREIGN KEY ("stream_id") REFERENCES "streams"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "stream_participants" DROP CONSTRAINT IF EXISTS "stream_participants_user_id_fkey";
ALTER TABLE "stream_participants" ADD CONSTRAINT "stream_participants_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
