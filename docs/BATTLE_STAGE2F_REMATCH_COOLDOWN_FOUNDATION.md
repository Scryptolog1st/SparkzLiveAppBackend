# Battle Stage 2F - Rematch Cooldown Foundation

This patch adds backend generalized battle cooldown and rematch voting foundation.

Added endpoints:

POST /battle-sessions/:battleSessionId/rematch-vote
POST /battle-sessions/:battleSessionId/process-cooldown

Rematch vote body:
vote: REMATCH or SKIP

Behavior:
- Only active accepted battle participants can vote.
- Votes are allowed only while the battle session is in COOLDOWN.
- Votes are allowed only before cooldownEndsAt.
- If all active accepted participants vote REMATCH before cooldownEndsAt, a new REMATCH BattleSession starts immediately.
- The rematch uses the same battle type, duration, cooldown, category, sides, streams, hosts, participants, roles, and media modes.
- Rematch sides start at score 0 with PENDING result.
- The previous battle is marked ENDED.
- If anyone votes SKIP or the cooldown expires without unanimous REMATCH, the battle ends.
- Automatic cooldown polling runs alongside timer expiry polling.
- Emits battle.v2.rematchVoteUpdated, battle.v2.rematchStarted, and battle.v2.ended.

Not included yet:
- mobile UI
- team rematch ready-check details
- reward distribution for top gifters
- battle stats aggregation

Patch verification marker: BATTLE_STAGE2F_REMATCH_COOLDOWN_FOUNDATION
