-- Migration: add auditable coin lot, gift source, streamer earnings, and payout method ledger
-- Target: PostgreSQL + Prisma
--
-- Folder:
-- prisma/migrations/20260426162238_add_auditable_coin_gift_payout_ledger/migration.sql
--
-- Existing mapped tables used by this migration:
--   users
--   wallets
--   purchase_orders
--   gift_transactions
--   payout_requests
--   app_config

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- 1. Extend existing enums.
-- ---------------------------------------------------------------------------

ALTER TYPE "PayoutStatus" ADD VALUE IF NOT EXISTS 'FAILED';
ALTER TYPE "PayoutStatus" ADD VALUE IF NOT EXISTS 'RETURNED';
ALTER TYPE "PayoutStatus" ADD VALUE IF NOT EXISTS 'UNCLAIMED';

ALTER TYPE "LedgerEntryType" ADD VALUE IF NOT EXISTS 'PURCHASE_REVERSAL';
ALTER TYPE "LedgerEntryType" ADD VALUE IF NOT EXISTS 'GIFT_REVERSAL';
ALTER TYPE "LedgerEntryType" ADD VALUE IF NOT EXISTS 'PAYOUT_REVERSAL';
ALTER TYPE "LedgerEntryType" ADD VALUE IF NOT EXISTS 'CHARGEBACK_REVERSAL';

ALTER TYPE "PurchaseProvider" ADD VALUE IF NOT EXISTS 'DEV';

