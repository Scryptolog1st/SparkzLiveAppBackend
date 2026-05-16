-- Phase 10: Battles (server authoritative)
-- Adds battles and battle_contributions tables.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
  CREATE TYPE "BattleStatus" AS ENUM ('PENDING', 'ACTIVE', 'ENDED', 'DECLINED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "battles" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "stream_id" UUID NOT NULL,
  "host_user_id" UUID NOT NULL,
  "opponent_user_id" UUID NOT NULL,
  "winner_user_id" UUID,
  "status" "BattleStatus" NOT NULL,
  "duration_seconds" INTEGER NOT NULL,
  "host_score" INTEGER NOT NULL DEFAULT 0,
  "opponent_score" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "started_at" TIMESTAMP(3),
  "ends_at" TIMESTAMP(3),
  "ended_at" TIMESTAMP(3),
  CONSTRAINT "battles_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "battles"
    ADD CONSTRAINT "battles_stream_id_fkey"
    FOREIGN KEY ("stream_id") REFERENCES "streams"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "battles"
    ADD CONSTRAINT "battles_host_user_id_fkey"
    FOREIGN KEY ("host_user_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "battles"
    ADD CONSTRAINT "battles_opponent_user_id_fkey"
    FOREIGN KEY ("opponent_user_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "battles"
    ADD CONSTRAINT "battles_winner_user_id_fkey"
    FOREIGN KEY ("winner_user_id") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE INDEX IF NOT EXISTS "battles_stream_id_idx" ON "battles"("stream_id");
CREATE INDEX IF NOT EXISTS "battles_status_idx" ON "battles"("status");
CREATE INDEX IF NOT EXISTS "battles_created_at_idx" ON "battles"("created_at");

CREATE TABLE IF NOT EXISTS "battle_contributions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "battle_id" UUID NOT NULL,
  "gift_tx_id" UUID NOT NULL,
  "sender_user_id" UUID NOT NULL,
  "recipient_user_id" UUID NOT NULL,
  "diamond_value" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "battle_contributions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "battle_contributions_gift_tx_id_key" ON "battle_contributions"("gift_tx_id");
CREATE INDEX IF NOT EXISTS "battle_contributions_battle_id_idx" ON "battle_contributions"("battle_id");
CREATE INDEX IF NOT EXISTS "battle_contributions_created_at_idx" ON "battle_contributions"("created_at");

DO $$ BEGIN
  ALTER TABLE "battle_contributions"
    ADD CONSTRAINT "battle_contributions_battle_id_fkey"
    FOREIGN KEY ("battle_id") REFERENCES "battles"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "battle_contributions"
    ADD CONSTRAINT "battle_contributions_gift_tx_id_fkey"
    FOREIGN KEY ("gift_tx_id") REFERENCES "gift_transactions"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "battle_contributions"
    ADD CONSTRAINT "battle_contributions_sender_user_id_fkey"
    FOREIGN KEY ("sender_user_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "battle_contributions"
    ADD CONSTRAINT "battle_contributions_recipient_user_id_fkey"
    FOREIGN KEY ("recipient_user_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
