# Phase 13 — Wire PaymentsModule

Symptom:
- `Cannot GET /payments/coin-packages` (404)
- `Cannot POST /payments/orders` (404)

Cause:
- `PaymentsController` routes are not registered because `PaymentsModule` is not imported into `AppModule`.

Fix:
Run:
```powershell
.\backend\scripts\phase13-wire-payments-module.ps1
docker compose restart liveapp-api
.\backend\scripts\phase13-smoke.ps1 -BaseUrl http://localhost:3001
```

Verification:
In API logs you should see:
- `RoutesResolver PaymentsController {/payments}:`
- `Mapped {/payments/coin-packages, GET}`
- `Mapped {/payments/orders, POST}`
