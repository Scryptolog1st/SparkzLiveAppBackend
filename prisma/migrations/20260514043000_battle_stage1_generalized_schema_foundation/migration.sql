-- Battle Stage 1C - Generalized Battle Schema Foundation
-- This migration is additive.
-- It keeps the existing legacy battles and battle_contributions tables intact.

DO $$
BEGIN
  CREATE TYPE "BattleType" AS ENUM (
    'ONE_V_ONE',
    'TWO_V_TWO',
    'THREE_V_THREE',
    'FOUR_V_FOUR',
    'ONE_V_ONE_V_ONE',
    'ONE_V_ONE_V_ONE_V_ONE'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "BattleMode" AS ENUM (
    'DIRECT_INVITE',
    'RANDOM_QUEUE',
    'REMATCH'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "BattleSessionStatus" AS ENUM (
    'DRAFT',
    'INVITING',
    'QUEUE_WAITING',
    'READY_CHECK',
    'ACTIVE',
    'SUDDEN_DEATH',
    'COOLDOWN',
    'REMATCH_READY_CHECK',
    'REMATCH_ACTIVE',
    'ENDED',
    'DECLINED',
    'CANCELLED',
    'EXPIRED',
    'NO_WINNER',
    'FORFEIT'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "BattleSideKey" AS ENUM (
    'A',
    'B',
    'C',
    'D'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "BattleSideResult" AS ENUM (
    'PENDING',
    'WIN',
    'LOSS',
    'NO_WINNER',
    'FORFEIT'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "BattleParticipantRole" AS ENUM (
    'HOST',
    'TEAMMATE'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "BattleParticipantStatus" AS ENUM (
    'INVITED',
    'ACCEPTED',
    'DECLINED',
    'TIMED_OUT',
    'LEFT',
    'REMOVED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "BattleParticipantMediaMode" AS ENUM (
    'VIDEO',
    'AUDIO_ONLY'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "BattleInviteKind" AS ENUM (
    'HOST_DIRECT',
    'TEAM_MEMBER'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "BattleInviteStatus" AS ENUM (
    'PENDING',
    'ACCEPTED',
    'DECLINED',
    'CANCELLED',
    'EXPIRED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "BattleRandomQueueStatus" AS ENUM (
    'WAITING',
    'MATCHED',
    'CANCELLED',
    'EXPIRED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "BattleRematchVoteValue" AS ENUM (
    'REMATCH',
    'SKIP'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "BattleContributionPhase" AS ENUM (
    'REGULAR',
    'SUDDEN_DEATH'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "BattleEndReason" AS ENUM (
    'NORMAL',
    'SUDDEN_DEATH',
    'FORFEIT',
    'NO_WINNER',
    'CANCELLED',
    'DECLINED',
    'EXPIRED',
    'MODERATION'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "battle_sessions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "battle_type" "BattleType" NOT NULL,
  "mode" "BattleMode" NOT NULL,
  "status" "BattleSessionStatus" NOT NULL DEFAULT 'DRAFT',
  "created_by_user_id" UUID NOT NULL,
  "category_id" UUID,
  "duration_seconds" INTEGER NOT NULL,
  "cooldown_seconds" INTEGER NOT NULL,
  "started_at" TIMESTAMP(3),
  "ends_at" TIMESTAMP(3),
  "cooldown_started_at" TIMESTAMP(3),
  "cooldown_ends_at" TIMESTAMP(3),
  "sudden_death_round" INTEGER NOT NULL DEFAULT 0,
  "winner_side_id" UUID,
  "ended_reason" "BattleEndReason",
  "parent_battle_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "battle_sessions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "battle_sessions_created_by_user_id_fkey"
    FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "battle_sides" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "battle_id" UUID NOT NULL,
  "side_key" "BattleSideKey" NOT NULL,
  "stream_id" UUID,
  "host_user_id" UUID,
  "score" INTEGER NOT NULL DEFAULT 0,
  "result" "BattleSideResult" NOT NULL DEFAULT 'PENDING',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "battle_sides_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "battle_sides_battle_id_fkey"
    FOREIGN KEY ("battle_id") REFERENCES "battle_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "battle_sides_stream_id_fkey"
    FOREIGN KEY ("stream_id") REFERENCES "streams"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "battle_sides_host_user_id_fkey"
    FOREIGN KEY ("host_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "battle_participants" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "battle_id" UUID NOT NULL,
  "side_id" UUID NOT NULL,
  "stream_id" UUID,
  "user_id" UUID NOT NULL,
  "role" "BattleParticipantRole" NOT NULL,
  "status" "BattleParticipantStatus" NOT NULL DEFAULT 'INVITED',
  "media_mode" "BattleParticipantMediaMode" NOT NULL DEFAULT 'VIDEO',
  "accepted_at" TIMESTAMP(3),
  "left_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "battle_participants_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "battle_participants_battle_id_fkey"
    FOREIGN KEY ("battle_id") REFERENCES "battle_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "battle_participants_side_id_fkey"
    FOREIGN KEY ("side_id") REFERENCES "battle_sides"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "battle_participants_stream_id_fkey"
    FOREIGN KEY ("stream_id") REFERENCES "streams"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "battle_participants_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "battle_invites" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "battle_id" UUID NOT NULL,
  "sender_user_id" UUID NOT NULL,
  "recipient_user_id" UUID NOT NULL,
  "kind" "BattleInviteKind" NOT NULL DEFAULT 'HOST_DIRECT',
  "status" "BattleInviteStatus" NOT NULL DEFAULT 'PENDING',
  "expires_at" TIMESTAMP(3) NOT NULL,
  "responded_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "battle_invites_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "battle_invites_battle_id_fkey"
    FOREIGN KEY ("battle_id") REFERENCES "battle_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "battle_invites_sender_user_id_fkey"
    FOREIGN KEY ("sender_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "battle_invites_recipient_user_id_fkey"
    FOREIGN KEY ("recipient_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "battle_random_queue_entries" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "host_user_id" UUID NOT NULL,
  "stream_id" UUID NOT NULL,
  "battle_type" "BattleType" NOT NULL,
  "category_id" UUID,
  "status" "BattleRandomQueueStatus" NOT NULL DEFAULT 'WAITING',
  "matched_battle_id" UUID,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "battle_random_queue_entries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "battle_random_queue_entries_host_user_id_fkey"
    FOREIGN KEY ("host_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "battle_random_queue_entries_stream_id_fkey"
    FOREIGN KEY ("stream_id") REFERENCES "streams"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "battle_rematch_votes" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "battle_id" UUID NOT NULL,
  "side_id" UUID,
  "participant_id" UUID,
  "user_id" UUID NOT NULL,
  "vote" "BattleRematchVoteValue" NOT NULL,
  "voted_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "battle_rematch_votes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "battle_rematch_votes_battle_id_fkey"
    FOREIGN KEY ("battle_id") REFERENCES "battle_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "battle_rematch_votes_side_id_fkey"
    FOREIGN KEY ("side_id") REFERENCES "battle_sides"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "battle_rematch_votes_participant_id_fkey"
    FOREIGN KEY ("participant_id") REFERENCES "battle_participants"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "battle_rematch_votes_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "battle_side_contributions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "battle_id" UUID NOT NULL,
  "side_id" UUID NOT NULL,
  "gift_tx_id" UUID NOT NULL,
  "sender_user_id" UUID NOT NULL,
  "recipient_user_id" UUID NOT NULL,
  "diamond_value" INTEGER NOT NULL,
  "phase" "BattleContributionPhase" NOT NULL DEFAULT 'REGULAR',
  "sudden_death_round" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "battle_side_contributions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "battle_side_contributions_battle_id_fkey"
    FOREIGN KEY ("battle_id") REFERENCES "battle_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "battle_side_contributions_side_id_fkey"
    FOREIGN KEY ("side_id") REFERENCES "battle_sides"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "battle_side_contributions_gift_tx_id_fkey"
    FOREIGN KEY ("gift_tx_id") REFERENCES "gift_transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "battle_side_contributions_sender_user_id_fkey"
    FOREIGN KEY ("sender_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "battle_side_contributions_recipient_user_id_fkey"
    FOREIGN KEY ("recipient_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "battle_sessions_status_idx" ON "battle_sessions"("status");
CREATE INDEX IF NOT EXISTS "battle_sessions_battle_type_idx" ON "battle_sessions"("battle_type");
CREATE INDEX IF NOT EXISTS "battle_sessions_mode_idx" ON "battle_sessions"("mode");
CREATE INDEX IF NOT EXISTS "battle_sessions_created_by_user_id_idx" ON "battle_sessions"("created_by_user_id");
CREATE INDEX IF NOT EXISTS "battle_sessions_category_id_idx" ON "battle_sessions"("category_id");
CREATE INDEX IF NOT EXISTS "battle_sessions_started_at_idx" ON "battle_sessions"("started_at");
CREATE INDEX IF NOT EXISTS "battle_sessions_ends_at_idx" ON "battle_sessions"("ends_at");
CREATE INDEX IF NOT EXISTS "battle_sessions_cooldown_ends_at_idx" ON "battle_sessions"("cooldown_ends_at");
CREATE INDEX IF NOT EXISTS "battle_sessions_parent_battle_id_idx" ON "battle_sessions"("parent_battle_id");

CREATE UNIQUE INDEX IF NOT EXISTS "battle_sides_battle_id_side_key_key" ON "battle_sides"("battle_id", "side_key");
CREATE INDEX IF NOT EXISTS "battle_sides_battle_id_idx" ON "battle_sides"("battle_id");
CREATE INDEX IF NOT EXISTS "battle_sides_stream_id_idx" ON "battle_sides"("stream_id");
CREATE INDEX IF NOT EXISTS "battle_sides_host_user_id_idx" ON "battle_sides"("host_user_id");
CREATE INDEX IF NOT EXISTS "battle_sides_result_idx" ON "battle_sides"("result");

CREATE UNIQUE INDEX IF NOT EXISTS "battle_participants_battle_id_user_id_key" ON "battle_participants"("battle_id", "user_id");
CREATE INDEX IF NOT EXISTS "battle_participants_battle_id_idx" ON "battle_participants"("battle_id");
CREATE INDEX IF NOT EXISTS "battle_participants_side_id_idx" ON "battle_participants"("side_id");
CREATE INDEX IF NOT EXISTS "battle_participants_stream_id_idx" ON "battle_participants"("stream_id");
CREATE INDEX IF NOT EXISTS "battle_participants_user_id_idx" ON "battle_participants"("user_id");
CREATE INDEX IF NOT EXISTS "battle_participants_status_idx" ON "battle_participants"("status");
CREATE INDEX IF NOT EXISTS "battle_participants_role_idx" ON "battle_participants"("role");

CREATE INDEX IF NOT EXISTS "battle_invites_battle_id_idx" ON "battle_invites"("battle_id");
CREATE INDEX IF NOT EXISTS "battle_invites_sender_user_id_status_idx" ON "battle_invites"("sender_user_id", "status");
CREATE INDEX IF NOT EXISTS "battle_invites_recipient_user_id_status_idx" ON "battle_invites"("recipient_user_id", "status");
CREATE INDEX IF NOT EXISTS "battle_invites_expires_at_idx" ON "battle_invites"("expires_at");

CREATE INDEX IF NOT EXISTS "battle_random_queue_entries_host_user_id_idx" ON "battle_random_queue_entries"("host_user_id");
CREATE INDEX IF NOT EXISTS "battle_random_queue_entries_stream_id_idx" ON "battle_random_queue_entries"("stream_id");
CREATE INDEX IF NOT EXISTS "battle_random_queue_entries_status_battle_type_category_id_created_at_idx"
  ON "battle_random_queue_entries"("status", "battle_type", "category_id", "created_at");
CREATE INDEX IF NOT EXISTS "battle_random_queue_entries_expires_at_idx" ON "battle_random_queue_entries"("expires_at");
CREATE INDEX IF NOT EXISTS "battle_random_queue_entries_matched_battle_id_idx" ON "battle_random_queue_entries"("matched_battle_id");

CREATE UNIQUE INDEX IF NOT EXISTS "battle_rematch_votes_battle_id_user_id_key" ON "battle_rematch_votes"("battle_id", "user_id");
CREATE INDEX IF NOT EXISTS "battle_rematch_votes_battle_id_idx" ON "battle_rematch_votes"("battle_id");
CREATE INDEX IF NOT EXISTS "battle_rematch_votes_side_id_idx" ON "battle_rematch_votes"("side_id");
CREATE INDEX IF NOT EXISTS "battle_rematch_votes_participant_id_idx" ON "battle_rematch_votes"("participant_id");
CREATE INDEX IF NOT EXISTS "battle_rematch_votes_user_id_idx" ON "battle_rematch_votes"("user_id");

CREATE UNIQUE INDEX IF NOT EXISTS "battle_side_contributions_gift_tx_id_key" ON "battle_side_contributions"("gift_tx_id");
CREATE INDEX IF NOT EXISTS "battle_side_contributions_battle_id_idx" ON "battle_side_contributions"("battle_id");
CREATE INDEX IF NOT EXISTS "battle_side_contributions_side_id_idx" ON "battle_side_contributions"("side_id");
CREATE INDEX IF NOT EXISTS "battle_side_contributions_sender_user_id_idx" ON "battle_side_contributions"("sender_user_id");
CREATE INDEX IF NOT EXISTS "battle_side_contributions_recipient_user_id_idx" ON "battle_side_contributions"("recipient_user_id");
CREATE INDEX IF NOT EXISTS "battle_side_contributions_battle_id_phase_sudden_death_round_idx"
  ON "battle_side_contributions"("battle_id", "phase", "sudden_death_round");
CREATE INDEX IF NOT EXISTS "battle_side_contributions_created_at_idx" ON "battle_side_contributions"("created_at");
