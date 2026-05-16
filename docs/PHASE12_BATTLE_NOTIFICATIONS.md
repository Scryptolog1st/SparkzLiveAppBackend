# Phase 12.6 — Battle ended notifications (polling)

This patch extends JobsService to emit `NotificationType.BATTLE_ENDED` when a battle ends.

## Dedupe
Uses `dedupeKey = battle_end:<battleId>` and checks `(userId, dedupeKey)` before inserting.

## Smoke test
Run:
- `backend/scripts/phase12-smoke-battle-notification.ps1 -BaseUrl http://localhost:3001`

Tip: for faster feedback while testing, set `JOBS_INTERVAL_MS=5000` in `backend/.env` and restart.
