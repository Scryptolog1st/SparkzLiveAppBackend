# Phase 13 — Safe wiring of PaymentsModule

Use this if the previous wiring script hit a regex timeout.

## Steps
```powershell
.ackend\scripts\phase13-wire-payments-module-safe.ps1
docker compose restart liveapp-api
.ackend\scripts\phase13-smoke.ps1 -BaseUrl http://localhost:3001
```

## Verify
```powershell
Select-String -Path .ackend\srcpp.module.ts -Pattern "PaymentsModule"
```

You should see:
- an import from `./modules/payments/payments.module`
- `PaymentsModule` inside the `@Module({ imports: [...] })` array
