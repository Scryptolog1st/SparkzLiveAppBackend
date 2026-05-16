# Battle Stage 2E - Timer Expiry, Sudden Death, Cooldown

This patch adds backend generalized battle timer-expiry processing.

Added endpoint:

POST /battle-sessions/:battleSessionId/process-expiry

Automatic processing:
- Adds lightweight service lifecycle polling every 5 seconds when the BattlesService initializes.
- Processes up to 10 expired active battle sessions per tick.

Behavior:
- Processes ACTIVE, SUDDEN_DEATH, and REMATCH_ACTIVE battles whose endsAt has passed.
- Calculates winner by BattleSide.score.
- If there is a tie, starts a 30 second sudden death round.
- Sudden death repeats because another tie at expiry starts another 30 second round.
- If one side wins, marks side result WIN/LOSS.
- Moves the battle session into COOLDOWN.
- Sets winnerSideId.
- Sets cooldownStartedAt and cooldownEndsAt.
- Emits battle.v2.suddenDeathStarted or battle.v2.cooldownStarted.

Not included yet:
- rematch voting
- final end after cooldown
- mobile UI
- reward distribution for top gifters

Patch verification marker: BATTLE_STAGE2E_TIMER_EXPIRY_COOLDOWN
