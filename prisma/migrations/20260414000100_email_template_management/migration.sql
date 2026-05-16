CREATE TYPE "EmailTemplateEditorType" AS ENUM ('MJML', 'HTML');
CREATE TYPE "EmailTemplateVersionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

CREATE TABLE "email_template_definitions" (
    "id" UUID NOT NULL,
    "key" VARCHAR(120) NOT NULL,
    "category" "EmailCategory" NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "description" VARCHAR(1000),
    "editor_type" "EmailTemplateEditorType" NOT NULL DEFAULT 'MJML',
    "allowed_variables" JSONB NOT NULL,
    "required_variables" JSONB NOT NULL,
    "sample_variables" JSONB,
    "published_version_id" UUID,
    "created_by_admin_user_id" UUID,
    "updated_by_admin_user_id" UUID,
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_template_definitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "email_template_versions" (
    "id" UUID NOT NULL,
    "definition_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "EmailTemplateVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "subject" VARCHAR(500) NOT NULL,
    "markup_source" TEXT NOT NULL,
    "text_body_source" TEXT,
    "html_body_compiled" TEXT NOT NULL,
    "text_body_compiled" TEXT NOT NULL,
    "design_json" JSONB,
    "validation_errors_json" JSONB,
    "placeholders" JSONB,
    "compiled_at" TIMESTAMP(3),
    "created_by_admin_user_id" UUID,
    "updated_by_admin_user_id" UUID,
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_template_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "email_template_test_logs" (
    "id" UUID NOT NULL,
    "template_version_id" UUID NOT NULL,
    "recipient_email" VARCHAR(255) NOT NULL,
    "sample_variables_json" JSONB,
    "delivery_log_id" UUID,
    "initiated_by_admin_user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_template_test_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "email_template_definitions_key_key"
ON "email_template_definitions"("key");

CREATE UNIQUE INDEX "email_template_definitions_category_key"
ON "email_template_definitions"("category");

CREATE UNIQUE INDEX "email_template_definitions_published_version_id_key"
ON "email_template_definitions"("published_version_id");

CREATE UNIQUE INDEX "email_template_versions_definition_id_version_key"
ON "email_template_versions"("definition_id", "version");

CREATE INDEX "email_template_definitions_category_idx"
ON "email_template_definitions"("category");

CREATE INDEX "email_template_definitions_archived_at_idx"
ON "email_template_definitions"("archived_at");

CREATE INDEX "email_template_definitions_updated_at_idx"
ON "email_template_definitions"("updated_at");

CREATE INDEX "email_template_versions_definition_id_status_idx"
ON "email_template_versions"("definition_id", "status");

CREATE INDEX "email_template_versions_compiled_at_idx"
ON "email_template_versions"("compiled_at");

CREATE INDEX "email_template_versions_updated_at_idx"
ON "email_template_versions"("updated_at");

CREATE INDEX "email_template_test_logs_template_version_id_created_at_idx"
ON "email_template_test_logs"("template_version_id", "created_at");

CREATE INDEX "email_template_test_logs_recipient_email_created_at_idx"
ON "email_template_test_logs"("recipient_email", "created_at");

ALTER TABLE "email_template_versions"
ADD CONSTRAINT "email_template_versions_definition_id_fkey"
FOREIGN KEY ("definition_id")
REFERENCES "email_template_definitions"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "email_template_definitions"
ADD CONSTRAINT "email_template_definitions_published_version_id_fkey"
FOREIGN KEY ("published_version_id")
REFERENCES "email_template_versions"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

ALTER TABLE "email_template_test_logs"
ADD CONSTRAINT "email_template_test_logs_template_version_id_fkey"
FOREIGN KEY ("template_version_id")
REFERENCES "email_template_versions"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;