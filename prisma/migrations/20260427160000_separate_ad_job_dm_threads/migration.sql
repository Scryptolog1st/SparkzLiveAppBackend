DO $$ BEGIN
  CREATE TYPE "ConversationThreadType" AS ENUM ('NORMAL', 'ADVERTISEMENT_JOB');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "conversations"
  ADD COLUMN IF NOT EXISTS "thread_type" "ConversationThreadType" NOT NULL DEFAULT 'NORMAL';

ALTER TABLE "conversations"
  ADD COLUMN IF NOT EXISTS "thread_key" VARCHAR(120) NOT NULL DEFAULT 'normal';

UPDATE "conversations"
SET
  "thread_type" = 'ADVERTISEMENT_JOB',
  "thread_key" = 'legacy-adjob:' || "id"::text
WHERE
  "request_origin" = 'ADVERTISEMENT'
  AND "thread_type" = 'NORMAL';

UPDATE "conversations"
SET "thread_key" = 'normal'
WHERE "thread_type" = 'NORMAL'
  AND ("thread_key" IS NULL OR "thread_key" = '');

ALTER TABLE "conversations"
  DROP CONSTRAINT IF EXISTS "conversations_participant_1_id_participant_2_id_key";

ALTER TABLE "conversations"
  DROP CONSTRAINT IF EXISTS "conversations_participant1Id_participant2Id_key";

ALTER TABLE "conversations"
  DROP CONSTRAINT IF EXISTS "Conversation_participant1Id_participant2Id_key";

DROP INDEX IF EXISTS "conversations_participant_1_id_participant_2_id_key";
DROP INDEX IF EXISTS "conversations_participant1Id_participant2Id_key";
DROP INDEX IF EXISTS "Conversation_participant1Id_participant2Id_key";

CREATE UNIQUE INDEX IF NOT EXISTS "conversations_participants_thread_key"
  ON "conversations"("participant_1_id", "participant_2_id", "thread_type", "thread_key");

CREATE INDEX IF NOT EXISTS "conversations_thread_type_updated_idx"
  ON "conversations"("thread_type", "updated_at");
