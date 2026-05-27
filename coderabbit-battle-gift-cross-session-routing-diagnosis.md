# CodeRabbit diagnosis request: Battle gift cross-session routing bug

## Critical runtime bug

We have a major live battle gift routing bug.

If two hosts start Battle Group 1, then two different hosts start Battle Group 2 at the same time, gifts sent in Battle Group 2 are being credited/routed to Battle Group 1 by side color/order.

Observed behavior:
- Group 2 Blue-side gifts get applied to Group 1 Blue side.
- Group 2 Red-side gifts get applied to Group 1 Red side.
- This strongly suggests gift routing/scoring is using a non-unique side key such as BLUE/RED/A/B/teamA/teamB instead of the specific battleSessionId + battleSideId/sideId.
- This is critical because gifts affect battle scores, diamonds, chat events, and winner calculation.

## Expected behavior

Every battle gift must be scoped to the exact active battle session involved in the current stream.

A gift sent during Battle Group 2 must only affect:
- the target recipient user,
- the recipient's exact battle side,
- the exact battleSessionId that contains that side,
- the exact source/target stream pair for that battle session.

No gift from one battle session should ever affect another simultaneous battle session.

## Files to inspect carefully

Please inspect these backend paths:

- `src/modules/economy/economy.controller.ts`
- `src/modules/economy/dto/send-gift.dto.ts`
- `src/modules/economy/economy.service.ts`
- `src/modules/battles/battles.service.ts`
- `src/modules/battles/battle-v2.serializer.ts`
- `src/modules/realtime/realtime.gateway.ts`
- `prisma/schema.prisma`

## Specific code areas to review

Please trace the full flow:

1. Mobile sends:
   `POST /streams/:id/gifts/send`

2. Backend controller passes:
   - streamId
   - recipientUserId
   - giftId
   - quantity
   - battleSideId

3. `EconomyService.sendGift()`

4. `resolveBattleGiftTargetForSendV2()`

5. `recordBattleGiftContributionAfterSendV2()`

6. Any legacy call:
   `this.battles.applyGiftToActiveBattle(...)`

7. Any V2 call:
   `this.battles.recordBattleGiftContributionV2(...)`

8. Any mirror/broadcast:
   `mirrorBattleGiftToTargetStreamV2(...)`
   `realtime.emitGiftSent(...)`
   `battle.scoreUpdated`

## Main questions

Please find the exact bug and recommend a safe patch.

Questions:
- Is `applyGiftToActiveBattle()` still being called for V2 battle gifts and accidentally applying gifts to the wrong active battle by `streamId`/side order?
- Is any scoring path finding a battle side by sideKey/color instead of the unique `battleSideId`?
- Is any query missing `battleSessionId`/`battleId` scoping when recording a battle contribution?
- Does `resolveBattleGiftTargetForSendV2()` allow a `battleSideId` from another battle if that battle happens to include the same stream ID or side key?
- Are realtime events broadcast globally or to the wrong stream room, causing another battle screen to update?
- Should `SendGiftDto` require both `battleSessionId` and `battleSideId` for battle gifts?
- Should backend validate that `battleSideId` belongs to the active battle session for the request stream and not any other active battle?
- Should legacy `applyGiftToActiveBattle()` be skipped when a V2 `battleGiftTarget` was resolved?

## Desired patch properties

The fix must:
- scope battle gift scoring by unique battle session ID and unique side ID;
- prevent cross-session gift scoring when multiple battles are live at once;
- preserve normal non-battle gifts;
- preserve gifting from either battle stream to either side;
- preserve mirroring gift animations/chat to the opponent stream;
- not double-count gifts;
- avoid relying on color/side label/teamA/teamB globally;
- include validation that rejects invalid/mismatched `battleSideId`;
- keep existing TypeScript passing.

Please provide exact line-level recommendations.
