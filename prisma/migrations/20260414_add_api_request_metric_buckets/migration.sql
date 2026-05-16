-- CreateTable
CREATE TABLE "api_request_metric_buckets" (
    "id" TEXT NOT NULL,
    "bucketStart" TIMESTAMP(3) NOT NULL,
    "routeKey" TEXT NOT NULL,
    "routeCategory" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "routePattern" TEXT NOT NULL,
    "requestCount" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "clientErrorCount" INTEGER NOT NULL DEFAULT 0,
    "serverErrorCount" INTEGER NOT NULL DEFAULT 0,
    "totalDurationMs" INTEGER NOT NULL DEFAULT 0,
    "lastStatusCode" INTEGER,
    "lastSeenAt" TIMESTAMP(3),
    "lastErrorAt" TIMESTAMP(3),
    "lastErrorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_request_metric_buckets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "api_request_metric_buckets_bucketStart_routeKey_key"
ON "api_request_metric_buckets"("bucketStart", "routeKey");

-- CreateIndex
CREATE INDEX "api_request_metric_buckets_bucketStart_idx"
ON "api_request_metric_buckets"("bucketStart");

-- CreateIndex
CREATE INDEX "api_request_metric_buckets_routeCategory_bucketStart_idx"
ON "api_request_metric_buckets"("routeCategory", "bucketStart");