# Phase 13.2 — IAP foundation (Apple + Google) with shared coin crediting

This phase sets up the backend plumbing so:
- iOS In-App Purchase (StoreKit 2) can credit coins to the same wallet ledger.
- Android Play Billing can credit coins to the same wallet ledger.
- Website payments (Stripe) can still credit coins via webhooks.
- ALL crediting runs through one server-authoritative, idempotent path.

## Endpoints (JWT)
- `POST /payments/iap/apple/verify`
- `POST /payments/iap/google/verify`

## DB changes
- `PurchaseProvider` adds `APPLE`, `GOOGLE`
- `CoinPackage` adds:
  - `appleProductId` (`coin_packages.apple_product_id`)
  - `googleProductId` (`coin_packages.google_product_id`)
- `PurchaseOrder` dedupe:
  - `@@unique([provider, providerRef])`

## Important: verification is a DEV STUB in Phase 13.2
These endpoints currently trust the client-supplied identifiers **only to prove the wiring**.

### Env toggles (backend/.env)
```
IAP_APPLE_VERIFY_MODE=STUB
IAP_GOOGLE_VERIFY_MODE=STUB
```
Set either to `DISABLED` to turn it off.

## Apply + migrate
```powershell
.\backend\scripts\phase13-2-apply-schema.ps1
cd .\backend
npx prisma format
npx prisma migrate dev --name phase13_2_iap_foundation
```

Then regenerate Prisma (if you build/run inside docker) and restart API:
```powershell
# from repo root
docker compose ps
docker compose exec <api_service_name> sh -lc "npx prisma generate"
```

## Smoke tests
```powershell
.\backend\scripts\phase13-2-smoke-apple-iap.ps1 -BaseUrl http://localhost:3001
.\backend\scripts\phase13-2-smoke-google-iap.ps1 -BaseUrl http://localhost:3001
```

## Next phase (13.3): real verification
- Apple: StoreKit 2 JWS verification and/or App Store Server API
- Google: Android Publisher API verification for purchaseToken
- Handle refunds/revocations via server notifications
