# Phase 13.0 — Payments scaffold (DEV provider)

This patch introduces a dev-friendly payments scaffold so you can build monetization UI now,
while keeping the backend **idempotent and ledger-backed**.

## What you get
- `GET /payments/coin-packages` — lists seeded packages (idempotent upsert)
- `POST /payments/orders` — creates a PENDING order for the authenticated user
- `POST /payments/orders/:id/dev/mark-paid` — dev-only helper to simulate provider payment success
- `POST /payments/orders/:id/fulfill` — credits wallet coins **exactly once** (idempotent)

## Schema
Run the schema apply script, then migrate:
1) `backend/scripts/phase13-apply-schema.ps1`
2) `cd backend`
3) `npx prisma migrate dev --name phase13_payments`
4) restart api

## Wire module
Add `PaymentsModule` to `backend/src/app.module.ts` imports.

## Smoke test
Run:
- `backend/scripts/phase13-smoke.ps1 -BaseUrl http://localhost:3001`
