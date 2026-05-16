# Phase 13.1 — Stripe webhook verification (no Stripe SDK)

This patch implements a **Stripe-style** webhook endpoint that verifies `Stripe-Signature` using `crypto` (no external stripe package).

## Endpoints added
- `POST /payments/orders/stripe` (JWT) — creates a STRIPE PurchaseOrder in PENDING
- `POST /payments/webhooks/stripe` — verifies signature, reads `metadata.orderId`, marks PAID then fulfills
- `GET /payments/orders/:id` (JWT) — debug/read

## Required env
Add to `backend/.env` (dev default is fine):
```
STRIPE_WEBHOOK_SECRET=whsec_dev
STRIPE_WEBHOOK_TOLERANCE_SECONDS=300
```

## IMPORTANT: enable rawBody
Stripe signature verification requires the exact raw request bytes.

Run:
```powershell
.\backend\scripts\phase13-enable-rawbody.ps1
```
Then restart your API process/container.

## Local smoke (fixture webhook)
```powershell
.\backend\scripts\phase13-1-stripe-webhook-smoke.ps1 -BaseUrl http://localhost:3001 -WebhookSecret whsec_dev
```

## Real Stripe wiring (later)
When you create a real Checkout Session or PaymentIntent in your Stripe integration, set:
- `metadata.orderId = <PurchaseOrder.id>`

Then the webhook can locate and fulfill the correct order safely + idempotently.
