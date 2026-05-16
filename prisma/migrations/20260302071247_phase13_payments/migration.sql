-- CreateEnum
CREATE TYPE "PurchaseProvider" AS ENUM ('DEV', 'STRIPE', 'REVENUECAT');

-- CreateEnum
CREATE TYPE "PurchaseStatus" AS ENUM ('PENDING', 'PAID', 'FULFILLED', 'FAILED', 'CANCELED');

-- AlterEnum
ALTER TYPE "LedgerEntryType" ADD VALUE 'PURCHASE_CREDIT';

-- CreateTable
CREATE TABLE "coin_packages" (
    "id" TEXT NOT NULL,
    "coins" INTEGER NOT NULL,
    "price_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coin_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_orders" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "package_id" TEXT NOT NULL,
    "provider" "PurchaseProvider" NOT NULL,
    "status" "PurchaseStatus" NOT NULL,
    "idempotency_key" TEXT,
    "provider_ref" TEXT,
    "coins" INTEGER NOT NULL,
    "price_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "paid_at" TIMESTAMP(3),
    "fulfilled_at" TIMESTAMP(3),

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "coin_packages_is_active_sort_order_idx" ON "coin_packages"("is_active", "sort_order");

-- CreateIndex
CREATE INDEX "purchase_orders_user_id_created_at_idx" ON "purchase_orders"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "purchase_orders_status_created_at_idx" ON "purchase_orders"("status", "created_at");

-- CreateIndex
CREATE INDEX "purchase_orders_provider_provider_ref_idx" ON "purchase_orders"("provider", "provider_ref");

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "coin_packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