-- ---------------------------------------------------------------------------
-- 2. Create new enums.
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CoinLotSourceType') THEN
    CREATE TYPE "CoinLotSourceType" AS ENUM (
      'PURCHASE',
      'ADMIN_ADJUST',
      'LEGACY_MIGRATION'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CoinLotStatus') THEN
    CREATE TYPE "CoinLotStatus" AS ENUM (
      'PENDING',
      'AVAILABLE',
      'REFUNDED',
      'CHARGED_BACK',
      'REVERSED'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'StreamerEarningStatus') THEN
    CREATE TYPE "StreamerEarningStatus" AS ENUM (
      'PENDING',
      'AVAILABLE',
      'LOCKED',
      'PAID',
      'REVERSED'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PayoutProvider') THEN
    CREATE TYPE "PayoutProvider" AS ENUM (
      'MANUAL',
      'STRIPE',
      'PAYPAL'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PayoutMethodType') THEN
    CREATE TYPE "PayoutMethodType" AS ENUM (
      'PAYPAL',
      'STRIPE_BANK',
      'STRIPE_DEBIT',
      'MANUAL'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PayoutMethodStatus') THEN
    CREATE TYPE "PayoutMethodStatus" AS ENUM (
      'PENDING',
      'ACTIVE',
      'DISABLED',
      'FAILED'
    );
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. Create payout_methods.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "payout_methods" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,

  "type" "PayoutMethodType" NOT NULL,
  "status" "PayoutMethodStatus" NOT NULL DEFAULT 'PENDING',

  "label" VARCHAR(120),
  "is_default" BOOLEAN NOT NULL DEFAULT false,

  "paypal_email" VARCHAR(255),

  "stripe_connected_account_id" TEXT,
  "stripe_external_account_id" TEXT,

  "metadata_json" JSONB,

  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "disabled_at" TIMESTAMP(3),

  CONSTRAINT "payout_methods_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'payout_methods_user_id_fkey'
  ) THEN
    ALTER TABLE "payout_methods"
    ADD CONSTRAINT "payout_methods_user_id_fkey"
    FOREIGN KEY ("user_id")
    REFERENCES "users"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "payout_methods_user_id_status_idx"
ON "payout_methods"("user_id", "status");

CREATE INDEX IF NOT EXISTS "payout_methods_user_id_type_status_idx"
ON "payout_methods"("user_id", "type", "status");

CREATE INDEX IF NOT EXISTS "payout_methods_paypal_email_idx"
ON "payout_methods"("paypal_email");

CREATE UNIQUE INDEX IF NOT EXISTS "payout_methods_one_default_per_user_idx"
ON "payout_methods"("user_id")
WHERE "is_default" = true AND "status" = 'ACTIVE';

-- ---------------------------------------------------------------------------
-- 4. Add provider payout fields to payout_requests.
-- ---------------------------------------------------------------------------

ALTER TABLE "payout_requests"
ADD COLUMN IF NOT EXISTS "idempotency_key" VARCHAR(120),
ADD COLUMN IF NOT EXISTS "provider" "PayoutProvider" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN IF NOT EXISTS "gross_amount_cents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "fee_amount_cents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "payout_method_id" UUID,
ADD COLUMN IF NOT EXISTS "provider_batch_id" TEXT,
ADD COLUMN IF NOT EXISTS "provider_payout_id" TEXT,
ADD COLUMN IF NOT EXISTS "provider_status" TEXT,
ADD COLUMN IF NOT EXISTS "provider_response" JSONB,
ADD COLUMN IF NOT EXISTS "paid_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "failed_at" TIMESTAMP(3);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'payout_requests_payout_method_id_fkey'
  ) THEN
    ALTER TABLE "payout_requests"
    ADD CONSTRAINT "payout_requests_payout_method_id_fkey"
    FOREIGN KEY ("payout_method_id")
    REFERENCES "payout_methods"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "payout_requests_provider_provider_payout_id_idx"
ON "payout_requests"("provider", "provider_payout_id");

CREATE INDEX IF NOT EXISTS "payout_requests_payout_method_id_idx"
ON "payout_requests"("payout_method_id");

CREATE UNIQUE INDEX IF NOT EXISTS "payout_requests_user_id_idempotency_key_key"
ON "payout_requests"("user_id", "idempotency_key");

-- ---------------------------------------------------------------------------
-- 5. Create coin_lots.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "coin_lots" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "order_id" UUID,

  "source_type" "CoinLotSourceType" NOT NULL DEFAULT 'PURCHASE',
  "provider" "PurchaseProvider" NOT NULL,

  "coins_purchased" INTEGER NOT NULL,
  "coins_remaining" INTEGER NOT NULL,

  "price_cents" INTEGER,
  "currency" TEXT NOT NULL DEFAULT 'USD',

  "provider_payment_intent_id" TEXT,
  "provider_charge_id" TEXT,
  "provider_balance_transaction_id" TEXT,
  "provider_available_on" TIMESTAMP(3),

  "status" "CoinLotStatus" NOT NULL DEFAULT 'PENDING',

  "metadata_json" JSONB,

  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "coin_lots_pkey" PRIMARY KEY ("id"),

  CONSTRAINT "coin_lots_non_negative_remaining_chk"
  CHECK ("coins_remaining" >= 0),

  CONSTRAINT "coin_lots_positive_purchased_chk"
  CHECK ("coins_purchased" >= 0),

  CONSTRAINT "coin_lots_remaining_not_over_purchased_chk"
  CHECK ("coins_remaining" <= "coins_purchased")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'coin_lots_user_id_fkey'
  ) THEN
    ALTER TABLE "coin_lots"
    ADD CONSTRAINT "coin_lots_user_id_fkey"
    FOREIGN KEY ("user_id")
    REFERENCES "users"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'coin_lots_order_id_fkey'
  ) THEN
    ALTER TABLE "coin_lots"
    ADD CONSTRAINT "coin_lots_order_id_fkey"
    FOREIGN KEY ("order_id")
    REFERENCES "purchase_orders"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "coin_lots_order_id_key"
ON "coin_lots"("order_id");

CREATE INDEX IF NOT EXISTS "coin_lots_user_id_status_idx"
ON "coin_lots"("user_id", "status");

CREATE INDEX IF NOT EXISTS "coin_lots_user_id_status_created_at_idx"
ON "coin_lots"("user_id", "status", "created_at");

CREATE INDEX IF NOT EXISTS "coin_lots_order_id_idx"
ON "coin_lots"("order_id");

CREATE INDEX IF NOT EXISTS "coin_lots_provider_provider_payment_intent_id_idx"
ON "coin_lots"("provider", "provider_payment_intent_id");

CREATE INDEX IF NOT EXISTS "coin_lots_provider_provider_charge_id_idx"
ON "coin_lots"("provider", "provider_charge_id");

