-- Phase 4: stream schedules + diamond milestones

-- CreateTable
CREATE TABLE "stream_schedules" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "is_recurring" BOOLEAN NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "timezone" TEXT NOT NULL,
  "day_of_week" INTEGER,
  "time_24h" TEXT,
  "start_at" TIMESTAMP(3),
  "end_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "stream_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "stream_schedules_user_id_idx" ON "stream_schedules"("user_id");
CREATE INDEX "stream_schedules_is_recurring_idx" ON "stream_schedules"("is_recurring");
CREATE INDEX "stream_schedules_start_at_idx" ON "stream_schedules"("start_at");

-- AddForeignKey
ALTER TABLE "stream_schedules" ADD CONSTRAINT "stream_schedules_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "diamond_milestones" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "milestone_amount" INTEGER NOT NULL,
  "achieved_at" TIMESTAMP(3) NOT NULL,
  "giver_user_id" UUID,
  "gift_id" TEXT,
  "gift_tx_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "diamond_milestones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "diamond_milestones_user_id_idx" ON "diamond_milestones"("user_id");
CREATE INDEX "diamond_milestones_milestone_amount_idx" ON "diamond_milestones"("milestone_amount");
CREATE INDEX "diamond_milestones_achieved_at_idx" ON "diamond_milestones"("achieved_at");

-- AddForeignKey
ALTER TABLE "diamond_milestones" ADD CONSTRAINT "diamond_milestones_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diamond_milestones" ADD CONSTRAINT "diamond_milestones_giver_user_id_fkey"
FOREIGN KEY ("giver_user_id") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
