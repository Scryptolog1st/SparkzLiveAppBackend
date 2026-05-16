CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'ANALYST');

CREATE TABLE "admin_users" (
  "id" UUID NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "password_hash" TEXT NOT NULL,
  "role" "AdminRole" NOT NULL DEFAULT 'ADMIN',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "force_password_reset" BOOLEAN NOT NULL DEFAULT false,
  "created_by_id" UUID,
  "last_login_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");
CREATE INDEX "admin_users_role_idx" ON "admin_users"("role");
CREATE INDEX "admin_users_is_active_idx" ON "admin_users"("is_active");
CREATE INDEX "admin_users_created_by_id_idx" ON "admin_users"("created_by_id");