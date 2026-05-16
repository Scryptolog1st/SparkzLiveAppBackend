DO $$ BEGIN
  CREATE TYPE "ConversationRequestStatus" AS ENUM ('NONE', 'PENDING', 'ACCEPTED', 'DENIED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ConversationRequestOrigin" AS ENUM ('NORMAL', 'ADVERTISEMENT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "DirectMessageOrigin" AS ENUM ('NORMAL', 'ADVERTISEMENT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "conversations"
  ADD COLUMN IF NOT EXISTS "request_status" "ConversationRequestStatus" NOT NULL DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS "request_origin" "ConversationRequestOrigin" NOT NULL DEFAULT 'NORMAL',
  ADD COLUMN IF NOT EXISTS "request_advertisement_id" UUID,
  ADD COLUMN IF NOT EXISTS "request_sender_id" UUID,
  ADD COLUMN IF NOT EXISTS "request_recipient_id" UUID,
  ADD COLUMN IF NOT EXISTS "request_preview_text" VARCHAR(280),
  ADD COLUMN IF NOT EXISTS "request_created_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "request_responded_at" TIMESTAMP(3);

ALTER TABLE "direct_messages"
  ADD COLUMN IF NOT EXISTS "origin" "DirectMessageOrigin" NOT NULL DEFAULT 'NORMAL',
  ADD COLUMN IF NOT EXISTS "advertisement_id" UUID,
  ADD COLUMN IF NOT EXISTS "hidden_until_request_accepted" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "conversations_request_recipient_status_updated_at_idx"
  ON "conversations" ("request_recipient_id", "request_status", "updated_at");

CREATE INDEX IF NOT EXISTS "conversations_request_advertisement_id_idx"
  ON "conversations" ("request_advertisement_id");

CREATE INDEX IF NOT EXISTS "direct_messages_advertisement_id_idx"
  ON "direct_messages" ("advertisement_id");
