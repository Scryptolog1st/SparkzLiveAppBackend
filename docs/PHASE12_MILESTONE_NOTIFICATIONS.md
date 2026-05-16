# Phase 12.7 — Milestone reached notifications (verification)

This smoke test verifies that:

1) Gifts increase `wallets.diamonds_earned`
2) Crossing a 1,000,000 threshold creates a `diamond_milestones` row
3) JobsService emits a `NotificationType.MILESTONE_REACHED` notification for the recipient

## Run
```powershell
.\backend\scripts\phase12-smoke-milestone-notification.ps1 -BaseUrl http://localhost:3001
```

## Tip (faster feedback)
If your jobs interval is still 60 seconds, add to `backend/.env`:
```
JOBS_INTERVAL_MS=5000
```
Restart the API and rerun the test.
