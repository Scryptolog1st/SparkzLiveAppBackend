-- Alter existing users table
ALTER TABLE "users"
ADD COLUMN "email_verified_at" TIMESTAMP(3);

-- Create enums
CREATE TYPE "EmailSmtpAccountStatus" AS ENUM (
    'ACTIVE',
    'DISABLED',
    'FAILING',
    'ARCHIVED'
);

CREATE TYPE "EmailCategory" AS ENUM (
    'AUTH_VERIFY_EMAIL',
    'AUTH_PASSWORD_RESET',
    'AUTH_EMAIL_CHANGE_VERIFY',
    'BAN_APPEAL_RECEIVED',
    'BAN_APPEAL_APPROVED',
    'BAN_APPEAL_DENIED',
    'ACCOUNT_CREATED',
    'ACCOUNT_DELETED',
    'PURCHASE_CONFIRMATION',
    'PAYOUT_REQUEST_RECEIVED',
    'PAYOUT_APPROVED',
    'PAYOUT_DENIED',
    'PAYOUT_PROCESSED',
    'SUPPORT_REPLY',
    'ADMIN_MANUAL_MESSAGE',
    'MARKETING_CAMPAIGN'
);

CREATE TYPE "EmailTemplateStatus" AS ENUM (
    'DRAFT',
    'ACTIVE'
);

CREATE TYPE "EmailDeliveryStatus" AS ENUM (
    'QUEUED',
    'SENDING',
    'SENT',
    'FAILED',
    'BOUNCED'
);

-- Create smtp_accounts
CREATE TABLE "smtp_accounts" (
    "id" UUID NOT NULL,
    "label" VARCHAR(120) NOT NULL,
    "host" VARCHAR(255) NOT NULL,
    "port" INTEGER NOT NULL,
    "secure" BOOLEAN NOT NULL DEFAULT false,
    "username" VARCHAR(255) NOT NULL,
    "encrypted_password" TEXT NOT NULL,
    "from_name" VARCHAR(120) NOT NULL,
    "from_email" VARCHAR(255) NOT NULL,
    "reply_to_email" VARCHAR(255),
    "status" "EmailSmtpAccountStatus" NOT NULL DEFAULT 'DISABLED',
    "priority" INTEGER NOT NULL DEFAULT 100,
    "notes" VARCHAR(2000),
    "last_verified_at" TIMESTAMP(3),
    "last_healthcheck_at" TIMESTAMP(3),
    "last_error" VARCHAR(2000),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "smtp_accounts_pkey" PRIMARY KEY ("id")
);

-- Create email_category_mappings
CREATE TABLE "email_category_mappings" (
    "id" UUID NOT NULL,
    "category" "EmailCategory" NOT NULL,
    "smtp_account_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_category_mappings_pkey" PRIMARY KEY ("id")
);

-- Create email_templates
CREATE TABLE "email_templates" (
    "id" UUID NOT NULL,
    "key" VARCHAR(120) NOT NULL,
    "category" "EmailCategory" NOT NULL,
    "subject" VARCHAR(500) NOT NULL,
    "html_body" TEXT NOT NULL,
    "text_body" TEXT NOT NULL,
    "required_variables" JSONB,
    "status" "EmailTemplateStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);

-- Create email_delivery_logs
CREATE TABLE "email_delivery_logs" (
    "id" UUID NOT NULL,
    "category" "EmailCategory" NOT NULL,
    "smtp_account_id" UUID,
    "template_key" VARCHAR(120),
    "recipient_email" VARCHAR(255) NOT NULL,
    "recipient_user_id" UUID,
    "subject_snapshot" VARCHAR(500),
    "html_snapshot" TEXT,
    "text_snapshot" TEXT,
    "status" "EmailDeliveryStatus" NOT NULL DEFAULT 'QUEUED',
    "provider_message_id" VARCHAR(255),
    "provider_response" TEXT,
    "error_message" VARCHAR(4000),
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "initiated_by_admin_user_id" UUID,
    "correlation_json" JSONB,
    "last_attempt_at" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_delivery_logs_pkey" PRIMARY KEY ("id")
);

-- Create email_verification_tokens
CREATE TABLE "email_verification_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verification_tokens_pkey" PRIMARY KEY ("id")
);

-- Create password_reset_tokens
CREATE TABLE "password_reset_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- Unique indexes
CREATE UNIQUE INDEX "smtp_accounts_label_key"
ON "smtp_accounts"("label");

CREATE UNIQUE INDEX "email_category_mappings_category_key"
ON "email_category_mappings"("category");

CREATE UNIQUE INDEX "email_templates_key_key"
ON "email_templates"("key");

CREATE UNIQUE INDEX "email_verification_tokens_token_hash_key"
ON "email_verification_tokens"("token_hash");

CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key"
ON "password_reset_tokens"("token_hash");

-- Regular indexes
CREATE INDEX "smtp_accounts_status_priority_idx"
ON "smtp_accounts"("status", "priority");

CREATE INDEX "smtp_accounts_from_email_idx"
ON "smtp_accounts"("from_email");

CREATE INDEX "email_category_mappings_smtp_account_id_idx"
ON "email_category_mappings"("smtp_account_id");

CREATE INDEX "email_templates_category_status_idx"
ON "email_templates"("category", "status");

CREATE INDEX "email_templates_updated_at_idx"
ON "email_templates"("updated_at");

CREATE INDEX "email_delivery_logs_status_created_at_idx"
ON "email_delivery_logs"("status", "created_at");

CREATE INDEX "email_delivery_logs_category_created_at_idx"
ON "email_delivery_logs"("category", "created_at");

CREATE INDEX "email_delivery_logs_recipient_email_created_at_idx"
ON "email_delivery_logs"("recipient_email", "created_at");

CREATE INDEX "email_delivery_logs_recipient_user_id_created_at_idx"
ON "email_delivery_logs"("recipient_user_id", "created_at");

CREATE INDEX "email_delivery_logs_smtp_account_id_created_at_idx"
ON "email_delivery_logs"("smtp_account_id", "created_at");

CREATE INDEX "email_delivery_logs_template_key_created_at_idx"
ON "email_delivery_logs"("template_key", "created_at");

CREATE INDEX "email_verification_tokens_user_id_expires_at_idx"
ON "email_verification_tokens"("user_id", "expires_at");

CREATE INDEX "email_verification_tokens_email_expires_at_idx"
ON "email_verification_tokens"("email", "expires_at");

CREATE INDEX "password_reset_tokens_user_id_expires_at_idx"
ON "password_reset_tokens"("user_id", "expires_at");

CREATE INDEX "password_reset_tokens_email_expires_at_idx"
ON "password_reset_tokens"("email", "expires_at");

-- Foreign keys
ALTER TABLE "email_category_mappings"
ADD CONSTRAINT "email_category_mappings_smtp_account_id_fkey"
FOREIGN KEY ("smtp_account_id")
REFERENCES "smtp_accounts"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

ALTER TABLE "email_delivery_logs"
ADD CONSTRAINT "email_delivery_logs_smtp_account_id_fkey"
FOREIGN KEY ("smtp_account_id")
REFERENCES "smtp_accounts"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
