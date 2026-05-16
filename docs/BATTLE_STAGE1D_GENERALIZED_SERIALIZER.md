# Battle Stage 1D - Generalized Battle Serializer

This patch adds the first read-only serializer for the generalized battle tables.

## Added

- `src/modules/battles/battle-v2.serializer.ts`
- `GET /streams/:id/battles/v2/active`
- `GET /battle-sessions/:battleSessionId`

## Serializer output includes

- battle session metadata
- sides
- participants
- invites
- rematch votes
- scoreboard
- contribution summary
- top 3 gifters placeholder summary

## Still not implemented

- generalized battle creation
- direct 1v1 invite flow
- random queue
- team invite flow
- scoring write path
- rematch write path
- mobile integration
- top gifter rewards

Patch verification marker: BATTLE_STAGE1D_GENERALIZED_SERIALIZER
