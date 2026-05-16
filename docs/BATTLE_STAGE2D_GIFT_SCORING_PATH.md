# Battle Stage 2D - Gift Scoring Path

This patch adds the backend-only generalized battle gift scoring write path.

Added endpoint:

POST /battle-sessions/:battleSessionId/sides/:sideId/contributions

Body requires:
giftTxId: uuid

Behavior:
- requires JWT auth
- requires the battle session to be active/scoring
- rejects contributions after endsAt
- validates the selected side belongs to the battle
- validates the gift transaction exists
- validates the actor is the gift sender
- validates the gift recipient belongs to the selected battle side
- creates BattleSideContribution
- increments BattleSide.score
- is idempotent by giftTxId
- emits battle.v2.scoreUpdated
- returns serialized battle session with scoreboard and top gifter summary

Not included yet:
- direct integration with /streams/:id/gifts/send
- mobile UI for choosing left/right side
- timer-expiry job
- cooldown
- rematch
- rewards for top gifters

Patch verification marker: BATTLE_STAGE2D_GIFT_SCORING_PATH
