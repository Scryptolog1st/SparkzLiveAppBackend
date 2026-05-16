BEGIN;

CREATE TABLE "admin_role_permissions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "role" "AdminRole" NOT NULL,
  "permission" VARCHAR(120) NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "admin_role_permissions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "admin_role_permissions_role_permission_key"
ON "admin_role_permissions"("role", "permission");

CREATE INDEX "admin_role_permissions_role_idx"
ON "admin_role_permissions"("role");

CREATE INDEX "admin_role_permissions_role_enabled_idx"
ON "admin_role_permissions"("role", "enabled");

COMMIT;