/*
  Warnings:

  - A unique constraint covering the columns `[provider,provider_ref]` on the table `purchase_orders` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PurchaseProvider" ADD VALUE 'APPLE';
ALTER TYPE "PurchaseProvider" ADD VALUE 'GOOGLE';

-- AlterTable
ALTER TABLE "coin_packages" ADD COLUMN     "apple_product_id" TEXT,
ADD COLUMN     "google_product_id" TEXT;

-- CreateIndex
CREATE INDEX "coin_packages_apple_product_id_idx" ON "coin_packages"("apple_product_id");

-- CreateIndex
CREATE INDEX "coin_packages_google_product_id_idx" ON "coin_packages"("google_product_id");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_provider_provider_ref_key" ON "purchase_orders"("provider", "provider_ref");
