-- Phase 8: Roles + Moderation (Prisma deploy migration)
-- Creates: stream_user_roles, stream_user_restrictions, moderation_actions
-- Adds enums: RestrictionKind, ModerationActionType

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "RestrictionKind" AS ENUM ('MUTE', 'BAN');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "ModerationActionType" AS ENUM ('KICK', 'MUTE', 'BAN', 'UNMUTE', 'UNBAN');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "stream_user_roles" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "stream_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "role" "StreamRole" NOT NULL,
  "assigned_by_user_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "stream_user_roles_pkey" PRIMARY KEY ("id")
);

-- Unique constraint (stream_id, user_id)
DO $$ BEGIN
  ALTER TABLE "stream_user_roles"
    ADD CONSTRAINT "stream_user_roles_stream_id_user_id_key" UNIQUE ("stream_id", "user_id");
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS "stream_user_roles_stream_id_idx" ON "stream_user_roles"("stream_id");
CREATE INDEX IF NOT EXISTS "stream_user_roles_user_id_idx" ON "stream_user_roles"("user_id");

-- Foreign keys
DO $$ BEGIN
  ALTER TABLE "stream_user_roles"
    ADD CONSTRAINT "stream_user_roles_stream_id_fkey" FOREIGN KEY ("stream_id") REFERENCES "streams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "stream_user_roles"
    ADD CONSTRAINT "stream_user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "stream_user_roles"
    ADD CONSTRAINT "stream_user_roles_assigned_by_user_id_fkey" FOREIGN KEY ("assigned_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "stream_user_restrictions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "stream_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "kind" "RestrictionKind" NOT NULL,
  "reason" VARCHAR(300),
  "expires_at" TIMESTAMP(3),
  "created_by_user_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "stream_user_restrictions_pkey" PRIMARY KEY ("id")
);

-- Unique constraint (stream_id, user_id, kind)
DO $$ BEGIN
  ALTER TABLE "stream_user_restrictions"
    ADD CONSTRAINT "stream_user_restrictions_stream_id_user_id_kind_key" UNIQUE ("stream_id", "user_id", "kind");
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS "stream_user_restrictions_stream_id_idx" ON "stream_user_restrictions"("stream_id");
CREATE INDEX IF NOT EXISTS "stream_user_restrictions_user_id_idx" ON "stream_user_restrictions"("user_id");
CREATE INDEX IF NOT EXISTS "stream_user_restrictions_kind_idx" ON "stream_user_restrictions"("kind");
CREATE INDEX IF NOT EXISTS "stream_user_restrictions_expires_at_idx" ON "stream_user_restrictions"("expires_at");

-- Foreign keys
DO $$ BEGIN
  ALTER TABLE "stream_user_restrictions"
    ADD CONSTRAINT "stream_user_restrictions_stream_id_fkey" FOREIGN KEY ("stream_id") REFERENCES "streams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "stream_user_restrictions"
    ADD CONSTRAINT "stream_user_restrictions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "stream_user_restrictions"
    ADD CONSTRAINT "stream_user_restrictions_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "moderation_actions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "stream_id" UUID NOT NULL,
  "action" "ModerationActionType" NOT NULL,
  "target_user_id" UUID NOT NULL,
  "actor_user_id" UUID NOT NULL,
  "reason" VARCHAR(300),
  "duration_seconds" INTEGER,
  "expires_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "moderation_actions_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX IF NOT EXISTS "moderation_actions_stream_id_idx" ON "moderation_actions"("stream_id");
CREATE INDEX IF NOT EXISTS "moderation_actions_target_user_id_idx" ON "moderation_actions"("target_user_id");
CREATE INDEX IF NOT EXISTS "moderation_actions_actor_user_id_idx" ON "moderation_actions"("actor_user_id");
CREATE INDEX IF NOT EXISTS "moderation_actions_created_at_idx" ON "moderation_actions"("created_at");

-- Foreign keys
DO $$ BEGIN
  ALTER TABLE "moderation_actions"
    ADD CONSTRAINT "moderation_actions_stream_id_fkey" FOREIGN KEY ("stream_id") REFERENCES "streams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "moderation_actions"
    ADD CONSTRAINT "moderation_actions_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "moderation_actions"
    ADD CONSTRAINT "moderation_actions_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
