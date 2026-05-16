/*
  Warnings:

  - You are about to alter the column `text` on the `chat_messages` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(500)`.

*/
-- DropIndex
DROP INDEX "streams_video_provider_idx";

-- AlterTable
ALTER TABLE "chat_messages" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "text" SET DATA TYPE VARCHAR(500);

-- AlterTable
ALTER TABLE "diamond_milestones" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "refresh_tokens" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "stream_participants" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "stream_schedules" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "streams" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "id" DROP DEFAULT;
