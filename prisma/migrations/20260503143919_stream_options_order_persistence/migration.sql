-- Patch 37A: persist per-user StreamOptionsModal custom order.
ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "stream_options_order" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
