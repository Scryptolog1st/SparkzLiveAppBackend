# Phase 13.3.2 — Apple REAL verification (StoreKit 2 JWS)

This phase upgrades `POST /payments/iap/apple/verify` from **STUB** to **REAL** verification using Apple’s official App Store Server Library for Node.

## What REAL mode verifies
In REAL mode the backend:
1) Verifies the **JWS signature** of `signedTransactionInfo` (StoreKit 2 transaction JWS / JWSTransaction)
2) Decodes the payload and extracts:
   - `transactionId` → stored as `providerRef` (idempotency key)
   - `productId` → maps to `coin_packages.apple_product_id`
   - `bundleId` → validated against `APPLE_BUNDLE_ID`
3) Credits coins through the existing append-only wallet ledger path **exactly once**

References:
- Apple’s `SignedDataVerifier.verifyAndDecodeTransaction` API citeturn0search0turn0search1turn0search2
- `jwsRepresentation` is the same as `JWSTransaction` used by the App Store Server API citeturn4search2turn0search3

---

## Files changed
- `backend/src/modules/payments/payments.service.ts`
  - Adds REAL mode to `verifyAppleIapAndCredit`
  - Uses `SignedDataVerifier` when `IAP_APPLE_VERIFY_MODE=REAL`
- `backend/src/modules/payments/dto/apple-iap-verify.dto.ts`
  - Adds legacy `productId` field so STUB remains compatible

---

## Setup steps

### 1) Install the Apple library
From `backend/`:

```bash
npm i @apple/app-store-server-library
```

(We add it to `backend/package.json` in this patch.)

### 2) Download Apple Root certificates
From repo root:

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File .\backend\scripts\phase13-3-2-download-apple-root-certs.ps1
```

This saves `.cer` files into `backend/certs/apple/`.

### 3) Configure backend `.env`
Add/confirm:

```env
IAP_APPLE_VERIFY_MODE=REAL
APPLE_BUNDLE_ID=com.yourcompany.yourapp
APPLE_ENVIRONMENT=Sandbox
APPLE_ROOT_CERTS_DIR=certs/apple
APPLE_ENABLE_ONLINE_CHECKS=false
```

Notes:
- If `APPLE_ROOT_CERTS_DIR` is omitted, the backend defaults to `backend/certs/apple` (relative to backend process cwd).
- `APPLE_ENABLE_ONLINE_CHECKS=true` enables revocation checks; keep `false` for dev stability.

### 4) Restart backend
Restart `api` so env changes are picked up.

---

## Smoke tests

### Contract smoke (does not require iOS purchase)
```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File .\backend\scripts\phase13-3-2-apple-real-contract-smoke.ps1
```

This confirms REAL mode rejects missing/invalid proofs.

### Real sandbox validation (requires iOS build)
Once you can perform an iOS sandbox purchase and obtain StoreKit2’s JWS (`jwsRepresentation` / `verificationResultIOS` depending on client library),
send it as:

```json
{
  "signedTransactionInfo": "<JWS from StoreKit 2>",
  "platform": "ios"
}
```

Expected result:
- First verify credits coins and writes `PURCHASE_CREDIT`
- Replaying same transactionId does **not** credit again (idempotent)

---

## Next checkpoint
Phase **13.3.3 — Google REAL verification** (Android Publisher API purchaseToken verification).
