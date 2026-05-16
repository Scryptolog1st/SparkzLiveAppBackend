-- CreateEnum
CREATE TYPE "ReportTargetType" AS ENUM ('USER', 'STREAM', 'CHAT_MESSAGE', 'DM_MESSAGE');

-- CreateEnum
CREATE TYPE "ReportReasonCode" AS ENUM (
    'NUDITY',
    'HARASSMENT_OR_BULLYING',
    'RACISM_OR_HATE',
    'THREATS',
    'INAPPROPRIATE_BEHAVIOR',
    'RULE_BREAKING_STREAM',
    'ABUSIVE_CHAT_MESSAGE',
    'ABUSIVE_DM',
    'OTHER'
);

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'RESOLVED', 'DISMISSED', 'ESCALATED');

-- CreateEnum
CREATE TYPE "ReportAuditAction" AS ENUM (
    'CREATED',
    'STATUS_CHANGED',
    'ASSIGNED',
    'NOTE_ADDED',
    'ACTION_TAKEN',
    'DISMISSED',
    'ESCALATED'
);

-- CreateTable
CREATE TABLE "reports" (
    "id" UUID NOT NULL,
    "reporter_user_id" UUID NOT NULL,
    "target_type" "ReportTargetType" NOT NULL,
    "target_user_id" UUID,
    "target_stream_id" UUID,
    "target_chat_message_id" UUID,
    "target_dm_message_id" UUID,
    "reason_code" "ReportReasonCode" NOT NULL,
    "description" VARCHAR(2000),
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "assigned_admin_user_id" UUID,
    "resolution_notes" VARCHAR(2000),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_audit_logs" (
    "id" UUID NOT NULL,
    "report_id" UUID NOT NULL,
    "actor_admin_user_id" UUID NOT NULL,
    "action" "ReportAuditAction" NOT NULL,
    "note" VARCHAR(2000),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reports_reporter_user_id_created_at_idx" ON "reports"("reporter_user_id", "created_at");

-- CreateIndex
CREATE INDEX "reports_target_type_status_created_at_idx" ON "reports"("target_type", "status", "created_at");

-- CreateIndex
CREATE INDEX "reports_target_user_id_created_at_idx" ON "reports"("target_user_id", "created_at");

-- CreateIndex
CREATE INDEX "reports_target_stream_id_created_at_idx" ON "reports"("target_stream_id", "created_at");

-- CreateIndex
CREATE INDEX "reports_target_chat_message_id_created_at_idx" ON "reports"("target_chat_message_id", "created_at");

-- CreateIndex
CREATE INDEX "reports_target_dm_message_id_created_at_idx" ON "reports"("target_dm_message_id", "created_at");

-- CreateIndex
CREATE INDEX "reports_status_created_at_idx" ON "reports"("status", "created_at");

-- CreateIndex
CREATE INDEX "reports_assigned_admin_user_id_status_idx" ON "reports"("assigned_admin_user_id", "status");

-- CreateIndex
CREATE INDEX "report_audit_logs_report_id_created_at_idx" ON "report_audit_logs"("report_id", "created_at");

-- CreateIndex
CREATE INDEX "report_audit_logs_actor_admin_user_id_created_at_idx" ON "report_audit_logs"("actor_admin_user_id", "created_at");

-- AddForeignKey
ALTER TABLE "reports"
ADD CONSTRAINT "reports_reporter_user_id_fkey"
FOREIGN KEY ("reporter_user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports"
ADD CONSTRAINT "reports_target_user_id_fkey"
FOREIGN KEY ("target_user_id") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports"
ADD CONSTRAINT "reports_target_stream_id_fkey"
FOREIGN KEY ("target_stream_id") REFERENCES "streams"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports"
ADD CONSTRAINT "reports_target_chat_message_id_fkey"
FOREIGN KEY ("target_chat_message_id") REFERENCES "chat_messages"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports"
ADD CONSTRAINT "reports_target_dm_message_id_fkey"
FOREIGN KEY ("target_dm_message_id") REFERENCES "direct_messages"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports"
ADD CONSTRAINT "reports_assigned_admin_user_id_fkey"
FOREIGN KEY ("assigned_admin_user_id") REFERENCES "admin_users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_audit_logs"
ADD CONSTRAINT "report_audit_logs_report_id_fkey"
FOREIGN KEY ("report_id") REFERENCES "reports"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_audit_logs"
ADD CONSTRAINT "report_audit_logs_actor_admin_user_id_fkey"
FOREIGN KEY ("actor_admin_user_id") REFERENCES "admin_users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
