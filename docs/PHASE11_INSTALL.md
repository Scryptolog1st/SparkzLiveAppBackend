# Phase 11 Patch — Explore + Leaderboards + Search

This zip contains drop-in NestJS + Prisma files for Phase 11.

## Extract instructions (recommended)
Extract the zip at your **repo root** (the folder that contains `/backend`).
It will merge files into:
- `backend/src/common/guards/`
- `backend/src/modules/discovery/`
- `backend/scripts/`

If your backend root is already `backend/`, you can also extract into that folder,
but do **not** create `backend/backend` by accident.

---

## ONE REQUIRED CHANGE (AppModule import)

Add this to `backend/src/app.module.ts`:

```ts
import { DiscoveryModule } from './modules/discovery/discovery.module';
```

Then include it in `imports: []`:

```ts
@Module({
  imports: [
    // ...existing modules...
    DiscoveryModule,
  ],
})
export class AppModule {}
```

---

## Endpoints added

- `GET /users/search?q=...&limit=...&cursor=...`
- `GET /explore/streams/live?sort=recent|trending&windowMinutes=10&limit=...`
- `GET /leaderboards?period=daily|weekly|alltime&type=earnings|gifters&limit=...`

---

## Model naming notes (if your Prisma model names differ)

This patch assumes the following Prisma client model names exist:

- `prisma.user` with `profile` relation
- `prisma.stream` with fields: `status`, `hostId`, `startedAt`
- `prisma.streamParticipant` with fields: `streamId`, `leftAt`
- `prisma.chatMessage` with fields: `streamId`, `createdAt`
- `prisma.giftTransaction` with fields: `streamId`, `createdAt`, `senderId`, `recipientId`, `coinsSpent`, `diamondsAwarded`
- `prisma.wallet` with fields: `userId`, `diamondsEarned` and relation: `user`

If any are named differently in your schema, open:
- `backend/src/modules/discovery/discovery.service.ts`
and adjust the prisma calls accordingly.

---

## Optional but recommended: add indexes
Add indexes on:
- chat messages: `(streamId, createdAt)`
- gift transactions: `(streamId, createdAt)`, `(senderId, createdAt)`, `(recipientId, createdAt)`
- stream participants: `(streamId, leftAt)`
- profile display name: `(displayName)`

Then run:
```bash
npx prisma migrate dev --name phase11_discovery_indexes
```

---

## Smoke test
Run:
```powershell
.\backend\scripts\phase11-smoke.ps1 -BaseUrl http://localhost:3000
```
