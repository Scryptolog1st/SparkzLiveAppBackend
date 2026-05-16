-- Add separate live-chat mute enum values without changing the existing timeout flow.

ALTER TYPE "RestrictionKind" ADD VALUE IF NOT EXISTS 'CHAT_MUTE';

ALTER TYPE "ModerationActionType" ADD VALUE IF NOT EXISTS 'CHAT_MUTE';
ALTER TYPE "ModerationActionType" ADD VALUE IF NOT EXISTS 'CHAT_UNMUTE';