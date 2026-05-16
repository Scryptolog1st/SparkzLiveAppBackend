# PHASE 13.3.3 — Google REAL verification (Android Publisher API)

This checkpoint upgrades `POST /payments/iap/google/verify` from **STUB** to **REAL** verification using the Google Play Developer API.

## What REAL mode does
When `IAP_GOOGLE_VERIFY_MODE=REAL`, the backend:

1) Calls `purchases.products.get` with:
- `packageName`
- `productId`
- `purchaseToken`

Endpoint format (Google docs):
- `GET https://androidpublisher.googleapis.com/androidpublisher/v3/applications/{packageName}/purchases/products/{productId}/tokens/{token}` citeturn1view0

2) Validates the returned `ProductPurchase`:
- `purchaseState` must be **0 (Purchased)**. Docs list: 0 Purchased, 1 Canceled, 2 Pending. citeturn1view1
- `productId` matches request (when present)

3) Maps `productId` → `coin_packages.google_product_id`

4) Credits coins through the existing idempotent fulfill path using:
- provider = `GOOGLE`
- providerRef = `purchaseToken` (dedupe via `@@unique([provider, providerRef])`)

---

## Setup (Google Console + Service Account)

### 1) Enable Google Play Developer API
Follow Google’s “Getting started” steps to:
- create/select a Google Cloud Project
- enable Google Play Developer API citeturn1view2

### 2) Create a service account + grant Play Console permissions
Google’s getting started guide instructs granting access by inviting the service account email in Play Console **Users & permissions** and granting the necessary rights. citeturn1view2

### 3) Put credentials into backend/.env
Recommended: store the service account JSON file contents as base64:

```powershell
# From Windows PowerShell (not pwsh), base64 a file:
[Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\path\to\service-account.json"))
```

Then set:

```env
IAP_GOOGLE_VERIFY_MODE=REAL
GOOGLE_PLAY_PACKAGE_NAME=com.yourcompany.yourapp
GOOGLE_SERVICE_ACCOUNT_JSON_BASE64=<base64-of-json>
```

Alternative (split):
```env
GOOGLE_SERVICE_ACCOUNT_EMAIL=...
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=...
```

---

## Install dependency
The backend uses `google-auth-library` JWT client:
- `JWT.authorize()` and `client.request()` (Node library docs). citeturn0search4

Install it:

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File .\backend\scripts\phase13-3-3-add-google-lib.ps1
```

---

## Smoke test (contract-level)
This works even before full Google setup:

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File .\backend\scripts\phase13-3-3-google-real-contract-smoke.ps1
```

Expected:
- Missing required REAL fields → 400
- Invalid token / missing credentials → controlled 4xx (not 500)

---

## Next
- Phase 13.3.4 Refunds/revokes (Google RTDN + Apple server notifications)
- Phase 13.3.5 Mobile “Buy Coins” screen using `react-native-iap`
