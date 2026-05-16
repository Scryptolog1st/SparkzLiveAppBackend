-- CreateEnum
CREATE TYPE "VipBadgeKey" AS ENUM ('GREEN', 'YELLOW', 'ORANGE', 'RED', 'PINK', 'PURPLE', 'BLACK', 'GOLD', 'PLATINUM', 'DIAMOND', 'ANODIZED_TITANIUM');

-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "vip_display_badge_key" "VipBadgeKey",
ADD COLUMN     "vip_live_badge_key" "VipBadgeKey",
ADD COLUMN     "vip_locked_badge_key" "VipBadgeKey",
ADD COLUMN     "vip_locked_period_key" VARCHAR(7);

-- CreateTable
CREATE TABLE "user_vip_months" (
    "user_id" UUID NOT NULL,
    "period_key" VARCHAR(7) NOT NULL,
    "spend_cents" INTEGER NOT NULL DEFAULT 0,
    "highest_color_badge" "VipBadgeKey",
    "highest_color_reached_at" TIMESTAMP(3),
    "finalized_badge_key" "VipBadgeKey",
    "finalized_percentile_band" INTEGER,
    "leaderboard_rank" INTEGER,
    "spender_count" INTEGER,
    "is_finalized" BOOLEAN NOT NULL DEFAULT false,
    "finalized_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_vip_months_pkey" PRIMARY KEY ("user_id","period_key")
);

-- CreateIndex
CREATE INDEX "user_vip_months_period_key_spend_cents_idx" ON "user_vip_months"("period_key", "spend_cents");

-- CreateIndex
CREATE INDEX "user_vip_months_period_key_highest_color_badge_idx" ON "user_vip_months"("period_key", "highest_color_badge");

-- CreateIndex
CREATE INDEX "user_vip_months_period_key_finalized_badge_key_idx" ON "user_vip_months"("period_key", "finalized_badge_key");

-- CreateIndex
CREATE INDEX "user_vip_months_period_key_is_finalized_idx" ON "user_vip_months"("period_key", "is_finalized");

-- CreateIndex
CREATE INDEX "profiles_vip_display_badge_key_idx" ON "profiles"("vip_display_badge_key");

-- CreateIndex
CREATE INDEX "profiles_vip_locked_badge_key_idx" ON "profiles"("vip_locked_badge_key");

-- AddForeignKey
ALTER TABLE "user_vip_months" ADD CONSTRAINT "user_vip_months_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

