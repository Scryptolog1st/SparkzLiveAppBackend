-- CreateEnum
CREATE TYPE "DirectMessageType" AS ENUM ('TEXT', 'GIF', 'IMAGE', 'GIFT');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "dm_unlock_gift_id" TEXT;

-- CreateTable
CREATE TABLE "conversations" (
    "id" UUID NOT NULL,
    "participant_1_id" UUID NOT NULL,
    "participant_2_id" UUID NOT NULL,
    "interaction_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "direct_messages" (
    "id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "message_type" "DirectMessageType" NOT NULL DEFAULT 'TEXT',
    "text" VARCHAR(1000),
    "media_url" TEXT,
    "gift_tx_id" UUID,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "direct_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "conversations_participant_1_id_updated_at_idx" ON "conversations"("participant_1_id", "updated_at");

-- CreateIndex
CREATE INDEX "conversations_participant_2_id_updated_at_idx" ON "conversations"("participant_2_id", "updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "conversations_participant_1_id_participant_2_id_key" ON "conversations"("participant_1_id", "participant_2_id");

-- CreateIndex
CREATE UNIQUE INDEX "direct_messages_gift_tx_id_key" ON "direct_messages"("gift_tx_id");

-- CreateIndex
CREATE INDEX "direct_messages_conversation_id_created_at_idx" ON "direct_messages"("conversation_id", "created_at");

-- CreateIndex
CREATE INDEX "direct_messages_sender_id_idx" ON "direct_messages"("sender_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_dm_unlock_gift_id_fkey" FOREIGN KEY ("dm_unlock_gift_id") REFERENCES "gifts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_participant_1_id_fkey" FOREIGN KEY ("participant_1_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_participant_2_id_fkey" FOREIGN KEY ("participant_2_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direct_messages" ADD CONSTRAINT "direct_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direct_messages" ADD CONSTRAINT "direct_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direct_messages" ADD CONSTRAINT "direct_messages_gift_tx_id_fkey" FOREIGN KEY ("gift_tx_id") REFERENCES "gift_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
