ALTER TABLE "system_log_events"
ADD COLUMN "event_code" VARCHAR(120),
ADD COLUMN "environment" VARCHAR(80),
ADD COLUMN "client_platform" VARCHAR(40),
ADD COLUMN "client_app_version" VARCHAR(80),
ADD COLUMN "client_build_number" VARCHAR(80),
ADD COLUMN "client_release_channel" VARCHAR(80),
ADD COLUMN "device_model" VARCHAR(120),
ADD COLUMN "device_os_version" VARCHAR(120),
ADD COLUMN "network_type" VARCHAR(60),
ADD COLUMN "session_id" VARCHAR(120),
ADD COLUMN "fingerprint" VARCHAR(255);

CREATE INDEX "system_log_events_event_code_createdAt_idx"
ON "system_log_events"("event_code", "createdAt" DESC);

CREATE INDEX "system_log_events_client_platform_createdAt_idx"
ON "system_log_events"("client_platform", "createdAt" DESC);

CREATE INDEX "system_log_events_fingerprint_createdAt_idx"
ON "system_log_events"("fingerprint", "createdAt" DESC);