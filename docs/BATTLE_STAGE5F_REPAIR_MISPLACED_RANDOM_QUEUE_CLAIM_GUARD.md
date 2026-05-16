# Battle Stage 5F Repair - Misplaced Random Queue Claim Guard

This patch repairs Stage 5F.

Problem found:

- The random queue claim guard was inserted into the direct invite transaction.
- That was wrong because direct invite does not have `candidateQueueEntryId`.
- The guard belongs inside `createRandomOneVOneBattleFromQueueV2`.

Patched files:

- src/modules/battles/battles.service.ts

Repair behavior:

- Removed the misplaced queue claim guard from `createDirectInviteBattleV2`.
- Inserted the queue claim guard into `createRandomOneVOneBattleFromQueueV2`.
- Kept the random queue candidate update as matchedBattleId-only after the claim succeeds.

Intentionally not changed:

- No controller route changes.
- No DTO changes.
- No Prisma commands.
- No database commands.
- No Docker commands.
- No Git commands.
- No build commands.
- No TypeScript command.
- No mobile files.

Patch verification marker: BATTLE_STAGE5F_REPAIR_MISPLACED_RANDOM_QUEUE_CLAIM_GUARD
