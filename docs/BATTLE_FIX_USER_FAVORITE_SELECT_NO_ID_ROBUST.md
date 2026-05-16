# Battle Fix - UserFavorite Select No ID Robust

This patch/diagnostic targets the Prisma runtime error:

- `Unknown field id for select statement on model UserFavorite`

Expected schema shape from runtime error:

- `userId`
- `favoriteUserId`
- `createdAt`
- `user`
- `favoriteUser`

Fix:

- Replace `select: { id: true }` inside `userFavorite.findFirst(...)` calls with:
  - `select: { userId: true, favoriteUserId: true }`

Files checked:

- `src/modules/battles/battles.service.ts`
- `dist/src/modules/battles/battles.service.js` when present

If src did not need a patch but dist did, the running backend was using stale built output.

Patch verification marker: BATTLE_FIX_USER_FAVORITE_SELECT_NO_ID_ROBUST
