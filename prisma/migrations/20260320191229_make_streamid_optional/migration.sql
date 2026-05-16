-- DropForeignKey
ALTER TABLE "gift_transactions" DROP CONSTRAINT "gift_transactions_stream_id_fkey";

-- AlterTable
ALTER TABLE "gift_transactions" ALTER COLUMN "stream_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "gift_transactions" ADD CONSTRAINT "gift_transactions_stream_id_fkey" FOREIGN KEY ("stream_id") REFERENCES "streams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
