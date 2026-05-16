-- CreateIndex
CREATE INDEX "stream_participants_stream_id_user_id_left_at_idx" ON "stream_participants"("stream_id", "user_id", "left_at");
