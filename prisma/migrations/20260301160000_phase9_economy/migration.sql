-- Phase 9: economy (gifts + wallets + ledger + gift transactions)

-- Enums
DO $$ BEGIN
  CREATE TYPE "GiftMediaType" AS ENUM ('VIDEO','LOTTIE','GIF','IMAGE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "LedgerEntryType" AS ENUM ('GIFT_SEND','GIFT_RECEIVE','ADMIN_ADJUST');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Gifts catalog
CREATE TABLE IF NOT EXISTS "gifts" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "diamond_value" INTEGER NOT NULL,
  "coin_cost" INTEGER NOT NULL,
  "media_url" TEXT NOT NULL,
  "media_type" "GiftMediaType" NOT NULL,
  "is_big_gift" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "gifts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "gifts_coin_cost_idx" ON "gifts"("coin_cost");
CREATE INDEX IF NOT EXISTS "gifts_diamond_value_idx" ON "gifts"("diamond_value");

-- Wallets
CREATE TABLE IF NOT EXISTS "wallets" (
  "user_id" UUID NOT NULL,
  "coins" INTEGER NOT NULL DEFAULT 0,
  "diamonds_earned" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "wallets_pkey" PRIMARY KEY ("user_id")
);

ALTER TABLE "wallets"
  ADD CONSTRAINT "wallets_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Gift transactions
CREATE TABLE IF NOT EXISTS "gift_transactions" (
  "id" UUID NOT NULL,
  "stream_id" UUID NOT NULL,
  "gift_id" TEXT NOT NULL,
  "sender_user_id" UUID NOT NULL,
  "recipient_user_id" UUID NOT NULL,
  "coin_cost" INTEGER NOT NULL,
  "diamond_value" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "gift_transactions_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "gift_transactions"
  ADD CONSTRAINT "gift_transactions_stream_id_fkey"
  FOREIGN KEY ("stream_id") REFERENCES "streams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "gift_transactions"
  ADD CONSTRAINT "gift_transactions_gift_id_fkey"
  FOREIGN KEY ("gift_id") REFERENCES "gifts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "gift_transactions"
  ADD CONSTRAINT "gift_transactions_sender_user_id_fkey"
  FOREIGN KEY ("sender_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "gift_transactions"
  ADD CONSTRAINT "gift_transactions_recipient_user_id_fkey"
  FOREIGN KEY ("recipient_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "gift_transactions_stream_created_idx" ON "gift_transactions"("stream_id","created_at");
CREATE INDEX IF NOT EXISTS "gift_transactions_sender_created_idx" ON "gift_transactions"("sender_user_id","created_at");
CREATE INDEX IF NOT EXISTS "gift_transactions_recipient_created_idx" ON "gift_transactions"("recipient_user_id","created_at");

-- Wallet ledger
CREATE TABLE IF NOT EXISTS "wallet_ledger" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "entry_type" "LedgerEntryType" NOT NULL,
  "delta_coins" INTEGER NOT NULL,
  "delta_diamonds" INTEGER NOT NULL,
  "stream_id" UUID,
  "gift_tx_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "wallet_ledger_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "wallet_ledger"
  ADD CONSTRAINT "wallet_ledger_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "wallet_ledger"
  ADD CONSTRAINT "wallet_ledger_stream_id_fkey"
  FOREIGN KEY ("stream_id") REFERENCES "streams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "wallet_ledger"
  ADD CONSTRAINT "wallet_ledger_gift_tx_id_fkey"
  FOREIGN KEY ("gift_tx_id") REFERENCES "gift_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "wallet_ledger_user_created_idx" ON "wallet_ledger"("user_id","created_at");
CREATE INDEX IF NOT EXISTS "wallet_ledger_stream_idx" ON "wallet_ledger"("stream_id");
CREATE INDEX IF NOT EXISTS "wallet_ledger_gift_tx_idx" ON "wallet_ledger"("gift_tx_id");

-- Optional: add FK from diamond_milestones.gift_tx_id -> gift_transactions.id (if column exists)
DO $$ BEGIN
  ALTER TABLE "diamond_milestones"
    ADD CONSTRAINT "diamond_milestones_gift_tx_id_fkey"
    FOREIGN KEY ("gift_tx_id") REFERENCES "gift_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
  WHEN undefined_column THEN null;
  WHEN undefined_table THEN null;
END $$;
