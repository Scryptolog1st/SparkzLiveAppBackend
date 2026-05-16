-- Add enum values for platform-level moderation actions
ALTER TYPE "ModerationActionType" ADD VALUE IF NOT EXISTS 'USER_BAN';
ALTER TYPE "ModerationActionType" ADD VALUE IF NOT EXISTS 'USER_UNBAN';

-- Add platform-ban fields to users
ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "is_platform_banned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "platform_ban_issued_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "platform_ban_expires_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "platform_ban_reason" VARCHAR(300),
ADD COLUMN IF NOT EXISTS "platform_banned_by_admin_user_id" UUID,
ADD COLUMN IF NOT EXISTS "force_logout_at" TIMESTAMP(3);

-- Make moderation_actions.stream_id optional for platform-wide actions
ALTER TABLE "moderation_actions"
ALTER COLUMN "stream_id" DROP NOT NULL;