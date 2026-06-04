-- CreateEnum
CREATE TYPE "HelpdeskTicketStatus" AS ENUM ('OPEN', 'PENDING_ADMIN', 'PENDING_USER', 'ESCALATED', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "HelpdeskTicketPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "HelpdeskTicketSource" AS ENUM ('USER', 'ADMIN', 'EMAIL', 'LIVE_CHAT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "HelpdeskTicketMessageSenderType" AS ENUM ('USER', 'STAFF', 'SYSTEM');

-- CreateEnum
CREATE TYPE "HelpdeskTicketEventType" AS ENUM ('TICKET_CREATED', 'MESSAGE_ADDED', 'INTERNAL_NOTE_ADDED', 'ASSIGNED', 'STATUS_CHANGED', 'PRIORITY_CHANGED', 'CATEGORY_CHANGED', 'CLOSED', 'REOPENED', 'ESCALATED');

-- CreateTable
CREATE TABLE "helpdesk_categories" (
    "id" UUID NOT NULL,
    "key" VARCHAR(80) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" VARCHAR(500),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "helpdesk_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "helpdesk_tickets" (
    "id" UUID NOT NULL,
    "ticket_number" VARCHAR(32) NOT NULL,
    "user_id" UUID NOT NULL,
    "assigned_admin_user_id" UUID,
    "category_id" UUID,
    "subject" VARCHAR(160) NOT NULL,
    "status" "HelpdeskTicketStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "HelpdeskTicketPriority" NOT NULL DEFAULT 'NORMAL',
    "source" "HelpdeskTicketSource" NOT NULL DEFAULT 'USER',
    "metadata_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_message_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "closed_by_admin_user_id" UUID,

    CONSTRAINT "helpdesk_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "helpdesk_ticket_messages" (
    "id" UUID NOT NULL,
    "ticket_id" UUID NOT NULL,
    "sender_type" "HelpdeskTicketMessageSenderType" NOT NULL,
    "sender_user_id" UUID,
    "sender_admin_user_id" UUID,
    "body" TEXT NOT NULL,
    "attachments_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "edited_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "helpdesk_ticket_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "helpdesk_ticket_internal_notes" (
    "id" UUID NOT NULL,
    "ticket_id" UUID NOT NULL,
    "admin_user_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "helpdesk_ticket_internal_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "helpdesk_ticket_events" (
    "id" UUID NOT NULL,
    "ticket_id" UUID NOT NULL,
    "actor_user_id" UUID,
    "actor_admin_user_id" UUID,
    "event_type" "HelpdeskTicketEventType" NOT NULL,
    "before_json" JSONB,
    "after_json" JSONB,
    "metadata_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "helpdesk_ticket_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "helpdesk_categories_key_key" ON "helpdesk_categories"("key");

-- CreateIndex
CREATE INDEX "helpdesk_categories_is_active_sort_order_idx" ON "helpdesk_categories"("is_active", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "helpdesk_tickets_ticket_number_key" ON "helpdesk_tickets"("ticket_number");

-- CreateIndex
CREATE INDEX "helpdesk_tickets_user_id_created_at_idx" ON "helpdesk_tickets"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "helpdesk_tickets_status_priority_created_at_idx" ON "helpdesk_tickets"("status", "priority", "created_at");

-- CreateIndex
CREATE INDEX "helpdesk_tickets_assigned_admin_user_id_status_idx" ON "helpdesk_tickets"("assigned_admin_user_id", "status");

-- CreateIndex
CREATE INDEX "helpdesk_tickets_category_id_status_idx" ON "helpdesk_tickets"("category_id", "status");

-- CreateIndex
CREATE INDEX "helpdesk_tickets_last_message_at_idx" ON "helpdesk_tickets"("last_message_at");

-- CreateIndex
CREATE INDEX "helpdesk_ticket_messages_ticket_id_created_at_idx" ON "helpdesk_ticket_messages"("ticket_id", "created_at");

-- CreateIndex
CREATE INDEX "helpdesk_ticket_messages_sender_user_id_created_at_idx" ON "helpdesk_ticket_messages"("sender_user_id", "created_at");

-- CreateIndex
CREATE INDEX "helpdesk_ticket_messages_sender_admin_user_id_created_at_idx" ON "helpdesk_ticket_messages"("sender_admin_user_id", "created_at");

-- CreateIndex
CREATE INDEX "helpdesk_ticket_internal_notes_ticket_id_created_at_idx" ON "helpdesk_ticket_internal_notes"("ticket_id", "created_at");

-- CreateIndex
CREATE INDEX "helpdesk_ticket_internal_notes_admin_user_id_created_at_idx" ON "helpdesk_ticket_internal_notes"("admin_user_id", "created_at");

-- CreateIndex
CREATE INDEX "helpdesk_ticket_events_ticket_id_created_at_idx" ON "helpdesk_ticket_events"("ticket_id", "created_at");

-- CreateIndex
CREATE INDEX "helpdesk_ticket_events_actor_user_id_created_at_idx" ON "helpdesk_ticket_events"("actor_user_id", "created_at");

-- CreateIndex
CREATE INDEX "helpdesk_ticket_events_actor_admin_user_id_created_at_idx" ON "helpdesk_ticket_events"("actor_admin_user_id", "created_at");

-- CreateIndex
CREATE INDEX "helpdesk_ticket_events_event_type_created_at_idx" ON "helpdesk_ticket_events"("event_type", "created_at");

-- AddForeignKey
ALTER TABLE "helpdesk_tickets" ADD CONSTRAINT "helpdesk_tickets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "helpdesk_tickets" ADD CONSTRAINT "helpdesk_tickets_assigned_admin_user_id_fkey" FOREIGN KEY ("assigned_admin_user_id") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "helpdesk_tickets" ADD CONSTRAINT "helpdesk_tickets_closed_by_admin_user_id_fkey" FOREIGN KEY ("closed_by_admin_user_id") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "helpdesk_tickets" ADD CONSTRAINT "helpdesk_tickets_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "helpdesk_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "helpdesk_ticket_messages" ADD CONSTRAINT "helpdesk_ticket_messages_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "helpdesk_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "helpdesk_ticket_messages" ADD CONSTRAINT "helpdesk_ticket_messages_sender_user_id_fkey" FOREIGN KEY ("sender_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "helpdesk_ticket_messages" ADD CONSTRAINT "helpdesk_ticket_messages_sender_admin_user_id_fkey" FOREIGN KEY ("sender_admin_user_id") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "helpdesk_ticket_internal_notes" ADD CONSTRAINT "helpdesk_ticket_internal_notes_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "helpdesk_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "helpdesk_ticket_internal_notes" ADD CONSTRAINT "helpdesk_ticket_internal_notes_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "helpdesk_ticket_events" ADD CONSTRAINT "helpdesk_ticket_events_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "helpdesk_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "helpdesk_ticket_events" ADD CONSTRAINT "helpdesk_ticket_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "helpdesk_ticket_events" ADD CONSTRAINT "helpdesk_ticket_events_actor_admin_user_id_fkey" FOREIGN KEY ("actor_admin_user_id") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

