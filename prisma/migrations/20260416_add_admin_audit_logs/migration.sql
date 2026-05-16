-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "AdminAuditActionType" AS ENUM (
        'VIEW',
        'CREATE',
        'UPDATE',
        'DELETE',
        'STATUS_CHANGE',
        'MODERATION_ACTION',
        'SYSTEM_ACTION',
        'AUTH_ACTION',
        'PERMISSION_ACTION',
        'EXPORT'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "AdminAuditStatus" AS ENUM (
        'SUCCESS',
        'DENIED',
        'FAILED'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "AdminAuditSeverity" AS ENUM (
        'INFO',
        'WARNING',
        'CRITICAL'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "admin_audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),

    "actor_admin_user_id" UUID NOT NULL,
    "actor_email" VARCHAR(255) NOT NULL,
    "actor_name" VARCHAR(160) NOT NULL,
    "actor_role" "AdminRole" NOT NULL,

    "action_type" "AdminAuditActionType" NOT NULL,
    "action_code" VARCHAR(160) NOT NULL,
    "action_label" VARCHAR(255) NOT NULL,

    "resource_type" VARCHAR(120) NOT NULL,
    "resource_id" VARCHAR(120),

    "status" "AdminAuditStatus" NOT NULL DEFAULT 'SUCCESS',
    "severity" "AdminAuditSeverity" NOT NULL DEFAULT 'INFO',

    "target_user_id" UUID,
    "target_stream_id" UUID,
    "target_report_id" UUID,
    "target_payout_request_id" UUID,
    "target_support_ticket_id" VARCHAR(120),

    "target_summary_json" JSONB,
    "secondary_identifiers_json" JSONB,
    "references_json" JSONB,

    "request_path" VARCHAR(500),
    "ip_address" VARCHAR(128),
    "location_label" VARCHAR(255),
    "device_label" VARCHAR(255),
    "user_agent" VARCHAR(1000),

    "before_state_json" JSONB,
    "after_state_json" JSONB,
    "diff_json" JSONB,
    "metadata_json" JSONB,
    "raw_event_json" JSONB,

    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

-- Foreign keys
DO $$ BEGIN
    ALTER TABLE "admin_audit_logs"
        ADD CONSTRAINT "admin_audit_logs_actor_admin_user_id_fkey"
        FOREIGN KEY ("actor_admin_user_id")
        REFERENCES "admin_users"("id")
        ON DELETE CASCADE
        ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS "admin_audit_logs_created_at_idx"
    ON "admin_audit_logs" ("created_at");

CREATE INDEX IF NOT EXISTS "admin_audit_logs_actor_admin_user_id_created_at_idx"
    ON "admin_audit_logs" ("actor_admin_user_id", "created_at");

CREATE INDEX IF NOT EXISTS "admin_audit_logs_actor_role_created_at_idx"
    ON "admin_audit_logs" ("actor_role", "created_at");

CREATE INDEX IF NOT EXISTS "admin_audit_logs_action_type_created_at_idx"
    ON "admin_audit_logs" ("action_type", "created_at");

CREATE INDEX IF NOT EXISTS "admin_audit_logs_action_code_created_at_idx"
    ON "admin_audit_logs" ("action_code", "created_at");

CREATE INDEX IF NOT EXISTS "admin_audit_logs_resource_type_created_at_idx"
    ON "admin_audit_logs" ("resource_type", "created_at");

CREATE INDEX IF NOT EXISTS "admin_audit_logs_resource_id_created_at_idx"
    ON "admin_audit_logs" ("resource_id", "created_at");

CREATE INDEX IF NOT EXISTS "admin_audit_logs_status_created_at_idx"
    ON "admin_audit_logs" ("status", "created_at");

CREATE INDEX IF NOT EXISTS "admin_audit_logs_severity_created_at_idx"
    ON "admin_audit_logs" ("severity", "created_at");

CREATE INDEX IF NOT EXISTS "admin_audit_logs_target_user_id_created_at_idx"
    ON "admin_audit_logs" ("target_user_id", "created_at");

CREATE INDEX IF NOT EXISTS "admin_audit_logs_target_stream_id_created_at_idx"
    ON "admin_audit_logs" ("target_stream_id", "created_at");

CREATE INDEX IF NOT EXISTS "admin_audit_logs_target_report_id_created_at_idx"
    ON "admin_audit_logs" ("target_report_id", "created_at");

CREATE INDEX IF NOT EXISTS "admin_audit_logs_target_payout_request_id_created_at_idx"
    ON "admin_audit_logs" ("target_payout_request_id", "created_at");

CREATE INDEX IF NOT EXISTS "admin_audit_logs_target_support_ticket_id_created_at_idx"
    ON "admin_audit_logs" ("target_support_ticket_id", "created_at");

-- Seed audit permissions if they do not already exist
INSERT INTO "admin_role_permissions" (
    "id",
    "role",
    "permission",
    "enabled",
    "created_at",
    "updated_at"
)
SELECT
    gen_random_uuid(),
    seeded.role,
    seeded.permission,
    seeded.enabled,
    NOW(),
    NOW()
FROM (
    VALUES
        ('SUPER_ADMIN'::"AdminRole", 'audit.logs.view', TRUE),
        ('SUPER_ADMIN'::"AdminRole", 'audit.logs.export', TRUE),
        ('ADMIN'::"AdminRole", 'audit.logs.view', TRUE),
        ('ADMIN'::"AdminRole", 'audit.logs.export', FALSE),
        ('MODERATOR'::"AdminRole", 'audit.logs.view', FALSE),
        ('MODERATOR'::"AdminRole", 'audit.logs.export', FALSE),
        ('ANALYST'::"AdminRole", 'audit.logs.view', FALSE),
        ('ANALYST'::"AdminRole", 'audit.logs.export', FALSE)
) AS seeded(role, permission, enabled)
WHERE NOT EXISTS (
    SELECT 1
    FROM "admin_role_permissions" arp
    WHERE arp."role" = seeded.role
      AND arp."permission" = seeded.permission
);