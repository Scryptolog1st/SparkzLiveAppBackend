# Battle Fix - Stale Cleanup Uses Valid End Reason

This patch fixes a Prisma enum validation error from Random Queue stale battle cleanup.

Problem:

- Stale battle cleanup attempted to set `endedReason: "ABANDONED"`.
- `ABANDONED` is not a valid `BattleEndReason` enum value.
- Prisma rejected the update before the stale battle could be cleared.

Patched file:

- src/modules/battles/battles.service.ts

Behavior:

- Stale Random Queue cleanup now sets `endedReason: "CANCELLED"`.
- The emitted `battle.v2.ended` event still includes `autoClearedForRandomQueue: true`.
- Random Queue can clear old stale blocking sessions without enum validation failure.

Intentionally not changed:

- No mobile files.
- No Prisma commands.
- No database commands.
- No Docker commands.
- No Git commands.
- No build commands.
- No TypeScript command.

Patch verification marker: BATTLE_FIX_STALE_CLEANUP_USES_VALID_END_REASON
