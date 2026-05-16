# Phase 12 Add-on — Event-backed notifications (polling)

This patch extends the Phase 12 JobsService to create **real notifications** from:
- Gift transactions (`GIFT_RECEIVED`)
- Diamond milestones (`MILESTONE_REACHED`)

## How it works (dev-friendly)
Instead of wiring every feature service immediately, JobsService polls for new rows created since last tick and creates notifications with a dedupeKey:
- `gift_tx:<giftTxId>`
- `milestone:<milestoneId>`

This avoids duplicates even if the job scans overlapping windows.

## Environment knobs (optional)
- `JOBS_INTERVAL_MS` (default 60000)
- `JOBS_SCAN_LOOKBACK_SECONDS` (default 300)
- `NOTIFICATIONS_RETENTION_DAYS` (default 30)

For fast local feedback while testing:
- Set `JOBS_INTERVAL_MS=5000` in `backend/.env` and restart the API.

## Smoke test
Run:
- `backend/scripts/phase12-smoke-gift-notification.ps1 -BaseUrl http://localhost:3001`
