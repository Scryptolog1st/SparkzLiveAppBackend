-- CreateTable
CREATE TABLE "system_log_events" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "detailsJson" JSONB,
    "requestId" TEXT,
    "route" TEXT,
    "method" TEXT,
    "statusCode" INTEGER,
    "durationMs" INTEGER,
    "streamId" TEXT,
    "roomName" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_log_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "system_log_events_createdAt_idx"
ON "system_log_events"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "system_log_events_source_createdAt_idx"
ON "system_log_events"("source", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "system_log_events_source_level_createdAt_idx"
ON "system_log_events"("source", "level", "createdAt" DESC);