CREATE INDEX IF NOT EXISTS "coin_lots_provider_balance_transaction_id_idx"
ON "coin_lots"("provider_balance_transaction_id");

CREATE INDEX IF NOT EXISTS "coin_lots_provider_available_on_idx"
ON "coin_lots"("provider_available_on");

-- ---------------------------------------------------------------------------
-- 6. Add gift transaction idempotency.
-- ---------------------------------------------------------------------------

ALTER TABLE "gift_transactions"
ADD COLUMN IF NOT EXISTS "idempotency_key" VARCHAR(120);

CREATE UNIQUE INDEX IF NOT EXISTS "gift_transactions_sender_user_id_idempotency_key_key"
ON "gift_transactions"("sender_user_id", "idempotency_key");

-- ---------------------------------------------------------------------------
-- 7. Create gift_coin_sources.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "gift_coin_sources" (
  "id" UUID NOT NULL,
  "gift_tx_id" UUID NOT NULL,
  "coin_lot_id" UUID NOT NULL,

  "coins_used" INTEGER NOT NULL,

  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "gift_coin_sources_pkey" PRIMARY KEY ("id"),

  CONSTRAINT "gift_coin_sources_positive_coins_chk"
  CHECK ("coins_used" > 0)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'gift_coin_sources_gift_tx_id_fkey'
  ) THEN
    ALTER TABLE "gift_coin_sources"
    ADD CONSTRAINT "gift_coin_sources_gift_tx_id_fkey"
    FOREIGN KEY ("gift_tx_id")
    REFERENCES "gift_transactions"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'gift_coin_sources_coin_lot_id_fkey'
  ) THEN
    ALTER TABLE "gift_coin_sources"
    ADD CONSTRAINT "gift_coin_sources_coin_lot_id_fkey"
    FOREIGN KEY ("coin_lot_id")
    REFERENCES "coin_lots"("id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "gift_coin_sources_gift_tx_id_coin_lot_id_key"
ON "gift_coin_sources"("gift_tx_id", "coin_lot_id");

CREATE INDEX IF NOT EXISTS "gift_coin_sources_gift_tx_id_idx"
ON "gift_coin_sources"("gift_tx_id");

CREATE INDEX IF NOT EXISTS "gift_coin_sources_coin_lot_id_idx"
ON "gift_coin_sources"("coin_lot_id");

-- ---------------------------------------------------------------------------
-- 8. Create streamer_earnings.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "streamer_earnings" (
  "id" UUID NOT NULL,
  "streamer_user_id" UUID NOT NULL,
  "gift_tx_id" UUID NOT NULL,
  "gift_coin_source_id" UUID NOT NULL,

  "diamonds_earned" INTEGER NOT NULL,
  "coins_source_used" INTEGER NOT NULL,

  "gross_amount_cents" INTEGER NOT NULL,
  "platform_fee_cents" INTEGER NOT NULL DEFAULT 0,
  "streamer_amount_cents" INTEGER NOT NULL,

  "provider_available_on" TIMESTAMP(3),
  "hold_until" TIMESTAMP(3) NOT NULL,
  "available_at" TIMESTAMP(3) NOT NULL,

  "status" "StreamerEarningStatus" NOT NULL DEFAULT 'PENDING',

  "payout_request_id" UUID,

  "reversal_reason" VARCHAR(300),
  "reversed_at" TIMESTAMP(3),

  "metadata_json" JSONB,

  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "streamer_earnings_pkey" PRIMARY KEY ("id"),

  CONSTRAINT "streamer_earnings_non_negative_amounts_chk"
  CHECK (
    "diamonds_earned" >= 0
    AND "coins_source_used" >= 0
    AND "gross_amount_cents" >= 0
    AND "platform_fee_cents" >= 0
    AND "streamer_amount_cents" >= 0
  )
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'streamer_earnings_streamer_user_id_fkey'
  ) THEN
    ALTER TABLE "streamer_earnings"
    ADD CONSTRAINT "streamer_earnings_streamer_user_id_fkey"
    FOREIGN KEY ("streamer_user_id")
    REFERENCES "users"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'streamer_earnings_gift_tx_id_fkey'
  ) THEN
    ALTER TABLE "streamer_earnings"
    ADD CONSTRAINT "streamer_earnings_gift_tx_id_fkey"
    FOREIGN KEY ("gift_tx_id")
    REFERENCES "gift_transactions"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'streamer_earnings_gift_coin_source_id_fkey'
  ) THEN
    ALTER TABLE "streamer_earnings"
    ADD CONSTRAINT "streamer_earnings_gift_coin_source_id_fkey"
    FOREIGN KEY ("gift_coin_source_id")
    REFERENCES "gift_coin_sources"("id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'streamer_earnings_payout_request_id_fkey'
  ) THEN
    ALTER TABLE "streamer_earnings"
    ADD CONSTRAINT "streamer_earnings_payout_request_id_fkey"
    FOREIGN KEY ("payout_request_id")
    REFERENCES "payout_requests"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "streamer_earnings_streamer_user_id_status_available_at_idx"
