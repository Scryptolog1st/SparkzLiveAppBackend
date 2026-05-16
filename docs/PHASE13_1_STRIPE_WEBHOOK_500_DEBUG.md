# Phase 13.1 — Stripe webhook 500 debug patch

If your webhook smoke test returns `500 Internal server error`, this patch:
- wraps the webhook handler in try/catch
- returns `{ ok:false, error: { name, message, code } }` with HTTP 200
- updates the smoke script to print the full response and fail with the real error message

## Apply
Extract into repo root.

## Run
1) Restart backend so controller code reloads
2) Run:
```powershell
.\backend\scripts\phase13-1-stripe-webhook-smoke.ps1 -BaseUrl http://localhost:3001 -WebhookSecret whsec_dev
```

The response should show the real failure reason in `error.message`.
