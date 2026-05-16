# Battle Stage 5R - Backend Sudden Death Expiry Loop Fix

This patch fixes sudden death battles getting stuck.

Problem:

- `processBattleTimerExpiryV2` can enter `SUDDEN_DEATH` and set a fresh `endsAt`.
- Automatic expired battle processing depends on `expirableBattleSessionStatusesV2`.
- If `SUDDEN_DEATH` is not expirable, the 30 second sudden death round can expire without being processed.

Fix:

- Include `SUDDEN_DEATH` in `expirableBattleSessionStatusesV2`.
- Normalize `assertBattleCanBeExpiryProcessedV2` so these statuses can expire:
  - ACTIVE
  - SUDDEN_DEATH
  - REMATCH_ACTIVE
- Existing process behavior is preserved:
  - tied scores start another 30 second sudden death round
  - one winning side starts cooldown

Patch verification marker: BATTLE_STAGE5R_BACKEND_SUDDEN_DEATH_EXPIRY_LOOP_FIX
