-- Add gift effect size tagging for stream gift behavior.
-- Applied by the normal Docker/Prisma migration deployment flow.
-- No Prisma CLI commands are run by this patch.

ALTER TABLE "gifts"
ADD COLUMN IF NOT EXISTS "effect_size" TEXT NOT NULL DEFAULT 'MEDIUM';

UPDATE "gifts"
SET "effect_size" = CASE
  WHEN "is_big_gift" = true THEN 'LARGE'
  ELSE 'MEDIUM'
END
WHERE "effect_size" IS NULL
   OR "effect_size" = '';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'gifts_effect_size_check'
  ) THEN
    ALTER TABLE "gifts"
    ADD CONSTRAINT "gifts_effect_size_check"
    CHECK ("effect_size" IN ('SMALL', 'MEDIUM', 'LARGE', 'EXTRA_LARGE'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "gifts_effect_size_idx"
ON "gifts" ("effect_size");
