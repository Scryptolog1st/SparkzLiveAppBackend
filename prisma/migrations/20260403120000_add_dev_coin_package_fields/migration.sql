ALTER TABLE "coin_packages"
  ADD COLUMN "for_dev_use" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "deleted_at" TIMESTAMP(3);

CREATE INDEX "coin_packages_for_dev_use_is_active_sort_order_idx"
  ON "coin_packages" ("for_dev_use", "is_active", "sort_order");

CREATE INDEX "coin_packages_deleted_at_idx"
  ON "coin_packages" ("deleted_at");
