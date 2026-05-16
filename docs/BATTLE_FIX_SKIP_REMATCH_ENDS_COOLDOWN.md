# Battle Fix - Skip Rematch Ends Cooldown

This patch fixes cooldown/rematch skip behavior.

Problem:

- `COOLDOWN` is treated as an active blocking battle state.
- `submitBattleRematchVoteV2` recorded `SKIP`, but did not end the battle immediately.
- Users could both skip rematch and still be blocked from starting another random 1v1 until cooldown expiry processing ended the battle.

Patched file:

- src/modules/battles/battles.service.ts

Behavior added:

- Any `SKIP` rematch vote immediately ends the cooldown battle.
- The battle is updated to `ENDED` with `endedReason: "NORMAL"`.
- Backend emits `battle.v2.ended` with:
  - `rematchSkipped: true`
  - `rematchStarted: false`
  - `skippedByUserId`
- `processBattleCooldownExpiryV2` also ends any cooldown battle that already has a `SKIP` vote.
- Unanimous `REMATCH` behavior is preserved.

Intentionally not changed:

- No mobile files.
- No Prisma commands.
- No database commands.
- No Docker commands.
- No Git commands.
- No build commands.
- No TypeScript command.

Patch verification marker: BATTLE_FIX_SKIP_REMATCH_ENDS_COOLDOWN
