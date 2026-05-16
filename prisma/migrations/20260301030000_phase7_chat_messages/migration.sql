-- Phase 7: chat_messages retention

-- ensure uuid generator is available (Prisma usually adds this in earlier migrations, but keep it safe)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS "chat_messages" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "stream_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "text" TEXT NOT NULL,
  "reply_to_message_id" UUID,
  "badges_json" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "chat_messages_stream_created_idx" ON "chat_messages"("stream_id", "created_at");
CREATE INDEX IF NOT EXISTS "chat_messages_user_idx" ON "chat_messages"("user_id");

ALTER TABLE "chat_messages" DROP CONSTRAINT IF EXISTS "chat_messages_stream_id_fkey";
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_stream_id_fkey"
FOREIGN KEY ("stream_id") REFERENCES "streams"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "chat_messages" DROP CONSTRAINT IF EXISTS "chat_messages_user_id_fkey";
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
