# Battle Stage 5F - Random Queue Match Claim Hardening

This patch hardens Stage 5E random queue matching.

Patched files:

- src/modules/battles/battles.service.ts

Behavior added:

- The candidate waiting queue entry is claimed inside the transaction before the battle is created.
- The claim requires:
  - matching queue entry id
  - status WAITING
  - expiresAt greater than now
- If the candidate entry was already claimed, the transaction throws and no duplicate battle is created.
- After the battle is created, the candidate queue entry only receives matchedBattleId because status was already claimed as MATCHED.

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

Patch verification marker: BATTLE_STAGE5F_RANDOM_QUEUE_MATCH_CLAIM_HARDENING
