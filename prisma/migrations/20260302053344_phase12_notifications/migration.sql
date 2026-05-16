-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('SYSTEM', 'STREAM_STARTED', 'GIFT_RECEIVED', 'MILESTONE_REACHED', 'BATTLE_ENDED', 'MODERATION');

-- AlterTable
ALTER TABLE "battle_contributions" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "battles" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "gifts" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "moderation_actions" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "stream_user_restrictions" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "stream_user_roles" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "wallets" ALTER COLUMN "updated_at" DROP DEFAULT;

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT,
    "body" TEXT,
    "payloadJson" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),
    "streamId" TEXT,
    "dedupeKey" TEXT,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- CreateIndex
CREATE INDEX "Notification_streamId_idx" ON "Notification"("streamId");

-- RenameIndex
ALTER INDEX "gift_transactions_recipient_created_idx" RENAME TO "gift_transactions_recipient_user_id_created_at_idx";

-- RenameIndex
ALTER INDEX "gift_transactions_sender_created_idx" RENAME TO "gift_transactions_sender_user_id_created_at_idx";

-- RenameIndex
ALTER INDEX "gift_transactions_stream_created_idx" RENAME TO "gift_transactions_stream_id_created_at_idx";

-- RenameIndex
ALTER INDEX "wallet_ledger_gift_tx_idx" RENAME TO "wallet_ledger_gift_tx_id_idx";

-- RenameIndex
ALTER INDEX "wallet_ledger_stream_idx" RENAME TO "wallet_ledger_stream_id_idx";

-- RenameIndex
ALTER INDEX "wallet_ledger_user_created_idx" RENAME TO "wallet_ledger_user_id_created_at_idx";
