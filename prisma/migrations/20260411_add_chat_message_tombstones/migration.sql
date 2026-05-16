ALTER TABLE "chat_messages"
  ADD COLUMN IF NOT EXISTS "is_deleted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "deleted_by_admin_user_id" UUID,
  ADD COLUMN IF NOT EXISTS "deletion_label" VARCHAR(120);

CREATE INDEX IF NOT EXISTS "chat_messages_is_deleted_idx"
  ON "chat_messages"("is_deleted");

CREATE INDEX IF NOT EXISTS "chat_messages_deleted_by_admin_user_id_idx"
  ON "chat_messages"("deleted_by_admin_user_id");

UPDATE "chat_messages"
SET "deletion_label" = 'Message deleted by an Admin.'
WHERE "is_deleted" = true
  AND ("deletion_label" IS NULL OR "deletion_label" = '');