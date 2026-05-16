-- Add admin actor references for dashboard-originated moderation actions
-- and make actor_user_id optional so moderation actions can come from either
-- an in-app user or an admin dashboard operator.

BEGIN;

-- ---------------------------------------------------------------------------
-- stream_user_restrictions
-- ---------------------------------------------------------------------------

ALTER TABLE "stream_user_restrictions"
ADD COLUMN "created_by_admin_user_id" UUID;

CREATE INDEX "stream_user_restrictions_created_by_admin_user_id_idx"
ON "stream_user_restrictions"("created_by_admin_user_id");

ALTER TABLE "stream_user_restrictions"
ADD CONSTRAINT "stream_user_restrictions_created_by_admin_user_id_fkey"
FOREIGN KEY ("created_by_admin_user_id")
REFERENCES "admin_users"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- moderation_actions
-- ---------------------------------------------------------------------------

ALTER TABLE "moderation_actions"
ALTER COLUMN "actor_user_id" DROP NOT NULL;

ALTER TABLE "moderation_actions"
ADD COLUMN "actor_admin_user_id" UUID;

CREATE INDEX "moderation_actions_actor_admin_user_id_idx"
ON "moderation_actions"("actor_admin_user_id");

ALTER TABLE "moderation_actions"
ADD CONSTRAINT "moderation_actions_actor_admin_user_id_fkey"
FOREIGN KEY ("actor_admin_user_id")
REFERENCES "admin_users"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

-- Replace the existing actor_user_id foreign key so nullable actor_user_id
-- behaves correctly for admin-originated actions.
ALTER TABLE "moderation_actions"
DROP CONSTRAINT IF EXISTS "moderation_actions_actor_user_id_fkey";

ALTER TABLE "moderation_actions"
ADD CONSTRAINT "moderation_actions_actor_user_id_fkey"
FOREIGN KEY ("actor_user_id")
REFERENCES "users"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

COMMIT;