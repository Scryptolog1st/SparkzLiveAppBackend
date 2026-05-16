# Phase 13 — Payments compile fix + Prisma types

If you see TypeScript errors like:
- `PurchaseProvider not exported from @prisma/client`
- `prisma.coinPackage does not exist`
- `prisma.purchaseOrder does not exist`

That means the Prisma schema/migration and Prisma Client generation have not been applied yet.

## Fix order (do this in order)
1) Extract this hotfix zip into repo root (overwrites PaymentsController/Service + schema apply script).
2) Run schema apply:
   - `.ackend\scripts\phase13-apply-schema.ps1`
3) Run migration:
   - `cd backend`
   - `npx prisma migrate dev --name phase13_payments`
4) Regenerate Prisma Client (pick one):
   - restart container: `docker compose restart liveapp-api`
   - OR inside container: `docker compose exec liveapp-api sh -lc "npx prisma generate"`
5) Ensure `PaymentsModule` is imported in `src/app.module.ts`.

Then rerun the Phase 13 smoke test.
