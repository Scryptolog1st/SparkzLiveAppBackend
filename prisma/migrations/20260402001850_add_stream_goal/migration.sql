-- Restore missing migration folder so Prisma migration history matches the database.
-- This migration was already applied to the DB previously.

ALTER TABLE "streams"
ADD COLUMN "stream_goal" INTEGER NOT NULL DEFAULT 0;
