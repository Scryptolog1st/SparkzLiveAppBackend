-- Add exact cursor/ordering index for bounded coin-lot gift consumption.
-- Supports:
--   WHERE user_id = ?
--     AND status = 'AVAILABLE'
--     AND coins_remaining > 0
--   ORDER BY created_at ASC, id ASC
--   LIMIT ?
--   FOR UPDATE
--
-- Note:
-- This migration only creates an index. It does not alter data.

CREATE INDEX IF NOT EXISTS "coin_lots_user_id_status_created_at_id_idx"
ON "coin_lots"("user_id", "status", "created_at", "id");
