-- Helpdesk archive support.
-- Records are never deleted; archive only hides them from active admin queues.

ALTER TYPE "HelpdeskTicketEventType" ADD VALUE IF NOT EXISTS 'ARCHIVED';
ALTER TYPE "HelpdeskTicketEventType" ADD VALUE IF NOT EXISTS 'RESTORED';

ALTER TABLE "helpdesk_tickets"
ADD COLUMN "archived_at" TIMESTAMP(3),
ADD COLUMN "archived_by_admin_user_id" UUID,
ADD COLUMN "archive_reason" VARCHAR(500),
ADD COLUMN "restored_at" TIMESTAMP(3),
ADD COLUMN "restored_by_admin_user_id" UUID,
ADD COLUMN "restore_reason" VARCHAR(500);

CREATE INDEX "helpdesk_tickets_archived_at_idx" ON "helpdesk_tickets"("archived_at");
CREATE INDEX "helpdesk_tickets_status_archived_at_idx" ON "helpdesk_tickets"("status", "archived_at");

ALTER TABLE "helpdesk_live_chat_threads"
ADD COLUMN "archived_at" TIMESTAMP(3),
ADD COLUMN "archived_by_admin_user_id" UUID,
ADD COLUMN "archive_reason" VARCHAR(500),
ADD COLUMN "restored_at" TIMESTAMP(3),
ADD COLUMN "restored_by_admin_user_id" UUID,
ADD COLUMN "restore_reason" VARCHAR(500);

CREATE INDEX "helpdesk_live_chat_threads_archived_at_idx" ON "helpdesk_live_chat_threads"("archived_at");
CREATE INDEX "helpdesk_live_chat_threads_status_archived_at_idx" ON "helpdesk_live_chat_threads"("status", "archived_at");
