# Battle Stage 1A - Generalized Schema Foundation

This patch adds the first backend foundation for the new SparkzLive battle roadmap.

## What changed

- Existing legacy `Battle` and `BattleContribution` models remain untouched.
- New additive generalized battle models were added:
  - `BattleSession`
  - `BattleSide`
  - `BattleParticipant`
  - `BattleInvite`
  - `BattleRandomQueueEntry`
  - `BattleRematchVote`
  - `BattleSideContribution`
- New enums were added for generalized battle type, mode, status, sides, participants, invites, queue state, rematch votes, contribution phases, and end reasons.
- A TypeScript contract/constants file was added at `src/modules/battles/battle-v2.contract.ts`.

## What this does not do yet

- It does not run Prisma.
- It does not create/apply a migration.
- It does not change existing battle routes.
- It does not change mobile behavior.
- It does not enable the Battle button.
- It does not change gift routing yet.

## Next roadmap checkpoint

Stage 1B should validate the schema, generate/create the migration when approved, then add read-only serializers and setup option contracts before any mobile battle entry is exposed.
