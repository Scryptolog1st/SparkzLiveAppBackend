-- AlterTable
ALTER TABLE "profiles" ALTER COLUMN "bio" SET DATA TYPE VARCHAR(1000);

-- AlterTable
ALTER TABLE "users" ADD COLUMN "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "two_factor_secret" TEXT;
