-- AlterTable
ALTER TABLE "users" ADD COLUMN "email_updated_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "stream_participants" ADD COLUMN "lastPingAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "streams" ADD COLUMN "guests" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "streams" ADD COLUMN "layoutGridSize" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "stream_guest_requests" (
    "id" TEXT NOT NULL,
    "stream_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stream_guest_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "stream_guest_requests_stream_id_status_created_at_idx" ON "stream_guest_requests"("stream_id", "status", "created_at");

-- AddForeignKey
ALTER TABLE "stream_guest_requests" ADD CONSTRAINT "stream_guest_requests_stream_id_fkey" FOREIGN KEY ("stream_id") REFERENCES "streams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stream_guest_requests" ADD CONSTRAINT "stream_guest_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
