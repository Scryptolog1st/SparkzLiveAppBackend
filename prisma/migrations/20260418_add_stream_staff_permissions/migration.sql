BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
  CREATE TYPE "StreamStaffRole" AS ENUM ('VIEWER', 'MODERATOR', 'ADMIN', 'SUPER_ADMIN');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "StreamPermissionKey" AS ENUM (
    'MUTE_CHAT',
    'KICK_VIEWER',
    'BAN_VIEWER',
    'CONTROL_GUEST_MEDIA',
    'REMOVE_GUESTS',
    'APPROVE_GUEST_REQUESTS',
    'CHANGE_LAYOUT',
    'EDIT_STREAM_GOAL',
    'EDIT_PINNED_MESSAGE',
    'ASSIGN_STAFF_ROLES'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "stream_staff_assignments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "stream_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "role" "StreamStaffRole" NOT NULL,
  "assigned_by_user_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "stream_staff_assignments_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "stream_staff_assignments"
    ADD CONSTRAINT "stream_staff_assignments_stream_id_user_id_key"
    UNIQUE ("stream_id", "user_id");
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "stream_staff_assignments_stream_id_idx"
ON "stream_staff_assignments"("stream_id");

CREATE INDEX IF NOT EXISTS "stream_staff_assignments_user_id_idx"
ON "stream_staff_assignments"("user_id");

CREATE INDEX IF NOT EXISTS "stream_staff_assignments_role_idx"
ON "stream_staff_assignments"("role");

DO $$ BEGIN
  ALTER TABLE "stream_staff_assignments"
    ADD CONSTRAINT "stream_staff_assignments_stream_id_fkey"
    FOREIGN KEY ("stream_id") REFERENCES "streams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "stream_staff_assignments"
    ADD CONSTRAINT "stream_staff_assignments_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "stream_staff_assignments"
    ADD CONSTRAINT "stream_staff_assignments_assigned_by_user_id_fkey"
    FOREIGN KEY ("assigned_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "stream_staff_role_permissions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "stream_id" UUID NOT NULL,
  "role" "StreamStaffRole" NOT NULL,
  "permission" "StreamPermissionKey" NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "stream_staff_role_permissions_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "stream_staff_role_permissions"
    ADD CONSTRAINT "stream_staff_role_permissions_stream_id_role_permission_key"
    UNIQUE ("stream_id", "role", "permission");
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "stream_staff_role_permissions_stream_id_idx"
ON "stream_staff_role_permissions"("stream_id");

CREATE INDEX IF NOT EXISTS "stream_staff_role_permissions_stream_id_role_idx"
ON "stream_staff_role_permissions"("stream_id", "role");

DO $$ BEGIN
  ALTER TABLE "stream_staff_role_permissions"
    ADD CONSTRAINT "stream_staff_role_permissions_stream_id_fkey"
    FOREIGN KEY ("stream_id") REFERENCES "streams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

COMMIT;
