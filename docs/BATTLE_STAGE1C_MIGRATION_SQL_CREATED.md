# Battle Stage 1C - Migration SQL Created

This patch creates a Prisma migration folder for the generalized battle schema foundation.

## Migration folder

`prisma/migrations/20260514043000_battle_stage1_generalized_schema_foundation/migration.sql`

## What the migration adds

- Battle enum types
- battle_sessions
- battle_sides
- battle_participants
- battle_invites
- battle_random_queue_entries
- battle_rematch_votes
- battle_side_contributions
- indexes and foreign keys for the new generalized battle foundation

## What it does not do

- It does not remove or alter the legacy battles table.
- It does not remove or alter the legacy battle_contributions table.
- It does not enable mobile battles.
- It does not create direct invite or random queue service logic yet.
- It does not run Prisma, Docker, Git, or database commands.
