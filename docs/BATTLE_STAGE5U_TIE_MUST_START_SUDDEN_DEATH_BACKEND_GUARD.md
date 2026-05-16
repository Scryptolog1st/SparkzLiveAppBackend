# Battle Stage 5U - Tie Must Start Sudden Death Backend Guard

Backend-only patch.

Fix:

- A tied expired battle cannot enter COOLDOWN.
- If `winningSides.length !== 1`, the battle session remains the same and transitions to SUDDEN_DEATH.
- Existing side scores are preserved.
- `endsAt` is reset to now + 30 seconds.
- `battle.v2.suddenDeathStarted` is emitted to all linked stream rooms.
- COOLDOWN remains allowed only when exactly one side is winning.

Patch verification marker: BATTLE_STAGE5U_TIE_MUST_START_SUDDEN_DEATH
