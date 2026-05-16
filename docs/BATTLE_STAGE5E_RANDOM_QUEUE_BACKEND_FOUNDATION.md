# Battle Stage 5E - Random Queue Backend Foundation

This patch adds the backend V2 random 1v1 queue foundation.

Patched files:

- src/modules/battles/battles.controller.ts
- src/modules/battles/battles.service.ts
- src/modules/battles/dto/battle-v2-random-queue.dto.ts

Endpoints added:

- POST /streams/:id/battles/random-queue
- DELETE /streams/:id/battles/random-queue

Behavior added:

- Only stream hosts can join/cancel random queue.
- Stream must be LIVE.
- Stream must have a category.
- Only ONE_V_ONE is supported in this stage.
- Waiting queue entries expire after the fixed random battle duration window.
- Matching requires:
  - same battle type
  - same stream category
  - different host
  - different stream
  - neither user has blocked the other
  - neither host is already in an active or pending battle
- If a match is found, backend creates and starts a generalized BattleSession immediately.
- The matched battle uses:
  - mode RANDOM_QUEUE
  - status ACTIVE
  - duration RANDOM_BATTLE_DURATION_SECONDS
  - cooldown ONE_V_ONE_COOLDOWN_SECONDS
- Emits battle.v2.started to linked battle streams after match creation.

Intentionally not changed:

- No Prisma commands were run.
- No database scripts were run.
- No Docker commands were run.
- No Git commands were run.
- No mobile files were changed.
- Random Queue mobile UI still needs to be enabled in a later mobile stage.

Patch verification marker: BATTLE_STAGE5E_RANDOM_QUEUE_BACKEND_FOUNDATION