ON "streamer_earnings"("streamer_user_id", "status", "available_at");

CREATE INDEX IF NOT EXISTS "streamer_earnings_streamer_user_id_status_idx"
ON "streamer_earnings"("streamer_user_id", "status");

CREATE INDEX IF NOT EXISTS "streamer_earnings_gift_tx_id_idx"
ON "streamer_earnings"("gift_tx_id");

CREATE INDEX IF NOT EXISTS "streamer_earnings_gift_coin_source_id_idx"
ON "streamer_earnings"("gift_coin_source_id");

CREATE INDEX IF NOT EXISTS "streamer_earnings_payout_request_id_idx"
ON "streamer_earnings"("payout_request_id");

CREATE INDEX IF NOT EXISTS "streamer_earnings_available_at_idx"
ON "streamer_earnings"("available_at");

CREATE INDEX IF NOT EXISTS "streamer_earnings_available_cashout_idx"
ON "streamer_earnings"("streamer_user_id", "available_at")
WHERE "status" = 'AVAILABLE' AND "payout_request_id" IS NULL;

-- ---------------------------------------------------------------------------
-- 9. Legacy coin balance backfill.
-- ---------------------------------------------------------------------------

INSERT INTO "coin_lots" (
  "id",
  "user_id",
  "order_id",
  "source_type",
  "provider",
  "coins_purchased",
  "coins_remaining",
  "price_cents",
  "currency",
  "provider_payment_intent_id",
  "provider_charge_id",
  "provider_balance_transaction_id",
  "provider_available_on",
  "status",
  "metadata_json",
  "created_at",
  "updated_at"
)
SELECT
  gen_random_uuid(),
  w."user_id",
  NULL,
  'LEGACY_MIGRATION',
  'DEV',
  w."coins",
  w."coins",
  NULL,
  'USD',
  NULL,
  NULL,
  NULL,
  CURRENT_TIMESTAMP,
  'AVAILABLE',
  jsonb_build_object(
    'source', 'legacy_wallet_balance_backfill',
    'note', 'Created from wallets.coins during auditable ledger migration'
  ),
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "wallets" w
WHERE w."coins" > 0
  AND NOT EXISTS (
    SELECT 1
    FROM "coin_lots" cl
    WHERE cl."user_id" = w."user_id"
      AND cl."source_type" = 'LEGACY_MIGRATION'
  );

-- ---------------------------------------------------------------------------
-- 10. Seed creator earnings config.
-- AppConfig maps to app_config, with columns:
--   key
--   valueJson
--   createdAt
--   updatedAt
-- ---------------------------------------------------------------------------

INSERT INTO "app_config" (
  "key",
  "valueJson",
  "createdAt",
  "updatedAt"
)
VALUES (
  'creator_earnings',
  jsonb_build_object(
    'diamondToCentsRate', 1,
    'platformFeeBps', 0,
    'defaultHoldDays', 7,
    'establishedStreamerHoldDays', 4,
    'largeGiftCoinThreshold', 10000,
    'largeGiftExtraHoldDays', 14,
    'firstPayoutRequiresManualReview', true
  ),
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("key") DO NOTHING;
