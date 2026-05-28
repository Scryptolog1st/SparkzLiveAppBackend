CREATE TABLE "stream_heart_stats" (
    "id" UUID NOT NULL,
    "stream_id" UUID NOT NULL,
    "sender_user_id" UUID NOT NULL,
    "host_user_id" UUID NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stream_heart_stats_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "stream_heart_stats_stream_id_sender_user_id_key"
    ON "stream_heart_stats"("stream_id", "sender_user_id");

CREATE INDEX "stream_heart_stats_sender_user_id_idx"
    ON "stream_heart_stats"("sender_user_id");

CREATE INDEX "stream_heart_stats_host_user_id_idx"
    ON "stream_heart_stats"("host_user_id");

CREATE INDEX "stream_heart_stats_stream_id_idx"
    ON "stream_heart_stats"("stream_id");
