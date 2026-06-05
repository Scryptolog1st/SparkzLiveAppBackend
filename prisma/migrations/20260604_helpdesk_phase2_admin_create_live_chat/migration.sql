-- CreateEnum
CREATE TYPE "HelpdeskLiveChatThreadStatus" AS ENUM ('WAITING', 'ACTIVE', 'CLOSED', 'CONVERTED_TO_TICKET');

-- CreateEnum
CREATE TYPE "HelpdeskLiveChatMessageSenderType" AS ENUM ('USER', 'STAFF', 'SYSTEM');

-- CreateTable
CREATE TABLE "helpdesk_live_chat_threads" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "category_id" UUID,
    "converted_ticket_id" UUID,
    "subject" VARCHAR(160),
    "status" "HelpdeskLiveChatThreadStatus" NOT NULL DEFAULT 'WAITING',
    "claimed_by_admin_user_id" UUID,
    "claimed_at" TIMESTAMP(3),
    "claim_expires_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "closed_by_admin_user_id" UUID,
    "close_reason" VARCHAR(500),
    "metadata_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_message_at" TIMESTAMP(3),

    CONSTRAINT "helpdesk_live_chat_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "helpdesk_live_chat_messages" (
    "id" UUID NOT NULL,
    "thread_id" UUID NOT NULL,
    "sender_type" "HelpdeskLiveChatMessageSenderType" NOT NULL,
    "sender_user_id" UUID,
    "sender_admin_user_id" UUID,
    "body" TEXT NOT NULL,
    "metadata_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "helpdesk_live_chat_messages_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "helpdesk_live_chat_messages_sender_identity_chk" CHECK (
        (
            "sender_type" = 'USER'
            AND "sender_user_id" IS NOT NULL
            AND "sender_admin_user_id" IS NULL
        )
        OR (
            "sender_type" = 'STAFF'
            AND "sender_admin_user_id" IS NOT NULL
            AND "sender_user_id" IS NULL
        )
        OR (
            "sender_type" = 'SYSTEM'
            AND "sender_user_id" IS NULL
            AND "sender_admin_user_id" IS NULL
        )
    )
);

-- CreateIndex
CREATE UNIQUE INDEX "helpdesk_live_chat_threads_converted_ticket_id_key" ON "helpdesk_live_chat_threads"("converted_ticket_id");

-- CreateIndex
CREATE INDEX "helpdesk_live_chat_threads_user_id_created_at_idx" ON "helpdesk_live_chat_threads"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "helpdesk_live_chat_threads_status_last_message_at_idx" ON "helpdesk_live_chat_threads"("status", "last_message_at");

-- CreateIndex
CREATE INDEX "helpdesk_live_chat_threads_claimed_by_admin_user_id_status_idx" ON "helpdesk_live_chat_threads"("claimed_by_admin_user_id", "status");

-- CreateIndex
CREATE INDEX "helpdesk_live_chat_threads_category_id_status_idx" ON "helpdesk_live_chat_threads"("category_id", "status");

-- CreateIndex
CREATE INDEX "helpdesk_live_chat_threads_claim_expires_at_idx" ON "helpdesk_live_chat_threads"("claim_expires_at");

-- CreateIndex
CREATE INDEX "helpdesk_live_chat_messages_thread_id_created_at_idx" ON "helpdesk_live_chat_messages"("thread_id", "created_at");

-- CreateIndex
CREATE INDEX "helpdesk_live_chat_messages_sender_user_id_created_at_idx" ON "helpdesk_live_chat_messages"("sender_user_id", "created_at");

-- CreateIndex
CREATE INDEX "helpdesk_live_chat_messages_sender_admin_user_id_created_at_idx" ON "helpdesk_live_chat_messages"("sender_admin_user_id", "created_at");

-- AddForeignKey
ALTER TABLE "helpdesk_live_chat_threads" ADD CONSTRAINT "helpdesk_live_chat_threads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "helpdesk_live_chat_threads" ADD CONSTRAINT "helpdesk_live_chat_threads_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "helpdesk_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "helpdesk_live_chat_threads" ADD CONSTRAINT "helpdesk_live_chat_threads_converted_ticket_id_fkey" FOREIGN KEY ("converted_ticket_id") REFERENCES "helpdesk_tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "helpdesk_live_chat_threads" ADD CONSTRAINT "helpdesk_live_chat_threads_claimed_by_admin_user_id_fkey" FOREIGN KEY ("claimed_by_admin_user_id") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "helpdesk_live_chat_threads" ADD CONSTRAINT "helpdesk_live_chat_threads_closed_by_admin_user_id_fkey" FOREIGN KEY ("closed_by_admin_user_id") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "helpdesk_live_chat_messages" ADD CONSTRAINT "helpdesk_live_chat_messages_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "helpdesk_live_chat_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "helpdesk_live_chat_messages" ADD CONSTRAINT "helpdesk_live_chat_messages_sender_user_id_fkey" FOREIGN KEY ("sender_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "helpdesk_live_chat_messages" ADD CONSTRAINT "helpdesk_live_chat_messages_sender_admin_user_id_fkey" FOREIGN KEY ("sender_admin_user_id") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

