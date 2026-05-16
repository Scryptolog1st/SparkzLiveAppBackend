# PHASE 13.3.1 — Backend contract tightening (IAP)

This checkpoint updates DTOs so the backend **accepts verification-ready payloads** while keeping Phase 13.2 STUB flows working.

## New/updated request bodies

### Apple
`POST /payments/iap/apple/verify`

- Legacy (STUB): `{ "transactionId": "..." }`
- Verification-ready: `{ "signedTransactionInfo": "<JWS>", "appAccountToken": "<uuid>" }`

### Google
`POST /payments/iap/google/verify`

- Legacy (STUB): `{ "purchaseToken": "..." }`
- Verification-ready: `{ "purchaseToken": "...", "productId": "...", "packageName": "..." }`

## Env toggles (add to backend/.env)

```env
# --- Phase 13.3 (IAP REAL verification toggles) ---
# STUB keeps local dev unblocked. REAL enables server-side verification calls.
IAP_APPLE_VERIFY_MODE=STUB   # STUB|REAL|DISABLED
IAP_GOOGLE_VERIFY_MODE=STUB  # STUB|REAL|DISABLED

# Apple (required for REAL)
APPLE_BUNDLE_ID=com.yourcompany.yourapp
APPLE_ENVIRONMENT=Sandbox  # Sandbox|Production

# Google (required for REAL)
GOOGLE_PLAY_PACKAGE_NAME=com.yourcompany.yourapp
GOOGLE_SERVICE_ACCOUNT_JSON_BASE64=
```

> Note: In 13.3.1 we only tighten contracts + env flags. REAL verification logic lands in 13.3.2 (Apple) and 13.3.3 (Google).
