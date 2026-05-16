-- CreateEnum
CREATE TYPE "AssetSubmissionType" AS ENUM ('CUSTOM_EMOTE', 'SUB_BADGE', 'PROFILE_BANNER', 'PROFILE_AVATAR');

-- CreateEnum
CREATE TYPE "AssetSubmissionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "app_config" (
    "key" TEXT NOT NULL,
    "valueJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_config_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "asset_submissions" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "type" "AssetSubmissionType" NOT NULL,
    "status" "AssetSubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "originalUrl" TEXT NOT NULL,
    "approvedUrl" TEXT,
    "adminNotes" TEXT,
    "reviewedById" UUID,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "asset_submissions_userId_status_idx" ON "asset_submissions"("userId", "status");

-- CreateIndex
CREATE INDEX "asset_submissions_status_createdAt_idx" ON "asset_submissions"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "asset_submissions" ADD CONSTRAINT "asset_submissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_submissions" ADD CONSTRAINT "asset_submissions_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
