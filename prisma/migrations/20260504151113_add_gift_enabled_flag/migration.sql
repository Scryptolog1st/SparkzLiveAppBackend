-- Add enable/disable support for gifts.
-- Applied by the normal Docker/Prisma migration deployment flow.

ALTER TABLE "gifts"
ADD COLUMN IF NOT EXISTS "is_enabled" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS "gifts_is_enabled_idx"
ON "gifts" ("is_enabled");
