-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PROCESSING', 'PAID', 'REJECTED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "LedgerEntryType" ADD VALUE 'PAYOUT_DEBIT';

-- AlterTable
ALTER TABLE "conversations" ADD COLUMN     "deleted_by_p1" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "deleted_by_p2" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "direct_messages" ADD COLUMN     "deleted_by_recipient" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "deleted_by_sender" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "payout_requests" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "diamond_amount" INTEGER NOT NULL,
    "net_amount_cents" INTEGER NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "payment_method" TEXT,
    "payment_details" JSONB,
    "admin_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "payout_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payout_requests_user_id_status_idx" ON "payout_requests"("user_id", "status");

-- CreateIndex
CREATE INDEX "payout_requests_created_at_idx" ON "payout_requests"("created_at");

-- AddForeignKey
ALTER TABLE "payout_requests" ADD CONSTRAINT "payout_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
