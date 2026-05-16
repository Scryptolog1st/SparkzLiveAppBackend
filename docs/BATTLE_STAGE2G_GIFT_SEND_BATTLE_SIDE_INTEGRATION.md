# Battle Stage 2G - Gift Send Battle Side Integration

This patch integrates the battle scoring path into the normal gift-send endpoint.

Endpoint:

POST /streams/:id/gifts/send

Added optional request field:

battleSideId: uuid

Behavior:
- When battleSideId is omitted, existing gift-send behavior is preserved.
- When battleSideId is present, the backend validates that the selected side belongs to an active battle linked to the current stream.
- The recipient must be the selected side host or an accepted participant on the selected side.
- This allows a viewer in one linked stream to send a gift to the opponent side during a battle.
- The normal gift transaction, wallet deduction, diamond credit, notifications, milestones, and gift events still run through EconomyService.
- After the gift transaction exists, the backend records BattleSideContribution through BattlesService.
- BattleSide.score increments through the existing Stage 2D scoring path.
- The existing battle.v2.scoreUpdated event is emitted by BattlesService.
- Idempotent gift retries also attempt to record the battle contribution safely by gift transaction id.

Not included yet:
- Mobile GiftSheet battle-side recipient UI.
- Top gifters dedicated event.
- Team battle participant selection.
- Random battle queue.

Patch verification marker: BATTLE_STAGE2G_GIFT_SEND_BATTLE_SIDE_INTEGRATION
