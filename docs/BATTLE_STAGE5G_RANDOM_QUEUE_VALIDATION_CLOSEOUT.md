# Battle Stage 5G - Random Queue Validation Closeout

Stage 5G validated the backend random queue foundation after Stage 5E and Stage 5F.

## Random queue validation result

Random queue static validation passed.

Verified:

- `POST /streams/:id/battles/random-queue` exists.
- `DELETE /streams/:id/battles/random-queue` exists.
- `JoinBattleV2RandomQueueDto` exists.
- `joinRandomBattleQueueV2` exists.
- `cancelRandomBattleQueueV2` exists.
- `createRandomOneVOneBattleFromQueueV2` exists.
- `findRandomQueueMatchCandidateV2` exists.
- `areUsersBlockedEitherWayV2` exists.
- Random queue creates `RANDOM_QUEUE` battle sessions.
- Random queue creates `ACTIVE` battle sessions on match.
- Random queue emits `battle.v2.started`.
- Random queue duplicate candidate claim guard exists.
- Claim guard is in the random queue transaction.
- Claim guard is not in direct invite.
- Direct invite no longer references `candidateClaim`.
- Direct invite no longer references `candidateQueueEntryId`.

## Full TypeScript result

Full backend `npx tsc --noEmit --pretty false` did not pass.

The visible TypeScript errors are existing non-battle Prisma client/schema issues related to badges:

- `BadgeStatus` missing from `@prisma/client`.
- `Prisma.BadgeWhereInput` missing.
- `Prisma.BadgeUpdateInput` missing.
- `Prisma.UserBadgeWhereInput` missing.
- `Prisma.UserBadgeUpdateInput` missing.
- `this.prisma.badge` missing.
- `this.prisma.userBadge` missing.

Affected files shown by TypeScript:

- `src/modules/admin-badges/admin-badges.service.ts`
- `src/modules/auth/auth.service.ts`
- `src/modules/profiles/profiles.controller.ts`

## Stage 5G conclusion

- Random queue static validation: PASS.
- Full backend TypeScript: BLOCKED by existing non-battle badge Prisma client errors.
- No random queue TypeScript errors were shown in the Stage 5G output.

## Next recommended action

Do not change random queue for the badge errors.

Either:

1. Fix the badge Prisma client/schema mismatch separately, or
2. Continue Stage 5 mobile UI enablement with the known backend TypeScript caveat documented.

Patch verification marker: BATTLE_STAGE5G_RANDOM_QUEUE_VALIDATION_CLOSEOUT
