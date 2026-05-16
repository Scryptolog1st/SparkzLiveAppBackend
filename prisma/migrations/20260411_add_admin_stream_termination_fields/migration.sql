ALTER TYPE "ModerationActionType" ADD VALUE IF NOT EXISTS 'STREAM_TERMINATE';

ALTER TABLE "streams"
  ADD COLUMN IF NOT EXISTS "ended_by_admin_user_id" UUID,
  ADD COLUMN IF NOT EXISTS "end_reason" VARCHAR(300);

CREATE INDEX IF NOT EXISTS "streams_ended_by_admin_user_id_idx"
  ON "streams"("ended_by_admin_user_id");