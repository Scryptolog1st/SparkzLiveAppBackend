--
-- PostgreSQL database dump
--

\restrict RPHh7Iho1YmfIAIEdcaOgN637JwWU0R5oXMyS0AZF1JU8pgzBhnjz6eHb0ODYd9

-- Dumped from database version 16.13 (Debian 16.13-1.pgdg13+1)
-- Dumped by pg_dump version 16.13 (Debian 16.13-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: BattleStatus; Type: TYPE; Schema: public; Owner: liveapp
--

CREATE TYPE public."BattleStatus" AS ENUM (
    'PENDING',
    'ACTIVE',
    'ENDED',
    'DECLINED',
    'CANCELLED'
);


ALTER TYPE public."BattleStatus" OWNER TO liveapp;

--
-- Name: DirectMessageType; Type: TYPE; Schema: public; Owner: liveapp
--

CREATE TYPE public."DirectMessageType" AS ENUM (
    'TEXT',
    'GIF',
    'IMAGE',
    'GIFT'
);


ALTER TYPE public."DirectMessageType" OWNER TO liveapp;

--
-- Name: GiftMediaType; Type: TYPE; Schema: public; Owner: liveapp
--

CREATE TYPE public."GiftMediaType" AS ENUM (
    'VIDEO',
    'LOTTIE',
    'GIF',
    'IMAGE'
);


ALTER TYPE public."GiftMediaType" OWNER TO liveapp;

--
-- Name: LedgerEntryType; Type: TYPE; Schema: public; Owner: liveapp
--

CREATE TYPE public."LedgerEntryType" AS ENUM (
    'GIFT_SEND',
    'GIFT_RECEIVE',
    'ADMIN_ADJUST',
    'PURCHASE_CREDIT',
    'PAYOUT_DEBIT'
);


ALTER TYPE public."LedgerEntryType" OWNER TO liveapp;

--
-- Name: ModerationActionType; Type: TYPE; Schema: public; Owner: liveapp
--

CREATE TYPE public."ModerationActionType" AS ENUM (
    'KICK',
    'MUTE',
    'BAN',
    'UNMUTE',
    'UNBAN'
);


ALTER TYPE public."ModerationActionType" OWNER TO liveapp;

--
-- Name: NotificationType; Type: TYPE; Schema: public; Owner: liveapp
--

CREATE TYPE public."NotificationType" AS ENUM (
    'SYSTEM',
    'STREAM_STARTED',
    'GIFT_RECEIVED',
    'MILESTONE_REACHED',
    'BATTLE_ENDED',
    'MODERATION'
);


ALTER TYPE public."NotificationType" OWNER TO liveapp;

--
-- Name: PayoutStatus; Type: TYPE; Schema: public; Owner: liveapp
--

CREATE TYPE public."PayoutStatus" AS ENUM (
    'PENDING',
    'PROCESSING',
    'PAID',
    'REJECTED',
    'CANCELLED'
);


ALTER TYPE public."PayoutStatus" OWNER TO liveapp;

--
-- Name: PurchaseProvider; Type: TYPE; Schema: public; Owner: liveapp
--

CREATE TYPE public."PurchaseProvider" AS ENUM (
    'DEV',
    'STRIPE',
    'REVENUECAT',
    'APPLE',
    'GOOGLE'
);


ALTER TYPE public."PurchaseProvider" OWNER TO liveapp;

--
-- Name: PurchaseStatus; Type: TYPE; Schema: public; Owner: liveapp
--

CREATE TYPE public."PurchaseStatus" AS ENUM (
    'PENDING',
    'PAID',
    'FULFILLED',
    'FAILED',
    'CANCELED'
);


ALTER TYPE public."PurchaseStatus" OWNER TO liveapp;

--
-- Name: PushPlatform; Type: TYPE; Schema: public; Owner: liveapp
--

CREATE TYPE public."PushPlatform" AS ENUM (
    'ANDROID',
    'IOS',
    'UNKNOWN'
);


ALTER TYPE public."PushPlatform" OWNER TO liveapp;

--
-- Name: RestrictionKind; Type: TYPE; Schema: public; Owner: liveapp
--

CREATE TYPE public."RestrictionKind" AS ENUM (
    'MUTE',
    'BAN'
);


ALTER TYPE public."RestrictionKind" OWNER TO liveapp;

--
-- Name: StreamRole; Type: TYPE; Schema: public; Owner: liveapp
--

CREATE TYPE public."StreamRole" AS ENUM (
    'HOST',
    'GUEST',
    'MODERATOR',
    'VIEWER'
);


ALTER TYPE public."StreamRole" OWNER TO liveapp;

--
-- Name: StreamStatus; Type: TYPE; Schema: public; Owner: liveapp
--

CREATE TYPE public."StreamStatus" AS ENUM (
    'LIVE',
    'ENDED'
);


ALTER TYPE public."StreamStatus" OWNER TO liveapp;

--
-- Name: StreamVisibility; Type: TYPE; Schema: public; Owner: liveapp
--

CREATE TYPE public."StreamVisibility" AS ENUM (
    'PUBLIC',
    'FOLLOWERS',
    'PRIVATE'
);


ALTER TYPE public."StreamVisibility" OWNER TO liveapp;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Notification; Type: TABLE; Schema: public; Owner: liveapp
--

CREATE TABLE public."Notification" (
    id text NOT NULL,
    "userId" uuid NOT NULL,
    type public."NotificationType" NOT NULL,
    title text,
    body text,
    "payloadJson" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "readAt" timestamp(3) without time zone,
    "streamId" text,
    "dedupeKey" text
);


ALTER TABLE public."Notification" OWNER TO liveapp;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: liveapp
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO liveapp;

--
-- Name: battle_contributions; Type: TABLE; Schema: public; Owner: liveapp
--

CREATE TABLE public.battle_contributions (
    id uuid NOT NULL,
    battle_id uuid NOT NULL,
    gift_tx_id uuid NOT NULL,
    sender_user_id uuid NOT NULL,
    recipient_user_id uuid NOT NULL,
    diamond_value integer NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.battle_contributions OWNER TO liveapp;

--
-- Name: battles; Type: TABLE; Schema: public; Owner: liveapp
--

CREATE TABLE public.battles (
    id uuid NOT NULL,
    stream_id uuid NOT NULL,
    host_user_id uuid NOT NULL,
    opponent_user_id uuid NOT NULL,
    winner_user_id uuid,
    status public."BattleStatus" NOT NULL,
    duration_seconds integer NOT NULL,
    host_score integer DEFAULT 0 NOT NULL,
    opponent_score integer DEFAULT 0 NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    started_at timestamp(3) without time zone,
    ends_at timestamp(3) without time zone,
    ended_at timestamp(3) without time zone
);


ALTER TABLE public.battles OWNER TO liveapp;

--
-- Name: chat_messages; Type: TABLE; Schema: public; Owner: liveapp
--

CREATE TABLE public.chat_messages (
    id uuid NOT NULL,
    stream_id uuid NOT NULL,
    user_id uuid NOT NULL,
    text character varying(500) NOT NULL,
    reply_to_message_id uuid,
    badges_json jsonb,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.chat_messages OWNER TO liveapp;

--
-- Name: coin_packages; Type: TABLE; Schema: public; Owner: liveapp
--

CREATE TABLE public.coin_packages (
    id text NOT NULL,
    coins integer NOT NULL,
    price_cents integer NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    apple_product_id text,
    google_product_id text,
    for_dev_use boolean DEFAULT false NOT NULL,
    deleted_at timestamp(3) without time zone,
    badge_text text,
    color_preset text,
    is_featured boolean DEFAULT false NOT NULL
);


ALTER TABLE public.coin_packages OWNER TO liveapp;

--
-- Name: conversations; Type: TABLE; Schema: public; Owner: liveapp
--

CREATE TABLE public.conversations (
    id uuid NOT NULL,
    participant_1_id uuid NOT NULL,
    participant_2_id uuid NOT NULL,
    interaction_count integer DEFAULT 0 NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_by_p1 boolean DEFAULT false NOT NULL,
    deleted_by_p2 boolean DEFAULT false NOT NULL
);


ALTER TABLE public.conversations OWNER TO liveapp;

--
-- Name: diamond_milestones; Type: TABLE; Schema: public; Owner: liveapp
--

CREATE TABLE public.diamond_milestones (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    milestone_amount integer NOT NULL,
    achieved_at timestamp(3) without time zone NOT NULL,
    giver_user_id uuid,
    gift_id text,
    gift_tx_id uuid,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.diamond_milestones OWNER TO liveapp;

--
-- Name: direct_messages; Type: TABLE; Schema: public; Owner: liveapp
--

CREATE TABLE public.direct_messages (
    id uuid NOT NULL,
    conversation_id uuid NOT NULL,
    sender_id uuid NOT NULL,
    message_type public."DirectMessageType" DEFAULT 'TEXT'::public."DirectMessageType" NOT NULL,
    text character varying(1000),
    media_url text,
    gift_tx_id uuid,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_by_recipient boolean DEFAULT false NOT NULL,
    deleted_by_sender boolean DEFAULT false NOT NULL
);


ALTER TABLE public.direct_messages OWNER TO liveapp;

--
-- Name: gift_transactions; Type: TABLE; Schema: public; Owner: liveapp
--

CREATE TABLE public.gift_transactions (
    id uuid NOT NULL,
    stream_id uuid,
    gift_id text NOT NULL,
    sender_user_id uuid NOT NULL,
    recipient_user_id uuid NOT NULL,
    coin_cost integer NOT NULL,
    diamond_value integer NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.gift_transactions OWNER TO liveapp;

--
-- Name: gifts; Type: TABLE; Schema: public; Owner: liveapp
--

CREATE TABLE public.gifts (
    id text NOT NULL,
    name text NOT NULL,
    diamond_value integer NOT NULL,
    coin_cost integer NOT NULL,
    media_url text NOT NULL,
    media_type public."GiftMediaType" NOT NULL,
    is_big_gift boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.gifts OWNER TO liveapp;

--
-- Name: moderation_actions; Type: TABLE; Schema: public; Owner: liveapp
--

CREATE TABLE public.moderation_actions (
    id uuid NOT NULL,
    stream_id uuid NOT NULL,
    action public."ModerationActionType" NOT NULL,
    target_user_id uuid NOT NULL,
    actor_user_id uuid NOT NULL,
    reason character varying(300),
    duration_seconds integer,
    expires_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.moderation_actions OWNER TO liveapp;

--
-- Name: payout_requests; Type: TABLE; Schema: public; Owner: liveapp
--

CREATE TABLE public.payout_requests (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    diamond_amount integer NOT NULL,
    net_amount_cents integer NOT NULL,
    status public."PayoutStatus" DEFAULT 'PENDING'::public."PayoutStatus" NOT NULL,
    payment_method text,
    payment_details jsonb,
    admin_notes text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    processed_at timestamp(3) without time zone
);


ALTER TABLE public.payout_requests OWNER TO liveapp;

--
-- Name: profiles; Type: TABLE; Schema: public; Owner: liveapp
--

CREATE TABLE public.profiles (
    user_id uuid NOT NULL,
    display_name text NOT NULL,
    bio character varying(1000),
    avatar_url text,
    banner_url text,
    links_json jsonb,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    wifw jsonb,
    badge_label character varying(80),
    badge_tone character varying(32),
    show_badge_on_profile boolean DEFAULT true NOT NULL
);


ALTER TABLE public.profiles OWNER TO liveapp;

--
-- Name: purchase_orders; Type: TABLE; Schema: public; Owner: liveapp
--

CREATE TABLE public.purchase_orders (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    package_id text NOT NULL,
    provider public."PurchaseProvider" NOT NULL,
    status public."PurchaseStatus" NOT NULL,
    idempotency_key text,
    provider_ref text,
    coins integer NOT NULL,
    price_cents integer NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    paid_at timestamp(3) without time zone,
    fulfilled_at timestamp(3) without time zone
);


ALTER TABLE public.purchase_orders OWNER TO liveapp;

--
-- Name: push_device_tokens; Type: TABLE; Schema: public; Owner: liveapp
--

CREATE TABLE public.push_device_tokens (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    expo_push_token text NOT NULL,
    platform public."PushPlatform" DEFAULT 'UNKNOWN'::public."PushPlatform" NOT NULL,
    device_id text,
    is_active boolean DEFAULT true NOT NULL,
    last_registered_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_sent_at timestamp(3) without time zone,
    last_error text,
    disabled_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.push_device_tokens OWNER TO liveapp;

--
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: liveapp
--

CREATE TABLE public.refresh_tokens (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    token_hash text NOT NULL,
    revoked_at timestamp(3) without time zone,
    expires_at timestamp(3) without time zone NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.refresh_tokens OWNER TO liveapp;

--
-- Name: stream_guest_requests; Type: TABLE; Schema: public; Owner: liveapp
--

CREATE TABLE public.stream_guest_requests (
    id text NOT NULL,
    stream_id uuid NOT NULL,
    user_id uuid NOT NULL,
    status text DEFAULT 'PENDING'::text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.stream_guest_requests OWNER TO liveapp;

--
-- Name: stream_participants; Type: TABLE; Schema: public; Owner: liveapp
--

CREATE TABLE public.stream_participants (
    id uuid NOT NULL,
    stream_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role public."StreamRole" NOT NULL,
    joined_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    left_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    "lastPingAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.stream_participants OWNER TO liveapp;

--
-- Name: stream_schedules; Type: TABLE; Schema: public; Owner: liveapp
--

CREATE TABLE public.stream_schedules (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    is_recurring boolean NOT NULL,
    title text NOT NULL,
    description text,
    timezone text NOT NULL,
    day_of_week integer,
    time_24h text,
    start_at timestamp(3) without time zone,
    end_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.stream_schedules OWNER TO liveapp;

--
-- Name: stream_user_restrictions; Type: TABLE; Schema: public; Owner: liveapp
--

CREATE TABLE public.stream_user_restrictions (
    id uuid NOT NULL,
    stream_id uuid NOT NULL,
    user_id uuid NOT NULL,
    kind public."RestrictionKind" NOT NULL,
    reason character varying(300),
    expires_at timestamp(3) without time zone,
    created_by_user_id uuid,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.stream_user_restrictions OWNER TO liveapp;

--
-- Name: stream_user_roles; Type: TABLE; Schema: public; Owner: liveapp
--

CREATE TABLE public.stream_user_roles (
    id uuid NOT NULL,
    stream_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role public."StreamRole" NOT NULL,
    assigned_by_user_id uuid,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.stream_user_roles OWNER TO liveapp;

--
-- Name: streams; Type: TABLE; Schema: public; Owner: liveapp
--

CREATE TABLE public.streams (
    id uuid NOT NULL,
    host_user_id uuid NOT NULL,
    title text NOT NULL,
    status public."StreamStatus" NOT NULL,
    visibility public."StreamVisibility" NOT NULL,
    tags_json jsonb DEFAULT '[]'::jsonb NOT NULL,
    started_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    ended_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    video_provider text,
    video_room_name text,
    guests jsonb DEFAULT '[]'::jsonb NOT NULL,
    "layoutGridSize" integer DEFAULT 1 NOT NULL,
    color text,
    stream_goal integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.streams OWNER TO liveapp;

--
-- Name: user_blocks; Type: TABLE; Schema: public; Owner: liveapp
--

CREATE TABLE public.user_blocks (
    blocker_id uuid NOT NULL,
    blocked_id uuid NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.user_blocks OWNER TO liveapp;

--
-- Name: user_favorites; Type: TABLE; Schema: public; Owner: liveapp
--

CREATE TABLE public.user_favorites (
    user_id uuid NOT NULL,
    favorite_user_id uuid NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT user_favorites_no_self_favorite_check CHECK ((user_id <> favorite_user_id))
);


ALTER TABLE public.user_favorites OWNER TO liveapp;

--
-- Name: users; Type: TABLE; Schema: public; Owner: liveapp
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    email text NOT NULL,
    username text NOT NULL,
    password_hash text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    public_id character varying(13) NOT NULL,
    last_username_change timestamp(3) without time zone,
    email_updated_at timestamp(3) without time zone,
    two_factor_enabled boolean DEFAULT false NOT NULL,
    two_factor_secret text,
    "twoFactorBackupCodes" text[],
    dm_unlock_gift_id text,
    notification_push_enabled boolean DEFAULT true NOT NULL,
    notification_live_alerts_enabled boolean DEFAULT true NOT NULL,
    notification_marketing_enabled boolean DEFAULT false NOT NULL
);


ALTER TABLE public.users OWNER TO liveapp;

--
-- Name: wallet_ledger; Type: TABLE; Schema: public; Owner: liveapp
--

CREATE TABLE public.wallet_ledger (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    entry_type public."LedgerEntryType" NOT NULL,
    delta_coins integer NOT NULL,
    delta_diamonds integer NOT NULL,
    stream_id uuid,
    gift_tx_id uuid,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.wallet_ledger OWNER TO liveapp;

--
-- Name: wallets; Type: TABLE; Schema: public; Owner: liveapp
--

CREATE TABLE public.wallets (
    user_id uuid NOT NULL,
    coins integer DEFAULT 0 NOT NULL,
    diamonds_earned integer DEFAULT 0 NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.wallets OWNER TO liveapp;

--
-- Data for Name: Notification; Type: TABLE DATA; Schema: public; Owner: liveapp
--

COPY public."Notification" (id, "userId", type, title, body, "payloadJson", "createdAt", "readAt", "streamId", "dedupeKey") FROM stdin;
21df5d5c-6ff4-421d-aafb-bed62227dfbf	e9134380-2da7-4a1e-bd2a-34398f85a6e5	GIFT_RECEIVED	You received a gift	BigDaddy sent you Dragon Egg Hatch	{"txId": "79e29532-aba9-467c-a9a2-3204e6315258", "giftId": "dragon_egg", "giftName": "Dragon Egg Hatch", "streamId": "f95d9d98-2a21-4211-bda1-11573a7c3af5", "diamondValue": 5000, "senderUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "senderUsername": "BigDaddy", "recipientUserId": "e9134380-2da7-4a1e-bd2a-34398f85a6e5", "senderDisplayName": "BigDaddy"}	2026-03-29 09:21:32.591	\N	f95d9d98-2a21-4211-bda1-11573a7c3af5	gift:79e29532-aba9-467c-a9a2-3204e6315258
1be35944-f80f-4e94-92a3-9572e4afc55a	e9134380-2da7-4a1e-bd2a-34398f85a6e5	GIFT_RECEIVED	Gift received	BigDaddy sent you Dragon Egg Hatch	{"giftId": "dragon_egg", "coinCost": 5000, "giftName": "Dragon Egg Hatch", "giftTxId": "79e29532-aba9-467c-a9a2-3204e6315258", "streamId": "f95d9d98-2a21-4211-bda1-11573a7c3af5", "createdAt": "2026-03-29T09:21:32.556Z", "diamondValue": 5000, "senderUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "senderUsername": "BigDaddy", "recipientUserId": "e9134380-2da7-4a1e-bd2a-34398f85a6e5", "recipientUsername": "FrankSinatra"}	2026-03-29 09:21:37.058	\N	f95d9d98-2a21-4211-bda1-11573a7c3af5	gift_tx:79e29532-aba9-467c-a9a2-3204e6315258
5dd25f0d-057e-4f25-9350-52804d4bfa1e	3961fabe-1345-4426-bd8a-ca0a5eac3aac	GIFT_RECEIVED	Gift received	FrankSinatra sent you Crowned Goat	{"giftId": "crown_goat", "coinCost": 250, "giftName": "Crowned Goat", "giftTxId": "718ed453-19c5-4457-a1bf-621958a58757", "streamId": "f95d9d98-2a21-4211-bda1-11573a7c3af5", "createdAt": "2026-03-29T09:20:53.057Z", "diamondValue": 250, "senderUserId": "e9134380-2da7-4a1e-bd2a-34398f85a6e5", "senderUsername": "FrankSinatra", "recipientUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "recipientUsername": "BigDaddy"}	2026-03-29 09:20:57.065	2026-03-30 01:15:33.556	f95d9d98-2a21-4211-bda1-11573a7c3af5	gift_tx:718ed453-19c5-4457-a1bf-621958a58757
99e301a5-6112-41de-b9c5-f4ab48af4406	3961fabe-1345-4426-bd8a-ca0a5eac3aac	GIFT_RECEIVED	You received a gift	FrankSinatra sent you Dragon Egg Hatch	{"txId": "6f0f2a5c-330d-43f7-915f-c1da6f93d4d1", "giftId": "dragon_egg", "giftName": "Dragon Egg Hatch", "streamId": "f95d9d98-2a21-4211-bda1-11573a7c3af5", "diamondValue": 5000, "senderUserId": "e9134380-2da7-4a1e-bd2a-34398f85a6e5", "senderUsername": "FrankSinatra", "recipientUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "senderDisplayName": "FrankSinatra"}	2026-03-29 09:21:12.388	2026-03-30 01:15:33.821	f95d9d98-2a21-4211-bda1-11573a7c3af5	gift:6f0f2a5c-330d-43f7-915f-c1da6f93d4d1
6049f964-1b4f-4641-bdb6-cd465af88e6d	3961fabe-1345-4426-bd8a-ca0a5eac3aac	GIFT_RECEIVED	Gift received	FrankSinatra sent you Dragon Egg Hatch	{"giftId": "dragon_egg", "coinCost": 5000, "giftName": "Dragon Egg Hatch", "giftTxId": "6f0f2a5c-330d-43f7-915f-c1da6f93d4d1", "streamId": "f95d9d98-2a21-4211-bda1-11573a7c3af5", "createdAt": "2026-03-29T09:21:12.347Z", "diamondValue": 5000, "senderUserId": "e9134380-2da7-4a1e-bd2a-34398f85a6e5", "senderUsername": "FrankSinatra", "recipientUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "recipientUsername": "BigDaddy"}	2026-03-29 09:21:17.061	2026-03-30 01:15:34.034	f95d9d98-2a21-4211-bda1-11573a7c3af5	gift_tx:6f0f2a5c-330d-43f7-915f-c1da6f93d4d1
f7d62e94-2c59-4a31-adec-ab387d3c06fc	3961fabe-1345-4426-bd8a-ca0a5eac3aac	GIFT_RECEIVED	You received a gift	FrankSinatra sent you Crowned Goat	{"txId": "255de527-d350-44ae-a635-a951084022d4", "giftId": "crown_goat", "giftName": "Crowned Goat", "streamId": "f95d9d98-2a21-4211-bda1-11573a7c3af5", "diamondValue": 250, "senderUserId": "e9134380-2da7-4a1e-bd2a-34398f85a6e5", "senderUsername": "FrankSinatra", "recipientUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "senderDisplayName": "FrankSinatra"}	2026-03-29 09:21:55.897	2026-03-30 01:15:34.224	f95d9d98-2a21-4211-bda1-11573a7c3af5	gift:255de527-d350-44ae-a635-a951084022d4
7a3c88e3-9836-47fb-af3e-0040f2e90f24	3961fabe-1345-4426-bd8a-ca0a5eac3aac	GIFT_RECEIVED	Gift received	FrankSinatra sent you Crowned Goat	{"giftId": "crown_goat", "coinCost": 250, "giftName": "Crowned Goat", "giftTxId": "255de527-d350-44ae-a635-a951084022d4", "streamId": "f95d9d98-2a21-4211-bda1-11573a7c3af5", "createdAt": "2026-03-29T09:21:55.858Z", "diamondValue": 250, "senderUserId": "e9134380-2da7-4a1e-bd2a-34398f85a6e5", "senderUsername": "FrankSinatra", "recipientUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "recipientUsername": "BigDaddy"}	2026-03-29 09:21:57.065	2026-03-30 01:15:34.546	f95d9d98-2a21-4211-bda1-11573a7c3af5	gift_tx:255de527-d350-44ae-a635-a951084022d4
3a10c07e-1020-4d8d-abff-f40be6a85be6	3961fabe-1345-4426-bd8a-ca0a5eac3aac	GIFT_RECEIVED	You received a gift	FrankSinatra sent you Dragon Egg Hatch	{"txId": "cca49029-ec80-417a-aba7-7e2922cf48a9", "giftId": "dragon_egg", "giftName": "Dragon Egg Hatch", "streamId": "f95d9d98-2a21-4211-bda1-11573a7c3af5", "diamondValue": 5000, "senderUserId": "e9134380-2da7-4a1e-bd2a-34398f85a6e5", "senderUsername": "FrankSinatra", "recipientUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "senderDisplayName": "FrankSinatra"}	2026-03-29 09:22:01.91	2026-03-30 01:15:34.929	f95d9d98-2a21-4211-bda1-11573a7c3af5	gift:cca49029-ec80-417a-aba7-7e2922cf48a9
74b54c1c-5888-416f-9160-47c848b738a7	3961fabe-1345-4426-bd8a-ca0a5eac3aac	GIFT_RECEIVED	Gift received	FrankSinatra sent you Dragon Egg Hatch	{"giftId": "dragon_egg", "coinCost": 5000, "giftName": "Dragon Egg Hatch", "giftTxId": "cca49029-ec80-417a-aba7-7e2922cf48a9", "streamId": "f95d9d98-2a21-4211-bda1-11573a7c3af5", "createdAt": "2026-03-29T09:22:01.875Z", "diamondValue": 5000, "senderUserId": "e9134380-2da7-4a1e-bd2a-34398f85a6e5", "senderUsername": "FrankSinatra", "recipientUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "recipientUsername": "BigDaddy"}	2026-03-29 09:22:02.063	2026-03-30 01:15:35.371	f95d9d98-2a21-4211-bda1-11573a7c3af5	gift_tx:cca49029-ec80-417a-aba7-7e2922cf48a9
ffae2e17-9cc3-4bf1-9bba-46ae0936400c	3961fabe-1345-4426-bd8a-ca0a5eac3aac	GIFT_RECEIVED	You received a gift	FrankSinatra sent you Dragon Egg Hatch	{"txId": "c530dd89-6942-4620-9c0b-6853e1448775", "giftId": "dragon_egg", "giftName": "Dragon Egg Hatch", "streamId": "f95d9d98-2a21-4211-bda1-11573a7c3af5", "diamondValue": 5000, "senderUserId": "e9134380-2da7-4a1e-bd2a-34398f85a6e5", "senderUsername": "FrankSinatra", "recipientUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "senderDisplayName": "FrankSinatra"}	2026-03-29 09:22:08.569	2026-03-30 01:15:37.22	f95d9d98-2a21-4211-bda1-11573a7c3af5	gift:c530dd89-6942-4620-9c0b-6853e1448775
3f746f3f-1dbe-421f-9da4-3b62d6b725c3	3961fabe-1345-4426-bd8a-ca0a5eac3aac	GIFT_RECEIVED	Gift received	FrankSinatra sent you Dragon Egg Hatch	{"giftId": "dragon_egg", "coinCost": 5000, "giftName": "Dragon Egg Hatch", "giftTxId": "c530dd89-6942-4620-9c0b-6853e1448775", "streamId": "f95d9d98-2a21-4211-bda1-11573a7c3af5", "createdAt": "2026-03-29T09:22:08.535Z", "diamondValue": 5000, "senderUserId": "e9134380-2da7-4a1e-bd2a-34398f85a6e5", "senderUsername": "FrankSinatra", "recipientUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "recipientUsername": "BigDaddy"}	2026-03-29 09:22:12.066	2026-03-30 01:15:37.415	f95d9d98-2a21-4211-bda1-11573a7c3af5	gift_tx:c530dd89-6942-4620-9c0b-6853e1448775
ce73ec11-ac5c-4665-85cc-fb99abd45d7a	47d9c408-1a3c-46c1-aecf-6f1746615499	SYSTEM	New message from BigDaddy	BigDaddy: Fhsjcnjnf	{"dmMessageId": "2c888375-bb9a-43ba-9e3e-9cc858de5d68", "messageType": "TEXT", "senderUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "conversationId": "a76df74d-06fc-4899-8249-5b4e093ea878", "senderUsername": "BigDaddy", "recipientUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "senderAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "senderDisplayName": "BigDaddy"}	2026-03-29 09:23:38.293	\N	\N	dm-received:2c888375-bb9a-43ba-9e3e-9cc858de5d68
545f958b-68b2-4958-9245-6788fb504be3	3961fabe-1345-4426-bd8a-ca0a5eac3aac	STREAM_STARTED	JamesConnor is live now	JamesConnor started: My Live Stream	{"title": "My Live Stream", "streamId": "c7b495b1-4313-4e89-96f8-e97de8f53a20", "startedAt": "2026-03-29T15:48:41.064Z", "hostUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "visibility": "PUBLIC", "hostUsername": "JamesConnor", "hostAvatarUrl": null, "hostDisplayName": "JamesConnor"}	2026-03-29 15:48:41.106	2026-03-30 01:15:28.958	c7b495b1-4313-4e89-96f8-e97de8f53a20	stream-started:c7b495b1-4313-4e89-96f8-e97de8f53a20
7fe9344d-059f-4c8f-80b7-d87e3c501aa3	3961fabe-1345-4426-bd8a-ca0a5eac3aac	STREAM_STARTED	JamesConnor is live now	JamesConnor started: My Live Stream	{"title": "My Live Stream", "streamId": "280ffffd-4a33-45f0-a894-53c5338a17a5", "startedAt": "2026-03-29T15:47:46.681Z", "hostUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "visibility": "PUBLIC", "hostUsername": "JamesConnor", "hostAvatarUrl": null, "hostDisplayName": "JamesConnor"}	2026-03-29 15:47:46.724	2026-03-30 01:15:29.341	280ffffd-4a33-45f0-a894-53c5338a17a5	stream-started:280ffffd-4a33-45f0-a894-53c5338a17a5
d561ac5d-7654-45f3-abab-ecaf1d4d175d	3961fabe-1345-4426-bd8a-ca0a5eac3aac	STREAM_STARTED	JamesConnor is live now	JamesConnor started: My Live Stream	{"title": "My Live Stream", "streamId": "df5b5795-588b-449a-bc79-4e4930273c41", "startedAt": "2026-03-29T15:31:23.595Z", "hostUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "visibility": "PUBLIC", "hostUsername": "JamesConnor", "hostAvatarUrl": null, "hostDisplayName": "JamesConnor"}	2026-03-29 15:31:23.636	2026-03-30 01:15:30.461	df5b5795-588b-449a-bc79-4e4930273c41	stream-started:df5b5795-588b-449a-bc79-4e4930273c41
330af601-e0c3-4544-a9a1-b98f2a8f8293	3961fabe-1345-4426-bd8a-ca0a5eac3aac	STREAM_STARTED	JamesConnor is live now	JamesConnor started: My Live Stream	{"title": "My Live Stream", "streamId": "b709f1a0-1033-4489-89e2-95f950f80df4", "startedAt": "2026-03-29T15:28:58.465Z", "hostUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "visibility": "PUBLIC", "hostUsername": "JamesConnor", "hostAvatarUrl": null, "hostDisplayName": "JamesConnor"}	2026-03-29 15:28:58.511	2026-03-30 01:15:30.744	b709f1a0-1033-4489-89e2-95f950f80df4	stream-started:b709f1a0-1033-4489-89e2-95f950f80df4
49d87f29-713a-4907-aa8d-24b169ebc64e	3961fabe-1345-4426-bd8a-ca0a5eac3aac	STREAM_STARTED	JamesConnor is live now	JamesConnor started: My Live Stream	{"title": "My Live Stream", "streamId": "569e6a4e-20b2-4738-a3bc-943b2b64b592", "startedAt": "2026-03-29T15:07:50.349Z", "hostUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "visibility": "PUBLIC", "hostUsername": "JamesConnor", "hostAvatarUrl": null, "hostDisplayName": "JamesConnor"}	2026-03-29 15:07:50.404	2026-03-30 01:15:31.049	569e6a4e-20b2-4738-a3bc-943b2b64b592	stream-started:569e6a4e-20b2-4738-a3bc-943b2b64b592
ecadc82e-7d39-4688-8bc9-1c2c02ed768b	3961fabe-1345-4426-bd8a-ca0a5eac3aac	STREAM_STARTED	FrankSinatra is live now	FrankSinatra started: My Live Stream	{"title": "My Live Stream", "streamId": "c3d7818a-339f-4272-b8ed-6d0199a9ec94", "startedAt": "2026-03-29T09:26:37.642Z", "hostUserId": "e9134380-2da7-4a1e-bd2a-34398f85a6e5", "visibility": "PUBLIC", "hostUsername": "FrankSinatra", "hostAvatarUrl": null, "hostDisplayName": "FrankSinatra"}	2026-03-29 09:26:37.69	2026-03-30 01:15:31.358	c3d7818a-339f-4272-b8ed-6d0199a9ec94	stream-started:c3d7818a-339f-4272-b8ed-6d0199a9ec94
7cbf92f3-2666-4a78-a1c6-36986e2d3e7b	3961fabe-1345-4426-bd8a-ca0a5eac3aac	GIFT_RECEIVED	You received a gift	FrankSinatra sent you Crowned Goat	{"txId": "13d439e6-2551-4e7e-b6e6-b297270b9cde", "giftId": "crown_goat", "giftName": "Crowned Goat", "streamId": "f95d9d98-2a21-4211-bda1-11573a7c3af5", "diamondValue": 250, "senderUserId": "e9134380-2da7-4a1e-bd2a-34398f85a6e5", "senderUsername": "FrankSinatra", "recipientUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "senderDisplayName": "FrankSinatra"}	2026-03-29 09:22:12.374	2026-03-30 01:15:37.592	f95d9d98-2a21-4211-bda1-11573a7c3af5	gift:13d439e6-2551-4e7e-b6e6-b297270b9cde
459b55e3-f533-4e88-b561-9ebc74f27482	3961fabe-1345-4426-bd8a-ca0a5eac3aac	GIFT_RECEIVED	Gift received	FrankSinatra sent you Crowned Goat	{"giftId": "crown_goat", "coinCost": 250, "giftName": "Crowned Goat", "giftTxId": "13d439e6-2551-4e7e-b6e6-b297270b9cde", "streamId": "f95d9d98-2a21-4211-bda1-11573a7c3af5", "createdAt": "2026-03-29T09:22:12.340Z", "diamondValue": 250, "senderUserId": "e9134380-2da7-4a1e-bd2a-34398f85a6e5", "senderUsername": "FrankSinatra", "recipientUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "recipientUsername": "BigDaddy"}	2026-03-29 09:22:17.071	2026-03-30 01:15:37.761	f95d9d98-2a21-4211-bda1-11573a7c3af5	gift_tx:13d439e6-2551-4e7e-b6e6-b297270b9cde
1839a380-3fcb-45be-9a8b-8f3e71471ef3	3961fabe-1345-4426-bd8a-ca0a5eac3aac	SYSTEM	New message from JamesConnor	JamesConnor: kjhgvfhcvfg	{"dmMessageId": "90b65cdf-81d5-4c0b-9ab3-924db04e4068", "messageType": "TEXT", "senderUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "conversationId": "a76df74d-06fc-4899-8249-5b4e093ea878", "senderUsername": "JamesConnor", "recipientUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "senderAvatarUrl": null, "senderDisplayName": "JamesConnor"}	2026-03-29 09:23:49.429	2026-03-30 01:15:37.937	\N	dm-received:90b65cdf-81d5-4c0b-9ab3-924db04e4068
16b87b41-062f-45db-abfb-0bc83f8a4bd4	3961fabe-1345-4426-bd8a-ca0a5eac3aac	SYSTEM	New message from FrankSinatra	FrankSinatra sent you a gift	{"dmMessageId": "7e57ab2a-d194-4a1d-8be5-17b8199a2566", "messageType": "GIFT", "senderUserId": "e9134380-2da7-4a1e-bd2a-34398f85a6e5", "conversationId": "098ccdb1-8375-4e63-93ad-1e90f4605f79", "senderUsername": "FrankSinatra", "recipientUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "senderAvatarUrl": null, "senderDisplayName": "FrankSinatra"}	2026-03-29 09:24:13.497	2026-03-30 01:15:38.28	\N	dm-received:7e57ab2a-d194-4a1d-8be5-17b8199a2566
7e40d6b1-5f72-4cff-98fe-34179af2774b	3961fabe-1345-4426-bd8a-ca0a5eac3aac	GIFT_RECEIVED	Gift received	FrankSinatra sent you Crowned Goat	{"giftId": "crown_goat", "coinCost": 250, "giftName": "Crowned Goat", "giftTxId": "969bb461-0a05-4af2-ace1-b03377d2ae9e", "streamId": null, "createdAt": "2026-03-29T09:24:13.446Z", "diamondValue": 250, "senderUserId": "e9134380-2da7-4a1e-bd2a-34398f85a6e5", "senderUsername": "FrankSinatra", "recipientUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "recipientUsername": "BigDaddy"}	2026-03-29 09:24:17.101	2026-03-30 01:15:38.462	\N	gift_tx:969bb461-0a05-4af2-ace1-b03377d2ae9e
ba9da07e-a0c2-44fa-8388-1651fce9e11b	3961fabe-1345-4426-bd8a-ca0a5eac3aac	STREAM_STARTED	ChiDotGo is live now	ChiDotGo started: Gdn	{"title": "Gdn", "streamId": "e55f590d-d03f-4d86-b1b6-57ae61910a99", "startedAt": "2026-04-01T15:50:06.421Z", "hostUserId": "281ac0c9-d22b-4ece-895a-9d2c86a8f315", "visibility": "PUBLIC", "hostUsername": "ChiDotGo", "hostAvatarUrl": null, "hostDisplayName": "ChiDotGo"}	2026-04-01 15:50:06.454	\N	e55f590d-d03f-4d86-b1b6-57ae61910a99	stream-started:e55f590d-d03f-4d86-b1b6-57ae61910a99
c4e436fe-9d0b-49a4-9094-865074d1be63	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "6a446cf8-0c9e-4851-a05c-1f86213ecdaa", "startedAt": "2026-03-29T16:50:34.183Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-03-29 16:50:34.228	\N	6a446cf8-0c9e-4851-a05c-1f86213ecdaa	stream-started:6a446cf8-0c9e-4851-a05c-1f86213ecdaa
0ebfc13d-df89-49c3-b1c2-721b10dd665c	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "6a446cf8-0c9e-4851-a05c-1f86213ecdaa", "startedAt": "2026-03-29T16:50:34.183Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-03-29 16:50:34.228	\N	6a446cf8-0c9e-4851-a05c-1f86213ecdaa	stream-started:6a446cf8-0c9e-4851-a05c-1f86213ecdaa
2b5e031a-a145-4263-9a94-752ca4b49286	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "22cbb6f7-6961-4114-84f1-4e34ab302cf3", "startedAt": "2026-03-29T17:36:23.271Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-03-29 17:36:23.315	\N	22cbb6f7-6961-4114-84f1-4e34ab302cf3	stream-started:22cbb6f7-6961-4114-84f1-4e34ab302cf3
f3e7c016-d4e7-4591-adac-87bc0f685021	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "22cbb6f7-6961-4114-84f1-4e34ab302cf3", "startedAt": "2026-03-29T17:36:23.271Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-03-29 17:36:23.315	\N	22cbb6f7-6961-4114-84f1-4e34ab302cf3	stream-started:22cbb6f7-6961-4114-84f1-4e34ab302cf3
0c8eb31d-3d45-4acb-b439-e6d81527b2b0	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "43fa6ef4-1c44-4c19-87b7-1273cb2e58e4", "startedAt": "2026-03-29T17:39:08.729Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-03-29 17:39:08.771	\N	43fa6ef4-1c44-4c19-87b7-1273cb2e58e4	stream-started:43fa6ef4-1c44-4c19-87b7-1273cb2e58e4
13d90bd5-4487-4551-b7ef-d92158dff984	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "43fa6ef4-1c44-4c19-87b7-1273cb2e58e4", "startedAt": "2026-03-29T17:39:08.729Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-03-29 17:39:08.771	\N	43fa6ef4-1c44-4c19-87b7-1273cb2e58e4	stream-started:43fa6ef4-1c44-4c19-87b7-1273cb2e58e4
33fc059e-4fb2-4b60-bccd-53579783422c	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "d9628570-75b1-4b39-a25d-b7d2336130ef", "startedAt": "2026-03-29T17:44:49.894Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-03-29 17:44:49.95	\N	d9628570-75b1-4b39-a25d-b7d2336130ef	stream-started:d9628570-75b1-4b39-a25d-b7d2336130ef
7bb3e562-a869-40a2-a607-df59d6409be6	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "d9628570-75b1-4b39-a25d-b7d2336130ef", "startedAt": "2026-03-29T17:44:49.894Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-03-29 17:44:49.95	\N	d9628570-75b1-4b39-a25d-b7d2336130ef	stream-started:d9628570-75b1-4b39-a25d-b7d2336130ef
38ca2e13-4767-4248-93b5-c39ade9ccaca	3961fabe-1345-4426-bd8a-ca0a5eac3aac	STREAM_STARTED	JamesConnor is live now	JamesConnor started: My Live Stream	{"title": "My Live Stream", "streamId": "b710b560-aa2d-4331-abdf-7f0a72366c72", "startedAt": "2026-03-29T16:19:37.771Z", "hostUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "visibility": "PUBLIC", "hostUsername": "JamesConnor", "hostAvatarUrl": null, "hostDisplayName": "JamesConnor"}	2026-03-29 16:19:37.827	2026-03-30 01:15:26.804	b710b560-aa2d-4331-abdf-7f0a72366c72	stream-started:b710b560-aa2d-4331-abdf-7f0a72366c72
3d5defe6-1d8c-449e-b3e2-f2710e28abff	3961fabe-1345-4426-bd8a-ca0a5eac3aac	STREAM_STARTED	JamesConnor is live now	JamesConnor started: My Live Stream	{"title": "My Live Stream", "streamId": "26d45485-4e0e-4f87-926d-ed6a71c94b94", "startedAt": "2026-03-29T16:07:18.842Z", "hostUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "visibility": "PUBLIC", "hostUsername": "JamesConnor", "hostAvatarUrl": null, "hostDisplayName": "JamesConnor"}	2026-03-29 16:07:18.893	2026-03-30 01:15:27.263	26d45485-4e0e-4f87-926d-ed6a71c94b94	stream-started:26d45485-4e0e-4f87-926d-ed6a71c94b94
2b0b9ea8-be70-47ee-b1aa-46d33e31c218	3961fabe-1345-4426-bd8a-ca0a5eac3aac	STREAM_STARTED	JamesConnor is live now	JamesConnor started: Just a test live	{"title": "Just a test live", "streamId": "92603abb-c236-4f30-ba9a-4cea552553b3", "startedAt": "2026-03-29T15:59:13.443Z", "hostUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "visibility": "PUBLIC", "hostUsername": "JamesConnor", "hostAvatarUrl": null, "hostDisplayName": "JamesConnor"}	2026-03-29 15:59:13.485	2026-03-30 01:15:27.672	92603abb-c236-4f30-ba9a-4cea552553b3	stream-started:92603abb-c236-4f30-ba9a-4cea552553b3
c209a2b7-7096-4cb0-b52e-c57c66719784	3961fabe-1345-4426-bd8a-ca0a5eac3aac	STREAM_STARTED	JamesConnor is live now	JamesConnor started: My Live Stream	{"title": "My Live Stream", "streamId": "1211e826-42f9-43a3-9f34-4b5955416e35", "startedAt": "2026-03-29T15:56:20.325Z", "hostUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "visibility": "PUBLIC", "hostUsername": "JamesConnor", "hostAvatarUrl": null, "hostDisplayName": "JamesConnor"}	2026-03-29 15:56:20.377	2026-03-30 01:15:28.106	1211e826-42f9-43a3-9f34-4b5955416e35	stream-started:1211e826-42f9-43a3-9f34-4b5955416e35
2913d65a-3e7e-4469-9e9e-9d4b4d25b77f	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "a7b5d4f1-ec2b-42ec-abb9-33d67ee5ac13", "startedAt": "2026-03-29T17:45:31.684Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-03-29 17:45:31.727	\N	a7b5d4f1-ec2b-42ec-abb9-33d67ee5ac13	stream-started:a7b5d4f1-ec2b-42ec-abb9-33d67ee5ac13
24af6fb8-37e6-402f-8d40-3b6072493bc7	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "a7b5d4f1-ec2b-42ec-abb9-33d67ee5ac13", "startedAt": "2026-03-29T17:45:31.684Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-03-29 17:45:31.727	\N	a7b5d4f1-ec2b-42ec-abb9-33d67ee5ac13	stream-started:a7b5d4f1-ec2b-42ec-abb9-33d67ee5ac13
dd53eda1-9e6d-4bed-87b2-636c46141092	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "13dcf31d-77f4-4c3d-b7bc-f8a24b946f96", "startedAt": "2026-03-29T21:54:36.674Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-03-29 21:54:36.726	\N	13dcf31d-77f4-4c3d-b7bc-f8a24b946f96	stream-started:13dcf31d-77f4-4c3d-b7bc-f8a24b946f96
bbedbecb-7e5a-49ad-b7e2-baaf3928458b	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "13dcf31d-77f4-4c3d-b7bc-f8a24b946f96", "startedAt": "2026-03-29T21:54:36.674Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-03-29 21:54:36.726	\N	13dcf31d-77f4-4c3d-b7bc-f8a24b946f96	stream-started:13dcf31d-77f4-4c3d-b7bc-f8a24b946f96
34b9dc0e-1a13-4323-b1b2-66947df3a0de	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "08ca06b0-9449-4291-9a3c-172dae6e0656", "startedAt": "2026-03-29T21:57:52.438Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-03-29 21:57:52.493	\N	08ca06b0-9449-4291-9a3c-172dae6e0656	stream-started:08ca06b0-9449-4291-9a3c-172dae6e0656
2de7fdd8-4e4a-47ec-a5bb-d10e9b754b54	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "08ca06b0-9449-4291-9a3c-172dae6e0656", "startedAt": "2026-03-29T21:57:52.438Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-03-29 21:57:52.493	\N	08ca06b0-9449-4291-9a3c-172dae6e0656	stream-started:08ca06b0-9449-4291-9a3c-172dae6e0656
a20da3be-9680-4231-95d3-b4e7b59020b9	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "165a9ca3-9b5d-4a8b-93ce-f17d5a9f490b", "startedAt": "2026-03-29T22:01:19.927Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-03-29 22:01:19.977	\N	165a9ca3-9b5d-4a8b-93ce-f17d5a9f490b	stream-started:165a9ca3-9b5d-4a8b-93ce-f17d5a9f490b
c15756ef-3d51-49e7-b050-f069511ad8a2	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "165a9ca3-9b5d-4a8b-93ce-f17d5a9f490b", "startedAt": "2026-03-29T22:01:19.927Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-03-29 22:01:19.977	\N	165a9ca3-9b5d-4a8b-93ce-f17d5a9f490b	stream-started:165a9ca3-9b5d-4a8b-93ce-f17d5a9f490b
e3a3f822-b9e9-4085-bfcd-21fdccc33410	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "10e2c843-05de-45cd-86dd-0ea21cda84c4", "startedAt": "2026-03-29T22:13:10.463Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-03-29 22:13:10.511	\N	10e2c843-05de-45cd-86dd-0ea21cda84c4	stream-started:10e2c843-05de-45cd-86dd-0ea21cda84c4
27967bdc-007e-4073-8c7a-8968a461a473	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "10e2c843-05de-45cd-86dd-0ea21cda84c4", "startedAt": "2026-03-29T22:13:10.463Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-03-29 22:13:10.511	\N	10e2c843-05de-45cd-86dd-0ea21cda84c4	stream-started:10e2c843-05de-45cd-86dd-0ea21cda84c4
1be6e4fe-e222-4988-92fd-1268caded919	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "b176fd7d-b6d0-4a60-8157-f50c5e9a23ea", "startedAt": "2026-03-29T22:14:51.972Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-03-29 22:14:52.018	\N	b176fd7d-b6d0-4a60-8157-f50c5e9a23ea	stream-started:b176fd7d-b6d0-4a60-8157-f50c5e9a23ea
401f45e3-18a5-4d17-8bb8-7d76408750d0	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "b176fd7d-b6d0-4a60-8157-f50c5e9a23ea", "startedAt": "2026-03-29T22:14:51.972Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-03-29 22:14:52.018	\N	b176fd7d-b6d0-4a60-8157-f50c5e9a23ea	stream-started:b176fd7d-b6d0-4a60-8157-f50c5e9a23ea
a5a5de8b-3c00-4141-a05d-3819aadd2d20	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "354a4e63-9feb-49bb-ab6d-12d281854c85", "startedAt": "2026-03-29T22:28:20.930Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-03-29 22:28:20.979	\N	354a4e63-9feb-49bb-ab6d-12d281854c85	stream-started:354a4e63-9feb-49bb-ab6d-12d281854c85
c42ed245-85b7-4a30-b10a-62b97d0db513	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "354a4e63-9feb-49bb-ab6d-12d281854c85", "startedAt": "2026-03-29T22:28:20.930Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-03-29 22:28:20.979	\N	354a4e63-9feb-49bb-ab6d-12d281854c85	stream-started:354a4e63-9feb-49bb-ab6d-12d281854c85
af752e59-d80e-4ffe-a033-d4baa7db0ef5	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "436bff59-7f3d-4179-9e25-6c4efbcbacb9", "startedAt": "2026-03-29T22:41:13.051Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-03-29 22:41:13.104	\N	436bff59-7f3d-4179-9e25-6c4efbcbacb9	stream-started:436bff59-7f3d-4179-9e25-6c4efbcbacb9
4675c4bb-ad24-4252-8603-1736cb5796c1	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "436bff59-7f3d-4179-9e25-6c4efbcbacb9", "startedAt": "2026-03-29T22:41:13.051Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-03-29 22:41:13.104	\N	436bff59-7f3d-4179-9e25-6c4efbcbacb9	stream-started:436bff59-7f3d-4179-9e25-6c4efbcbacb9
3220115e-55ee-4c52-bf73-1627ab528308	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "2bd17abc-ad0a-47e5-8d60-f309468f6466", "startedAt": "2026-03-29T22:45:30.381Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-03-29 22:45:30.425	\N	2bd17abc-ad0a-47e5-8d60-f309468f6466	stream-started:2bd17abc-ad0a-47e5-8d60-f309468f6466
f9068a66-1748-434a-990e-4eecf455a75b	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "2bd17abc-ad0a-47e5-8d60-f309468f6466", "startedAt": "2026-03-29T22:45:30.381Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-03-29 22:45:30.425	\N	2bd17abc-ad0a-47e5-8d60-f309468f6466	stream-started:2bd17abc-ad0a-47e5-8d60-f309468f6466
ab630a44-671a-4370-999b-04983396626b	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "70f5a64f-078a-478a-9a44-68acce85461b", "startedAt": "2026-03-29T22:55:04.536Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-03-29 22:55:04.584	\N	70f5a64f-078a-478a-9a44-68acce85461b	stream-started:70f5a64f-078a-478a-9a44-68acce85461b
79ae5a1d-2e6e-4e1c-9c43-d08584cd6d0c	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "70f5a64f-078a-478a-9a44-68acce85461b", "startedAt": "2026-03-29T22:55:04.536Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-03-29 22:55:04.584	\N	70f5a64f-078a-478a-9a44-68acce85461b	stream-started:70f5a64f-078a-478a-9a44-68acce85461b
af97a441-28eb-490c-8aa7-abb123f09940	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "9db1ac16-7231-4c90-8454-69660c40f761", "startedAt": "2026-03-29T23:10:24.500Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-03-29 23:10:24.55	\N	9db1ac16-7231-4c90-8454-69660c40f761	stream-started:9db1ac16-7231-4c90-8454-69660c40f761
e03aa965-02c9-46e3-bba7-76ffe95efe88	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "9db1ac16-7231-4c90-8454-69660c40f761", "startedAt": "2026-03-29T23:10:24.500Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-03-29 23:10:24.55	\N	9db1ac16-7231-4c90-8454-69660c40f761	stream-started:9db1ac16-7231-4c90-8454-69660c40f761
6b4e01f5-7bfd-4e09-8bc9-031b327e851e	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "86728898-a4e7-4ad7-a7c1-f04627cac589", "startedAt": "2026-03-29T23:11:18.874Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-03-29 23:11:18.919	\N	86728898-a4e7-4ad7-a7c1-f04627cac589	stream-started:86728898-a4e7-4ad7-a7c1-f04627cac589
fa1b3651-64b8-4e11-9098-b1363ae48c38	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "86728898-a4e7-4ad7-a7c1-f04627cac589", "startedAt": "2026-03-29T23:11:18.874Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-03-29 23:11:18.919	\N	86728898-a4e7-4ad7-a7c1-f04627cac589	stream-started:86728898-a4e7-4ad7-a7c1-f04627cac589
e202d7f1-0cb1-4797-9b55-248bf39bfbbe	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "10544059-6626-459a-b988-110e48f5fd85", "startedAt": "2026-03-29T23:12:01.940Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-03-29 23:12:01.984	\N	10544059-6626-459a-b988-110e48f5fd85	stream-started:10544059-6626-459a-b988-110e48f5fd85
c8ed9e12-2f06-41bf-90cc-80dce4466048	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "10544059-6626-459a-b988-110e48f5fd85", "startedAt": "2026-03-29T23:12:01.940Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-03-29 23:12:01.984	\N	10544059-6626-459a-b988-110e48f5fd85	stream-started:10544059-6626-459a-b988-110e48f5fd85
8cab71c0-ecca-423e-b6e5-db01bd83a3b8	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "6d6a1a95-6384-4252-9737-62aefe3d21b2", "startedAt": "2026-03-29T23:15:07.704Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-03-29 23:15:07.74	\N	6d6a1a95-6384-4252-9737-62aefe3d21b2	stream-started:6d6a1a95-6384-4252-9737-62aefe3d21b2
c63a035a-7424-4a6f-9cf4-02d28e7c4443	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "6d6a1a95-6384-4252-9737-62aefe3d21b2", "startedAt": "2026-03-29T23:15:07.704Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-03-29 23:15:07.74	\N	6d6a1a95-6384-4252-9737-62aefe3d21b2	stream-started:6d6a1a95-6384-4252-9737-62aefe3d21b2
b6710ce9-7042-41bf-92cf-affc1f8065ed	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "2da4eae4-5604-413b-a0a8-c9155c07b7cd", "startedAt": "2026-03-29T23:22:22.812Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-03-29 23:22:22.857	\N	2da4eae4-5604-413b-a0a8-c9155c07b7cd	stream-started:2da4eae4-5604-413b-a0a8-c9155c07b7cd
978507c0-4f22-4d49-ab44-8a05b764d31b	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "2da4eae4-5604-413b-a0a8-c9155c07b7cd", "startedAt": "2026-03-29T23:22:22.812Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-03-29 23:22:22.857	\N	2da4eae4-5604-413b-a0a8-c9155c07b7cd	stream-started:2da4eae4-5604-413b-a0a8-c9155c07b7cd
dcc06832-b36d-4d4b-b075-6c1255341484	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "8005af89-6a3a-4992-b2bb-b3fc7930c92c", "startedAt": "2026-03-29T23:22:59.174Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-03-29 23:22:59.214	\N	8005af89-6a3a-4992-b2bb-b3fc7930c92c	stream-started:8005af89-6a3a-4992-b2bb-b3fc7930c92c
89581003-7712-4377-b362-3c661f4c24a4	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "8005af89-6a3a-4992-b2bb-b3fc7930c92c", "startedAt": "2026-03-29T23:22:59.174Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-03-29 23:22:59.214	\N	8005af89-6a3a-4992-b2bb-b3fc7930c92c	stream-started:8005af89-6a3a-4992-b2bb-b3fc7930c92c
6c4195a4-48f7-4d1d-911c-0e9305edf44f	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "a2890620-e7a4-4122-913a-e532e9e5591b", "startedAt": "2026-03-29T23:56:25.573Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-03-29 23:56:25.621	\N	a2890620-e7a4-4122-913a-e532e9e5591b	stream-started:a2890620-e7a4-4122-913a-e532e9e5591b
943c6487-14bd-4dd1-9618-6ac87b6c0b8b	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "a2890620-e7a4-4122-913a-e532e9e5591b", "startedAt": "2026-03-29T23:56:25.573Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-03-29 23:56:25.621	\N	a2890620-e7a4-4122-913a-e532e9e5591b	stream-started:a2890620-e7a4-4122-913a-e532e9e5591b
3f429da0-c189-4c61-8e95-e9661fdf4c8c	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "77d1076b-ad76-41e3-b9b7-0042f1938066", "startedAt": "2026-03-29T23:57:32.952Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-03-29 23:57:32.992	\N	77d1076b-ad76-41e3-b9b7-0042f1938066	stream-started:77d1076b-ad76-41e3-b9b7-0042f1938066
e2141a63-6dab-4e00-a5eb-d8ac6614663f	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "77d1076b-ad76-41e3-b9b7-0042f1938066", "startedAt": "2026-03-29T23:57:32.952Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-03-29 23:57:32.992	\N	77d1076b-ad76-41e3-b9b7-0042f1938066	stream-started:77d1076b-ad76-41e3-b9b7-0042f1938066
83f4e8b1-18ec-4b03-aa68-0c44c95f3bdd	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "32d6e607-c997-45ec-9cb2-7dfba5f1e5b6", "startedAt": "2026-03-30T00:04:32.581Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-03-30 00:04:32.626	\N	32d6e607-c997-45ec-9cb2-7dfba5f1e5b6	stream-started:32d6e607-c997-45ec-9cb2-7dfba5f1e5b6
7633e141-3d8c-4f6d-88a7-13beaa8e98c2	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "32d6e607-c997-45ec-9cb2-7dfba5f1e5b6", "startedAt": "2026-03-30T00:04:32.581Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-03-30 00:04:32.626	\N	32d6e607-c997-45ec-9cb2-7dfba5f1e5b6	stream-started:32d6e607-c997-45ec-9cb2-7dfba5f1e5b6
88bfbf0d-6df2-44ac-85da-5186f68f86c7	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "445be4fe-583c-4e3f-b545-3be0ca1f5e2d", "startedAt": "2026-03-30T00:06:15.073Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-03-30 00:06:15.115	\N	445be4fe-583c-4e3f-b545-3be0ca1f5e2d	stream-started:445be4fe-583c-4e3f-b545-3be0ca1f5e2d
4392d462-e54e-40df-b3f8-fef593718919	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "445be4fe-583c-4e3f-b545-3be0ca1f5e2d", "startedAt": "2026-03-30T00:06:15.073Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-03-30 00:06:15.115	\N	445be4fe-583c-4e3f-b545-3be0ca1f5e2d	stream-started:445be4fe-583c-4e3f-b545-3be0ca1f5e2d
653292a3-180c-43b5-9361-1455befa2695	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "382c9037-0ef1-4184-9f67-1719c1e5ed27", "startedAt": "2026-03-30T00:11:49.137Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-03-30 00:11:49.18	\N	382c9037-0ef1-4184-9f67-1719c1e5ed27	stream-started:382c9037-0ef1-4184-9f67-1719c1e5ed27
668f4e5d-d9c2-4dee-969c-fa4b7f6b2dae	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "382c9037-0ef1-4184-9f67-1719c1e5ed27", "startedAt": "2026-03-30T00:11:49.137Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-03-30 00:11:49.18	\N	382c9037-0ef1-4184-9f67-1719c1e5ed27	stream-started:382c9037-0ef1-4184-9f67-1719c1e5ed27
249340b4-d6da-4934-bc00-e0ddb4d4b97d	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "f991d30e-d26c-4e52-80be-587c209787a2", "startedAt": "2026-03-30T00:13:50.742Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-03-30 00:13:50.782	\N	f991d30e-d26c-4e52-80be-587c209787a2	stream-started:f991d30e-d26c-4e52-80be-587c209787a2
a2cb338b-06cb-4aa7-8487-522521b7fc29	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "f991d30e-d26c-4e52-80be-587c209787a2", "startedAt": "2026-03-30T00:13:50.742Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-03-30 00:13:50.782	\N	f991d30e-d26c-4e52-80be-587c209787a2	stream-started:f991d30e-d26c-4e52-80be-587c209787a2
dc67531c-72f0-4e6a-b145-7882c72296c7	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "86125c98-2c14-4803-a7a5-0eb988a90635", "startedAt": "2026-03-30T00:57:20.517Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-03-30 00:57:20.56	\N	86125c98-2c14-4803-a7a5-0eb988a90635	stream-started:86125c98-2c14-4803-a7a5-0eb988a90635
44fa9eb3-761a-4103-96cf-6776b109e13a	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "86125c98-2c14-4803-a7a5-0eb988a90635", "startedAt": "2026-03-30T00:57:20.517Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-03-30 00:57:20.56	\N	86125c98-2c14-4803-a7a5-0eb988a90635	stream-started:86125c98-2c14-4803-a7a5-0eb988a90635
d60e79eb-d551-43a1-96aa-932de97c6b9b	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "39cd9fde-9e23-4e3c-949d-550b33ee4f90", "startedAt": "2026-03-30T00:58:12.862Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-03-30 00:58:12.907	\N	39cd9fde-9e23-4e3c-949d-550b33ee4f90	stream-started:39cd9fde-9e23-4e3c-949d-550b33ee4f90
50c71942-4222-4e0d-819d-73004debe645	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "39cd9fde-9e23-4e3c-949d-550b33ee4f90", "startedAt": "2026-03-30T00:58:12.862Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-03-30 00:58:12.907	\N	39cd9fde-9e23-4e3c-949d-550b33ee4f90	stream-started:39cd9fde-9e23-4e3c-949d-550b33ee4f90
8eac8517-7b32-4710-be24-9caa7c7990b3	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "9c7d7da2-6440-4236-b6ad-3730fcd8b403", "startedAt": "2026-03-30T01:11:56.059Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-03-30 01:11:56.096	\N	9c7d7da2-6440-4236-b6ad-3730fcd8b403	stream-started:9c7d7da2-6440-4236-b6ad-3730fcd8b403
62107e30-5924-4df9-9339-e78e084a7049	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "9c7d7da2-6440-4236-b6ad-3730fcd8b403", "startedAt": "2026-03-30T01:11:56.059Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-03-30 01:11:56.096	\N	9c7d7da2-6440-4236-b6ad-3730fcd8b403	stream-started:9c7d7da2-6440-4236-b6ad-3730fcd8b403
f4ae4d90-fed2-4adb-a379-f33612bed761	3961fabe-1345-4426-bd8a-ca0a5eac3aac	STREAM_STARTED	JamesConnor is live now	JamesConnor started: My Live Stream	{"title": "My Live Stream", "streamId": "a15f2ff7-b78c-4ec7-a1bc-2959d4c5fb2c", "startedAt": "2026-03-29T16:23:43.958Z", "hostUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "visibility": "PUBLIC", "hostUsername": "JamesConnor", "hostAvatarUrl": null, "hostDisplayName": "JamesConnor"}	2026-03-29 16:23:44.003	2026-03-30 01:15:26.161	a15f2ff7-b78c-4ec7-a1bc-2959d4c5fb2c	stream-started:a15f2ff7-b78c-4ec7-a1bc-2959d4c5fb2c
cad66f43-f961-4d61-88c2-6111e3dc33a2	3961fabe-1345-4426-bd8a-ca0a5eac3aac	STREAM_STARTED	JamesConnor is live now	JamesConnor started: My Live Stream	{"title": "My Live Stream", "streamId": "f15ddde3-9e7d-465b-b066-68cfd265e936", "startedAt": "2026-03-29T15:50:25.843Z", "hostUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "visibility": "PUBLIC", "hostUsername": "JamesConnor", "hostAvatarUrl": null, "hostDisplayName": "JamesConnor"}	2026-03-29 15:50:25.877	2026-03-30 01:15:28.538	f15ddde3-9e7d-465b-b066-68cfd265e936	stream-started:f15ddde3-9e7d-465b-b066-68cfd265e936
de04d03d-6dc3-46d7-8c00-0a1e35811dbb	3961fabe-1345-4426-bd8a-ca0a5eac3aac	GIFT_RECEIVED	You received a gift	FrankSinatra sent you Crowned Goat	{"txId": "718ed453-19c5-4457-a1bf-621958a58757", "giftId": "crown_goat", "giftName": "Crowned Goat", "streamId": "f95d9d98-2a21-4211-bda1-11573a7c3af5", "diamondValue": 250, "senderUserId": "e9134380-2da7-4a1e-bd2a-34398f85a6e5", "senderUsername": "FrankSinatra", "recipientUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "senderDisplayName": "FrankSinatra"}	2026-03-29 09:20:53.105	2026-03-30 01:15:33.287	f95d9d98-2a21-4211-bda1-11573a7c3af5	gift:718ed453-19c5-4457-a1bf-621958a58757
6005e39a-e627-4bab-91eb-484b4ba93f78	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "31227a63-d77c-4ff0-bb2c-33c95cca836a", "startedAt": "2026-03-30T01:27:19.007Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-03-30 01:27:19.051	\N	31227a63-d77c-4ff0-bb2c-33c95cca836a	stream-started:31227a63-d77c-4ff0-bb2c-33c95cca836a
f2e6997f-8e9a-4244-8a75-dc5b02cd3a8c	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "31227a63-d77c-4ff0-bb2c-33c95cca836a", "startedAt": "2026-03-30T01:27:19.007Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-03-30 01:27:19.051	\N	31227a63-d77c-4ff0-bb2c-33c95cca836a	stream-started:31227a63-d77c-4ff0-bb2c-33c95cca836a
0f7b44a6-3536-4c1b-bd5e-37cfd95b45eb	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "bf6ab63d-445a-4e54-b4e1-2297258f8d98", "startedAt": "2026-03-30T01:45:50.178Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-03-30 01:45:50.22	\N	bf6ab63d-445a-4e54-b4e1-2297258f8d98	stream-started:bf6ab63d-445a-4e54-b4e1-2297258f8d98
51a30015-c4cc-46be-ad6a-e2879eca139e	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "bf6ab63d-445a-4e54-b4e1-2297258f8d98", "startedAt": "2026-03-30T01:45:50.178Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-03-30 01:45:50.22	\N	bf6ab63d-445a-4e54-b4e1-2297258f8d98	stream-started:bf6ab63d-445a-4e54-b4e1-2297258f8d98
80b2300b-12e7-4196-a06b-e12a00258a33	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "02a9d097-1bce-479f-b4e3-a2e941c55369", "startedAt": "2026-03-30T01:49:44.547Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-03-30 01:49:44.586	\N	02a9d097-1bce-479f-b4e3-a2e941c55369	stream-started:02a9d097-1bce-479f-b4e3-a2e941c55369
a3ae8ab0-25b7-48fd-a2ad-7542c8e33a44	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "02a9d097-1bce-479f-b4e3-a2e941c55369", "startedAt": "2026-03-30T01:49:44.547Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-03-30 01:49:44.586	\N	02a9d097-1bce-479f-b4e3-a2e941c55369	stream-started:02a9d097-1bce-479f-b4e3-a2e941c55369
01a56693-abc1-4f91-b13f-2c5d999c48d8	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "bd30a810-0868-4216-b030-da607a5a7cd6", "startedAt": "2026-03-30T01:55:32.273Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-03-30 01:55:32.319	\N	bd30a810-0868-4216-b030-da607a5a7cd6	stream-started:bd30a810-0868-4216-b030-da607a5a7cd6
586562ee-5a4b-4760-9454-32bf09355a7f	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "bd30a810-0868-4216-b030-da607a5a7cd6", "startedAt": "2026-03-30T01:55:32.273Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-03-30 01:55:32.319	\N	bd30a810-0868-4216-b030-da607a5a7cd6	stream-started:bd30a810-0868-4216-b030-da607a5a7cd6
66a5ccaa-11bc-492d-beba-d6299cdebe7c	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "495bd926-8b1d-44c8-9a20-10721639313c", "startedAt": "2026-03-30T01:58:53.753Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-03-30 01:58:53.792	\N	495bd926-8b1d-44c8-9a20-10721639313c	stream-started:495bd926-8b1d-44c8-9a20-10721639313c
2ea9deea-c3d7-471c-af00-5000a10d3c25	281ac0c9-d22b-4ece-895a-9d2c86a8f315	GIFT_RECEIVED	You received a gift	🎬 H!M sent you Galaxy	{"txId": "659c52b9-e263-4154-a2b1-274e7296d25e", "giftId": "galaxy", "giftName": "Galaxy", "streamId": "2d2e25f5-33bd-4adf-b69e-150d53b5b108", "diamondValue": 1000000, "senderUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "senderUsername": "BigDaddy", "recipientUserId": "281ac0c9-d22b-4ece-895a-9d2c86a8f315", "senderDisplayName": "🎬 H!M"}	2026-04-01 09:30:11.48	\N	2d2e25f5-33bd-4adf-b69e-150d53b5b108	gift:659c52b9-e263-4154-a2b1-274e7296d25e
3fc08bab-77db-421a-ae52-daf8364f7478	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "495bd926-8b1d-44c8-9a20-10721639313c", "startedAt": "2026-03-30T01:58:53.753Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-03-30 01:58:53.792	\N	495bd926-8b1d-44c8-9a20-10721639313c	stream-started:495bd926-8b1d-44c8-9a20-10721639313c
ed4358ce-06ff-4932-8195-f5af9aeb2418	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "f3b0301e-650e-438a-9581-cb2582b887a4", "startedAt": "2026-03-30T02:14:54.210Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-03-30 02:14:54.262	\N	f3b0301e-650e-438a-9581-cb2582b887a4	stream-started:f3b0301e-650e-438a-9581-cb2582b887a4
827ea5b6-03a3-4dac-a936-d78ab76793bf	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "f3b0301e-650e-438a-9581-cb2582b887a4", "startedAt": "2026-03-30T02:14:54.210Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-03-30 02:14:54.262	\N	f3b0301e-650e-438a-9581-cb2582b887a4	stream-started:f3b0301e-650e-438a-9581-cb2582b887a4
a420ea73-7298-4b85-8411-28901c10b737	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "ff03452b-730e-4aa3-9287-90f37a7be132", "startedAt": "2026-03-30T02:23:41.027Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-03-30 02:23:41.071	\N	ff03452b-730e-4aa3-9287-90f37a7be132	stream-started:ff03452b-730e-4aa3-9287-90f37a7be132
84661256-0114-40f1-81f1-e93a54fff17a	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "ff03452b-730e-4aa3-9287-90f37a7be132", "startedAt": "2026-03-30T02:23:41.027Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-03-30 02:23:41.071	\N	ff03452b-730e-4aa3-9287-90f37a7be132	stream-started:ff03452b-730e-4aa3-9287-90f37a7be132
8172f7e5-81e5-48c2-abc9-224af3f39963	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "f7121682-ae4c-48e5-b566-fbf2ee36d1d6", "startedAt": "2026-03-30T02:24:14.532Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-03-30 02:24:14.574	\N	f7121682-ae4c-48e5-b566-fbf2ee36d1d6	stream-started:f7121682-ae4c-48e5-b566-fbf2ee36d1d6
195b2569-8747-4c4b-a9a6-a008878a59de	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "f7121682-ae4c-48e5-b566-fbf2ee36d1d6", "startedAt": "2026-03-30T02:24:14.532Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-03-30 02:24:14.574	\N	f7121682-ae4c-48e5-b566-fbf2ee36d1d6	stream-started:f7121682-ae4c-48e5-b566-fbf2ee36d1d6
d449621e-016a-4963-981b-112289a8af03	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "73103c83-901a-4e0a-b58c-329d8523ff3a", "startedAt": "2026-03-31T01:50:29.902Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-03-31 01:50:29.945	\N	73103c83-901a-4e0a-b58c-329d8523ff3a	stream-started:73103c83-901a-4e0a-b58c-329d8523ff3a
9eaf1c0d-cd5d-4a4f-a44a-bcebc3c12043	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "73103c83-901a-4e0a-b58c-329d8523ff3a", "startedAt": "2026-03-31T01:50:29.902Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-03-31 01:50:29.945	\N	73103c83-901a-4e0a-b58c-329d8523ff3a	stream-started:73103c83-901a-4e0a-b58c-329d8523ff3a
c7c60ad4-0bca-4183-9267-a9162e3c7739	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "f2a4ec93-0634-498f-ab8e-60cd037ea291", "startedAt": "2026-04-01T01:58:42.687Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-04-01 01:58:42.718	\N	f2a4ec93-0634-498f-ab8e-60cd037ea291	stream-started:f2a4ec93-0634-498f-ab8e-60cd037ea291
55505121-88eb-4883-a3d8-c06afdfff276	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "f2a4ec93-0634-498f-ab8e-60cd037ea291", "startedAt": "2026-04-01T01:58:42.687Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-04-01 01:58:42.718	\N	f2a4ec93-0634-498f-ab8e-60cd037ea291	stream-started:f2a4ec93-0634-498f-ab8e-60cd037ea291
be87c9d7-2563-4e12-ba4a-c674931f6069	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "389c03fe-873d-454a-91c0-dc059ceb7532", "startedAt": "2026-04-01T02:00:23.819Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-04-01 02:00:23.846	\N	389c03fe-873d-454a-91c0-dc059ceb7532	stream-started:389c03fe-873d-454a-91c0-dc059ceb7532
79e6c665-3bf5-45a7-b6ba-02decd9ca6ae	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "389c03fe-873d-454a-91c0-dc059ceb7532", "startedAt": "2026-04-01T02:00:23.819Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-04-01 02:00:23.846	\N	389c03fe-873d-454a-91c0-dc059ceb7532	stream-started:389c03fe-873d-454a-91c0-dc059ceb7532
1cb04178-3ccc-46d2-be72-a7930f5a10c3	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "084c6697-2f19-45b2-bf6c-f9fbfa2f1949", "startedAt": "2026-04-01T02:35:47.499Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-04-01 02:35:47.527	\N	084c6697-2f19-45b2-bf6c-f9fbfa2f1949	stream-started:084c6697-2f19-45b2-bf6c-f9fbfa2f1949
f6e57f57-2a73-43dd-8746-b378531b90c1	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "084c6697-2f19-45b2-bf6c-f9fbfa2f1949", "startedAt": "2026-04-01T02:35:47.499Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-04-01 02:35:47.527	\N	084c6697-2f19-45b2-bf6c-f9fbfa2f1949	stream-started:084c6697-2f19-45b2-bf6c-f9fbfa2f1949
bb60d8f6-7535-49f6-babb-6480b80d2884	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "8f759ba1-d9e0-4c1f-b486-ed85be7ed073", "startedAt": "2026-04-01T03:10:17.337Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-04-01 03:10:17.361	\N	8f759ba1-d9e0-4c1f-b486-ed85be7ed073	stream-started:8f759ba1-d9e0-4c1f-b486-ed85be7ed073
d9a61f5d-f3ea-425d-ab82-239986319652	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "8f759ba1-d9e0-4c1f-b486-ed85be7ed073", "startedAt": "2026-04-01T03:10:17.337Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-04-01 03:10:17.361	\N	8f759ba1-d9e0-4c1f-b486-ed85be7ed073	stream-started:8f759ba1-d9e0-4c1f-b486-ed85be7ed073
5b086055-94c7-416a-ad2b-d364d8d490f3	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "f51a8588-7221-4f98-b449-ef68c9deba5d", "startedAt": "2026-04-01T03:18:16.072Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-04-01 03:18:16.098	\N	f51a8588-7221-4f98-b449-ef68c9deba5d	stream-started:f51a8588-7221-4f98-b449-ef68c9deba5d
e39effbb-af1b-4776-8453-3cdeea044bfd	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "f51a8588-7221-4f98-b449-ef68c9deba5d", "startedAt": "2026-04-01T03:18:16.072Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-04-01 03:18:16.098	\N	f51a8588-7221-4f98-b449-ef68c9deba5d	stream-started:f51a8588-7221-4f98-b449-ef68c9deba5d
5d9b0563-0bd3-4744-8fa0-74ca1d0accf9	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "2146ffc2-a9dd-444e-9b0b-46973aca29d6", "startedAt": "2026-04-01T03:36:04.068Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-04-01 03:36:04.094	\N	2146ffc2-a9dd-444e-9b0b-46973aca29d6	stream-started:2146ffc2-a9dd-444e-9b0b-46973aca29d6
3d887cbf-0d2a-4023-900a-f1730c3c39e7	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "2146ffc2-a9dd-444e-9b0b-46973aca29d6", "startedAt": "2026-04-01T03:36:04.068Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-04-01 03:36:04.094	\N	2146ffc2-a9dd-444e-9b0b-46973aca29d6	stream-started:2146ffc2-a9dd-444e-9b0b-46973aca29d6
55d942ad-25cb-4e35-b761-f62dad7e13a9	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "d55502ca-ce10-4099-b79a-54180cf83a8e", "startedAt": "2026-04-01T03:55:19.066Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-04-01 03:55:19.092	\N	d55502ca-ce10-4099-b79a-54180cf83a8e	stream-started:d55502ca-ce10-4099-b79a-54180cf83a8e
09a54cf4-bac9-4aa2-9def-5a0f00739038	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "d55502ca-ce10-4099-b79a-54180cf83a8e", "startedAt": "2026-04-01T03:55:19.066Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-04-01 03:55:19.092	\N	d55502ca-ce10-4099-b79a-54180cf83a8e	stream-started:d55502ca-ce10-4099-b79a-54180cf83a8e
be0c539a-14e6-46bb-97d8-bf019cd535e8	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "287240b3-4aca-4b24-85c0-0ba73fce38e8", "startedAt": "2026-04-01T03:59:12.928Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-04-01 03:59:12.953	\N	287240b3-4aca-4b24-85c0-0ba73fce38e8	stream-started:287240b3-4aca-4b24-85c0-0ba73fce38e8
d5669db6-3aa6-4a7a-9f8d-3a4df6a9e755	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "287240b3-4aca-4b24-85c0-0ba73fce38e8", "startedAt": "2026-04-01T03:59:12.928Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-04-01 03:59:12.953	\N	287240b3-4aca-4b24-85c0-0ba73fce38e8	stream-started:287240b3-4aca-4b24-85c0-0ba73fce38e8
8a9a2cba-e1b4-4289-bada-c93d1f89164e	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "98cbd644-54d2-4f7d-999f-76cbd8682a66", "startedAt": "2026-04-01T04:02:02.831Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-04-01 04:02:02.856	\N	98cbd644-54d2-4f7d-999f-76cbd8682a66	stream-started:98cbd644-54d2-4f7d-999f-76cbd8682a66
4e071001-c121-4269-8c7a-d64374763169	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "98cbd644-54d2-4f7d-999f-76cbd8682a66", "startedAt": "2026-04-01T04:02:02.831Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-04-01 04:02:02.856	\N	98cbd644-54d2-4f7d-999f-76cbd8682a66	stream-started:98cbd644-54d2-4f7d-999f-76cbd8682a66
9d87efd0-f3f2-4a8d-8d8b-682741f8401d	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "afc38820-d731-4072-90d9-285710074f89", "startedAt": "2026-04-01T04:15:51.112Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-04-01 04:15:51.137	\N	afc38820-d731-4072-90d9-285710074f89	stream-started:afc38820-d731-4072-90d9-285710074f89
605781f6-1b19-49d7-81d6-a2087b1f0828	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "afc38820-d731-4072-90d9-285710074f89", "startedAt": "2026-04-01T04:15:51.112Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-04-01 04:15:51.137	\N	afc38820-d731-4072-90d9-285710074f89	stream-started:afc38820-d731-4072-90d9-285710074f89
1599b744-cbef-44e7-8446-74b791a27fb7	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "405bf147-56fa-4844-bbc2-86e73d57398a", "startedAt": "2026-04-01T04:33:00.436Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-04-01 04:33:03.673	\N	405bf147-56fa-4844-bbc2-86e73d57398a	stream-started:405bf147-56fa-4844-bbc2-86e73d57398a
a171c914-3d0d-439b-98ed-a04ec2e8f70d	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "405bf147-56fa-4844-bbc2-86e73d57398a", "startedAt": "2026-04-01T04:33:00.436Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-04-01 04:33:03.673	\N	405bf147-56fa-4844-bbc2-86e73d57398a	stream-started:405bf147-56fa-4844-bbc2-86e73d57398a
b35a169e-00ea-4679-aeca-cd353bf4e1f4	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "d9736820-7961-41e6-9268-7a29224f49f7", "startedAt": "2026-04-01T04:33:42.579Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-04-01 04:33:45.731	\N	d9736820-7961-41e6-9268-7a29224f49f7	stream-started:d9736820-7961-41e6-9268-7a29224f49f7
ab78651f-2d1b-47cd-b227-05985f8c2785	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "d9736820-7961-41e6-9268-7a29224f49f7", "startedAt": "2026-04-01T04:33:42.579Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-04-01 04:33:45.731	\N	d9736820-7961-41e6-9268-7a29224f49f7	stream-started:d9736820-7961-41e6-9268-7a29224f49f7
dcbf66c2-2b81-4230-a462-2e1a91efd002	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "6ec74e99-6e58-4a60-9e94-1048f182d264", "startedAt": "2026-04-01T04:34:17.835Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-04-01 04:34:17.863	\N	6ec74e99-6e58-4a60-9e94-1048f182d264	stream-started:6ec74e99-6e58-4a60-9e94-1048f182d264
dd65e412-8677-4d43-beef-7ae659ca80f8	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "6ec74e99-6e58-4a60-9e94-1048f182d264", "startedAt": "2026-04-01T04:34:17.835Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-04-01 04:34:17.863	\N	6ec74e99-6e58-4a60-9e94-1048f182d264	stream-started:6ec74e99-6e58-4a60-9e94-1048f182d264
75333bce-9ddf-4efb-9107-271e3e2f94d6	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "41b9646d-4f67-4978-843c-7e8df013240e", "startedAt": "2026-04-01T04:35:11.777Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-04-01 04:35:12.094	\N	41b9646d-4f67-4978-843c-7e8df013240e	stream-started:41b9646d-4f67-4978-843c-7e8df013240e
bcc41c7c-0446-429d-92e8-e5f4f410a5a9	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "41b9646d-4f67-4978-843c-7e8df013240e", "startedAt": "2026-04-01T04:35:11.777Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-04-01 04:35:12.094	\N	41b9646d-4f67-4978-843c-7e8df013240e	stream-started:41b9646d-4f67-4978-843c-7e8df013240e
bbee7bfb-2439-4f03-9eeb-7fe00d9a9fa3	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "485a0f7c-83b8-4c59-a55c-3604febb32b3", "startedAt": "2026-04-01T04:48:00.831Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-04-01 04:48:00.856	\N	485a0f7c-83b8-4c59-a55c-3604febb32b3	stream-started:485a0f7c-83b8-4c59-a55c-3604febb32b3
0b08d04e-a30b-4dc1-a424-e88bd1a3323c	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "485a0f7c-83b8-4c59-a55c-3604febb32b3", "startedAt": "2026-04-01T04:48:00.831Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-04-01 04:48:00.856	\N	485a0f7c-83b8-4c59-a55c-3604febb32b3	stream-started:485a0f7c-83b8-4c59-a55c-3604febb32b3
dd779172-88f1-4a61-a527-82cfbdec6139	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "47c9010d-8a14-49b3-b32f-bd9edf385a18", "startedAt": "2026-04-01T04:52:29.118Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-04-01 04:52:29.146	\N	47c9010d-8a14-49b3-b32f-bd9edf385a18	stream-started:47c9010d-8a14-49b3-b32f-bd9edf385a18
9f0b4576-7ce7-4dd6-8a11-5fb805c4f435	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "47c9010d-8a14-49b3-b32f-bd9edf385a18", "startedAt": "2026-04-01T04:52:29.118Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-04-01 04:52:29.146	\N	47c9010d-8a14-49b3-b32f-bd9edf385a18	stream-started:47c9010d-8a14-49b3-b32f-bd9edf385a18
54ac74a2-fe90-4342-b1cd-ce577a8007e3	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "0302388d-14c6-43be-9880-5229aa377602", "startedAt": "2026-04-01T04:53:40.337Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-04-01 04:53:40.362	\N	0302388d-14c6-43be-9880-5229aa377602	stream-started:0302388d-14c6-43be-9880-5229aa377602
17c877df-1c4a-439a-bf13-e56e046f0eec	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "0302388d-14c6-43be-9880-5229aa377602", "startedAt": "2026-04-01T04:53:40.337Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-04-01 04:53:40.362	\N	0302388d-14c6-43be-9880-5229aa377602	stream-started:0302388d-14c6-43be-9880-5229aa377602
7a9af7a3-09ec-41be-9d3b-ebba4d1344f1	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "ace6f4ac-38cd-4699-a52d-84ef27384ecf", "startedAt": "2026-04-01T04:54:22.963Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-04-01 04:54:22.991	\N	ace6f4ac-38cd-4699-a52d-84ef27384ecf	stream-started:ace6f4ac-38cd-4699-a52d-84ef27384ecf
87ff5723-2351-4f36-a350-96268c194664	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "ace6f4ac-38cd-4699-a52d-84ef27384ecf", "startedAt": "2026-04-01T04:54:22.963Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-04-01 04:54:22.991	\N	ace6f4ac-38cd-4699-a52d-84ef27384ecf	stream-started:ace6f4ac-38cd-4699-a52d-84ef27384ecf
8c43cc76-f11e-4c73-bdf0-6ac4ef58f677	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "254ffb18-cb98-4685-a589-83850feb779e", "startedAt": "2026-04-01T05:25:53.442Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-04-01 05:25:53.472	\N	254ffb18-cb98-4685-a589-83850feb779e	stream-started:254ffb18-cb98-4685-a589-83850feb779e
a2262f8d-1be1-4b72-8824-9402451e1d60	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "254ffb18-cb98-4685-a589-83850feb779e", "startedAt": "2026-04-01T05:25:53.442Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-04-01 05:25:53.472	\N	254ffb18-cb98-4685-a589-83850feb779e	stream-started:254ffb18-cb98-4685-a589-83850feb779e
5ea4600d-82b2-44ab-8910-76b930f0e6b4	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "29d035b3-3f77-434b-afda-634755777eb9", "startedAt": "2026-04-01T05:39:03.456Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-04-01 05:39:03.486	\N	29d035b3-3f77-434b-afda-634755777eb9	stream-started:29d035b3-3f77-434b-afda-634755777eb9
3d8828c1-0826-43cd-8624-22d0804bde6b	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "29d035b3-3f77-434b-afda-634755777eb9", "startedAt": "2026-04-01T05:39:03.456Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-04-01 05:39:03.486	\N	29d035b3-3f77-434b-afda-634755777eb9	stream-started:29d035b3-3f77-434b-afda-634755777eb9
4128408d-f1ef-47cc-8c6d-9f49e7fc377a	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "f8048731-7af5-4b84-8f7a-575ec801791d", "startedAt": "2026-04-01T05:44:47.028Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-04-01 05:44:47.06	\N	f8048731-7af5-4b84-8f7a-575ec801791d	stream-started:f8048731-7af5-4b84-8f7a-575ec801791d
82eb00ea-ea5a-45f9-ba39-36b517ee18e8	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "f8048731-7af5-4b84-8f7a-575ec801791d", "startedAt": "2026-04-01T05:44:47.028Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-04-01 05:44:47.06	\N	f8048731-7af5-4b84-8f7a-575ec801791d	stream-started:f8048731-7af5-4b84-8f7a-575ec801791d
b6e5b721-4f99-49e4-8b00-1b0a51423d58	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "f908d303-37b5-4709-b160-fef59798a8ce", "startedAt": "2026-04-01T05:45:44.933Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-04-01 05:45:44.955	\N	f908d303-37b5-4709-b160-fef59798a8ce	stream-started:f908d303-37b5-4709-b160-fef59798a8ce
3ef51d5c-0a7a-46fe-ab80-d097059963a3	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "f908d303-37b5-4709-b160-fef59798a8ce", "startedAt": "2026-04-01T05:45:44.933Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-04-01 05:45:44.955	\N	f908d303-37b5-4709-b160-fef59798a8ce	stream-started:f908d303-37b5-4709-b160-fef59798a8ce
468c392f-7656-4440-b41b-87ebd0e83d01	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "4c787e07-3eb1-48fe-ad71-2a8f2856f1f3", "startedAt": "2026-04-01T05:46:05.365Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-04-01 05:46:05.391	\N	4c787e07-3eb1-48fe-ad71-2a8f2856f1f3	stream-started:4c787e07-3eb1-48fe-ad71-2a8f2856f1f3
1efdbe05-93a3-4695-bdb6-6db3c99fb83a	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "4c787e07-3eb1-48fe-ad71-2a8f2856f1f3", "startedAt": "2026-04-01T05:46:05.365Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-04-01 05:46:05.391	\N	4c787e07-3eb1-48fe-ad71-2a8f2856f1f3	stream-started:4c787e07-3eb1-48fe-ad71-2a8f2856f1f3
b3ab3c97-6ab9-4785-88a9-b50c4e70ab34	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "e25a79f0-2a3f-4a6c-8bb6-8da4dcfcac78", "startedAt": "2026-04-01T05:56:09.881Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-04-01 05:56:09.909	\N	e25a79f0-2a3f-4a6c-8bb6-8da4dcfcac78	stream-started:e25a79f0-2a3f-4a6c-8bb6-8da4dcfcac78
7a64eaa1-ba43-463d-9733-2ee90683f242	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "e25a79f0-2a3f-4a6c-8bb6-8da4dcfcac78", "startedAt": "2026-04-01T05:56:09.881Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-04-01 05:56:09.909	\N	e25a79f0-2a3f-4a6c-8bb6-8da4dcfcac78	stream-started:e25a79f0-2a3f-4a6c-8bb6-8da4dcfcac78
38c08d5b-eac0-444b-b58b-7e10adce42cc	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "8a3b6e2b-e790-4f38-ad5c-899c02a04b96", "startedAt": "2026-04-01T05:59:29.332Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-04-01 05:59:29.357	\N	8a3b6e2b-e790-4f38-ad5c-899c02a04b96	stream-started:8a3b6e2b-e790-4f38-ad5c-899c02a04b96
95148c99-247a-4b4a-8d71-1b696584ff9b	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "8a3b6e2b-e790-4f38-ad5c-899c02a04b96", "startedAt": "2026-04-01T05:59:29.332Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-04-01 05:59:29.357	\N	8a3b6e2b-e790-4f38-ad5c-899c02a04b96	stream-started:8a3b6e2b-e790-4f38-ad5c-899c02a04b96
7316b0ed-dcf4-4a4a-b3eb-a236a093900f	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "d2777555-bf06-451a-899c-a5b3f5557779", "startedAt": "2026-04-01T08:41:35.618Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-04-01 08:41:35.649	\N	d2777555-bf06-451a-899c-a5b3f5557779	stream-started:d2777555-bf06-451a-899c-a5b3f5557779
b1ace5df-6ff7-4de1-8e65-dab7ceaae91c	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	BigDaddy is live now	BigDaddy started: My Live Stream	{"title": "My Live Stream", "streamId": "d2777555-bf06-451a-899c-a5b3f5557779", "startedAt": "2026-04-01T08:41:35.618Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/0e95a885-e62b-4b5e-908a-c4dab3ca5cbe.jpeg", "hostDisplayName": "BigDaddy"}	2026-04-01 08:41:35.649	\N	d2777555-bf06-451a-899c-a5b3f5557779	stream-started:d2777555-bf06-451a-899c-a5b3f5557779
948428ac-0625-4879-a143-8bd2c042394c	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: This MY mfn house bitch!!!	{"title": "This MY mfn house bitch!!!", "streamId": "ca347a9f-b6d8-498e-a455-5804fd34f781", "startedAt": "2026-04-01T09:09:41.046Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-01 09:09:41.078	\N	ca347a9f-b6d8-498e-a455-5804fd34f781	stream-started:ca347a9f-b6d8-498e-a455-5804fd34f781
b3bd02d8-2af6-4d3b-ae4d-ba083abe9502	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: This MY mfn house bitch!!!	{"title": "This MY mfn house bitch!!!", "streamId": "ca347a9f-b6d8-498e-a455-5804fd34f781", "startedAt": "2026-04-01T09:09:41.046Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-01 09:09:41.078	\N	ca347a9f-b6d8-498e-a455-5804fd34f781	stream-started:ca347a9f-b6d8-498e-a455-5804fd34f781
44abf603-5f99-4efd-b877-411d49bbd6cf	281ac0c9-d22b-4ece-895a-9d2c86a8f315	MILESTONE_REACHED	Diamond milestone reached	🎬 H!M helped you reach 1,000,000 diamonds	{"giftId": "galaxy", "userId": "281ac0c9-d22b-4ece-895a-9d2c86a8f315", "giftTxId": "d184d94c-c082-4c64-8d00-f2d768a6e469", "achievedAt": "2026-04-01T09:15:47.043Z", "giverUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "giverUsername": "BigDaddy", "milestoneAmount": 1000000, "giverDisplayName": "🎬 H!M"}	2026-04-01 09:15:47.105	\N	e7c18482-912b-4e3d-936b-ce153022829e	milestone:281ac0c9-d22b-4ece-895a-9d2c86a8f315:1000000:d184d94c-c082-4c64-8d00-f2d768a6e469
a78c4b51-de9f-4b7b-a01b-247a83cf06f7	281ac0c9-d22b-4ece-895a-9d2c86a8f315	GIFT_RECEIVED	You received a gift	🎬 H!M sent you Galaxy	{"txId": "d184d94c-c082-4c64-8d00-f2d768a6e469", "giftId": "galaxy", "giftName": "Galaxy", "streamId": "e7c18482-912b-4e3d-936b-ce153022829e", "diamondValue": 1000000, "senderUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "senderUsername": "BigDaddy", "recipientUserId": "281ac0c9-d22b-4ece-895a-9d2c86a8f315", "senderDisplayName": "🎬 H!M"}	2026-04-01 09:15:47.128	\N	e7c18482-912b-4e3d-936b-ce153022829e	gift:d184d94c-c082-4c64-8d00-f2d768a6e469
e1e5b56d-cb5c-4ec3-a3a4-c26950f68b6e	281ac0c9-d22b-4ece-895a-9d2c86a8f315	GIFT_RECEIVED	Gift received	BigDaddy sent you Galaxy	{"giftId": "galaxy", "coinCost": 1000000, "giftName": "Galaxy", "giftTxId": "d184d94c-c082-4c64-8d00-f2d768a6e469", "streamId": "e7c18482-912b-4e3d-936b-ce153022829e", "createdAt": "2026-04-01T09:15:47.043Z", "diamondValue": 1000000, "senderUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "senderUsername": "BigDaddy", "recipientUserId": "281ac0c9-d22b-4ece-895a-9d2c86a8f315", "recipientUsername": "ChiDotGo"}	2026-04-01 09:15:51.649	\N	e7c18482-912b-4e3d-936b-ce153022829e	gift_tx:d184d94c-c082-4c64-8d00-f2d768a6e469
2a8203d3-2032-436b-adc0-36ff27b4f904	281ac0c9-d22b-4ece-895a-9d2c86a8f315	MILESTONE_REACHED	Milestone reached	You reached 1,000,000 diamonds earned!	{"userId": "281ac0c9-d22b-4ece-895a-9d2c86a8f315", "giftTxId": "d184d94c-c082-4c64-8d00-f2d768a6e469", "username": "ChiDotGo", "createdAt": "2026-04-01T09:15:47.075Z", "achievedAt": "2026-04-01T09:15:47.043Z", "giverUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "milestoneId": "06c3bd6a-3b97-4cff-ba38-5ef94c3235ce", "giverUsername": "BigDaddy", "milestoneAmount": 1000000}	2026-04-01 09:15:51.662	\N	\N	milestone:06c3bd6a-3b97-4cff-ba38-5ef94c3235ce
4b90fe40-446d-4d21-850e-d61f76894d9e	281ac0c9-d22b-4ece-895a-9d2c86a8f315	GIFT_RECEIVED	You received a gift	🎬 H!M sent you Rose	{"txId": "0604a41d-f20d-4c83-8ed2-2269cdba7d63", "giftId": "rose", "giftName": "Rose", "streamId": "e7c18482-912b-4e3d-936b-ce153022829e", "diamondValue": 10, "senderUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "senderUsername": "BigDaddy", "recipientUserId": "281ac0c9-d22b-4ece-895a-9d2c86a8f315", "senderDisplayName": "🎬 H!M"}	2026-04-01 09:16:20.43	\N	e7c18482-912b-4e3d-936b-ce153022829e	gift:0604a41d-f20d-4c83-8ed2-2269cdba7d63
5035ab01-ab2c-4626-9fbc-92942a593dc0	281ac0c9-d22b-4ece-895a-9d2c86a8f315	GIFT_RECEIVED	Gift received	BigDaddy sent you Rose	{"giftId": "rose", "coinCost": 10, "giftName": "Rose", "giftTxId": "0604a41d-f20d-4c83-8ed2-2269cdba7d63", "streamId": "e7c18482-912b-4e3d-936b-ce153022829e", "createdAt": "2026-04-01T09:16:20.404Z", "diamondValue": 10, "senderUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "senderUsername": "BigDaddy", "recipientUserId": "281ac0c9-d22b-4ece-895a-9d2c86a8f315", "recipientUsername": "ChiDotGo"}	2026-04-01 09:16:21.652	\N	e7c18482-912b-4e3d-936b-ce153022829e	gift_tx:0604a41d-f20d-4c83-8ed2-2269cdba7d63
76a123fe-a47a-4d50-ab05-409395f39a92	281ac0c9-d22b-4ece-895a-9d2c86a8f315	SYSTEM	New message from 🎬 H!M	🎬 H!M: Yooooooo	{"dmMessageId": "3debe5d9-5562-435f-b46c-45ef23814250", "messageType": "TEXT", "senderUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "conversationId": "4551ebb6-723c-43a9-a4fd-4d15f91f874a", "senderUsername": "BigDaddy", "recipientUserId": "281ac0c9-d22b-4ece-895a-9d2c86a8f315", "senderAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "senderDisplayName": "🎬 H!M"}	2026-04-01 09:16:33.898	\N	\N	dm-received:3debe5d9-5562-435f-b46c-45ef23814250
83369d12-4bfc-44c4-8716-0194215b05a0	3961fabe-1345-4426-bd8a-ca0a5eac3aac	SYSTEM	New message from ChiDotGo	ChiDotGo: Eee	{"dmMessageId": "27a3dde5-ba84-471f-81c0-446f74759b2e", "messageType": "TEXT", "senderUserId": "281ac0c9-d22b-4ece-895a-9d2c86a8f315", "conversationId": "4551ebb6-723c-43a9-a4fd-4d15f91f874a", "senderUsername": "ChiDotGo", "recipientUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "senderAvatarUrl": null, "senderDisplayName": "ChiDotGo"}	2026-04-01 09:17:02.3	\N	\N	dm-received:27a3dde5-ba84-471f-81c0-446f74759b2e
43d7b845-5fbc-471b-aa90-47c6f3c650bf	281ac0c9-d22b-4ece-895a-9d2c86a8f315	SYSTEM	New message from 🎬 H!M	🎬 H!M sent you a gift	{"dmMessageId": "713bd044-e4bb-4903-aadd-b452c92d4784", "messageType": "GIFT", "senderUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "conversationId": "4551ebb6-723c-43a9-a4fd-4d15f91f874a", "senderUsername": "BigDaddy", "recipientUserId": "281ac0c9-d22b-4ece-895a-9d2c86a8f315", "senderAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "senderDisplayName": "🎬 H!M"}	2026-04-01 09:17:38.741	\N	\N	dm-received:713bd044-e4bb-4903-aadd-b452c92d4784
14a9d251-75f1-473c-bf37-f665c180cb44	281ac0c9-d22b-4ece-895a-9d2c86a8f315	GIFT_RECEIVED	Gift received	BigDaddy sent you Dragon Egg Hatch	{"giftId": "dragon_egg", "coinCost": 5000, "giftName": "Dragon Egg Hatch", "giftTxId": "3797657a-154b-4f99-b225-dd7cf9fa74be", "streamId": null, "createdAt": "2026-04-01T09:17:38.718Z", "diamondValue": 5000, "senderUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "senderUsername": "BigDaddy", "recipientUserId": "281ac0c9-d22b-4ece-895a-9d2c86a8f315", "recipientUsername": "ChiDotGo"}	2026-04-01 09:17:41.675	\N	\N	gift_tx:3797657a-154b-4f99-b225-dd7cf9fa74be
86c22fae-7124-4eb9-b98d-3d24206cb2ff	281ac0c9-d22b-4ece-895a-9d2c86a8f315	SYSTEM	New message from 🎬 H!M	🎬 H!M sent you a GIF	{"dmMessageId": "cfd35e97-12ad-4a97-b831-6abadf42e447", "messageType": "GIF", "senderUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "conversationId": "4551ebb6-723c-43a9-a4fd-4d15f91f874a", "senderUsername": "BigDaddy", "recipientUserId": "281ac0c9-d22b-4ece-895a-9d2c86a8f315", "senderAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "senderDisplayName": "🎬 H!M"}	2026-04-01 09:17:46.432	\N	\N	dm-received:cfd35e97-12ad-4a97-b831-6abadf42e447
e29395d1-c47e-44e3-900b-8179b55f40db	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: My Live Stream	{"title": "My Live Stream", "streamId": "96233155-9731-4913-9dae-dfe7ba7269d7", "startedAt": "2026-04-01T09:22:29.810Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-01 09:22:29.836	\N	96233155-9731-4913-9dae-dfe7ba7269d7	stream-started:96233155-9731-4913-9dae-dfe7ba7269d7
e551e920-403b-45e1-bf50-c270b1228c6c	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: My Live Stream	{"title": "My Live Stream", "streamId": "96233155-9731-4913-9dae-dfe7ba7269d7", "startedAt": "2026-04-01T09:22:29.810Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-01 09:22:29.836	\N	96233155-9731-4913-9dae-dfe7ba7269d7	stream-started:96233155-9731-4913-9dae-dfe7ba7269d7
acf7f045-3847-4e90-ad1c-7e623141a2fb	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: My Live Stream	{"title": "My Live Stream", "streamId": "c54155e7-1039-4597-b336-3a7097a63284", "startedAt": "2026-04-01T09:23:17.434Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-01 09:23:17.461	\N	c54155e7-1039-4597-b336-3a7097a63284	stream-started:c54155e7-1039-4597-b336-3a7097a63284
3c3306d3-c3e5-48f8-9523-e3a99b5e0bb4	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: My Live Stream	{"title": "My Live Stream", "streamId": "c54155e7-1039-4597-b336-3a7097a63284", "startedAt": "2026-04-01T09:23:17.434Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-01 09:23:17.461	\N	c54155e7-1039-4597-b336-3a7097a63284	stream-started:c54155e7-1039-4597-b336-3a7097a63284
d5bda6c9-bb34-43aa-81a7-1cea169d9dc4	3961fabe-1345-4426-bd8a-ca0a5eac3aac	GIFT_RECEIVED	You received a gift	ChiDotGo sent you Rose	{"txId": "19fd3eea-9a82-4014-a4e5-c70c5c4ff8ae", "giftId": "rose", "giftName": "Rose", "streamId": "c54155e7-1039-4597-b336-3a7097a63284", "diamondValue": 10, "senderUserId": "281ac0c9-d22b-4ece-895a-9d2c86a8f315", "senderUsername": "ChiDotGo", "recipientUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "senderDisplayName": "ChiDotGo"}	2026-04-01 09:25:24.547	\N	c54155e7-1039-4597-b336-3a7097a63284	gift:19fd3eea-9a82-4014-a4e5-c70c5c4ff8ae
8d8d36b6-618b-48e4-b16c-5f5b96d35db2	3961fabe-1345-4426-bd8a-ca0a5eac3aac	GIFT_RECEIVED	Gift received	ChiDotGo sent you Rose	{"giftId": "rose", "coinCost": 10, "giftName": "Rose", "giftTxId": "19fd3eea-9a82-4014-a4e5-c70c5c4ff8ae", "streamId": "c54155e7-1039-4597-b336-3a7097a63284", "createdAt": "2026-04-01T09:25:24.520Z", "diamondValue": 10, "senderUserId": "281ac0c9-d22b-4ece-895a-9d2c86a8f315", "senderUsername": "ChiDotGo", "recipientUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "recipientUsername": "BigDaddy"}	2026-04-01 09:25:26.77	\N	c54155e7-1039-4597-b336-3a7097a63284	gift_tx:19fd3eea-9a82-4014-a4e5-c70c5c4ff8ae
a5e0e02d-4bbd-433c-8c37-5d53a5b14dce	3961fabe-1345-4426-bd8a-ca0a5eac3aac	MILESTONE_REACHED	Diamond milestone reached	ChiDotGo helped you reach 1,000,000 diamonds	{"giftId": "galaxy", "userId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "giftTxId": "bc2f4918-37d3-4ade-8dce-1193fcf6f6a1", "achievedAt": "2026-04-01T09:25:30.938Z", "giverUserId": "281ac0c9-d22b-4ece-895a-9d2c86a8f315", "giverUsername": "ChiDotGo", "milestoneAmount": 1000000, "giverDisplayName": "ChiDotGo"}	2026-04-01 09:25:30.972	\N	c54155e7-1039-4597-b336-3a7097a63284	milestone:3961fabe-1345-4426-bd8a-ca0a5eac3aac:1000000:bc2f4918-37d3-4ade-8dce-1193fcf6f6a1
c1813103-6a16-4850-b5df-98065929d462	3961fabe-1345-4426-bd8a-ca0a5eac3aac	GIFT_RECEIVED	You received a gift	ChiDotGo sent you Galaxy	{"txId": "bc2f4918-37d3-4ade-8dce-1193fcf6f6a1", "giftId": "galaxy", "giftName": "Galaxy", "streamId": "c54155e7-1039-4597-b336-3a7097a63284", "diamondValue": 1000000, "senderUserId": "281ac0c9-d22b-4ece-895a-9d2c86a8f315", "senderUsername": "ChiDotGo", "recipientUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "senderDisplayName": "ChiDotGo"}	2026-04-01 09:25:30.991	\N	c54155e7-1039-4597-b336-3a7097a63284	gift:bc2f4918-37d3-4ade-8dce-1193fcf6f6a1
eafebcc4-fa51-45c0-87ae-a541ef0d935a	3961fabe-1345-4426-bd8a-ca0a5eac3aac	GIFT_RECEIVED	Gift received	ChiDotGo sent you Galaxy	{"giftId": "galaxy", "coinCost": 1000000, "giftName": "Galaxy", "giftTxId": "bc2f4918-37d3-4ade-8dce-1193fcf6f6a1", "streamId": "c54155e7-1039-4597-b336-3a7097a63284", "createdAt": "2026-04-01T09:25:30.938Z", "diamondValue": 1000000, "senderUserId": "281ac0c9-d22b-4ece-895a-9d2c86a8f315", "senderUsername": "ChiDotGo", "recipientUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "recipientUsername": "BigDaddy"}	2026-04-01 09:25:31.77	\N	c54155e7-1039-4597-b336-3a7097a63284	gift_tx:bc2f4918-37d3-4ade-8dce-1193fcf6f6a1
0ff160e5-5754-4475-920e-0b54d154ea9e	3961fabe-1345-4426-bd8a-ca0a5eac3aac	MILESTONE_REACHED	Milestone reached	You reached 1,000,000 diamonds earned!	{"userId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "giftTxId": "bc2f4918-37d3-4ade-8dce-1193fcf6f6a1", "username": "BigDaddy", "createdAt": "2026-04-01T09:25:30.961Z", "achievedAt": "2026-04-01T09:25:30.938Z", "giverUserId": "281ac0c9-d22b-4ece-895a-9d2c86a8f315", "milestoneId": "0915d098-2e2f-40db-a684-59345f1d9e66", "giverUsername": "ChiDotGo", "milestoneAmount": 1000000}	2026-04-01 09:25:31.782	\N	\N	milestone:0915d098-2e2f-40db-a684-59345f1d9e66
9b9b3345-2322-447c-94a0-4acc38c46a66	281ac0c9-d22b-4ece-895a-9d2c86a8f315	MILESTONE_REACHED	Diamond milestone reached	🎬 H!M helped you reach 2,000,000 diamonds	{"giftId": "galaxy", "userId": "281ac0c9-d22b-4ece-895a-9d2c86a8f315", "giftTxId": "6edb75ae-20c2-4652-b644-158e5caa1e60", "achievedAt": "2026-04-01T09:30:04.943Z", "giverUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "giverUsername": "BigDaddy", "milestoneAmount": 2000000, "giverDisplayName": "🎬 H!M"}	2026-04-01 09:30:04.98	\N	2d2e25f5-33bd-4adf-b69e-150d53b5b108	milestone:281ac0c9-d22b-4ece-895a-9d2c86a8f315:2000000:6edb75ae-20c2-4652-b644-158e5caa1e60
1cb4809c-2449-4243-b843-f3014619d66d	281ac0c9-d22b-4ece-895a-9d2c86a8f315	GIFT_RECEIVED	You received a gift	🎬 H!M sent you Galaxy	{"txId": "6edb75ae-20c2-4652-b644-158e5caa1e60", "giftId": "galaxy", "giftName": "Galaxy", "streamId": "2d2e25f5-33bd-4adf-b69e-150d53b5b108", "diamondValue": 1000000, "senderUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "senderUsername": "BigDaddy", "recipientUserId": "281ac0c9-d22b-4ece-895a-9d2c86a8f315", "senderDisplayName": "🎬 H!M"}	2026-04-01 09:30:05.001	\N	2d2e25f5-33bd-4adf-b69e-150d53b5b108	gift:6edb75ae-20c2-4652-b644-158e5caa1e60
25a4b91d-0f5c-4d2e-8ee6-6520cca41e34	281ac0c9-d22b-4ece-895a-9d2c86a8f315	MILESTONE_REACHED	Diamond milestone reached	🎬 H!M helped you reach 3,000,000 diamonds	{"giftId": "galaxy", "userId": "281ac0c9-d22b-4ece-895a-9d2c86a8f315", "giftTxId": "785dfbec-cc36-4019-9e6b-00470749d2ed", "achievedAt": "2026-04-01T09:30:06.537Z", "giverUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "giverUsername": "BigDaddy", "milestoneAmount": 3000000, "giverDisplayName": "🎬 H!M"}	2026-04-01 09:30:06.566	\N	2d2e25f5-33bd-4adf-b69e-150d53b5b108	milestone:281ac0c9-d22b-4ece-895a-9d2c86a8f315:3000000:785dfbec-cc36-4019-9e6b-00470749d2ed
cb4d9d94-a10d-4d2a-b285-36ca03554907	281ac0c9-d22b-4ece-895a-9d2c86a8f315	GIFT_RECEIVED	You received a gift	🎬 H!M sent you Galaxy	{"txId": "785dfbec-cc36-4019-9e6b-00470749d2ed", "giftId": "galaxy", "giftName": "Galaxy", "streamId": "2d2e25f5-33bd-4adf-b69e-150d53b5b108", "diamondValue": 1000000, "senderUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "senderUsername": "BigDaddy", "recipientUserId": "281ac0c9-d22b-4ece-895a-9d2c86a8f315", "senderDisplayName": "🎬 H!M"}	2026-04-01 09:30:06.582	\N	2d2e25f5-33bd-4adf-b69e-150d53b5b108	gift:785dfbec-cc36-4019-9e6b-00470749d2ed
6c042a27-ec90-48ce-a539-38af5ff02339	281ac0c9-d22b-4ece-895a-9d2c86a8f315	GIFT_RECEIVED	Gift received	BigDaddy sent you Galaxy	{"giftId": "galaxy", "coinCost": 1000000, "giftName": "Galaxy", "giftTxId": "6edb75ae-20c2-4652-b644-158e5caa1e60", "streamId": "2d2e25f5-33bd-4adf-b69e-150d53b5b108", "createdAt": "2026-04-01T09:30:04.943Z", "diamondValue": 1000000, "senderUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "senderUsername": "BigDaddy", "recipientUserId": "281ac0c9-d22b-4ece-895a-9d2c86a8f315", "recipientUsername": "ChiDotGo"}	2026-04-01 09:30:06.842	\N	2d2e25f5-33bd-4adf-b69e-150d53b5b108	gift_tx:6edb75ae-20c2-4652-b644-158e5caa1e60
e07ce03e-618f-4457-830d-4f604eafa63d	281ac0c9-d22b-4ece-895a-9d2c86a8f315	GIFT_RECEIVED	Gift received	BigDaddy sent you Galaxy	{"giftId": "galaxy", "coinCost": 1000000, "giftName": "Galaxy", "giftTxId": "785dfbec-cc36-4019-9e6b-00470749d2ed", "streamId": "2d2e25f5-33bd-4adf-b69e-150d53b5b108", "createdAt": "2026-04-01T09:30:06.537Z", "diamondValue": 1000000, "senderUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "senderUsername": "BigDaddy", "recipientUserId": "281ac0c9-d22b-4ece-895a-9d2c86a8f315", "recipientUsername": "ChiDotGo"}	2026-04-01 09:30:06.849	\N	2d2e25f5-33bd-4adf-b69e-150d53b5b108	gift_tx:785dfbec-cc36-4019-9e6b-00470749d2ed
3884d892-7bcc-4817-b23a-19e9314a2193	281ac0c9-d22b-4ece-895a-9d2c86a8f315	MILESTONE_REACHED	Milestone reached	You reached 2,000,000 diamonds earned!	{"userId": "281ac0c9-d22b-4ece-895a-9d2c86a8f315", "giftTxId": "6edb75ae-20c2-4652-b644-158e5caa1e60", "username": "ChiDotGo", "createdAt": "2026-04-01T09:30:04.968Z", "achievedAt": "2026-04-01T09:30:04.943Z", "giverUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "milestoneId": "3a590a6d-e5ab-4643-a428-8d0a005d7ae5", "giverUsername": "BigDaddy", "milestoneAmount": 2000000}	2026-04-01 09:30:06.86	\N	\N	milestone:3a590a6d-e5ab-4643-a428-8d0a005d7ae5
dc2f4790-8b01-4520-975e-e3d2388d1fad	281ac0c9-d22b-4ece-895a-9d2c86a8f315	MILESTONE_REACHED	Milestone reached	You reached 3,000,000 diamonds earned!	{"userId": "281ac0c9-d22b-4ece-895a-9d2c86a8f315", "giftTxId": "785dfbec-cc36-4019-9e6b-00470749d2ed", "username": "ChiDotGo", "createdAt": "2026-04-01T09:30:06.556Z", "achievedAt": "2026-04-01T09:30:06.537Z", "giverUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "milestoneId": "5fd8081c-6e77-4684-8022-2fc9fe39b928", "giverUsername": "BigDaddy", "milestoneAmount": 3000000}	2026-04-01 09:30:06.866	\N	\N	milestone:5fd8081c-6e77-4684-8022-2fc9fe39b928
d3a99567-7619-42e2-938a-6f7f7ec6ced3	281ac0c9-d22b-4ece-895a-9d2c86a8f315	MILESTONE_REACHED	Diamond milestone reached	🎬 H!M helped you reach 4,000,000 diamonds	{"giftId": "galaxy", "userId": "281ac0c9-d22b-4ece-895a-9d2c86a8f315", "giftTxId": "6a1d1793-29b4-46a4-b3a4-da83348c7926", "achievedAt": "2026-04-01T09:30:07.764Z", "giverUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "giverUsername": "BigDaddy", "milestoneAmount": 4000000, "giverDisplayName": "🎬 H!M"}	2026-04-01 09:30:07.793	\N	2d2e25f5-33bd-4adf-b69e-150d53b5b108	milestone:281ac0c9-d22b-4ece-895a-9d2c86a8f315:4000000:6a1d1793-29b4-46a4-b3a4-da83348c7926
36ce4ba0-f3f8-4c84-97c6-52cf37f64b2a	281ac0c9-d22b-4ece-895a-9d2c86a8f315	GIFT_RECEIVED	You received a gift	🎬 H!M sent you Galaxy	{"txId": "6a1d1793-29b4-46a4-b3a4-da83348c7926", "giftId": "galaxy", "giftName": "Galaxy", "streamId": "2d2e25f5-33bd-4adf-b69e-150d53b5b108", "diamondValue": 1000000, "senderUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "senderUsername": "BigDaddy", "recipientUserId": "281ac0c9-d22b-4ece-895a-9d2c86a8f315", "senderDisplayName": "🎬 H!M"}	2026-04-01 09:30:07.809	\N	2d2e25f5-33bd-4adf-b69e-150d53b5b108	gift:6a1d1793-29b4-46a4-b3a4-da83348c7926
9706e5bb-0821-4c1e-9fe7-cbcdf193c066	281ac0c9-d22b-4ece-895a-9d2c86a8f315	MILESTONE_REACHED	Diamond milestone reached	🎬 H!M helped you reach 5,000,000 diamonds	{"giftId": "galaxy", "userId": "281ac0c9-d22b-4ece-895a-9d2c86a8f315", "giftTxId": "6805c424-c5f5-4e83-a324-363d95cb8bd7", "achievedAt": "2026-04-01T09:30:08.880Z", "giverUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "giverUsername": "BigDaddy", "milestoneAmount": 5000000, "giverDisplayName": "🎬 H!M"}	2026-04-01 09:30:08.909	\N	2d2e25f5-33bd-4adf-b69e-150d53b5b108	milestone:281ac0c9-d22b-4ece-895a-9d2c86a8f315:5000000:6805c424-c5f5-4e83-a324-363d95cb8bd7
6f27281c-46af-4629-b4c1-1ee5eb411092	281ac0c9-d22b-4ece-895a-9d2c86a8f315	GIFT_RECEIVED	You received a gift	🎬 H!M sent you Galaxy	{"txId": "6805c424-c5f5-4e83-a324-363d95cb8bd7", "giftId": "galaxy", "giftName": "Galaxy", "streamId": "2d2e25f5-33bd-4adf-b69e-150d53b5b108", "diamondValue": 1000000, "senderUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "senderUsername": "BigDaddy", "recipientUserId": "281ac0c9-d22b-4ece-895a-9d2c86a8f315", "senderDisplayName": "🎬 H!M"}	2026-04-01 09:30:08.923	\N	2d2e25f5-33bd-4adf-b69e-150d53b5b108	gift:6805c424-c5f5-4e83-a324-363d95cb8bd7
5a7e6c75-37be-42a4-9315-8df5835923e6	281ac0c9-d22b-4ece-895a-9d2c86a8f315	MILESTONE_REACHED	Diamond milestone reached	🎬 H!M helped you reach 6,000,000 diamonds	{"giftId": "galaxy", "userId": "281ac0c9-d22b-4ece-895a-9d2c86a8f315", "giftTxId": "a4e64831-2f1a-461b-a2b1-36784ddf2550", "achievedAt": "2026-04-01T09:30:10.247Z", "giverUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "giverUsername": "BigDaddy", "milestoneAmount": 6000000, "giverDisplayName": "🎬 H!M"}	2026-04-01 09:30:10.276	\N	2d2e25f5-33bd-4adf-b69e-150d53b5b108	milestone:281ac0c9-d22b-4ece-895a-9d2c86a8f315:6000000:a4e64831-2f1a-461b-a2b1-36784ddf2550
e60ae908-4ca4-451e-a22d-dcd4a7f480f2	281ac0c9-d22b-4ece-895a-9d2c86a8f315	GIFT_RECEIVED	You received a gift	🎬 H!M sent you Galaxy	{"txId": "a4e64831-2f1a-461b-a2b1-36784ddf2550", "giftId": "galaxy", "giftName": "Galaxy", "streamId": "2d2e25f5-33bd-4adf-b69e-150d53b5b108", "diamondValue": 1000000, "senderUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "senderUsername": "BigDaddy", "recipientUserId": "281ac0c9-d22b-4ece-895a-9d2c86a8f315", "senderDisplayName": "🎬 H!M"}	2026-04-01 09:30:10.291	\N	2d2e25f5-33bd-4adf-b69e-150d53b5b108	gift:a4e64831-2f1a-461b-a2b1-36784ddf2550
f19d27a9-5ac6-476f-9da0-ae7be48d2926	281ac0c9-d22b-4ece-895a-9d2c86a8f315	MILESTONE_REACHED	Diamond milestone reached	🎬 H!M helped you reach 7,000,000 diamonds	{"giftId": "galaxy", "userId": "281ac0c9-d22b-4ece-895a-9d2c86a8f315", "giftTxId": "659c52b9-e263-4154-a2b1-274e7296d25e", "achievedAt": "2026-04-01T09:30:11.427Z", "giverUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "giverUsername": "BigDaddy", "milestoneAmount": 7000000, "giverDisplayName": "🎬 H!M"}	2026-04-01 09:30:11.461	\N	2d2e25f5-33bd-4adf-b69e-150d53b5b108	milestone:281ac0c9-d22b-4ece-895a-9d2c86a8f315:7000000:659c52b9-e263-4154-a2b1-274e7296d25e
7f65bc75-fdf0-4e72-b2ec-e3abeb278387	281ac0c9-d22b-4ece-895a-9d2c86a8f315	GIFT_RECEIVED	Gift received	BigDaddy sent you Galaxy	{"giftId": "galaxy", "coinCost": 1000000, "giftName": "Galaxy", "giftTxId": "6a1d1793-29b4-46a4-b3a4-da83348c7926", "streamId": "2d2e25f5-33bd-4adf-b69e-150d53b5b108", "createdAt": "2026-04-01T09:30:07.764Z", "diamondValue": 1000000, "senderUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "senderUsername": "BigDaddy", "recipientUserId": "281ac0c9-d22b-4ece-895a-9d2c86a8f315", "recipientUsername": "ChiDotGo"}	2026-04-01 09:30:11.841	\N	2d2e25f5-33bd-4adf-b69e-150d53b5b108	gift_tx:6a1d1793-29b4-46a4-b3a4-da83348c7926
df33e325-a177-4e8d-a3f3-80cb60a2a467	281ac0c9-d22b-4ece-895a-9d2c86a8f315	GIFT_RECEIVED	Gift received	BigDaddy sent you Galaxy	{"giftId": "galaxy", "coinCost": 1000000, "giftName": "Galaxy", "giftTxId": "6805c424-c5f5-4e83-a324-363d95cb8bd7", "streamId": "2d2e25f5-33bd-4adf-b69e-150d53b5b108", "createdAt": "2026-04-01T09:30:08.880Z", "diamondValue": 1000000, "senderUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "senderUsername": "BigDaddy", "recipientUserId": "281ac0c9-d22b-4ece-895a-9d2c86a8f315", "recipientUsername": "ChiDotGo"}	2026-04-01 09:30:11.848	\N	2d2e25f5-33bd-4adf-b69e-150d53b5b108	gift_tx:6805c424-c5f5-4e83-a324-363d95cb8bd7
e0c97994-004d-465c-9583-b6aff2868ff3	281ac0c9-d22b-4ece-895a-9d2c86a8f315	GIFT_RECEIVED	Gift received	BigDaddy sent you Galaxy	{"giftId": "galaxy", "coinCost": 1000000, "giftName": "Galaxy", "giftTxId": "a4e64831-2f1a-461b-a2b1-36784ddf2550", "streamId": "2d2e25f5-33bd-4adf-b69e-150d53b5b108", "createdAt": "2026-04-01T09:30:10.247Z", "diamondValue": 1000000, "senderUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "senderUsername": "BigDaddy", "recipientUserId": "281ac0c9-d22b-4ece-895a-9d2c86a8f315", "recipientUsername": "ChiDotGo"}	2026-04-01 09:30:11.854	\N	2d2e25f5-33bd-4adf-b69e-150d53b5b108	gift_tx:a4e64831-2f1a-461b-a2b1-36784ddf2550
6010c24c-6b9e-4147-80ed-d693b2364eb5	281ac0c9-d22b-4ece-895a-9d2c86a8f315	GIFT_RECEIVED	Gift received	BigDaddy sent you Galaxy	{"giftId": "galaxy", "coinCost": 1000000, "giftName": "Galaxy", "giftTxId": "659c52b9-e263-4154-a2b1-274e7296d25e", "streamId": "2d2e25f5-33bd-4adf-b69e-150d53b5b108", "createdAt": "2026-04-01T09:30:11.427Z", "diamondValue": 1000000, "senderUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "senderUsername": "BigDaddy", "recipientUserId": "281ac0c9-d22b-4ece-895a-9d2c86a8f315", "recipientUsername": "ChiDotGo"}	2026-04-01 09:30:11.86	\N	2d2e25f5-33bd-4adf-b69e-150d53b5b108	gift_tx:659c52b9-e263-4154-a2b1-274e7296d25e
1022279d-8b10-465a-9bbe-703366320374	281ac0c9-d22b-4ece-895a-9d2c86a8f315	MILESTONE_REACHED	Milestone reached	You reached 4,000,000 diamonds earned!	{"userId": "281ac0c9-d22b-4ece-895a-9d2c86a8f315", "giftTxId": "6a1d1793-29b4-46a4-b3a4-da83348c7926", "username": "ChiDotGo", "createdAt": "2026-04-01T09:30:07.783Z", "achievedAt": "2026-04-01T09:30:07.764Z", "giverUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "milestoneId": "531939b5-3149-45db-b60b-1e9fc129b69d", "giverUsername": "BigDaddy", "milestoneAmount": 4000000}	2026-04-01 09:30:11.871	\N	\N	milestone:531939b5-3149-45db-b60b-1e9fc129b69d
e16c9c83-e4de-4144-8eb3-a44bfd15788c	281ac0c9-d22b-4ece-895a-9d2c86a8f315	MILESTONE_REACHED	Milestone reached	You reached 5,000,000 diamonds earned!	{"userId": "281ac0c9-d22b-4ece-895a-9d2c86a8f315", "giftTxId": "6805c424-c5f5-4e83-a324-363d95cb8bd7", "username": "ChiDotGo", "createdAt": "2026-04-01T09:30:08.899Z", "achievedAt": "2026-04-01T09:30:08.880Z", "giverUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "milestoneId": "f830abe1-03b9-4942-a0b2-7314781bcd42", "giverUsername": "BigDaddy", "milestoneAmount": 5000000}	2026-04-01 09:30:11.877	\N	\N	milestone:f830abe1-03b9-4942-a0b2-7314781bcd42
35bb22f9-7476-421f-8f53-9fda7d06bf29	281ac0c9-d22b-4ece-895a-9d2c86a8f315	MILESTONE_REACHED	Milestone reached	You reached 6,000,000 diamonds earned!	{"userId": "281ac0c9-d22b-4ece-895a-9d2c86a8f315", "giftTxId": "a4e64831-2f1a-461b-a2b1-36784ddf2550", "username": "ChiDotGo", "createdAt": "2026-04-01T09:30:10.265Z", "achievedAt": "2026-04-01T09:30:10.247Z", "giverUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "milestoneId": "4c163f59-2a66-4dfc-b896-9fee3d748399", "giverUsername": "BigDaddy", "milestoneAmount": 6000000}	2026-04-01 09:30:11.883	\N	\N	milestone:4c163f59-2a66-4dfc-b896-9fee3d748399
1f407ee5-d227-47fb-8441-e3faf961c69c	281ac0c9-d22b-4ece-895a-9d2c86a8f315	MILESTONE_REACHED	Milestone reached	You reached 7,000,000 diamonds earned!	{"userId": "281ac0c9-d22b-4ece-895a-9d2c86a8f315", "giftTxId": "659c52b9-e263-4154-a2b1-274e7296d25e", "username": "ChiDotGo", "createdAt": "2026-04-01T09:30:11.450Z", "achievedAt": "2026-04-01T09:30:11.427Z", "giverUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "milestoneId": "08282e0e-5a0c-43c1-a545-2dbfde45f870", "giverUsername": "BigDaddy", "milestoneAmount": 7000000}	2026-04-01 09:30:11.889	\N	\N	milestone:08282e0e-5a0c-43c1-a545-2dbfde45f870
df912143-19a6-4b72-b4f3-38d944ad9611	281ac0c9-d22b-4ece-895a-9d2c86a8f315	MILESTONE_REACHED	Diamond milestone reached	🎬 H!M helped you reach 8,000,000 diamonds	{"giftId": "galaxy", "userId": "281ac0c9-d22b-4ece-895a-9d2c86a8f315", "giftTxId": "d3dfb248-e464-4b9c-840f-ebc3bc0bb43b", "achievedAt": "2026-04-01T09:30:12.650Z", "giverUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "giverUsername": "BigDaddy", "milestoneAmount": 8000000, "giverDisplayName": "🎬 H!M"}	2026-04-01 09:30:12.679	\N	2d2e25f5-33bd-4adf-b69e-150d53b5b108	milestone:281ac0c9-d22b-4ece-895a-9d2c86a8f315:8000000:d3dfb248-e464-4b9c-840f-ebc3bc0bb43b
0c4d8a2b-51d4-41a1-8a8c-2b97373cb37e	281ac0c9-d22b-4ece-895a-9d2c86a8f315	GIFT_RECEIVED	You received a gift	🎬 H!M sent you Galaxy	{"txId": "d3dfb248-e464-4b9c-840f-ebc3bc0bb43b", "giftId": "galaxy", "giftName": "Galaxy", "streamId": "2d2e25f5-33bd-4adf-b69e-150d53b5b108", "diamondValue": 1000000, "senderUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "senderUsername": "BigDaddy", "recipientUserId": "281ac0c9-d22b-4ece-895a-9d2c86a8f315", "senderDisplayName": "🎬 H!M"}	2026-04-01 09:30:12.694	\N	2d2e25f5-33bd-4adf-b69e-150d53b5b108	gift:d3dfb248-e464-4b9c-840f-ebc3bc0bb43b
caa0cda7-c97d-4034-b168-bfbbe47f58bc	281ac0c9-d22b-4ece-895a-9d2c86a8f315	GIFT_RECEIVED	Gift received	BigDaddy sent you Galaxy	{"giftId": "galaxy", "coinCost": 1000000, "giftName": "Galaxy", "giftTxId": "d3dfb248-e464-4b9c-840f-ebc3bc0bb43b", "streamId": "2d2e25f5-33bd-4adf-b69e-150d53b5b108", "createdAt": "2026-04-01T09:30:12.650Z", "diamondValue": 1000000, "senderUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "senderUsername": "BigDaddy", "recipientUserId": "281ac0c9-d22b-4ece-895a-9d2c86a8f315", "recipientUsername": "ChiDotGo"}	2026-04-01 09:30:16.842	\N	2d2e25f5-33bd-4adf-b69e-150d53b5b108	gift_tx:d3dfb248-e464-4b9c-840f-ebc3bc0bb43b
56a19d64-ffa0-42e6-a84f-eac61b19f253	281ac0c9-d22b-4ece-895a-9d2c86a8f315	MILESTONE_REACHED	Milestone reached	You reached 8,000,000 diamonds earned!	{"userId": "281ac0c9-d22b-4ece-895a-9d2c86a8f315", "giftTxId": "d3dfb248-e464-4b9c-840f-ebc3bc0bb43b", "username": "ChiDotGo", "createdAt": "2026-04-01T09:30:12.669Z", "achievedAt": "2026-04-01T09:30:12.650Z", "giverUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "milestoneId": "e0fe6f69-765b-46b5-acc8-745779dec0f1", "giverUsername": "BigDaddy", "milestoneAmount": 8000000}	2026-04-01 09:30:16.852	\N	\N	milestone:e0fe6f69-765b-46b5-acc8-745779dec0f1
0e378bb2-5089-4112-9144-7a784ab377ab	3961fabe-1345-4426-bd8a-ca0a5eac3aac	STREAM_STARTED	ChiDotGo is live now	ChiDotGo started: Gdn	{"title": "Gdn", "streamId": "481dad7d-d73f-4dce-b9a7-f24066eb069c", "startedAt": "2026-04-01T09:54:28.809Z", "hostUserId": "281ac0c9-d22b-4ece-895a-9d2c86a8f315", "visibility": "PUBLIC", "hostUsername": "ChiDotGo", "hostAvatarUrl": null, "hostDisplayName": "ChiDotGo"}	2026-04-01 09:54:28.83	\N	481dad7d-d73f-4dce-b9a7-f24066eb069c	stream-started:481dad7d-d73f-4dce-b9a7-f24066eb069c
e08dbabd-1a3b-4346-aa8e-a7b0cc5f6560	281ac0c9-d22b-4ece-895a-9d2c86a8f315	SYSTEM	New message from 🎬 H!M	🎬 H!M: Faded Djdhhd Dubbed Jdbdbjr	{"dmMessageId": "800f223c-5ca6-4e8f-9f19-4f2c43cfd421", "messageType": "TEXT", "senderUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "conversationId": "4551ebb6-723c-43a9-a4fd-4d15f91f874a", "senderUsername": "BigDaddy", "recipientUserId": "281ac0c9-d22b-4ece-895a-9d2c86a8f315", "senderAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "senderDisplayName": "🎬 H!M"}	2026-04-01 09:36:28.38	\N	\N	dm-received:800f223c-5ca6-4e8f-9f19-4f2c43cfd421
dde4ce20-71b2-4eef-b40b-8db6b8f7efe7	281ac0c9-d22b-4ece-895a-9d2c86a8f315	SYSTEM	New message from 🎬 H!M	🎬 H!M: Djdjd	{"dmMessageId": "5ab916e1-7606-44d1-92c2-d03d7a2bbbf8", "messageType": "TEXT", "senderUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "conversationId": "4551ebb6-723c-43a9-a4fd-4d15f91f874a", "senderUsername": "BigDaddy", "recipientUserId": "281ac0c9-d22b-4ece-895a-9d2c86a8f315", "senderAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "senderDisplayName": "🎬 H!M"}	2026-04-01 09:36:30.995	\N	\N	dm-received:5ab916e1-7606-44d1-92c2-d03d7a2bbbf8
478a963a-f540-4346-8d2a-0db4982cefa7	3961fabe-1345-4426-bd8a-ca0a5eac3aac	SYSTEM	New message from ChiDotGo	ChiDotGo: Yo	{"dmMessageId": "a53c09a6-d902-4315-b193-d689f9222f25", "messageType": "TEXT", "senderUserId": "281ac0c9-d22b-4ece-895a-9d2c86a8f315", "conversationId": "4551ebb6-723c-43a9-a4fd-4d15f91f874a", "senderUsername": "ChiDotGo", "recipientUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "senderAvatarUrl": null, "senderDisplayName": "ChiDotGo"}	2026-04-01 09:36:36.535	\N	\N	dm-received:a53c09a6-d902-4315-b193-d689f9222f25
88017431-b279-4f6e-bb1a-dff4179fef29	3961fabe-1345-4426-bd8a-ca0a5eac3aac	SYSTEM	New message from ChiDotGo	ChiDotGo: Cxff	{"dmMessageId": "ea967b08-2379-4043-b72a-3a7870464aa6", "messageType": "TEXT", "senderUserId": "281ac0c9-d22b-4ece-895a-9d2c86a8f315", "conversationId": "4551ebb6-723c-43a9-a4fd-4d15f91f874a", "senderUsername": "ChiDotGo", "recipientUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "senderAvatarUrl": null, "senderDisplayName": "ChiDotGo"}	2026-04-01 09:36:47.486	\N	\N	dm-received:ea967b08-2379-4043-b72a-3a7870464aa6
0ba8df03-85b1-4e23-a86e-446e00bc8d18	3961fabe-1345-4426-bd8a-ca0a5eac3aac	SYSTEM	New message from ChiDotGo	ChiDotGo sent you a GIF	{"dmMessageId": "7ac8f0dc-9fb6-4410-8c38-7a9fc99885f3", "messageType": "GIF", "senderUserId": "281ac0c9-d22b-4ece-895a-9d2c86a8f315", "conversationId": "4551ebb6-723c-43a9-a4fd-4d15f91f874a", "senderUsername": "ChiDotGo", "recipientUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "senderAvatarUrl": null, "senderDisplayName": "ChiDotGo"}	2026-04-01 09:36:58.223	\N	\N	dm-received:7ac8f0dc-9fb6-4410-8c38-7a9fc99885f3
f3de3d9a-a725-4edf-a971-0ef7d6110f16	3961fabe-1345-4426-bd8a-ca0a5eac3aac	SYSTEM	New message from ChiDotGo	ChiDotGo sent you a GIF	{"dmMessageId": "c7953604-c60c-4ef7-a0d2-cbab09b36611", "messageType": "GIF", "senderUserId": "281ac0c9-d22b-4ece-895a-9d2c86a8f315", "conversationId": "4551ebb6-723c-43a9-a4fd-4d15f91f874a", "senderUsername": "ChiDotGo", "recipientUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "senderAvatarUrl": null, "senderDisplayName": "ChiDotGo"}	2026-04-01 09:37:02.055	\N	\N	dm-received:c7953604-c60c-4ef7-a0d2-cbab09b36611
99e0858a-5a5f-45f3-9d3d-9ee97a0aa620	3961fabe-1345-4426-bd8a-ca0a5eac3aac	SYSTEM	New message from ChiDotGo	ChiDotGo sent you a GIF	{"dmMessageId": "ff4c28c1-9dda-4f4c-a5cc-4638f2580d47", "messageType": "GIF", "senderUserId": "281ac0c9-d22b-4ece-895a-9d2c86a8f315", "conversationId": "4551ebb6-723c-43a9-a4fd-4d15f91f874a", "senderUsername": "ChiDotGo", "recipientUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "senderAvatarUrl": null, "senderDisplayName": "ChiDotGo"}	2026-04-01 09:37:08.424	\N	\N	dm-received:ff4c28c1-9dda-4f4c-a5cc-4638f2580d47
123475e5-29e1-49cf-92d2-fac54d6fa5f5	281ac0c9-d22b-4ece-895a-9d2c86a8f315	SYSTEM	New message from 🎬 H!M	🎬 H!M sent you a photo	{"dmMessageId": "94b482f3-d94c-49f9-a2d3-05c20c74449e", "messageType": "IMAGE", "senderUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "conversationId": "4551ebb6-723c-43a9-a4fd-4d15f91f874a", "senderUsername": "BigDaddy", "recipientUserId": "281ac0c9-d22b-4ece-895a-9d2c86a8f315", "senderAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "senderDisplayName": "🎬 H!M"}	2026-04-01 09:37:26.627	\N	\N	dm-received:94b482f3-d94c-49f9-a2d3-05c20c74449e
1d46e649-1382-4a4e-b180-ed71ed766568	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: My Live Stream	{"title": "My Live Stream", "streamId": "e477bb1a-2d08-4e06-8455-6183aa8b6ba3", "startedAt": "2026-04-01T09:49:33.446Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-01 09:49:33.473	\N	e477bb1a-2d08-4e06-8455-6183aa8b6ba3	stream-started:e477bb1a-2d08-4e06-8455-6183aa8b6ba3
5bd88f88-c44f-44a0-a363-31f2115ea28d	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: My Live Stream	{"title": "My Live Stream", "streamId": "e477bb1a-2d08-4e06-8455-6183aa8b6ba3", "startedAt": "2026-04-01T09:49:33.446Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-01 09:49:33.473	\N	e477bb1a-2d08-4e06-8455-6183aa8b6ba3	stream-started:e477bb1a-2d08-4e06-8455-6183aa8b6ba3
df7333af-5853-43cc-a6be-93ff1548464a	281ac0c9-d22b-4ece-895a-9d2c86a8f315	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: My Live Stream	{"title": "My Live Stream", "streamId": "e477bb1a-2d08-4e06-8455-6183aa8b6ba3", "startedAt": "2026-04-01T09:49:33.446Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-01 09:49:33.473	\N	e477bb1a-2d08-4e06-8455-6183aa8b6ba3	stream-started:e477bb1a-2d08-4e06-8455-6183aa8b6ba3
e6a2e12c-6394-4d64-8751-cb75f86bdc11	3961fabe-1345-4426-bd8a-ca0a5eac3aac	STREAM_STARTED	ChiDotGo is live now	ChiDotGo started: Gds in the door	{"title": "Gds in the door", "streamId": "128e8cc7-cc76-4367-b035-9423121bef49", "startedAt": "2026-04-01T09:52:26.726Z", "hostUserId": "281ac0c9-d22b-4ece-895a-9d2c86a8f315", "visibility": "PUBLIC", "hostUsername": "ChiDotGo", "hostAvatarUrl": null, "hostDisplayName": "ChiDotGo"}	2026-04-01 09:52:26.754	\N	128e8cc7-cc76-4367-b035-9423121bef49	stream-started:128e8cc7-cc76-4367-b035-9423121bef49
6f02150a-467e-4a17-adda-cd96b4e8c1fb	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: This a test bitch	{"title": "This a test bitch", "streamId": "fc805175-e93f-49ef-834e-eaac90cec00f", "startedAt": "2026-04-01T09:53:09.884Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-01 09:53:09.91	\N	fc805175-e93f-49ef-834e-eaac90cec00f	stream-started:fc805175-e93f-49ef-834e-eaac90cec00f
98e57793-065c-46b4-bb96-4c58a386f255	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: This a test bitch	{"title": "This a test bitch", "streamId": "fc805175-e93f-49ef-834e-eaac90cec00f", "startedAt": "2026-04-01T09:53:09.884Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-01 09:53:09.91	\N	fc805175-e93f-49ef-834e-eaac90cec00f	stream-started:fc805175-e93f-49ef-834e-eaac90cec00f
8642ef7d-db27-412c-98af-80c901cd5121	281ac0c9-d22b-4ece-895a-9d2c86a8f315	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: This a test bitch	{"title": "This a test bitch", "streamId": "fc805175-e93f-49ef-834e-eaac90cec00f", "startedAt": "2026-04-01T09:53:09.884Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-01 09:53:09.91	\N	fc805175-e93f-49ef-834e-eaac90cec00f	stream-started:fc805175-e93f-49ef-834e-eaac90cec00f
b0634a16-8aa7-46d9-bc5a-84240c6fba19	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: Test	{"title": "Test", "streamId": "b1001c15-3e22-4d3f-b80b-08eeb774338c", "startedAt": "2026-04-01T10:52:40.719Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-01 10:52:40.75	\N	b1001c15-3e22-4d3f-b80b-08eeb774338c	stream-started:b1001c15-3e22-4d3f-b80b-08eeb774338c
072993cf-025b-4ae1-8ebb-29413fd81e3f	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: Test	{"title": "Test", "streamId": "b1001c15-3e22-4d3f-b80b-08eeb774338c", "startedAt": "2026-04-01T10:52:40.719Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-01 10:52:40.75	\N	b1001c15-3e22-4d3f-b80b-08eeb774338c	stream-started:b1001c15-3e22-4d3f-b80b-08eeb774338c
f2ac4df8-8113-47e0-a350-192f967f162c	281ac0c9-d22b-4ece-895a-9d2c86a8f315	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: Test	{"title": "Test", "streamId": "b1001c15-3e22-4d3f-b80b-08eeb774338c", "startedAt": "2026-04-01T10:52:40.719Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-01 10:52:40.75	\N	b1001c15-3e22-4d3f-b80b-08eeb774338c	stream-started:b1001c15-3e22-4d3f-b80b-08eeb774338c
f966ffd9-e35c-4166-bbca-d78d1df7323f	3961fabe-1345-4426-bd8a-ca0a5eac3aac	SYSTEM	New message from SarahOconnor	SarahOconnor sent you a gift	{"dmMessageId": "6e867391-1cf2-4920-9573-ed906977d324", "messageType": "GIFT", "senderUserId": "9f70646e-c63e-4a08-a4fa-8786204bbf4e", "conversationId": "1798eda1-ef5f-4629-88af-5c5cacc08d45", "senderUsername": "SarahOconnor", "recipientUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "senderAvatarUrl": null, "senderDisplayName": "SarahOconnor"}	2026-04-01 10:55:16.503	\N	\N	dm-received:6e867391-1cf2-4920-9573-ed906977d324
b1a7d243-7708-4c6d-b2fd-ded02128ebb4	3961fabe-1345-4426-bd8a-ca0a5eac3aac	GIFT_RECEIVED	Gift received	SarahOconnor sent you Galaxy	{"giftId": "galaxy", "coinCost": 1000000, "giftName": "Galaxy", "giftTxId": "c49f67bb-40a9-4738-990a-d3384ddb2b16", "streamId": null, "createdAt": "2026-04-01T10:55:16.473Z", "diamondValue": 1000000, "senderUserId": "9f70646e-c63e-4a08-a4fa-8786204bbf4e", "senderUsername": "SarahOconnor", "recipientUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "recipientUsername": "BigDaddy"}	2026-04-01 10:55:19.242	\N	\N	gift_tx:c49f67bb-40a9-4738-990a-d3384ddb2b16
413dc4ae-5cd1-4604-b023-9d7e17a3a761	3961fabe-1345-4426-bd8a-ca0a5eac3aac	SYSTEM	New message from SarahOconnor	SarahOconnor: sadfbvdsfb	{"dmMessageId": "1fc6c6d2-123c-4b81-b322-e73092bf58b3", "messageType": "TEXT", "senderUserId": "9f70646e-c63e-4a08-a4fa-8786204bbf4e", "conversationId": "1798eda1-ef5f-4629-88af-5c5cacc08d45", "senderUsername": "SarahOconnor", "recipientUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "senderAvatarUrl": null, "senderDisplayName": "SarahOconnor"}	2026-04-01 10:55:22.363	\N	\N	dm-received:1fc6c6d2-123c-4b81-b322-e73092bf58b3
250cc7af-4587-4a43-903f-31d3d18891b3	3961fabe-1345-4426-bd8a-ca0a5eac3aac	SYSTEM	New message from JamesConnor	JamesConnor: sadvasdvsadvsadv	{"dmMessageId": "c6774e31-b8e7-494c-b544-cd0011af6e3f", "messageType": "TEXT", "senderUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "conversationId": "a76df74d-06fc-4899-8249-5b4e093ea878", "senderUsername": "JamesConnor", "recipientUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "senderAvatarUrl": null, "senderDisplayName": "JamesConnor"}	2026-04-01 10:55:55.97	\N	\N	dm-received:c6774e31-b8e7-494c-b544-cd0011af6e3f
8c156916-4167-40e0-8bf1-4fdc7e945885	47d9c408-1a3c-46c1-aecf-6f1746615499	SYSTEM	New message from 🎬 H!M	🎬 H!M: Gyyu	{"dmMessageId": "284e67bb-b2f5-4b07-8a0b-3400a8d55f92", "messageType": "TEXT", "senderUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "conversationId": "a76df74d-06fc-4899-8249-5b4e093ea878", "senderUsername": "BigDaddy", "recipientUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "senderAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "senderDisplayName": "🎬 H!M"}	2026-04-01 10:56:50.174	\N	\N	dm-received:284e67bb-b2f5-4b07-8a0b-3400a8d55f92
c3305080-753b-4b5b-9f55-3c57ae27c5b3	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: My Live Stream	{"title": "My Live Stream", "streamId": "2a4f4ba0-dca4-4aa3-b002-10e5a2af132f", "startedAt": "2026-04-01T10:57:52.382Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-01 10:57:52.407	\N	2a4f4ba0-dca4-4aa3-b002-10e5a2af132f	stream-started:2a4f4ba0-dca4-4aa3-b002-10e5a2af132f
e4d4957a-bc6b-43be-80af-893cf7ba50bc	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: My Live Stream	{"title": "My Live Stream", "streamId": "2a4f4ba0-dca4-4aa3-b002-10e5a2af132f", "startedAt": "2026-04-01T10:57:52.382Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-01 10:57:52.407	\N	2a4f4ba0-dca4-4aa3-b002-10e5a2af132f	stream-started:2a4f4ba0-dca4-4aa3-b002-10e5a2af132f
11ba2c8e-5119-4bf1-abea-ed30a7aa23dd	281ac0c9-d22b-4ece-895a-9d2c86a8f315	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: My Live Stream	{"title": "My Live Stream", "streamId": "2a4f4ba0-dca4-4aa3-b002-10e5a2af132f", "startedAt": "2026-04-01T10:57:52.382Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-01 10:57:52.407	\N	2a4f4ba0-dca4-4aa3-b002-10e5a2af132f	stream-started:2a4f4ba0-dca4-4aa3-b002-10e5a2af132f
1858e9c2-6fb6-40b1-a0ab-033252e2326e	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: My Live Stream	{"title": "My Live Stream", "streamId": "dfaa6a9c-3d1f-45cb-9074-f48e4f7026e7", "startedAt": "2026-04-01T17:44:57.881Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-01 17:44:57.911	\N	dfaa6a9c-3d1f-45cb-9074-f48e4f7026e7	stream-started:dfaa6a9c-3d1f-45cb-9074-f48e4f7026e7
8c3a12c4-29c2-49d4-adde-976914e9ce31	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: My Live Stream	{"title": "My Live Stream", "streamId": "dfaa6a9c-3d1f-45cb-9074-f48e4f7026e7", "startedAt": "2026-04-01T17:44:57.881Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-01 17:44:57.911	\N	dfaa6a9c-3d1f-45cb-9074-f48e4f7026e7	stream-started:dfaa6a9c-3d1f-45cb-9074-f48e4f7026e7
e5b84614-db32-4aed-9ceb-eccf8e52e2d8	281ac0c9-d22b-4ece-895a-9d2c86a8f315	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: My Live Stream	{"title": "My Live Stream", "streamId": "dfaa6a9c-3d1f-45cb-9074-f48e4f7026e7", "startedAt": "2026-04-01T17:44:57.881Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-01 17:44:57.911	\N	dfaa6a9c-3d1f-45cb-9074-f48e4f7026e7	stream-started:dfaa6a9c-3d1f-45cb-9074-f48e4f7026e7
85a0d0b3-d7fe-43b4-9239-5e7008d49444	3961fabe-1345-4426-bd8a-ca0a5eac3aac	SYSTEM	New message from JamesConnor	JamesConnor: vbdsfb	{"dmMessageId": "3d04275c-c731-49be-8608-f6bdf64576be", "messageType": "TEXT", "senderUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "conversationId": "a76df74d-06fc-4899-8249-5b4e093ea878", "senderUsername": "JamesConnor", "recipientUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "senderAvatarUrl": null, "senderDisplayName": "JamesConnor"}	2026-04-01 17:50:46.328	\N	\N	dm-received:3d04275c-c731-49be-8608-f6bdf64576be
ae9a4272-d083-4a39-b913-4dc3a3bfe197	3961fabe-1345-4426-bd8a-ca0a5eac3aac	SYSTEM	New message from JamesConnor	JamesConnor: abab	{"dmMessageId": "57ade762-cba5-4d29-80ee-ba722d9b8fcd", "messageType": "TEXT", "senderUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "conversationId": "a76df74d-06fc-4899-8249-5b4e093ea878", "senderUsername": "JamesConnor", "recipientUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "senderAvatarUrl": null, "senderDisplayName": "JamesConnor"}	2026-04-01 17:50:47.253	\N	\N	dm-received:57ade762-cba5-4d29-80ee-ba722d9b8fcd
37183656-45aa-4161-8bc5-9b7b15e3dbdb	3961fabe-1345-4426-bd8a-ca0a5eac3aac	SYSTEM	New message from JamesConnor	JamesConnor: sab	{"dmMessageId": "981495e7-9cb1-4ac1-9df6-026f33dbbe0e", "messageType": "TEXT", "senderUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "conversationId": "a76df74d-06fc-4899-8249-5b4e093ea878", "senderUsername": "JamesConnor", "recipientUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "senderAvatarUrl": null, "senderDisplayName": "JamesConnor"}	2026-04-01 17:50:48.527	\N	\N	dm-received:981495e7-9cb1-4ac1-9df6-026f33dbbe0e
d003a052-7039-497b-ac96-93171ebb3082	3961fabe-1345-4426-bd8a-ca0a5eac3aac	SYSTEM	New message from JamesConnor	JamesConnor: afbs	{"dmMessageId": "f2761324-ac5d-49cc-b63e-f3e55561c04a", "messageType": "TEXT", "senderUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "conversationId": "a76df74d-06fc-4899-8249-5b4e093ea878", "senderUsername": "JamesConnor", "recipientUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "senderAvatarUrl": null, "senderDisplayName": "JamesConnor"}	2026-04-01 17:50:49.772	\N	\N	dm-received:f2761324-ac5d-49cc-b63e-f3e55561c04a
c98c1f87-4400-4716-9afb-864c59c50a01	47d9c408-1a3c-46c1-aecf-6f1746615499	SYSTEM	New message from 🎬 H!M	🎬 H!M: Durban	{"dmMessageId": "6cf5c2af-57a3-47bd-b6ac-055816fca6de", "messageType": "TEXT", "senderUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "conversationId": "a76df74d-06fc-4899-8249-5b4e093ea878", "senderUsername": "BigDaddy", "recipientUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "senderAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "senderDisplayName": "🎬 H!M"}	2026-04-01 17:50:58.756	\N	\N	dm-received:6cf5c2af-57a3-47bd-b6ac-055816fca6de
167e606f-8d2a-4ef8-8ed9-b2e4c63fde6a	47d9c408-1a3c-46c1-aecf-6f1746615499	SYSTEM	New message from 🎬 H!M	🎬 H!M: Duhr	{"dmMessageId": "079feec2-bf48-4a35-94af-b8dcb2c73758", "messageType": "TEXT", "senderUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "conversationId": "a76df74d-06fc-4899-8249-5b4e093ea878", "senderUsername": "BigDaddy", "recipientUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "senderAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "senderDisplayName": "🎬 H!M"}	2026-04-01 17:51:01.374	\N	\N	dm-received:079feec2-bf48-4a35-94af-b8dcb2c73758
39c55eef-d285-4ccf-95bd-07f5153ad294	47d9c408-1a3c-46c1-aecf-6f1746615499	SYSTEM	New message from 🎬 H!M	🎬 H!M: Djdjd	{"dmMessageId": "23bab907-5f00-423e-a2a7-b4a7ca62a8d1", "messageType": "TEXT", "senderUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "conversationId": "a76df74d-06fc-4899-8249-5b4e093ea878", "senderUsername": "BigDaddy", "recipientUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "senderAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "senderDisplayName": "🎬 H!M"}	2026-04-01 17:51:03.576	\N	\N	dm-received:23bab907-5f00-423e-a2a7-b4a7ca62a8d1
3f56e3a6-9be7-4312-8242-b7f9dac5eb38	3961fabe-1345-4426-bd8a-ca0a5eac3aac	SYSTEM	New message from JamesConnor	JamesConnor sent you a photo	{"dmMessageId": "8bf6f1f9-6da7-4089-adfa-65b09a282fb1", "messageType": "IMAGE", "senderUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "conversationId": "a76df74d-06fc-4899-8249-5b4e093ea878", "senderUsername": "JamesConnor", "recipientUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "senderAvatarUrl": null, "senderDisplayName": "JamesConnor"}	2026-04-01 17:51:13.704	\N	\N	dm-received:8bf6f1f9-6da7-4089-adfa-65b09a282fb1
f70d4f1e-1e87-45bb-be18-04f59f0f1bfa	47d9c408-1a3c-46c1-aecf-6f1746615499	SYSTEM	New message from 🎬 H!M	🎬 H!M sent you a photo	{"dmMessageId": "28d36dfa-6961-4c18-915f-1a3328f7d134", "messageType": "IMAGE", "senderUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "conversationId": "a76df74d-06fc-4899-8249-5b4e093ea878", "senderUsername": "BigDaddy", "recipientUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "senderAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "senderDisplayName": "🎬 H!M"}	2026-04-01 17:51:36.001	\N	\N	dm-received:28d36dfa-6961-4c18-915f-1a3328f7d134
0c48f621-1ec1-44f2-b2a8-087abf2d9317	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: My Live Stream	{"title": "My Live Stream", "streamId": "b40bfeac-ca8f-443b-b72d-8f058d898446", "startedAt": "2026-04-01T18:22:32.604Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-01 18:22:32.634	\N	b40bfeac-ca8f-443b-b72d-8f058d898446	stream-started:b40bfeac-ca8f-443b-b72d-8f058d898446
f00d7994-a02c-4dc0-91d4-2fccb6d9c74d	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: My Live Stream	{"title": "My Live Stream", "streamId": "b40bfeac-ca8f-443b-b72d-8f058d898446", "startedAt": "2026-04-01T18:22:32.604Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-01 18:22:32.634	\N	b40bfeac-ca8f-443b-b72d-8f058d898446	stream-started:b40bfeac-ca8f-443b-b72d-8f058d898446
81c73c65-b8e4-44f6-94a2-ec3e34a6810b	281ac0c9-d22b-4ece-895a-9d2c86a8f315	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: My Live Stream	{"title": "My Live Stream", "streamId": "b40bfeac-ca8f-443b-b72d-8f058d898446", "startedAt": "2026-04-01T18:22:32.604Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-01 18:22:32.634	\N	b40bfeac-ca8f-443b-b72d-8f058d898446	stream-started:b40bfeac-ca8f-443b-b72d-8f058d898446
ccd060ce-56fb-497a-a950-d65f59b22093	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: My Live Stream	{"title": "My Live Stream", "streamId": "3e3724e2-4413-41e0-8a19-451579092edb", "startedAt": "2026-04-01T18:23:00.298Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-01 18:23:00.324	\N	3e3724e2-4413-41e0-8a19-451579092edb	stream-started:3e3724e2-4413-41e0-8a19-451579092edb
fe5fb7a4-6210-46be-9f8f-7750d6be8887	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: My Live Stream	{"title": "My Live Stream", "streamId": "3e3724e2-4413-41e0-8a19-451579092edb", "startedAt": "2026-04-01T18:23:00.298Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-01 18:23:00.324	\N	3e3724e2-4413-41e0-8a19-451579092edb	stream-started:3e3724e2-4413-41e0-8a19-451579092edb
25012253-0553-4c21-8107-911d24812e99	281ac0c9-d22b-4ece-895a-9d2c86a8f315	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: My Live Stream	{"title": "My Live Stream", "streamId": "3e3724e2-4413-41e0-8a19-451579092edb", "startedAt": "2026-04-01T18:23:00.298Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-01 18:23:00.324	\N	3e3724e2-4413-41e0-8a19-451579092edb	stream-started:3e3724e2-4413-41e0-8a19-451579092edb
1573f975-6fc6-4c5c-9d4d-e578c6f6f82d	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: My Live Stream	{"title": "My Live Stream", "streamId": "e94455bd-d7a9-455b-8e7a-9b12f15bff19", "startedAt": "2026-04-01T18:40:29.683Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-01 18:40:29.712	\N	e94455bd-d7a9-455b-8e7a-9b12f15bff19	stream-started:e94455bd-d7a9-455b-8e7a-9b12f15bff19
a902dc83-c5aa-4709-923a-5bc2b6506bcd	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: My Live Stream	{"title": "My Live Stream", "streamId": "e94455bd-d7a9-455b-8e7a-9b12f15bff19", "startedAt": "2026-04-01T18:40:29.683Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-01 18:40:29.712	\N	e94455bd-d7a9-455b-8e7a-9b12f15bff19	stream-started:e94455bd-d7a9-455b-8e7a-9b12f15bff19
2c75b6ed-73b2-455b-b5d6-5d1243b1812d	281ac0c9-d22b-4ece-895a-9d2c86a8f315	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: My Live Stream	{"title": "My Live Stream", "streamId": "e94455bd-d7a9-455b-8e7a-9b12f15bff19", "startedAt": "2026-04-01T18:40:29.683Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-01 18:40:29.712	\N	e94455bd-d7a9-455b-8e7a-9b12f15bff19	stream-started:e94455bd-d7a9-455b-8e7a-9b12f15bff19
6e8e24c4-7b35-4bb6-b238-ce3619c02b86	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: My Live Stream	{"title": "My Live Stream", "streamId": "844886a5-96fd-49c7-ba1c-f2eea3d7ce01", "startedAt": "2026-04-01T19:08:13.336Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-01 19:08:13.367	\N	844886a5-96fd-49c7-ba1c-f2eea3d7ce01	stream-started:844886a5-96fd-49c7-ba1c-f2eea3d7ce01
4473b114-0513-4085-8d8f-ec94f7f4bc69	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: My Live Stream	{"title": "My Live Stream", "streamId": "844886a5-96fd-49c7-ba1c-f2eea3d7ce01", "startedAt": "2026-04-01T19:08:13.336Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-01 19:08:13.367	\N	844886a5-96fd-49c7-ba1c-f2eea3d7ce01	stream-started:844886a5-96fd-49c7-ba1c-f2eea3d7ce01
99e488f1-63d7-47ca-92b2-ca6a67cb685e	281ac0c9-d22b-4ece-895a-9d2c86a8f315	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: My Live Stream	{"title": "My Live Stream", "streamId": "844886a5-96fd-49c7-ba1c-f2eea3d7ce01", "startedAt": "2026-04-01T19:08:13.336Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-01 19:08:13.367	\N	844886a5-96fd-49c7-ba1c-f2eea3d7ce01	stream-started:844886a5-96fd-49c7-ba1c-f2eea3d7ce01
b670b075-73ab-47c1-974d-ba8aedc2fd5e	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: My Live Stream	{"title": "My Live Stream", "streamId": "67dca92d-3a1a-4799-87ba-a6504d628339", "startedAt": "2026-04-01T19:08:53.449Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-01 19:08:53.477	\N	67dca92d-3a1a-4799-87ba-a6504d628339	stream-started:67dca92d-3a1a-4799-87ba-a6504d628339
8f9ac37e-c4c9-420f-beb7-5aef5fbc71e3	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: My Live Stream	{"title": "My Live Stream", "streamId": "67dca92d-3a1a-4799-87ba-a6504d628339", "startedAt": "2026-04-01T19:08:53.449Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-01 19:08:53.477	\N	67dca92d-3a1a-4799-87ba-a6504d628339	stream-started:67dca92d-3a1a-4799-87ba-a6504d628339
d3544590-c1c2-4690-ba8e-3c77ced1eb5f	281ac0c9-d22b-4ece-895a-9d2c86a8f315	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: My Live Stream	{"title": "My Live Stream", "streamId": "67dca92d-3a1a-4799-87ba-a6504d628339", "startedAt": "2026-04-01T19:08:53.449Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-01 19:08:53.477	\N	67dca92d-3a1a-4799-87ba-a6504d628339	stream-started:67dca92d-3a1a-4799-87ba-a6504d628339
04caf2c8-fb8a-4027-bb53-cfd32a36b397	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: My Live Stream	{"title": "My Live Stream", "streamId": "80abe71e-5ff4-4f83-9f52-0d650aad154d", "startedAt": "2026-04-01T19:46:45.687Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-01 19:46:45.717	\N	80abe71e-5ff4-4f83-9f52-0d650aad154d	stream-started:80abe71e-5ff4-4f83-9f52-0d650aad154d
27b96b37-5b27-4930-92c7-80b71f9f92d1	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: My Live Stream	{"title": "My Live Stream", "streamId": "80abe71e-5ff4-4f83-9f52-0d650aad154d", "startedAt": "2026-04-01T19:46:45.687Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-01 19:46:45.717	\N	80abe71e-5ff4-4f83-9f52-0d650aad154d	stream-started:80abe71e-5ff4-4f83-9f52-0d650aad154d
1e8cdf20-cd24-4ed4-aaf6-11c345b3f236	281ac0c9-d22b-4ece-895a-9d2c86a8f315	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: My Live Stream	{"title": "My Live Stream", "streamId": "80abe71e-5ff4-4f83-9f52-0d650aad154d", "startedAt": "2026-04-01T19:46:45.687Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-01 19:46:45.717	\N	80abe71e-5ff4-4f83-9f52-0d650aad154d	stream-started:80abe71e-5ff4-4f83-9f52-0d650aad154d
d0c68806-7d46-4630-9b87-0f0492656e6e	3961fabe-1345-4426-bd8a-ca0a5eac3aac	STREAM_STARTED	JamesConnor is live now	JamesConnor started: My Live Stream	{"title": "My Live Stream", "streamId": "96c5ce44-1733-46ba-a957-e79cf5c5f9a3", "startedAt": "2026-04-01T19:53:56.656Z", "hostUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "visibility": "PUBLIC", "hostUsername": "JamesConnor", "hostAvatarUrl": null, "hostDisplayName": "JamesConnor"}	2026-04-01 19:53:56.683	\N	96c5ce44-1733-46ba-a957-e79cf5c5f9a3	stream-started:96c5ce44-1733-46ba-a957-e79cf5c5f9a3
53c9eaae-f3be-4187-a73c-84e4bc38bcfb	3961fabe-1345-4426-bd8a-ca0a5eac3aac	STREAM_STARTED	JamesConnor is live now	JamesConnor started: My Live Stream	{"title": "My Live Stream", "streamId": "385f01e7-5ce6-4797-a65f-371c2d99937b", "startedAt": "2026-04-01T20:09:21.726Z", "hostUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "visibility": "PUBLIC", "hostUsername": "JamesConnor", "hostAvatarUrl": null, "hostDisplayName": "JamesConnor"}	2026-04-01 20:09:21.752	\N	385f01e7-5ce6-4797-a65f-371c2d99937b	stream-started:385f01e7-5ce6-4797-a65f-371c2d99937b
8a88d5ce-151d-410e-98c3-e3c12ef518fb	3961fabe-1345-4426-bd8a-ca0a5eac3aac	STREAM_STARTED	JamesConnor is live now	JamesConnor started: My Live Stream	{"title": "My Live Stream", "streamId": "81b21678-d5db-4d79-9ced-ee6219312102", "startedAt": "2026-04-01T20:10:50.905Z", "hostUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "visibility": "PUBLIC", "hostUsername": "JamesConnor", "hostAvatarUrl": null, "hostDisplayName": "JamesConnor"}	2026-04-01 20:10:50.93	\N	81b21678-d5db-4d79-9ced-ee6219312102	stream-started:81b21678-d5db-4d79-9ced-ee6219312102
3c8be7b4-9c2d-46c0-a10e-c873e83deb1a	3961fabe-1345-4426-bd8a-ca0a5eac3aac	STREAM_STARTED	JamesConnor is live now	JamesConnor started: My Live Stream	{"title": "My Live Stream", "streamId": "52b78333-2d5a-46b2-b968-94f906ec3136", "startedAt": "2026-04-01T20:33:29.088Z", "hostUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "visibility": "PUBLIC", "hostUsername": "JamesConnor", "hostAvatarUrl": null, "hostDisplayName": "JamesConnor"}	2026-04-01 20:33:29.116	\N	52b78333-2d5a-46b2-b968-94f906ec3136	stream-started:52b78333-2d5a-46b2-b968-94f906ec3136
630e8c9b-4f37-46e7-a79c-97f835ba3ba0	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: My Live Stream	{"title": "My Live Stream", "streamId": "8b79dfb5-2b29-4dea-9546-8a1c908be9c3", "startedAt": "2026-04-01T20:33:37.891Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-01 20:33:37.918	\N	8b79dfb5-2b29-4dea-9546-8a1c908be9c3	stream-started:8b79dfb5-2b29-4dea-9546-8a1c908be9c3
33adbd3f-8a08-4596-8984-627ca7d54ca7	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: My Live Stream	{"title": "My Live Stream", "streamId": "8b79dfb5-2b29-4dea-9546-8a1c908be9c3", "startedAt": "2026-04-01T20:33:37.891Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-01 20:33:37.918	\N	8b79dfb5-2b29-4dea-9546-8a1c908be9c3	stream-started:8b79dfb5-2b29-4dea-9546-8a1c908be9c3
d130b15f-eefe-43a5-b77f-becd0597120a	281ac0c9-d22b-4ece-895a-9d2c86a8f315	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: My Live Stream	{"title": "My Live Stream", "streamId": "8b79dfb5-2b29-4dea-9546-8a1c908be9c3", "startedAt": "2026-04-01T20:33:37.891Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-01 20:33:37.918	\N	8b79dfb5-2b29-4dea-9546-8a1c908be9c3	stream-started:8b79dfb5-2b29-4dea-9546-8a1c908be9c3
f1153043-feb1-4f2d-8898-2f7758141313	3961fabe-1345-4426-bd8a-ca0a5eac3aac	STREAM_STARTED	JamesConnor is live now	JamesConnor started: My Live Stream	{"title": "My Live Stream", "streamId": "47b34798-029a-4f4e-87b7-77bb2aaabfdd", "startedAt": "2026-04-01T20:55:51.215Z", "hostUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "visibility": "PUBLIC", "hostUsername": "JamesConnor", "hostAvatarUrl": null, "hostDisplayName": "JamesConnor"}	2026-04-01 20:55:51.241	\N	47b34798-029a-4f4e-87b7-77bb2aaabfdd	stream-started:47b34798-029a-4f4e-87b7-77bb2aaabfdd
c633bfe5-59f4-435e-b40b-367663119697	3961fabe-1345-4426-bd8a-ca0a5eac3aac	STREAM_STARTED	JamesConnor is live now	JamesConnor started: My Live Stream	{"title": "My Live Stream", "streamId": "ef05d047-00b7-4faa-b9d9-3f19c3aced8d", "startedAt": "2026-04-01T21:37:45.581Z", "hostUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "visibility": "PUBLIC", "hostUsername": "JamesConnor", "hostAvatarUrl": null, "hostDisplayName": "JamesConnor"}	2026-04-01 21:37:45.609	\N	ef05d047-00b7-4faa-b9d9-3f19c3aced8d	stream-started:ef05d047-00b7-4faa-b9d9-3f19c3aced8d
43289fe8-e7f0-4c98-83e0-b7beffc9eee0	c5c904e8-da40-4458-b8bf-5c2cc97348b1	MILESTONE_REACHED	Diamond milestone reached	🎬 H!M helped you reach 1,000,000 diamonds	{"giftId": "galaxy", "userId": "c5c904e8-da40-4458-b8bf-5c2cc97348b1", "giftTxId": "0a1126f0-63eb-4fa9-9b82-621e237b5d18", "achievedAt": "2026-04-01T22:09:51.636Z", "giverUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "giverUsername": "BigDaddy", "milestoneAmount": 1000000, "giverDisplayName": "🎬 H!M"}	2026-04-01 22:09:51.67	\N	8fc0ae7c-4c43-46b0-aac9-44e8469aeb49	milestone:c5c904e8-da40-4458-b8bf-5c2cc97348b1:1000000:0a1126f0-63eb-4fa9-9b82-621e237b5d18
5ce2c92b-1b17-46df-8e7f-d9cacfaa3ed9	c5c904e8-da40-4458-b8bf-5c2cc97348b1	GIFT_RECEIVED	You received a gift	🎬 H!M sent you Galaxy	{"txId": "0a1126f0-63eb-4fa9-9b82-621e237b5d18", "giftId": "galaxy", "giftName": "Galaxy", "streamId": "8fc0ae7c-4c43-46b0-aac9-44e8469aeb49", "diamondValue": 1000000, "senderUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "senderUsername": "BigDaddy", "recipientUserId": "c5c904e8-da40-4458-b8bf-5c2cc97348b1", "senderDisplayName": "🎬 H!M"}	2026-04-01 22:09:51.69	\N	8fc0ae7c-4c43-46b0-aac9-44e8469aeb49	gift:0a1126f0-63eb-4fa9-9b82-621e237b5d18
8f34ffdb-daff-49a4-b274-7d46298da70b	c5c904e8-da40-4458-b8bf-5c2cc97348b1	GIFT_RECEIVED	Gift received	BigDaddy sent you Galaxy	{"giftId": "galaxy", "coinCost": 1000000, "giftName": "Galaxy", "giftTxId": "0a1126f0-63eb-4fa9-9b82-621e237b5d18", "streamId": "8fc0ae7c-4c43-46b0-aac9-44e8469aeb49", "createdAt": "2026-04-01T22:09:51.636Z", "diamondValue": 1000000, "senderUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "senderUsername": "BigDaddy", "recipientUserId": "c5c904e8-da40-4458-b8bf-5c2cc97348b1", "recipientUsername": "supr"}	2026-04-01 22:09:56.353	\N	8fc0ae7c-4c43-46b0-aac9-44e8469aeb49	gift_tx:0a1126f0-63eb-4fa9-9b82-621e237b5d18
18726e2d-5212-44be-9c37-e8323dc3d32b	c5c904e8-da40-4458-b8bf-5c2cc97348b1	MILESTONE_REACHED	Milestone reached	You reached 1,000,000 diamonds earned!	{"userId": "c5c904e8-da40-4458-b8bf-5c2cc97348b1", "giftTxId": "0a1126f0-63eb-4fa9-9b82-621e237b5d18", "username": "supr", "createdAt": "2026-04-01T22:09:51.659Z", "achievedAt": "2026-04-01T22:09:51.636Z", "giverUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "milestoneId": "18f6fdf8-74f9-49f8-bc55-9ba6dca044ab", "giverUsername": "BigDaddy", "milestoneAmount": 1000000}	2026-04-01 22:09:56.365	\N	\N	milestone:18f6fdf8-74f9-49f8-bc55-9ba6dca044ab
243a899f-7b8e-4d13-a018-a6490e20915e	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: My Live Stream	{"title": "My Live Stream", "streamId": "bdffc9c0-0103-4b5a-b3a6-0605f683ca23", "startedAt": "2026-04-01T22:12:22.032Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-01 22:12:22.057	\N	bdffc9c0-0103-4b5a-b3a6-0605f683ca23	stream-started:bdffc9c0-0103-4b5a-b3a6-0605f683ca23
31942c7b-40b5-4643-958d-788ffabf32b9	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: My Live Stream	{"title": "My Live Stream", "streamId": "bdffc9c0-0103-4b5a-b3a6-0605f683ca23", "startedAt": "2026-04-01T22:12:22.032Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-01 22:12:22.057	\N	bdffc9c0-0103-4b5a-b3a6-0605f683ca23	stream-started:bdffc9c0-0103-4b5a-b3a6-0605f683ca23
fc7b0fce-8ff0-4b92-b27c-509b67078d33	281ac0c9-d22b-4ece-895a-9d2c86a8f315	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: My Live Stream	{"title": "My Live Stream", "streamId": "bdffc9c0-0103-4b5a-b3a6-0605f683ca23", "startedAt": "2026-04-01T22:12:22.032Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-01 22:12:22.057	\N	bdffc9c0-0103-4b5a-b3a6-0605f683ca23	stream-started:bdffc9c0-0103-4b5a-b3a6-0605f683ca23
947329a5-1ce2-4ad1-9116-03fe184fb11c	c5c904e8-da40-4458-b8bf-5c2cc97348b1	SYSTEM	New message from 🎬 H!M	🎬 H!M: Ucucucufufuf	{"dmMessageId": "826997b6-57fa-4b18-9cfb-d566528bdb81", "messageType": "TEXT", "senderUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "conversationId": "570701d9-c8c0-4b92-9285-f12ed7f5d7e3", "senderUsername": "BigDaddy", "recipientUserId": "c5c904e8-da40-4458-b8bf-5c2cc97348b1", "senderAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "senderDisplayName": "🎬 H!M"}	2026-04-01 22:15:28.685	\N	\N	dm-received:826997b6-57fa-4b18-9cfb-d566528bdb81
3f9c1adc-4ebd-4571-9250-4fe78f58626d	3961fabe-1345-4426-bd8a-ca0a5eac3aac	SYSTEM	New message from supr	supr: Testicle	{"dmMessageId": "8a920a40-2187-4252-9ec7-6ae7cc6330d7", "messageType": "TEXT", "senderUserId": "c5c904e8-da40-4458-b8bf-5c2cc97348b1", "conversationId": "570701d9-c8c0-4b92-9285-f12ed7f5d7e3", "senderUsername": "supr", "recipientUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "senderAvatarUrl": null, "senderDisplayName": "supr"}	2026-04-01 22:16:24.658	\N	\N	dm-received:8a920a40-2187-4252-9ec7-6ae7cc6330d7
a9c8439a-10ff-4fe6-a64a-0823627a78d9	c5c904e8-da40-4458-b8bf-5c2cc97348b1	SYSTEM	New message from 🎬 H!M	🎬 H!M sent you a GIF	{"dmMessageId": "93f1f07f-2d57-417c-b014-284a60b9cba6", "messageType": "GIF", "senderUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "conversationId": "570701d9-c8c0-4b92-9285-f12ed7f5d7e3", "senderUsername": "BigDaddy", "recipientUserId": "c5c904e8-da40-4458-b8bf-5c2cc97348b1", "senderAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "senderDisplayName": "🎬 H!M"}	2026-04-01 22:16:44.052	\N	\N	dm-received:93f1f07f-2d57-417c-b014-284a60b9cba6
2eb7d5b3-7df5-4b13-a67b-313322542a6c	3961fabe-1345-4426-bd8a-ca0a5eac3aac	SYSTEM	New message from supr	supr sent you a GIF	{"dmMessageId": "836e05b4-d644-4eb1-8ecb-df95d889a876", "messageType": "GIF", "senderUserId": "c5c904e8-da40-4458-b8bf-5c2cc97348b1", "conversationId": "570701d9-c8c0-4b92-9285-f12ed7f5d7e3", "senderUsername": "supr", "recipientUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "senderAvatarUrl": null, "senderDisplayName": "supr"}	2026-04-01 22:16:51.066	\N	\N	dm-received:836e05b4-d644-4eb1-8ecb-df95d889a876
5f6baf22-c4a7-46d9-82f1-cca272adf0b1	c5c904e8-da40-4458-b8bf-5c2cc97348b1	SYSTEM	New message from 🎬 H!M	🎬 H!M: Iviviciv	{"dmMessageId": "f77fd506-5a17-4add-83e4-c9b7f258224e", "messageType": "TEXT", "senderUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "conversationId": "570701d9-c8c0-4b92-9285-f12ed7f5d7e3", "senderUsername": "BigDaddy", "recipientUserId": "c5c904e8-da40-4458-b8bf-5c2cc97348b1", "senderAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "senderDisplayName": "🎬 H!M"}	2026-04-01 22:17:02.152	\N	\N	dm-received:f77fd506-5a17-4add-83e4-c9b7f258224e
51a37a10-c87e-4407-8dd8-82e56b71a7a0	c5c904e8-da40-4458-b8bf-5c2cc97348b1	SYSTEM	New message from 🎬 H!M	🎬 H!M: Uviv	{"dmMessageId": "7e0d8862-55e8-45d4-8427-74ddf1d44f42", "messageType": "TEXT", "senderUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "conversationId": "570701d9-c8c0-4b92-9285-f12ed7f5d7e3", "senderUsername": "BigDaddy", "recipientUserId": "c5c904e8-da40-4458-b8bf-5c2cc97348b1", "senderAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "senderDisplayName": "🎬 H!M"}	2026-04-01 22:17:04.92	\N	\N	dm-received:7e0d8862-55e8-45d4-8427-74ddf1d44f42
4829477d-e789-4c85-bf5e-460c707e71ab	c5c904e8-da40-4458-b8bf-5c2cc97348b1	SYSTEM	New message from 🎬 H!M	🎬 H!M: Civi	{"dmMessageId": "6033a3bd-b1b7-4326-ac65-8155c0cba610", "messageType": "TEXT", "senderUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "conversationId": "570701d9-c8c0-4b92-9285-f12ed7f5d7e3", "senderUsername": "BigDaddy", "recipientUserId": "c5c904e8-da40-4458-b8bf-5c2cc97348b1", "senderAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "senderDisplayName": "🎬 H!M"}	2026-04-01 22:17:07.748	\N	\N	dm-received:6033a3bd-b1b7-4326-ac65-8155c0cba610
0ba1c163-bd31-48bb-8655-5c1b41605916	3961fabe-1345-4426-bd8a-ca0a5eac3aac	SYSTEM	New message from supr	supr: Heheh	{"dmMessageId": "b886aa7c-d1b6-4907-9a56-ebd054225b02", "messageType": "TEXT", "senderUserId": "c5c904e8-da40-4458-b8bf-5c2cc97348b1", "conversationId": "570701d9-c8c0-4b92-9285-f12ed7f5d7e3", "senderUsername": "supr", "recipientUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "senderAvatarUrl": null, "senderDisplayName": "supr"}	2026-04-01 22:17:08.183	\N	\N	dm-received:b886aa7c-d1b6-4907-9a56-ebd054225b02
8e20691a-042b-49a9-9fad-7b1fb5e747b8	3961fabe-1345-4426-bd8a-ca0a5eac3aac	SYSTEM	New message from supr	supr: Ok	{"dmMessageId": "40bb8be2-5b19-4d4b-b2ef-fa966b2bfe5e", "messageType": "TEXT", "senderUserId": "c5c904e8-da40-4458-b8bf-5c2cc97348b1", "conversationId": "570701d9-c8c0-4b92-9285-f12ed7f5d7e3", "senderUsername": "supr", "recipientUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "senderAvatarUrl": null, "senderDisplayName": "supr"}	2026-04-01 22:17:30.037	\N	\N	dm-received:40bb8be2-5b19-4d4b-b2ef-fa966b2bfe5e
58333d41-128d-4327-af36-8e2aa0704ac9	3961fabe-1345-4426-bd8a-ca0a5eac3aac	SYSTEM	New message from supr	supr: Hshd	{"dmMessageId": "0136c2f0-3fab-4f93-bc10-0ddcc6f45e28", "messageType": "TEXT", "senderUserId": "c5c904e8-da40-4458-b8bf-5c2cc97348b1", "conversationId": "570701d9-c8c0-4b92-9285-f12ed7f5d7e3", "senderUsername": "supr", "recipientUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "senderAvatarUrl": null, "senderDisplayName": "supr"}	2026-04-01 22:17:33.66	\N	\N	dm-received:0136c2f0-3fab-4f93-bc10-0ddcc6f45e28
5d9b43ee-ad67-41f6-8daa-72ae29461559	c5c904e8-da40-4458-b8bf-5c2cc97348b1	SYSTEM	New message from 🎬 H!M	🎬 H!M sent you a photo	{"dmMessageId": "16ede933-d8ee-4cda-8a0f-e6426f36658b", "messageType": "IMAGE", "senderUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "conversationId": "570701d9-c8c0-4b92-9285-f12ed7f5d7e3", "senderUsername": "BigDaddy", "recipientUserId": "c5c904e8-da40-4458-b8bf-5c2cc97348b1", "senderAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "senderDisplayName": "🎬 H!M"}	2026-04-01 22:17:42.575	\N	\N	dm-received:16ede933-d8ee-4cda-8a0f-e6426f36658b
a7520a87-09a1-4e19-b66e-f05f18ac02b8	3961fabe-1345-4426-bd8a-ca0a5eac3aac	SYSTEM	New message from supr	supr sent you a photo	{"dmMessageId": "1645e1f2-7d41-4424-875c-0b2a8f8ec149", "messageType": "IMAGE", "senderUserId": "c5c904e8-da40-4458-b8bf-5c2cc97348b1", "conversationId": "570701d9-c8c0-4b92-9285-f12ed7f5d7e3", "senderUsername": "supr", "recipientUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "senderAvatarUrl": null, "senderDisplayName": "supr"}	2026-04-01 22:18:05.106	\N	\N	dm-received:1645e1f2-7d41-4424-875c-0b2a8f8ec149
51137888-6ca6-4b48-95d0-0a1821100e05	3961fabe-1345-4426-bd8a-ca0a5eac3aac	SYSTEM	New message from supr	supr sent you a photo	{"dmMessageId": "1638a3a4-5b99-42cc-9efb-5cf0dd305209", "messageType": "IMAGE", "senderUserId": "c5c904e8-da40-4458-b8bf-5c2cc97348b1", "conversationId": "570701d9-c8c0-4b92-9285-f12ed7f5d7e3", "senderUsername": "supr", "recipientUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "senderAvatarUrl": null, "senderDisplayName": "supr"}	2026-04-01 22:18:24.462	\N	\N	dm-received:1638a3a4-5b99-42cc-9efb-5cf0dd305209
b9b49ed2-2596-4417-b5c9-6ebf41f21d22	3961fabe-1345-4426-bd8a-ca0a5eac3aac	SYSTEM	New message from supr	supr sent you a gift	{"dmMessageId": "c63db776-1738-4c8d-a607-a2018f5b2a1f", "messageType": "GIFT", "senderUserId": "c5c904e8-da40-4458-b8bf-5c2cc97348b1", "conversationId": "570701d9-c8c0-4b92-9285-f12ed7f5d7e3", "senderUsername": "supr", "recipientUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "senderAvatarUrl": null, "senderDisplayName": "supr"}	2026-04-01 22:19:35.531	\N	\N	dm-received:c63db776-1738-4c8d-a607-a2018f5b2a1f
aab6761a-4020-4958-a49f-c84d814ec4aa	3961fabe-1345-4426-bd8a-ca0a5eac3aac	GIFT_RECEIVED	Gift received	supr sent you Rose	{"giftId": "rose", "coinCost": 10, "giftName": "Rose", "giftTxId": "8c9c8878-b340-4cf5-96c9-7cf16cd39291", "streamId": null, "createdAt": "2026-04-01T22:19:35.507Z", "diamondValue": 10, "senderUserId": "c5c904e8-da40-4458-b8bf-5c2cc97348b1", "senderUsername": "supr", "recipientUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "recipientUsername": "BigDaddy"}	2026-04-01 22:19:36.436	\N	\N	gift_tx:8c9c8878-b340-4cf5-96c9-7cf16cd39291
355c46e2-c8fa-4b0e-8ccc-63d3ec5fb2ab	c5c904e8-da40-4458-b8bf-5c2cc97348b1	SYSTEM	New message from 🎬 H!M	🎬 H!M sent you a gift	{"dmMessageId": "e47712c7-6c72-4642-9502-6318b131cc58", "messageType": "GIFT", "senderUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "conversationId": "570701d9-c8c0-4b92-9285-f12ed7f5d7e3", "senderUsername": "BigDaddy", "recipientUserId": "c5c904e8-da40-4458-b8bf-5c2cc97348b1", "senderAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "senderDisplayName": "🎬 H!M"}	2026-04-01 22:19:44.638	\N	\N	dm-received:e47712c7-6c72-4642-9502-6318b131cc58
fb9a6aad-c2d2-46c5-ae00-381e32ec548e	c5c904e8-da40-4458-b8bf-5c2cc97348b1	GIFT_RECEIVED	Gift received	BigDaddy sent you Galaxy	{"giftId": "galaxy", "coinCost": 1000000, "giftName": "Galaxy", "giftTxId": "a646c4e0-2bfb-468f-990e-4f7f0b57dd76", "streamId": null, "createdAt": "2026-04-01T22:19:44.612Z", "diamondValue": 1000000, "senderUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "senderUsername": "BigDaddy", "recipientUserId": "c5c904e8-da40-4458-b8bf-5c2cc97348b1", "recipientUsername": "supr"}	2026-04-01 22:19:46.437	\N	\N	gift_tx:a646c4e0-2bfb-468f-990e-4f7f0b57dd76
857d6ed4-97d5-43a7-9fb6-a5f382e48328	c5c904e8-da40-4458-b8bf-5c2cc97348b1	SYSTEM	New message from 🎬 H!M	🎬 H!M sent you a gift	{"dmMessageId": "d705cf51-fda1-4a36-86fc-fb36f65b0d7e", "messageType": "GIFT", "senderUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "conversationId": "570701d9-c8c0-4b92-9285-f12ed7f5d7e3", "senderUsername": "BigDaddy", "recipientUserId": "c5c904e8-da40-4458-b8bf-5c2cc97348b1", "senderAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "senderDisplayName": "🎬 H!M"}	2026-04-01 22:19:46.673	\N	\N	dm-received:d705cf51-fda1-4a36-86fc-fb36f65b0d7e
7bf963fc-de22-4612-ad9f-5b9abdc950d0	c5c904e8-da40-4458-b8bf-5c2cc97348b1	SYSTEM	New message from 🎬 H!M	🎬 H!M sent you a gift	{"dmMessageId": "bfa667c3-eb1a-42a3-94ef-53dfb45ae552", "messageType": "GIFT", "senderUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "conversationId": "570701d9-c8c0-4b92-9285-f12ed7f5d7e3", "senderUsername": "BigDaddy", "recipientUserId": "c5c904e8-da40-4458-b8bf-5c2cc97348b1", "senderAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "senderDisplayName": "🎬 H!M"}	2026-04-01 22:19:48.272	\N	\N	dm-received:bfa667c3-eb1a-42a3-94ef-53dfb45ae552
97f20995-93bc-42a8-85de-f66ed590d50e	c5c904e8-da40-4458-b8bf-5c2cc97348b1	GIFT_RECEIVED	Gift received	BigDaddy sent you Galaxy	{"giftId": "galaxy", "coinCost": 1000000, "giftName": "Galaxy", "giftTxId": "a489940f-7d4c-433c-87d4-e8e3cd9fc417", "streamId": null, "createdAt": "2026-04-01T22:19:46.652Z", "diamondValue": 1000000, "senderUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "senderUsername": "BigDaddy", "recipientUserId": "c5c904e8-da40-4458-b8bf-5c2cc97348b1", "recipientUsername": "supr"}	2026-04-01 22:19:51.436	\N	\N	gift_tx:a489940f-7d4c-433c-87d4-e8e3cd9fc417
b7d474fb-b534-49cb-82dc-96e17affa950	c5c904e8-da40-4458-b8bf-5c2cc97348b1	GIFT_RECEIVED	Gift received	BigDaddy sent you Galaxy	{"giftId": "galaxy", "coinCost": 1000000, "giftName": "Galaxy", "giftTxId": "77658a63-a58e-4ee2-a28c-7bd875161d55", "streamId": null, "createdAt": "2026-04-01T22:19:48.251Z", "diamondValue": 1000000, "senderUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "senderUsername": "BigDaddy", "recipientUserId": "c5c904e8-da40-4458-b8bf-5c2cc97348b1", "recipientUsername": "supr"}	2026-04-01 22:19:51.442	\N	\N	gift_tx:77658a63-a58e-4ee2-a28c-7bd875161d55
fe788e24-6125-4171-b63d-b2a6a370e020	c5c904e8-da40-4458-b8bf-5c2cc97348b1	SYSTEM	New message from 🎬 H!M	🎬 H!M: Yvuvuvu	{"dmMessageId": "9dfa2d5f-7643-4672-a0a0-8115223e8300", "messageType": "TEXT", "senderUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "conversationId": "570701d9-c8c0-4b92-9285-f12ed7f5d7e3", "senderUsername": "BigDaddy", "recipientUserId": "c5c904e8-da40-4458-b8bf-5c2cc97348b1", "senderAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "senderDisplayName": "🎬 H!M"}	2026-04-01 22:21:58.22	\N	\N	dm-received:9dfa2d5f-7643-4672-a0a0-8115223e8300
b2481338-1112-419f-b45f-373757604693	3961fabe-1345-4426-bd8a-ca0a5eac3aac	STREAM_STARTED	Dandy is live now	Dandy started: My Live Stream	{"title": "My Live Stream", "streamId": "47ea64c7-11c3-4b29-ace3-adeef70dde13", "startedAt": "2026-04-01T22:26:18.464Z", "hostUserId": "c5c904e8-da40-4458-b8bf-5c2cc97348b1", "visibility": "PUBLIC", "hostUsername": "supr", "hostAvatarUrl": "/uploads/c5c904e8-da40-4458-b8bf-5c2cc97348b1/profile/bd62590a-8852-4bd1-8e2b-52b099fa4f3e.jpeg", "hostDisplayName": "Dandy"}	2026-04-01 22:26:18.493	\N	47ea64c7-11c3-4b29-ace3-adeef70dde13	stream-started:47ea64c7-11c3-4b29-ace3-adeef70dde13
ca3da3d8-88ad-4fc3-aef7-46b8b4b313fa	3961fabe-1345-4426-bd8a-ca0a5eac3aac	STREAM_STARTED	Dandy is live now	Dandy started: Fish and Chips	{"title": "Fish and Chips", "streamId": "66000676-e56a-4c26-a200-4a930987e019", "startedAt": "2026-04-01T22:26:44.343Z", "hostUserId": "c5c904e8-da40-4458-b8bf-5c2cc97348b1", "visibility": "PUBLIC", "hostUsername": "supr", "hostAvatarUrl": "/uploads/c5c904e8-da40-4458-b8bf-5c2cc97348b1/profile/bd62590a-8852-4bd1-8e2b-52b099fa4f3e.jpeg", "hostDisplayName": "Dandy"}	2026-04-01 22:26:44.366	\N	66000676-e56a-4c26-a200-4a930987e019	stream-started:66000676-e56a-4c26-a200-4a930987e019
a260aab1-dfb5-4929-9a6c-871f2ca3509d	3961fabe-1345-4426-bd8a-ca0a5eac3aac	STREAM_STARTED	Dandy is live now	Dandy started: Shitz	{"title": "Shitz", "streamId": "8932ebc4-876d-4cb4-8fbe-d59e05767546", "startedAt": "2026-04-01T22:31:05.333Z", "hostUserId": "c5c904e8-da40-4458-b8bf-5c2cc97348b1", "visibility": "PUBLIC", "hostUsername": "supr", "hostAvatarUrl": "/uploads/c5c904e8-da40-4458-b8bf-5c2cc97348b1/profile/bd62590a-8852-4bd1-8e2b-52b099fa4f3e.jpeg", "hostDisplayName": "Dandy"}	2026-04-01 22:31:05.359	\N	8932ebc4-876d-4cb4-8fbe-d59e05767546	stream-started:8932ebc4-876d-4cb4-8fbe-d59e05767546
200c4617-b4e5-4098-89a3-66f095f20322	c5c904e8-da40-4458-b8bf-5c2cc97348b1	MILESTONE_REACHED	Diamond milestone reached	JamesConnor helped you reach 2,000,000 diamonds	{"giftId": "galaxy", "userId": "c5c904e8-da40-4458-b8bf-5c2cc97348b1", "giftTxId": "9f61bf5e-d73f-473d-9b1a-3d5315791b68", "achievedAt": "2026-04-01T22:35:50.542Z", "giverUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "giverUsername": "JamesConnor", "milestoneAmount": 2000000, "giverDisplayName": "JamesConnor"}	2026-04-01 22:35:50.591	\N	8932ebc4-876d-4cb4-8fbe-d59e05767546	milestone:c5c904e8-da40-4458-b8bf-5c2cc97348b1:2000000:9f61bf5e-d73f-473d-9b1a-3d5315791b68
575bcebc-03d2-43bc-8704-574cf807eba1	c5c904e8-da40-4458-b8bf-5c2cc97348b1	MILESTONE_REACHED	Diamond milestone reached	JamesConnor helped you reach 3,000,000 diamonds	{"giftId": "galaxy", "userId": "c5c904e8-da40-4458-b8bf-5c2cc97348b1", "giftTxId": "9f61bf5e-d73f-473d-9b1a-3d5315791b68", "achievedAt": "2026-04-01T22:35:50.542Z", "giverUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "giverUsername": "JamesConnor", "milestoneAmount": 3000000, "giverDisplayName": "JamesConnor"}	2026-04-01 22:35:50.606	\N	8932ebc4-876d-4cb4-8fbe-d59e05767546	milestone:c5c904e8-da40-4458-b8bf-5c2cc97348b1:3000000:9f61bf5e-d73f-473d-9b1a-3d5315791b68
3e80303f-37f3-4de1-bc5a-8a14e96981e2	c5c904e8-da40-4458-b8bf-5c2cc97348b1	MILESTONE_REACHED	Diamond milestone reached	JamesConnor helped you reach 4,000,000 diamonds	{"giftId": "galaxy", "userId": "c5c904e8-da40-4458-b8bf-5c2cc97348b1", "giftTxId": "9f61bf5e-d73f-473d-9b1a-3d5315791b68", "achievedAt": "2026-04-01T22:35:50.542Z", "giverUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "giverUsername": "JamesConnor", "milestoneAmount": 4000000, "giverDisplayName": "JamesConnor"}	2026-04-01 22:35:50.616	\N	8932ebc4-876d-4cb4-8fbe-d59e05767546	milestone:c5c904e8-da40-4458-b8bf-5c2cc97348b1:4000000:9f61bf5e-d73f-473d-9b1a-3d5315791b68
7e396090-a984-40bc-b754-3b5a27565696	c5c904e8-da40-4458-b8bf-5c2cc97348b1	MILESTONE_REACHED	Diamond milestone reached	JamesConnor helped you reach 5,000,000 diamonds	{"giftId": "galaxy", "userId": "c5c904e8-da40-4458-b8bf-5c2cc97348b1", "giftTxId": "9f61bf5e-d73f-473d-9b1a-3d5315791b68", "achievedAt": "2026-04-01T22:35:50.542Z", "giverUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "giverUsername": "JamesConnor", "milestoneAmount": 5000000, "giverDisplayName": "JamesConnor"}	2026-04-01 22:35:50.626	\N	8932ebc4-876d-4cb4-8fbe-d59e05767546	milestone:c5c904e8-da40-4458-b8bf-5c2cc97348b1:5000000:9f61bf5e-d73f-473d-9b1a-3d5315791b68
2a4e715a-6cd6-458f-919d-53b920b7cf5c	c5c904e8-da40-4458-b8bf-5c2cc97348b1	GIFT_RECEIVED	You received a gift	JamesConnor sent you Galaxy	{"txId": "9f61bf5e-d73f-473d-9b1a-3d5315791b68", "giftId": "galaxy", "giftName": "Galaxy", "streamId": "8932ebc4-876d-4cb4-8fbe-d59e05767546", "diamondValue": 1000000, "senderUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "senderUsername": "JamesConnor", "recipientUserId": "c5c904e8-da40-4458-b8bf-5c2cc97348b1", "senderDisplayName": "JamesConnor"}	2026-04-01 22:35:50.641	\N	8932ebc4-876d-4cb4-8fbe-d59e05767546	gift:9f61bf5e-d73f-473d-9b1a-3d5315791b68
20125d42-adea-4040-aaf6-d215ad28d766	c5c904e8-da40-4458-b8bf-5c2cc97348b1	GIFT_RECEIVED	Gift received	JamesConnor sent you Galaxy	{"giftId": "galaxy", "coinCost": 1000000, "giftName": "Galaxy", "giftTxId": "9f61bf5e-d73f-473d-9b1a-3d5315791b68", "streamId": "8932ebc4-876d-4cb4-8fbe-d59e05767546", "createdAt": "2026-04-01T22:35:50.542Z", "diamondValue": 1000000, "senderUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "senderUsername": "JamesConnor", "recipientUserId": "c5c904e8-da40-4458-b8bf-5c2cc97348b1", "recipientUsername": "supr"}	2026-04-01 22:35:51.591	\N	8932ebc4-876d-4cb4-8fbe-d59e05767546	gift_tx:9f61bf5e-d73f-473d-9b1a-3d5315791b68
8d6a7e09-0965-4ca9-8917-30c4c6be7047	c5c904e8-da40-4458-b8bf-5c2cc97348b1	MILESTONE_REACHED	Milestone reached	You reached 2,000,000 diamonds earned!	{"userId": "c5c904e8-da40-4458-b8bf-5c2cc97348b1", "giftTxId": "9f61bf5e-d73f-473d-9b1a-3d5315791b68", "username": "supr", "createdAt": "2026-04-01T22:35:50.568Z", "achievedAt": "2026-04-01T22:35:50.542Z", "giverUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "milestoneId": "475a8e1c-d3eb-42c5-8c99-ce9c00ccc48f", "giverUsername": "JamesConnor", "milestoneAmount": 2000000}	2026-04-01 22:35:51.604	\N	\N	milestone:475a8e1c-d3eb-42c5-8c99-ce9c00ccc48f
c272d30e-920d-4c19-9a87-b230195fc64b	c5c904e8-da40-4458-b8bf-5c2cc97348b1	MILESTONE_REACHED	Milestone reached	You reached 3,000,000 diamonds earned!	{"userId": "c5c904e8-da40-4458-b8bf-5c2cc97348b1", "giftTxId": "9f61bf5e-d73f-473d-9b1a-3d5315791b68", "username": "supr", "createdAt": "2026-04-01T22:35:50.572Z", "achievedAt": "2026-04-01T22:35:50.542Z", "giverUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "milestoneId": "e3ecf3a6-b312-409a-9ac0-9fddadf7f613", "giverUsername": "JamesConnor", "milestoneAmount": 3000000}	2026-04-01 22:35:51.611	\N	\N	milestone:e3ecf3a6-b312-409a-9ac0-9fddadf7f613
a1419237-4b64-4498-8431-bce6c8c4d477	c5c904e8-da40-4458-b8bf-5c2cc97348b1	MILESTONE_REACHED	Milestone reached	You reached 4,000,000 diamonds earned!	{"userId": "c5c904e8-da40-4458-b8bf-5c2cc97348b1", "giftTxId": "9f61bf5e-d73f-473d-9b1a-3d5315791b68", "username": "supr", "createdAt": "2026-04-01T22:35:50.576Z", "achievedAt": "2026-04-01T22:35:50.542Z", "giverUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "milestoneId": "4ecccc56-5de5-478b-a4db-20a320b68ddd", "giverUsername": "JamesConnor", "milestoneAmount": 4000000}	2026-04-01 22:35:51.617	\N	\N	milestone:4ecccc56-5de5-478b-a4db-20a320b68ddd
0a3a98e4-3e27-44f8-a9a1-a89465d7907d	c5c904e8-da40-4458-b8bf-5c2cc97348b1	MILESTONE_REACHED	Milestone reached	You reached 5,000,000 diamonds earned!	{"userId": "c5c904e8-da40-4458-b8bf-5c2cc97348b1", "giftTxId": "9f61bf5e-d73f-473d-9b1a-3d5315791b68", "username": "supr", "createdAt": "2026-04-01T22:35:50.580Z", "achievedAt": "2026-04-01T22:35:50.542Z", "giverUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "milestoneId": "b021e11d-3bc7-44a5-ab74-836a07f570bb", "giverUsername": "JamesConnor", "milestoneAmount": 5000000}	2026-04-01 22:35:51.623	\N	\N	milestone:b021e11d-3bc7-44a5-ab74-836a07f570bb
d43d3708-6393-4909-aa45-4dcbdace3aae	c5c904e8-da40-4458-b8bf-5c2cc97348b1	GIFT_RECEIVED	You received a gift	JamesConnor sent you Dragon Egg Hatch	{"txId": "2a3cb0ff-e485-4231-a931-e28c5e0ca269", "giftId": "dragon_egg", "giftName": "Dragon Egg Hatch", "streamId": "8932ebc4-876d-4cb4-8fbe-d59e05767546", "diamondValue": 5000, "senderUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "senderUsername": "JamesConnor", "recipientUserId": "c5c904e8-da40-4458-b8bf-5c2cc97348b1", "senderDisplayName": "JamesConnor"}	2026-04-01 22:35:52.293	\N	8932ebc4-876d-4cb4-8fbe-d59e05767546	gift:2a3cb0ff-e485-4231-a931-e28c5e0ca269
8e9917ac-b6f3-4003-873b-4245fade08c6	c5c904e8-da40-4458-b8bf-5c2cc97348b1	GIFT_RECEIVED	You received a gift	JamesConnor sent you Crowned Goat	{"txId": "9f19614b-fdb8-49be-84a9-fec3e17f99b7", "giftId": "crown_goat", "giftName": "Crowned Goat", "streamId": "8932ebc4-876d-4cb4-8fbe-d59e05767546", "diamondValue": 250, "senderUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "senderUsername": "JamesConnor", "recipientUserId": "c5c904e8-da40-4458-b8bf-5c2cc97348b1", "senderDisplayName": "JamesConnor"}	2026-04-01 22:35:53.97	\N	8932ebc4-876d-4cb4-8fbe-d59e05767546	gift:9f19614b-fdb8-49be-84a9-fec3e17f99b7
9931b08b-a9df-4fda-9aa0-015473888e90	c5c904e8-da40-4458-b8bf-5c2cc97348b1	GIFT_RECEIVED	Gift received	JamesConnor sent you Dragon Egg Hatch	{"giftId": "dragon_egg", "coinCost": 5000, "giftName": "Dragon Egg Hatch", "giftTxId": "2a3cb0ff-e485-4231-a931-e28c5e0ca269", "streamId": "8932ebc4-876d-4cb4-8fbe-d59e05767546", "createdAt": "2026-04-01T22:35:52.265Z", "diamondValue": 5000, "senderUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "senderUsername": "JamesConnor", "recipientUserId": "c5c904e8-da40-4458-b8bf-5c2cc97348b1", "recipientUsername": "supr"}	2026-04-01 22:35:56.591	\N	8932ebc4-876d-4cb4-8fbe-d59e05767546	gift_tx:2a3cb0ff-e485-4231-a931-e28c5e0ca269
b2b9ff4e-73fa-4dfc-926c-314e508402b0	c5c904e8-da40-4458-b8bf-5c2cc97348b1	GIFT_RECEIVED	Gift received	JamesConnor sent you Crowned Goat	{"giftId": "crown_goat", "coinCost": 250, "giftName": "Crowned Goat", "giftTxId": "9f19614b-fdb8-49be-84a9-fec3e17f99b7", "streamId": "8932ebc4-876d-4cb4-8fbe-d59e05767546", "createdAt": "2026-04-01T22:35:53.944Z", "diamondValue": 250, "senderUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "senderUsername": "JamesConnor", "recipientUserId": "c5c904e8-da40-4458-b8bf-5c2cc97348b1", "recipientUsername": "supr"}	2026-04-01 22:35:56.597	\N	8932ebc4-876d-4cb4-8fbe-d59e05767546	gift_tx:9f19614b-fdb8-49be-84a9-fec3e17f99b7
b66ecfb4-6578-40ad-8b56-9f059bd50a8b	3961fabe-1345-4426-bd8a-ca0a5eac3aac	STREAM_STARTED	Dandy is live now	Dandy started: My Live Stream	{"title": "My Live Stream", "streamId": "ad4abb54-e038-4c35-8785-d7c2f4389b91", "startedAt": "2026-04-01T22:53:31.285Z", "hostUserId": "c5c904e8-da40-4458-b8bf-5c2cc97348b1", "visibility": "PUBLIC", "hostUsername": "supr", "hostAvatarUrl": "/uploads/c5c904e8-da40-4458-b8bf-5c2cc97348b1/profile/bd62590a-8852-4bd1-8e2b-52b099fa4f3e.jpeg", "hostDisplayName": "Dandy"}	2026-04-01 22:53:31.319	\N	ad4abb54-e038-4c35-8785-d7c2f4389b91	stream-started:ad4abb54-e038-4c35-8785-d7c2f4389b91
0756c65d-d133-41b9-9f36-2fc9f55f9968	3961fabe-1345-4426-bd8a-ca0a5eac3aac	STREAM_STARTED	Dandy is live now	Dandy started: My Live Stream	{"title": "My Live Stream", "streamId": "f9480f50-6974-4f22-a4fc-fb81800d97ad", "startedAt": "2026-04-01T23:06:18.116Z", "hostUserId": "c5c904e8-da40-4458-b8bf-5c2cc97348b1", "visibility": "PUBLIC", "hostUsername": "supr", "hostAvatarUrl": "/uploads/c5c904e8-da40-4458-b8bf-5c2cc97348b1/profile/bd62590a-8852-4bd1-8e2b-52b099fa4f3e.jpeg", "hostDisplayName": "Dandy"}	2026-04-01 23:06:18.146	\N	f9480f50-6974-4f22-a4fc-fb81800d97ad	stream-started:f9480f50-6974-4f22-a4fc-fb81800d97ad
6fbef5ca-11a4-4ef8-99d8-307819881d9c	3961fabe-1345-4426-bd8a-ca0a5eac3aac	STREAM_STARTED	ChiDotGo is live now	ChiDotGo started: Wyoming	{"title": "Wyoming", "streamId": "27819416-1f12-4c8d-939d-318f6dc2adb7", "startedAt": "2026-04-01T23:09:52.870Z", "hostUserId": "281ac0c9-d22b-4ece-895a-9d2c86a8f315", "visibility": "PUBLIC", "hostUsername": "ChiDotGo", "hostAvatarUrl": null, "hostDisplayName": "ChiDotGo"}	2026-04-01 23:09:52.893	\N	27819416-1f12-4c8d-939d-318f6dc2adb7	stream-started:27819416-1f12-4c8d-939d-318f6dc2adb7
51ac2edf-a5b6-45ea-bd5c-14d34f0a140d	3961fabe-1345-4426-bd8a-ca0a5eac3aac	STREAM_STARTED	ChiDotGo is live now	ChiDotGo started: Chicago	{"title": "Chicago", "streamId": "954b55ba-be54-456f-81eb-31c108c42ae6", "startedAt": "2026-04-01T23:13:48.274Z", "hostUserId": "281ac0c9-d22b-4ece-895a-9d2c86a8f315", "visibility": "PUBLIC", "hostUsername": "ChiDotGo", "hostAvatarUrl": null, "hostDisplayName": "ChiDotGo"}	2026-04-01 23:13:48.302	\N	954b55ba-be54-456f-81eb-31c108c42ae6	stream-started:954b55ba-be54-456f-81eb-31c108c42ae6
a582ced3-aa65-437d-a00b-e563679b51b5	281ac0c9-d22b-4ece-895a-9d2c86a8f315	SYSTEM	New message from 🎬 H!M	🎬 H!M: Ucucjc	{"dmMessageId": "c63dd6ba-df5e-4206-aca3-96ec04d89e89", "messageType": "TEXT", "senderUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "conversationId": "4551ebb6-723c-43a9-a4fd-4d15f91f874a", "senderUsername": "BigDaddy", "recipientUserId": "281ac0c9-d22b-4ece-895a-9d2c86a8f315", "senderAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "senderDisplayName": "🎬 H!M"}	2026-04-01 23:15:35.356	\N	\N	dm-received:c63dd6ba-df5e-4206-aca3-96ec04d89e89
af9efece-5b62-4059-99c3-e8aa9c94e22e	3961fabe-1345-4426-bd8a-ca0a5eac3aac	STREAM_STARTED	ChiDotGo is live now	ChiDotGo started: I eat ass	{"title": "I eat ass", "streamId": "b524fe7d-3e1a-42cc-9ab8-6c873b378fe0", "startedAt": "2026-04-01T23:21:13.026Z", "hostUserId": "281ac0c9-d22b-4ece-895a-9d2c86a8f315", "visibility": "PUBLIC", "hostUsername": "ChiDotGo", "hostAvatarUrl": null, "hostDisplayName": "ChiDotGo"}	2026-04-01 23:21:13.054	\N	b524fe7d-3e1a-42cc-9ab8-6c873b378fe0	stream-started:b524fe7d-3e1a-42cc-9ab8-6c873b378fe0
cc5c0f44-6bfa-408b-a0ef-4cbf17b51ea4	281ac0c9-d22b-4ece-895a-9d2c86a8f315	MILESTONE_REACHED	Diamond milestone reached	🎬 H!M helped you reach 9,000,000 diamonds	{"giftId": "galaxy", "userId": "281ac0c9-d22b-4ece-895a-9d2c86a8f315", "giftTxId": "25a8efa8-edab-4eee-838b-8f3941f33ec6", "achievedAt": "2026-04-01T23:21:16.759Z", "giverUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "giverUsername": "BigDaddy", "milestoneAmount": 9000000, "giverDisplayName": "🎬 H!M"}	2026-04-01 23:21:16.795	\N	b524fe7d-3e1a-42cc-9ab8-6c873b378fe0	milestone:281ac0c9-d22b-4ece-895a-9d2c86a8f315:9000000:25a8efa8-edab-4eee-838b-8f3941f33ec6
e29ff212-6752-4a4f-857d-0822d35dec21	281ac0c9-d22b-4ece-895a-9d2c86a8f315	GIFT_RECEIVED	You received a gift	🎬 H!M sent you Galaxy	{"txId": "25a8efa8-edab-4eee-838b-8f3941f33ec6", "giftId": "galaxy", "giftName": "Galaxy", "streamId": "b524fe7d-3e1a-42cc-9ab8-6c873b378fe0", "diamondValue": 1000000, "senderUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "senderUsername": "BigDaddy", "recipientUserId": "281ac0c9-d22b-4ece-895a-9d2c86a8f315", "senderDisplayName": "🎬 H!M"}	2026-04-01 23:21:16.816	\N	b524fe7d-3e1a-42cc-9ab8-6c873b378fe0	gift:25a8efa8-edab-4eee-838b-8f3941f33ec6
775b6893-7443-4889-8ad3-0e4284ec938d	281ac0c9-d22b-4ece-895a-9d2c86a8f315	GIFT_RECEIVED	Gift received	BigDaddy sent you Galaxy	{"giftId": "galaxy", "coinCost": 1000000, "giftName": "Galaxy", "giftTxId": "25a8efa8-edab-4eee-838b-8f3941f33ec6", "streamId": "b524fe7d-3e1a-42cc-9ab8-6c873b378fe0", "createdAt": "2026-04-01T23:21:16.759Z", "diamondValue": 1000000, "senderUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "senderUsername": "BigDaddy", "recipientUserId": "281ac0c9-d22b-4ece-895a-9d2c86a8f315", "recipientUsername": "ChiDotGo"}	2026-04-01 23:21:17.083	\N	b524fe7d-3e1a-42cc-9ab8-6c873b378fe0	gift_tx:25a8efa8-edab-4eee-838b-8f3941f33ec6
5ac68518-aecb-4295-b39d-dc0d05f9ef7a	281ac0c9-d22b-4ece-895a-9d2c86a8f315	MILESTONE_REACHED	Milestone reached	You reached 9,000,000 diamonds earned!	{"userId": "281ac0c9-d22b-4ece-895a-9d2c86a8f315", "giftTxId": "25a8efa8-edab-4eee-838b-8f3941f33ec6", "username": "ChiDotGo", "createdAt": "2026-04-01T23:21:16.785Z", "achievedAt": "2026-04-01T23:21:16.759Z", "giverUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "milestoneId": "ca47babb-a0ba-4b80-a8c4-56100dba92d7", "giverUsername": "BigDaddy", "milestoneAmount": 9000000}	2026-04-01 23:21:17.096	\N	\N	milestone:ca47babb-a0ba-4b80-a8c4-56100dba92d7
a45c79f7-150e-4d03-9f37-c08f8e0ba5f6	281ac0c9-d22b-4ece-895a-9d2c86a8f315	MILESTONE_REACHED	Diamond milestone reached	🎬 H!M helped you reach 10,000,000 diamonds	{"giftId": "galaxy", "userId": "281ac0c9-d22b-4ece-895a-9d2c86a8f315", "giftTxId": "7ab320f2-d974-41a3-a3c4-49eb127ff21e", "achievedAt": "2026-04-01T23:21:24.438Z", "giverUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "giverUsername": "BigDaddy", "milestoneAmount": 10000000, "giverDisplayName": "🎬 H!M"}	2026-04-01 23:21:24.474	\N	b524fe7d-3e1a-42cc-9ab8-6c873b378fe0	milestone:281ac0c9-d22b-4ece-895a-9d2c86a8f315:10000000:7ab320f2-d974-41a3-a3c4-49eb127ff21e
c1dacd81-292f-4f14-9067-ab594b36b148	281ac0c9-d22b-4ece-895a-9d2c86a8f315	GIFT_RECEIVED	You received a gift	🎬 H!M sent you Galaxy	{"txId": "7ab320f2-d974-41a3-a3c4-49eb127ff21e", "giftId": "galaxy", "giftName": "Galaxy", "streamId": "b524fe7d-3e1a-42cc-9ab8-6c873b378fe0", "diamondValue": 1000000, "senderUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "senderUsername": "BigDaddy", "recipientUserId": "281ac0c9-d22b-4ece-895a-9d2c86a8f315", "senderDisplayName": "🎬 H!M"}	2026-04-01 23:21:24.493	\N	b524fe7d-3e1a-42cc-9ab8-6c873b378fe0	gift:7ab320f2-d974-41a3-a3c4-49eb127ff21e
dda7a8ef-e662-4617-8ee1-de723be3a963	281ac0c9-d22b-4ece-895a-9d2c86a8f315	GIFT_RECEIVED	Gift received	BigDaddy sent you Galaxy	{"giftId": "galaxy", "coinCost": 1000000, "giftName": "Galaxy", "giftTxId": "7ab320f2-d974-41a3-a3c4-49eb127ff21e", "streamId": "b524fe7d-3e1a-42cc-9ab8-6c873b378fe0", "createdAt": "2026-04-01T23:21:24.438Z", "diamondValue": 1000000, "senderUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "senderUsername": "BigDaddy", "recipientUserId": "281ac0c9-d22b-4ece-895a-9d2c86a8f315", "recipientUsername": "ChiDotGo"}	2026-04-01 23:21:27.082	\N	b524fe7d-3e1a-42cc-9ab8-6c873b378fe0	gift_tx:7ab320f2-d974-41a3-a3c4-49eb127ff21e
8f1a3d09-7456-4853-85ee-0879dde8c026	281ac0c9-d22b-4ece-895a-9d2c86a8f315	MILESTONE_REACHED	Milestone reached	You reached 10,000,000 diamonds earned!	{"userId": "281ac0c9-d22b-4ece-895a-9d2c86a8f315", "giftTxId": "7ab320f2-d974-41a3-a3c4-49eb127ff21e", "username": "ChiDotGo", "createdAt": "2026-04-01T23:21:24.463Z", "achievedAt": "2026-04-01T23:21:24.438Z", "giverUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "milestoneId": "ee790138-4891-4792-99a6-2b74e01dad30", "giverUsername": "BigDaddy", "milestoneAmount": 10000000}	2026-04-01 23:21:27.094	\N	\N	milestone:ee790138-4891-4792-99a6-2b74e01dad30
bcc07afe-bed6-4c32-a1cd-9f63bc47787c	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: My Live Stream	{"title": "My Live Stream", "streamId": "a1587cc4-753b-4449-ab03-823d0b214d7e", "startedAt": "2026-04-02T00:51:16.097Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-02 00:51:16.135	\N	a1587cc4-753b-4449-ab03-823d0b214d7e	stream-started:a1587cc4-753b-4449-ab03-823d0b214d7e
694cd75c-e3e1-4261-88e7-bc4acab768cb	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: My Live Stream	{"title": "My Live Stream", "streamId": "a1587cc4-753b-4449-ab03-823d0b214d7e", "startedAt": "2026-04-02T00:51:16.097Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-02 00:51:16.135	\N	a1587cc4-753b-4449-ab03-823d0b214d7e	stream-started:a1587cc4-753b-4449-ab03-823d0b214d7e
29c5b56b-5b36-4810-853f-30692121e3de	281ac0c9-d22b-4ece-895a-9d2c86a8f315	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: My Live Stream	{"title": "My Live Stream", "streamId": "a1587cc4-753b-4449-ab03-823d0b214d7e", "startedAt": "2026-04-02T00:51:16.097Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-02 00:51:16.135	\N	a1587cc4-753b-4449-ab03-823d0b214d7e	stream-started:a1587cc4-753b-4449-ab03-823d0b214d7e
f8ef9bce-2faf-4b4f-a29c-800cf0029b55	c5c904e8-da40-4458-b8bf-5c2cc97348b1	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: My Live Stream	{"title": "My Live Stream", "streamId": "a1587cc4-753b-4449-ab03-823d0b214d7e", "startedAt": "2026-04-02T00:51:16.097Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-02 00:51:16.135	\N	a1587cc4-753b-4449-ab03-823d0b214d7e	stream-started:a1587cc4-753b-4449-ab03-823d0b214d7e
7c72bec2-3e0d-450e-a1c1-129e3fe2f676	3961fabe-1345-4426-bd8a-ca0a5eac3aac	MILESTONE_REACHED	Diamond milestone reached	JamesConnor helped you reach 2,000,000 diamonds	{"giftId": "galaxy", "userId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "giftTxId": "d1666c09-3181-49aa-bbf3-b350521c6fd6", "achievedAt": "2026-04-02T00:52:51.607Z", "giverUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "giverUsername": "JamesConnor", "milestoneAmount": 2000000, "giverDisplayName": "JamesConnor"}	2026-04-02 00:52:51.667	\N	a1587cc4-753b-4449-ab03-823d0b214d7e	milestone:3961fabe-1345-4426-bd8a-ca0a5eac3aac:2000000:d1666c09-3181-49aa-bbf3-b350521c6fd6
57f77d14-56d1-4ad2-ab50-c4a9f42a364d	3961fabe-1345-4426-bd8a-ca0a5eac3aac	MILESTONE_REACHED	Diamond milestone reached	JamesConnor helped you reach 3,000,000 diamonds	{"giftId": "galaxy", "userId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "giftTxId": "d1666c09-3181-49aa-bbf3-b350521c6fd6", "achievedAt": "2026-04-02T00:52:51.607Z", "giverUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "giverUsername": "JamesConnor", "milestoneAmount": 3000000, "giverDisplayName": "JamesConnor"}	2026-04-02 00:52:51.682	\N	a1587cc4-753b-4449-ab03-823d0b214d7e	milestone:3961fabe-1345-4426-bd8a-ca0a5eac3aac:3000000:d1666c09-3181-49aa-bbf3-b350521c6fd6
50c26486-ceae-4cd0-a533-112172f0abcc	3961fabe-1345-4426-bd8a-ca0a5eac3aac	GIFT_RECEIVED	You received a gift	JamesConnor sent you Galaxy	{"txId": "d1666c09-3181-49aa-bbf3-b350521c6fd6", "giftId": "galaxy", "giftName": "Galaxy", "streamId": "a1587cc4-753b-4449-ab03-823d0b214d7e", "diamondValue": 1000000, "senderUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "senderUsername": "JamesConnor", "recipientUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "senderDisplayName": "JamesConnor"}	2026-04-02 00:52:51.698	\N	a1587cc4-753b-4449-ab03-823d0b214d7e	gift:d1666c09-3181-49aa-bbf3-b350521c6fd6
a609d7f5-fdfe-4b03-9e1d-3b90cbdef2b2	3961fabe-1345-4426-bd8a-ca0a5eac3aac	GIFT_RECEIVED	Gift received	JamesConnor sent you Galaxy	{"giftId": "galaxy", "coinCost": 1000000, "giftName": "Galaxy", "giftTxId": "d1666c09-3181-49aa-bbf3-b350521c6fd6", "streamId": "a1587cc4-753b-4449-ab03-823d0b214d7e", "createdAt": "2026-04-02T00:52:51.607Z", "diamondValue": 1000000, "senderUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "senderUsername": "JamesConnor", "recipientUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "recipientUsername": "BigDaddy"}	2026-04-02 00:52:55.813	\N	a1587cc4-753b-4449-ab03-823d0b214d7e	gift_tx:d1666c09-3181-49aa-bbf3-b350521c6fd6
05af8671-408d-40d7-a212-161375838906	3961fabe-1345-4426-bd8a-ca0a5eac3aac	MILESTONE_REACHED	Milestone reached	You reached 2,000,000 diamonds earned!	{"userId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "giftTxId": "d1666c09-3181-49aa-bbf3-b350521c6fd6", "username": "BigDaddy", "createdAt": "2026-04-02T00:52:51.635Z", "achievedAt": "2026-04-02T00:52:51.607Z", "giverUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "milestoneId": "cc4215bd-0cbc-4874-a074-0e79ad28e771", "giverUsername": "JamesConnor", "milestoneAmount": 2000000}	2026-04-02 00:52:55.827	\N	\N	milestone:cc4215bd-0cbc-4874-a074-0e79ad28e771
2bb1be55-dedb-42b2-b712-486f779b6462	3961fabe-1345-4426-bd8a-ca0a5eac3aac	MILESTONE_REACHED	Milestone reached	You reached 3,000,000 diamonds earned!	{"userId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "giftTxId": "d1666c09-3181-49aa-bbf3-b350521c6fd6", "username": "BigDaddy", "createdAt": "2026-04-02T00:52:51.640Z", "achievedAt": "2026-04-02T00:52:51.607Z", "giverUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "milestoneId": "f0418569-cd72-4f86-bf0e-9bb7015e2b6f", "giverUsername": "JamesConnor", "milestoneAmount": 3000000}	2026-04-02 00:52:55.834	\N	\N	milestone:f0418569-cd72-4f86-bf0e-9bb7015e2b6f
c68029d7-2b82-40ed-b133-14d588608f8e	3961fabe-1345-4426-bd8a-ca0a5eac3aac	STREAM_STARTED	JamesConnor is live now	JamesConnor started: My Live Stream	{"title": "My Live Stream", "streamId": "f3574df7-3c50-44f9-b908-b84420c75b48", "startedAt": "2026-04-02T01:43:52.952Z", "hostUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "visibility": "PUBLIC", "hostUsername": "JamesConnor", "hostAvatarUrl": null, "hostDisplayName": "JamesConnor"}	2026-04-02 01:43:52.992	\N	f3574df7-3c50-44f9-b908-b84420c75b48	stream-started:f3574df7-3c50-44f9-b908-b84420c75b48
a7d86a78-4b01-4a63-b552-5215f6d450d6	3961fabe-1345-4426-bd8a-ca0a5eac3aac	STREAM_STARTED	JamesConnor is live now	JamesConnor started: My Live Stream	{"title": "My Live Stream", "streamId": "96456357-7470-40d4-bb0d-957c49561d88", "startedAt": "2026-04-02T01:45:10.193Z", "hostUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "visibility": "PUBLIC", "hostUsername": "JamesConnor", "hostAvatarUrl": null, "hostDisplayName": "JamesConnor"}	2026-04-02 01:45:10.224	\N	96456357-7470-40d4-bb0d-957c49561d88	stream-started:96456357-7470-40d4-bb0d-957c49561d88
91988121-7ec8-4d4f-917c-c786fa335bb5	3961fabe-1345-4426-bd8a-ca0a5eac3aac	STREAM_STARTED	JamesConnor is live now	JamesConnor started: My Live Stream	{"title": "My Live Stream", "streamId": "02615b24-131a-4df4-953f-9802b3cd3047", "startedAt": "2026-04-02T02:01:20.579Z", "hostUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "visibility": "PUBLIC", "hostUsername": "JamesConnor", "hostAvatarUrl": null, "hostDisplayName": "JamesConnor"}	2026-04-02 02:01:20.615	\N	02615b24-131a-4df4-953f-9802b3cd3047	stream-started:02615b24-131a-4df4-953f-9802b3cd3047
2f97fc1d-65c1-43f4-a60f-31f8affb5f5c	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	JamesConnor is live now	JamesConnor started: My Live Stream	{"title": "My Live Stream", "streamId": "02615b24-131a-4df4-953f-9802b3cd3047", "startedAt": "2026-04-02T02:01:20.579Z", "hostUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "visibility": "PUBLIC", "hostUsername": "JamesConnor", "hostAvatarUrl": null, "hostDisplayName": "JamesConnor"}	2026-04-02 02:01:20.615	\N	02615b24-131a-4df4-953f-9802b3cd3047	stream-started:02615b24-131a-4df4-953f-9802b3cd3047
6e16b198-261e-4aec-9851-19a949f41cbb	3961fabe-1345-4426-bd8a-ca0a5eac3aac	STREAM_STARTED	JamesConnor is live now	JamesConnor started: My Live Stream	{"title": "My Live Stream", "streamId": "26952696-6533-46e8-933c-2b008248ff6f", "startedAt": "2026-04-02T03:16:15.266Z", "hostUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "visibility": "PUBLIC", "hostUsername": "JamesConnor", "hostAvatarUrl": null, "hostDisplayName": "JamesConnor"}	2026-04-02 03:16:15.299	\N	26952696-6533-46e8-933c-2b008248ff6f	stream-started:26952696-6533-46e8-933c-2b008248ff6f
e4622b74-cb18-472f-a514-919b48d17c7c	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	JamesConnor is live now	JamesConnor started: My Live Stream	{"title": "My Live Stream", "streamId": "26952696-6533-46e8-933c-2b008248ff6f", "startedAt": "2026-04-02T03:16:15.266Z", "hostUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "visibility": "PUBLIC", "hostUsername": "JamesConnor", "hostAvatarUrl": null, "hostDisplayName": "JamesConnor"}	2026-04-02 03:16:15.299	\N	26952696-6533-46e8-933c-2b008248ff6f	stream-started:26952696-6533-46e8-933c-2b008248ff6f
cac7559a-15d7-4cf8-8750-da5f9ed48461	3961fabe-1345-4426-bd8a-ca0a5eac3aac	STREAM_STARTED	JamesConnor is live now	JamesConnor started: My Live Stream	{"title": "My Live Stream", "streamId": "53725353-c8cb-40f3-941c-343cca5b8976", "startedAt": "2026-04-02T03:17:06.221Z", "hostUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "visibility": "PUBLIC", "hostUsername": "JamesConnor", "hostAvatarUrl": null, "hostDisplayName": "JamesConnor"}	2026-04-02 03:17:06.244	\N	53725353-c8cb-40f3-941c-343cca5b8976	stream-started:53725353-c8cb-40f3-941c-343cca5b8976
acfce9dd-595d-476a-8df2-b798c33c69dc	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	JamesConnor is live now	JamesConnor started: My Live Stream	{"title": "My Live Stream", "streamId": "53725353-c8cb-40f3-941c-343cca5b8976", "startedAt": "2026-04-02T03:17:06.221Z", "hostUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "visibility": "PUBLIC", "hostUsername": "JamesConnor", "hostAvatarUrl": null, "hostDisplayName": "JamesConnor"}	2026-04-02 03:17:06.244	\N	53725353-c8cb-40f3-941c-343cca5b8976	stream-started:53725353-c8cb-40f3-941c-343cca5b8976
ece59dc2-beba-495f-b8ab-16ae9d8cf402	3961fabe-1345-4426-bd8a-ca0a5eac3aac	STREAM_STARTED	JamesConnor is live now	JamesConnor started: My Live Stream	{"title": "My Live Stream", "streamId": "caa0abb9-6866-4ca0-b96f-884c19bb1e6b", "startedAt": "2026-04-02T04:49:15.742Z", "hostUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "visibility": "PUBLIC", "hostUsername": "JamesConnor", "hostAvatarUrl": null, "hostDisplayName": "JamesConnor"}	2026-04-02 04:49:15.772	\N	caa0abb9-6866-4ca0-b96f-884c19bb1e6b	stream-started:caa0abb9-6866-4ca0-b96f-884c19bb1e6b
5c50ffe4-29ba-4069-b86d-e0a344df93c4	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	JamesConnor is live now	JamesConnor started: My Live Stream	{"title": "My Live Stream", "streamId": "caa0abb9-6866-4ca0-b96f-884c19bb1e6b", "startedAt": "2026-04-02T04:49:15.742Z", "hostUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "visibility": "PUBLIC", "hostUsername": "JamesConnor", "hostAvatarUrl": null, "hostDisplayName": "JamesConnor"}	2026-04-02 04:49:15.772	\N	caa0abb9-6866-4ca0-b96f-884c19bb1e6b	stream-started:caa0abb9-6866-4ca0-b96f-884c19bb1e6b
1ac419c2-4698-4b91-b21b-a7fc69812f6b	3961fabe-1345-4426-bd8a-ca0a5eac3aac	STREAM_STARTED	JamesConnor is live now	JamesConnor started: My Live Stream	{"title": "My Live Stream", "streamId": "d4c944f1-c309-4ae5-975e-67659f876f87", "startedAt": "2026-04-02T05:26:33.413Z", "hostUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "visibility": "PUBLIC", "hostUsername": "JamesConnor", "hostAvatarUrl": null, "hostDisplayName": "JamesConnor"}	2026-04-02 05:26:33.443	\N	d4c944f1-c309-4ae5-975e-67659f876f87	stream-started:d4c944f1-c309-4ae5-975e-67659f876f87
15134971-9aad-4cfb-a88d-e08d281f7330	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	JamesConnor is live now	JamesConnor started: My Live Stream	{"title": "My Live Stream", "streamId": "d4c944f1-c309-4ae5-975e-67659f876f87", "startedAt": "2026-04-02T05:26:33.413Z", "hostUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "visibility": "PUBLIC", "hostUsername": "JamesConnor", "hostAvatarUrl": null, "hostDisplayName": "JamesConnor"}	2026-04-02 05:26:33.443	\N	d4c944f1-c309-4ae5-975e-67659f876f87	stream-started:d4c944f1-c309-4ae5-975e-67659f876f87
3d04314b-a53a-491f-8e95-fcdc5cd853b7	3961fabe-1345-4426-bd8a-ca0a5eac3aac	STREAM_STARTED	JamesConnor is live now	JamesConnor started: My Live Stream	{"title": "My Live Stream", "streamId": "a324b73d-282e-406c-8407-fafeb191cfb3", "startedAt": "2026-04-02T05:37:17.975Z", "hostUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "visibility": "PUBLIC", "hostUsername": "JamesConnor", "hostAvatarUrl": null, "hostDisplayName": "JamesConnor"}	2026-04-02 05:37:18.002	\N	a324b73d-282e-406c-8407-fafeb191cfb3	stream-started:a324b73d-282e-406c-8407-fafeb191cfb3
44971f69-75ab-444c-9e50-cade704dfff4	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	JamesConnor is live now	JamesConnor started: My Live Stream	{"title": "My Live Stream", "streamId": "a324b73d-282e-406c-8407-fafeb191cfb3", "startedAt": "2026-04-02T05:37:17.975Z", "hostUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "visibility": "PUBLIC", "hostUsername": "JamesConnor", "hostAvatarUrl": null, "hostDisplayName": "JamesConnor"}	2026-04-02 05:37:18.002	\N	a324b73d-282e-406c-8407-fafeb191cfb3	stream-started:a324b73d-282e-406c-8407-fafeb191cfb3
c88bd42d-eb66-4b86-8980-63ed3b837fb0	3961fabe-1345-4426-bd8a-ca0a5eac3aac	STREAM_STARTED	JamesConnor is live now	JamesConnor started: My Live Stream	{"title": "My Live Stream", "streamId": "16813a30-c789-445e-94f5-13b58c02b245", "startedAt": "2026-04-02T05:55:52.383Z", "hostUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "visibility": "PUBLIC", "hostUsername": "JamesConnor", "hostAvatarUrl": null, "hostDisplayName": "JamesConnor"}	2026-04-02 05:55:52.412	\N	16813a30-c789-445e-94f5-13b58c02b245	stream-started:16813a30-c789-445e-94f5-13b58c02b245
12489f27-c9eb-4ce4-bb38-3bab2731d5f5	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	JamesConnor is live now	JamesConnor started: My Live Stream	{"title": "My Live Stream", "streamId": "16813a30-c789-445e-94f5-13b58c02b245", "startedAt": "2026-04-02T05:55:52.383Z", "hostUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "visibility": "PUBLIC", "hostUsername": "JamesConnor", "hostAvatarUrl": null, "hostDisplayName": "JamesConnor"}	2026-04-02 05:55:52.412	\N	16813a30-c789-445e-94f5-13b58c02b245	stream-started:16813a30-c789-445e-94f5-13b58c02b245
67fdec60-ecac-4f33-afcd-09f4d5eb09bf	3961fabe-1345-4426-bd8a-ca0a5eac3aac	STREAM_STARTED	JamesConnor is live now	JamesConnor started: My Live Stream	{"title": "My Live Stream", "streamId": "63a3a45c-bfb5-4fc9-bd52-0443d45c7c6a", "startedAt": "2026-04-02T06:13:14.671Z", "hostUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "visibility": "PUBLIC", "hostUsername": "JamesConnor", "hostAvatarUrl": null, "hostDisplayName": "JamesConnor"}	2026-04-02 06:13:14.7	\N	63a3a45c-bfb5-4fc9-bd52-0443d45c7c6a	stream-started:63a3a45c-bfb5-4fc9-bd52-0443d45c7c6a
75caa44f-6496-435b-9e68-47a66a8c158d	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	JamesConnor is live now	JamesConnor started: My Live Stream	{"title": "My Live Stream", "streamId": "63a3a45c-bfb5-4fc9-bd52-0443d45c7c6a", "startedAt": "2026-04-02T06:13:14.671Z", "hostUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "visibility": "PUBLIC", "hostUsername": "JamesConnor", "hostAvatarUrl": null, "hostDisplayName": "JamesConnor"}	2026-04-02 06:13:14.7	\N	63a3a45c-bfb5-4fc9-bd52-0443d45c7c6a	stream-started:63a3a45c-bfb5-4fc9-bd52-0443d45c7c6a
604964e5-8121-49cf-ae8d-189da419beca	3961fabe-1345-4426-bd8a-ca0a5eac3aac	STREAM_STARTED	JamesConnor is live now	JamesConnor started: My Live Stream	{"title": "My Live Stream", "streamId": "67f6598c-24a7-4ec3-b926-6cc10daf0586", "startedAt": "2026-04-02T06:13:38.250Z", "hostUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "visibility": "PUBLIC", "hostUsername": "JamesConnor", "hostAvatarUrl": null, "hostDisplayName": "JamesConnor"}	2026-04-02 06:13:38.276	\N	67f6598c-24a7-4ec3-b926-6cc10daf0586	stream-started:67f6598c-24a7-4ec3-b926-6cc10daf0586
91b85981-758b-4d0e-9a00-8de6d7d95ebe	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	JamesConnor is live now	JamesConnor started: My Live Stream	{"title": "My Live Stream", "streamId": "67f6598c-24a7-4ec3-b926-6cc10daf0586", "startedAt": "2026-04-02T06:13:38.250Z", "hostUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "visibility": "PUBLIC", "hostUsername": "JamesConnor", "hostAvatarUrl": null, "hostDisplayName": "JamesConnor"}	2026-04-02 06:13:38.276	\N	67f6598c-24a7-4ec3-b926-6cc10daf0586	stream-started:67f6598c-24a7-4ec3-b926-6cc10daf0586
08ece8be-a16c-49c3-b036-f959e46e9e9c	3961fabe-1345-4426-bd8a-ca0a5eac3aac	STREAM_STARTED	JamesConnor is live now	JamesConnor started: My Live Stream	{"title": "My Live Stream", "streamId": "acde2759-a974-49ef-845d-3343abfa947b", "startedAt": "2026-04-02T06:41:08.126Z", "hostUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "visibility": "PUBLIC", "hostUsername": "JamesConnor", "hostAvatarUrl": null, "hostDisplayName": "JamesConnor"}	2026-04-02 06:41:08.154	\N	acde2759-a974-49ef-845d-3343abfa947b	stream-started:acde2759-a974-49ef-845d-3343abfa947b
cbfc9894-010d-4a98-ab2a-0994c7c27888	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	JamesConnor is live now	JamesConnor started: My Live Stream	{"title": "My Live Stream", "streamId": "acde2759-a974-49ef-845d-3343abfa947b", "startedAt": "2026-04-02T06:41:08.126Z", "hostUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "visibility": "PUBLIC", "hostUsername": "JamesConnor", "hostAvatarUrl": null, "hostDisplayName": "JamesConnor"}	2026-04-02 06:41:08.154	\N	acde2759-a974-49ef-845d-3343abfa947b	stream-started:acde2759-a974-49ef-845d-3343abfa947b
01206e56-1a5d-44b9-b19e-11fb61a291b5	3961fabe-1345-4426-bd8a-ca0a5eac3aac	STREAM_STARTED	JamesConnor is live now	JamesConnor started: My Live Stream	{"title": "My Live Stream", "streamId": "c0ee23c7-f6ae-46f8-9a98-7182e883a000", "startedAt": "2026-04-02T08:02:00.579Z", "hostUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "visibility": "PUBLIC", "hostUsername": "JamesConnor", "hostAvatarUrl": null, "hostDisplayName": "JamesConnor"}	2026-04-02 08:02:00.613	\N	c0ee23c7-f6ae-46f8-9a98-7182e883a000	stream-started:c0ee23c7-f6ae-46f8-9a98-7182e883a000
be359317-59ee-4a24-9888-995dc1678bde	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	JamesConnor is live now	JamesConnor started: My Live Stream	{"title": "My Live Stream", "streamId": "c0ee23c7-f6ae-46f8-9a98-7182e883a000", "startedAt": "2026-04-02T08:02:00.579Z", "hostUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "visibility": "PUBLIC", "hostUsername": "JamesConnor", "hostAvatarUrl": null, "hostDisplayName": "JamesConnor"}	2026-04-02 08:02:00.613	\N	c0ee23c7-f6ae-46f8-9a98-7182e883a000	stream-started:c0ee23c7-f6ae-46f8-9a98-7182e883a000
8982b0fb-59a3-4b5d-9a5e-eceaf8decee6	3961fabe-1345-4426-bd8a-ca0a5eac3aac	STREAM_STARTED	JamesConnor is live now	JamesConnor started: My Live Stream	{"title": "My Live Stream", "streamId": "fa770eba-c6d5-4379-a889-02d245470438", "startedAt": "2026-04-02T09:22:47.702Z", "hostUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "visibility": "PUBLIC", "hostUsername": "JamesConnor", "hostAvatarUrl": null, "hostDisplayName": "JamesConnor"}	2026-04-02 09:22:47.736	\N	fa770eba-c6d5-4379-a889-02d245470438	stream-started:fa770eba-c6d5-4379-a889-02d245470438
f21e2009-f409-4f74-ae1d-6e89334ba8ac	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	JamesConnor is live now	JamesConnor started: My Live Stream	{"title": "My Live Stream", "streamId": "fa770eba-c6d5-4379-a889-02d245470438", "startedAt": "2026-04-02T09:22:47.702Z", "hostUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "visibility": "PUBLIC", "hostUsername": "JamesConnor", "hostAvatarUrl": null, "hostDisplayName": "JamesConnor"}	2026-04-02 09:22:47.736	\N	fa770eba-c6d5-4379-a889-02d245470438	stream-started:fa770eba-c6d5-4379-a889-02d245470438
4cea55ff-1139-4c03-89d6-30e5331d4faf	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: My Live Stream	{"title": "My Live Stream", "streamId": "2d4e49c4-54c5-4f34-ac4c-97f86f7fb80f", "startedAt": "2026-04-02T20:28:32.980Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-02 20:28:33.01	\N	2d4e49c4-54c5-4f34-ac4c-97f86f7fb80f	stream-started:2d4e49c4-54c5-4f34-ac4c-97f86f7fb80f
8ebdc3e3-e558-4647-a7d1-04a67054fb36	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: My Live Stream	{"title": "My Live Stream", "streamId": "2d4e49c4-54c5-4f34-ac4c-97f86f7fb80f", "startedAt": "2026-04-02T20:28:32.980Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-02 20:28:33.01	\N	2d4e49c4-54c5-4f34-ac4c-97f86f7fb80f	stream-started:2d4e49c4-54c5-4f34-ac4c-97f86f7fb80f
9ce2cbfe-4e9e-4378-9693-1c7730bdb1b9	281ac0c9-d22b-4ece-895a-9d2c86a8f315	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: My Live Stream	{"title": "My Live Stream", "streamId": "2d4e49c4-54c5-4f34-ac4c-97f86f7fb80f", "startedAt": "2026-04-02T20:28:32.980Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-02 20:28:33.01	\N	2d4e49c4-54c5-4f34-ac4c-97f86f7fb80f	stream-started:2d4e49c4-54c5-4f34-ac4c-97f86f7fb80f
ce82acd0-ddf1-4ec4-9ecb-e93ad6a672fe	c5c904e8-da40-4458-b8bf-5c2cc97348b1	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: My Live Stream	{"title": "My Live Stream", "streamId": "2d4e49c4-54c5-4f34-ac4c-97f86f7fb80f", "startedAt": "2026-04-02T20:28:32.980Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-02 20:28:33.01	\N	2d4e49c4-54c5-4f34-ac4c-97f86f7fb80f	stream-started:2d4e49c4-54c5-4f34-ac4c-97f86f7fb80f
0417ab91-a4a4-478f-8a71-351094a9be6f	3961fabe-1345-4426-bd8a-ca0a5eac3aac	STREAM_STARTED	FrankSinatra is live now	FrankSinatra started: My Live Stream	{"title": "My Live Stream", "streamId": "0419c286-af86-4be5-91cf-4d57e8af21ed", "startedAt": "2026-04-02T20:29:07.799Z", "hostUserId": "e9134380-2da7-4a1e-bd2a-34398f85a6e5", "visibility": "PUBLIC", "hostUsername": "FrankSinatra", "hostAvatarUrl": null, "hostDisplayName": "FrankSinatra"}	2026-04-02 20:29:07.827	\N	0419c286-af86-4be5-91cf-4d57e8af21ed	stream-started:0419c286-af86-4be5-91cf-4d57e8af21ed
190eb852-3c02-46f1-90c7-4052debee9a6	3961fabe-1345-4426-bd8a-ca0a5eac3aac	STREAM_STARTED	FrankSinatra is live now	FrankSinatra started: My Live Stream	{"title": "My Live Stream", "streamId": "92851de4-b5ed-42de-9afb-6fb22306d1e1", "startedAt": "2026-04-02T21:15:39.648Z", "hostUserId": "e9134380-2da7-4a1e-bd2a-34398f85a6e5", "visibility": "PUBLIC", "hostUsername": "FrankSinatra", "hostAvatarUrl": null, "hostDisplayName": "FrankSinatra"}	2026-04-02 21:15:39.688	\N	92851de4-b5ed-42de-9afb-6fb22306d1e1	stream-started:92851de4-b5ed-42de-9afb-6fb22306d1e1
24c824a4-c375-4252-8e5a-e73d04daa154	3961fabe-1345-4426-bd8a-ca0a5eac3aac	STREAM_STARTED	JamesConnor is live now	JamesConnor started: My Live Stream	{"title": "My Live Stream", "streamId": "a35d4aab-2842-4d65-a959-d6084c335a15", "startedAt": "2026-04-02T21:38:46.413Z", "hostUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "visibility": "PUBLIC", "hostUsername": "JamesConnor", "hostAvatarUrl": null, "hostDisplayName": "JamesConnor"}	2026-04-02 21:38:46.444	\N	a35d4aab-2842-4d65-a959-d6084c335a15	stream-started:a35d4aab-2842-4d65-a959-d6084c335a15
8742eb40-0cfc-4f95-a2a3-eb65ae5ddf2e	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	JamesConnor is live now	JamesConnor started: My Live Stream	{"title": "My Live Stream", "streamId": "a35d4aab-2842-4d65-a959-d6084c335a15", "startedAt": "2026-04-02T21:38:46.413Z", "hostUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "visibility": "PUBLIC", "hostUsername": "JamesConnor", "hostAvatarUrl": null, "hostDisplayName": "JamesConnor"}	2026-04-02 21:38:46.444	\N	a35d4aab-2842-4d65-a959-d6084c335a15	stream-started:a35d4aab-2842-4d65-a959-d6084c335a15
afa42579-53ab-4392-a3a9-5f4518d67422	3961fabe-1345-4426-bd8a-ca0a5eac3aac	STREAM_STARTED	JamesConnor is live now	JamesConnor started: My Live Stream	{"title": "My Live Stream", "streamId": "f50c16f0-d9a9-42a9-84c9-06344237287c", "startedAt": "2026-04-02T21:40:53.528Z", "hostUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "visibility": "PUBLIC", "hostUsername": "JamesConnor", "hostAvatarUrl": null, "hostDisplayName": "JamesConnor"}	2026-04-02 21:40:53.558	\N	f50c16f0-d9a9-42a9-84c9-06344237287c	stream-started:f50c16f0-d9a9-42a9-84c9-06344237287c
5782d960-2204-40ec-8350-7eece967172c	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	JamesConnor is live now	JamesConnor started: My Live Stream	{"title": "My Live Stream", "streamId": "f50c16f0-d9a9-42a9-84c9-06344237287c", "startedAt": "2026-04-02T21:40:53.528Z", "hostUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "visibility": "PUBLIC", "hostUsername": "JamesConnor", "hostAvatarUrl": null, "hostDisplayName": "JamesConnor"}	2026-04-02 21:40:53.558	\N	f50c16f0-d9a9-42a9-84c9-06344237287c	stream-started:f50c16f0-d9a9-42a9-84c9-06344237287c
14e2e9a5-ca54-446a-b78d-6697f2139620	3961fabe-1345-4426-bd8a-ca0a5eac3aac	STREAM_STARTED	JamesConnor is live now	JamesConnor started: My Live Stream	{"title": "My Live Stream", "streamId": "d009276d-12d6-4cc2-9b13-66057b20f812", "startedAt": "2026-04-02T22:00:00.584Z", "hostUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "visibility": "PUBLIC", "hostUsername": "JamesConnor", "hostAvatarUrl": null, "hostDisplayName": "JamesConnor"}	2026-04-02 22:00:00.622	\N	d009276d-12d6-4cc2-9b13-66057b20f812	stream-started:d009276d-12d6-4cc2-9b13-66057b20f812
32ffddd4-d98e-4ef5-858c-a753ecfc5016	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	JamesConnor is live now	JamesConnor started: My Live Stream	{"title": "My Live Stream", "streamId": "d009276d-12d6-4cc2-9b13-66057b20f812", "startedAt": "2026-04-02T22:00:00.584Z", "hostUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "visibility": "PUBLIC", "hostUsername": "JamesConnor", "hostAvatarUrl": null, "hostDisplayName": "JamesConnor"}	2026-04-02 22:00:00.622	\N	d009276d-12d6-4cc2-9b13-66057b20f812	stream-started:d009276d-12d6-4cc2-9b13-66057b20f812
535bb38f-a011-499b-8687-008eced100ff	3961fabe-1345-4426-bd8a-ca0a5eac3aac	STREAM_STARTED	JamesConnor is live now	JamesConnor started: My Live Stream	{"title": "My Live Stream", "streamId": "77a6dee4-8367-44ed-8c3c-ce9e3a9f0d44", "startedAt": "2026-04-02T22:00:54.983Z", "hostUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "visibility": "PUBLIC", "hostUsername": "JamesConnor", "hostAvatarUrl": null, "hostDisplayName": "JamesConnor"}	2026-04-02 22:00:55.01	\N	77a6dee4-8367-44ed-8c3c-ce9e3a9f0d44	stream-started:77a6dee4-8367-44ed-8c3c-ce9e3a9f0d44
fda6dd45-73ce-469e-8b46-797e6b2d783b	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	JamesConnor is live now	JamesConnor started: My Live Stream	{"title": "My Live Stream", "streamId": "77a6dee4-8367-44ed-8c3c-ce9e3a9f0d44", "startedAt": "2026-04-02T22:00:54.983Z", "hostUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "visibility": "PUBLIC", "hostUsername": "JamesConnor", "hostAvatarUrl": null, "hostDisplayName": "JamesConnor"}	2026-04-02 22:00:55.01	\N	77a6dee4-8367-44ed-8c3c-ce9e3a9f0d44	stream-started:77a6dee4-8367-44ed-8c3c-ce9e3a9f0d44
ffe8bad7-37e0-44ed-9238-fdc967a84b79	3961fabe-1345-4426-bd8a-ca0a5eac3aac	STREAM_STARTED	JamesConnor is live now	JamesConnor started: My Live Stream	{"title": "My Live Stream", "streamId": "09b0ff8c-d177-437f-9895-622c4bd1b117", "startedAt": "2026-04-02T22:28:08.976Z", "hostUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "visibility": "PUBLIC", "hostUsername": "JamesConnor", "hostAvatarUrl": null, "hostDisplayName": "JamesConnor"}	2026-04-02 22:28:09.004	\N	09b0ff8c-d177-437f-9895-622c4bd1b117	stream-started:09b0ff8c-d177-437f-9895-622c4bd1b117
3dc92d95-8be0-49bf-b624-8e0d507de3db	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	JamesConnor is live now	JamesConnor started: My Live Stream	{"title": "My Live Stream", "streamId": "09b0ff8c-d177-437f-9895-622c4bd1b117", "startedAt": "2026-04-02T22:28:08.976Z", "hostUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "visibility": "PUBLIC", "hostUsername": "JamesConnor", "hostAvatarUrl": null, "hostDisplayName": "JamesConnor"}	2026-04-02 22:28:09.004	\N	09b0ff8c-d177-437f-9895-622c4bd1b117	stream-started:09b0ff8c-d177-437f-9895-622c4bd1b117
26015a5e-fc8f-4a2d-a8fd-ef146bbb97ab	3961fabe-1345-4426-bd8a-ca0a5eac3aac	STREAM_STARTED	JamesConnor is live now	JamesConnor started: My Live Stream	{"title": "My Live Stream", "streamId": "cc5dd290-ad46-40a3-bc08-19fee473d6a3", "startedAt": "2026-04-02T22:34:40.935Z", "hostUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "visibility": "PUBLIC", "hostUsername": "JamesConnor", "hostAvatarUrl": null, "hostDisplayName": "JamesConnor"}	2026-04-02 22:34:40.962	\N	cc5dd290-ad46-40a3-bc08-19fee473d6a3	stream-started:cc5dd290-ad46-40a3-bc08-19fee473d6a3
b495dcf5-cb56-4c5f-8a71-d33595f8b867	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	JamesConnor is live now	JamesConnor started: My Live Stream	{"title": "My Live Stream", "streamId": "cc5dd290-ad46-40a3-bc08-19fee473d6a3", "startedAt": "2026-04-02T22:34:40.935Z", "hostUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "visibility": "PUBLIC", "hostUsername": "JamesConnor", "hostAvatarUrl": null, "hostDisplayName": "JamesConnor"}	2026-04-02 22:34:40.962	\N	cc5dd290-ad46-40a3-bc08-19fee473d6a3	stream-started:cc5dd290-ad46-40a3-bc08-19fee473d6a3
cff94b79-0d80-4981-a312-b776521aeda3	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: My Live Stream	{"title": "My Live Stream", "streamId": "69ea0705-43cd-4173-bc2c-8e2377162b70", "startedAt": "2026-04-02T22:38:56.264Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-02 22:38:56.293	\N	69ea0705-43cd-4173-bc2c-8e2377162b70	stream-started:69ea0705-43cd-4173-bc2c-8e2377162b70
b2fa4e8f-60eb-4a9b-9503-cbefd2e69d27	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: My Live Stream	{"title": "My Live Stream", "streamId": "69ea0705-43cd-4173-bc2c-8e2377162b70", "startedAt": "2026-04-02T22:38:56.264Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-02 22:38:56.293	\N	69ea0705-43cd-4173-bc2c-8e2377162b70	stream-started:69ea0705-43cd-4173-bc2c-8e2377162b70
7866929d-a20a-4ebc-8805-b2d9b8d0e194	281ac0c9-d22b-4ece-895a-9d2c86a8f315	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: My Live Stream	{"title": "My Live Stream", "streamId": "69ea0705-43cd-4173-bc2c-8e2377162b70", "startedAt": "2026-04-02T22:38:56.264Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-02 22:38:56.293	\N	69ea0705-43cd-4173-bc2c-8e2377162b70	stream-started:69ea0705-43cd-4173-bc2c-8e2377162b70
7917ddd2-0673-4ef5-85c5-1636a4bfa482	c5c904e8-da40-4458-b8bf-5c2cc97348b1	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: My Live Stream	{"title": "My Live Stream", "streamId": "69ea0705-43cd-4173-bc2c-8e2377162b70", "startedAt": "2026-04-02T22:38:56.264Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-02 22:38:56.293	\N	69ea0705-43cd-4173-bc2c-8e2377162b70	stream-started:69ea0705-43cd-4173-bc2c-8e2377162b70
9788f43a-f3b2-4d65-ba8f-728cd1710730	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: My Live Stream	{"title": "My Live Stream", "streamId": "f398c85e-4dba-42e6-add2-ea305fcd0575", "startedAt": "2026-04-02T22:39:29.236Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-02 22:39:29.266	\N	f398c85e-4dba-42e6-add2-ea305fcd0575	stream-started:f398c85e-4dba-42e6-add2-ea305fcd0575
7b18ce0d-ab45-44c1-9743-a2f7dd259b1e	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: My Live Stream	{"title": "My Live Stream", "streamId": "f398c85e-4dba-42e6-add2-ea305fcd0575", "startedAt": "2026-04-02T22:39:29.236Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-02 22:39:29.266	\N	f398c85e-4dba-42e6-add2-ea305fcd0575	stream-started:f398c85e-4dba-42e6-add2-ea305fcd0575
c34fc6ab-9274-4bb8-a38b-28ea1d6653e4	281ac0c9-d22b-4ece-895a-9d2c86a8f315	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: My Live Stream	{"title": "My Live Stream", "streamId": "f398c85e-4dba-42e6-add2-ea305fcd0575", "startedAt": "2026-04-02T22:39:29.236Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-02 22:39:29.266	\N	f398c85e-4dba-42e6-add2-ea305fcd0575	stream-started:f398c85e-4dba-42e6-add2-ea305fcd0575
3c868b4c-3333-4808-b686-2bcc9db0ce0e	c5c904e8-da40-4458-b8bf-5c2cc97348b1	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: My Live Stream	{"title": "My Live Stream", "streamId": "f398c85e-4dba-42e6-add2-ea305fcd0575", "startedAt": "2026-04-02T22:39:29.236Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-02 22:39:29.266	\N	f398c85e-4dba-42e6-add2-ea305fcd0575	stream-started:f398c85e-4dba-42e6-add2-ea305fcd0575
c972fd3d-0870-4daf-9387-4cb9c091ed92	3961fabe-1345-4426-bd8a-ca0a5eac3aac	STREAM_STARTED	JamesConnor is live now	JamesConnor started: My Live Stream	{"title": "My Live Stream", "streamId": "e09120b6-e993-43fb-9a40-680e8654de4d", "startedAt": "2026-04-02T22:55:43.998Z", "hostUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "visibility": "PUBLIC", "hostUsername": "JamesConnor", "hostAvatarUrl": null, "hostDisplayName": "JamesConnor"}	2026-04-02 22:55:44.028	\N	e09120b6-e993-43fb-9a40-680e8654de4d	stream-started:e09120b6-e993-43fb-9a40-680e8654de4d
63218b4b-8c33-4ca3-854e-6f80ba170b15	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	JamesConnor is live now	JamesConnor started: My Live Stream	{"title": "My Live Stream", "streamId": "e09120b6-e993-43fb-9a40-680e8654de4d", "startedAt": "2026-04-02T22:55:43.998Z", "hostUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "visibility": "PUBLIC", "hostUsername": "JamesConnor", "hostAvatarUrl": null, "hostDisplayName": "JamesConnor"}	2026-04-02 22:55:44.028	\N	e09120b6-e993-43fb-9a40-680e8654de4d	stream-started:e09120b6-e993-43fb-9a40-680e8654de4d
5fe07083-043f-4230-9c37-6d74502513ed	3961fabe-1345-4426-bd8a-ca0a5eac3aac	STREAM_STARTED	JamesConnor is live now	JamesConnor started: My Live Stream	{"title": "My Live Stream", "streamId": "5ff4847f-a310-41e8-ac54-711d51db07dd", "startedAt": "2026-04-02T22:56:13.561Z", "hostUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "visibility": "PUBLIC", "hostUsername": "JamesConnor", "hostAvatarUrl": null, "hostDisplayName": "JamesConnor"}	2026-04-02 22:56:13.589	\N	5ff4847f-a310-41e8-ac54-711d51db07dd	stream-started:5ff4847f-a310-41e8-ac54-711d51db07dd
c698a8c1-5671-4668-b52c-739354774950	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	JamesConnor is live now	JamesConnor started: My Live Stream	{"title": "My Live Stream", "streamId": "5ff4847f-a310-41e8-ac54-711d51db07dd", "startedAt": "2026-04-02T22:56:13.561Z", "hostUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "visibility": "PUBLIC", "hostUsername": "JamesConnor", "hostAvatarUrl": null, "hostDisplayName": "JamesConnor"}	2026-04-02 22:56:13.589	\N	5ff4847f-a310-41e8-ac54-711d51db07dd	stream-started:5ff4847f-a310-41e8-ac54-711d51db07dd
5a68a22a-7897-46bc-b49d-87c53de695f1	3961fabe-1345-4426-bd8a-ca0a5eac3aac	STREAM_STARTED	JamesConnor is live now	JamesConnor started: My Live Stream	{"title": "My Live Stream", "streamId": "5e5ed126-17c9-4b3c-abc6-3a1f4862fc43", "startedAt": "2026-04-02T22:56:40.763Z", "hostUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "visibility": "PUBLIC", "hostUsername": "JamesConnor", "hostAvatarUrl": null, "hostDisplayName": "JamesConnor"}	2026-04-02 22:56:40.786	\N	5e5ed126-17c9-4b3c-abc6-3a1f4862fc43	stream-started:5e5ed126-17c9-4b3c-abc6-3a1f4862fc43
d84c98a7-3cf6-4a99-95ad-1e4e722706ae	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	JamesConnor is live now	JamesConnor started: My Live Stream	{"title": "My Live Stream", "streamId": "5e5ed126-17c9-4b3c-abc6-3a1f4862fc43", "startedAt": "2026-04-02T22:56:40.763Z", "hostUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "visibility": "PUBLIC", "hostUsername": "JamesConnor", "hostAvatarUrl": null, "hostDisplayName": "JamesConnor"}	2026-04-02 22:56:40.786	\N	5e5ed126-17c9-4b3c-abc6-3a1f4862fc43	stream-started:5e5ed126-17c9-4b3c-abc6-3a1f4862fc43
3d05c268-becc-4e0d-aada-ba9f10c8b021	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: My Live Stream	{"title": "My Live Stream", "streamId": "5778b4b4-bfc5-46db-8082-7ce78ff31a78", "startedAt": "2026-04-02T22:56:46.014Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-02 22:56:46.042	\N	5778b4b4-bfc5-46db-8082-7ce78ff31a78	stream-started:5778b4b4-bfc5-46db-8082-7ce78ff31a78
238c2f51-8a78-494b-8aba-ceee3971f2b0	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: My Live Stream	{"title": "My Live Stream", "streamId": "5778b4b4-bfc5-46db-8082-7ce78ff31a78", "startedAt": "2026-04-02T22:56:46.014Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-02 22:56:46.042	\N	5778b4b4-bfc5-46db-8082-7ce78ff31a78	stream-started:5778b4b4-bfc5-46db-8082-7ce78ff31a78
41a2f7a1-ba7a-4ada-8f72-ecb29d8f4cfd	281ac0c9-d22b-4ece-895a-9d2c86a8f315	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: My Live Stream	{"title": "My Live Stream", "streamId": "5778b4b4-bfc5-46db-8082-7ce78ff31a78", "startedAt": "2026-04-02T22:56:46.014Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-02 22:56:46.042	\N	5778b4b4-bfc5-46db-8082-7ce78ff31a78	stream-started:5778b4b4-bfc5-46db-8082-7ce78ff31a78
9dcc90c8-9276-4980-b47b-2f6dc9c9f278	c5c904e8-da40-4458-b8bf-5c2cc97348b1	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: My Live Stream	{"title": "My Live Stream", "streamId": "5778b4b4-bfc5-46db-8082-7ce78ff31a78", "startedAt": "2026-04-02T22:56:46.014Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-02 22:56:46.042	\N	5778b4b4-bfc5-46db-8082-7ce78ff31a78	stream-started:5778b4b4-bfc5-46db-8082-7ce78ff31a78
2f246be7-0e4d-44ef-b9c7-d77f5f712862	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: My Live Stream	{"title": "My Live Stream", "streamId": "d47d3d9f-ac85-4586-b09b-aba3dc40df91", "startedAt": "2026-04-02T22:57:43.743Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-02 22:57:43.766	\N	d47d3d9f-ac85-4586-b09b-aba3dc40df91	stream-started:d47d3d9f-ac85-4586-b09b-aba3dc40df91
a4860daf-4e20-4ba1-93a4-9fd555b874eb	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: My Live Stream	{"title": "My Live Stream", "streamId": "d47d3d9f-ac85-4586-b09b-aba3dc40df91", "startedAt": "2026-04-02T22:57:43.743Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-02 22:57:43.766	\N	d47d3d9f-ac85-4586-b09b-aba3dc40df91	stream-started:d47d3d9f-ac85-4586-b09b-aba3dc40df91
2e39fee7-e024-40b8-9a92-7ff8a7658dd9	281ac0c9-d22b-4ece-895a-9d2c86a8f315	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: My Live Stream	{"title": "My Live Stream", "streamId": "d47d3d9f-ac85-4586-b09b-aba3dc40df91", "startedAt": "2026-04-02T22:57:43.743Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-02 22:57:43.766	\N	d47d3d9f-ac85-4586-b09b-aba3dc40df91	stream-started:d47d3d9f-ac85-4586-b09b-aba3dc40df91
2382c04e-0004-465f-ba5f-9662bcd5e5dd	c5c904e8-da40-4458-b8bf-5c2cc97348b1	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: My Live Stream	{"title": "My Live Stream", "streamId": "d47d3d9f-ac85-4586-b09b-aba3dc40df91", "startedAt": "2026-04-02T22:57:43.743Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-02 22:57:43.766	\N	d47d3d9f-ac85-4586-b09b-aba3dc40df91	stream-started:d47d3d9f-ac85-4586-b09b-aba3dc40df91
fdd13a4a-67ee-4e21-8a97-42d4e606da4b	3961fabe-1345-4426-bd8a-ca0a5eac3aac	STREAM_STARTED	JamesConnor is live now	JamesConnor started: My Live Stream	{"title": "My Live Stream", "streamId": "97dd1700-f4f1-4f39-b36e-0c2e59037d29", "startedAt": "2026-04-03T01:33:36.792Z", "hostUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "visibility": "PUBLIC", "hostUsername": "JamesConnor", "hostAvatarUrl": null, "hostDisplayName": "JamesConnor"}	2026-04-03 01:33:36.822	\N	97dd1700-f4f1-4f39-b36e-0c2e59037d29	stream-started:97dd1700-f4f1-4f39-b36e-0c2e59037d29
a5f652cd-6121-4a79-9a46-3e4cf0a6942b	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	JamesConnor is live now	JamesConnor started: My Live Stream	{"title": "My Live Stream", "streamId": "97dd1700-f4f1-4f39-b36e-0c2e59037d29", "startedAt": "2026-04-03T01:33:36.792Z", "hostUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "visibility": "PUBLIC", "hostUsername": "JamesConnor", "hostAvatarUrl": null, "hostDisplayName": "JamesConnor"}	2026-04-03 01:33:36.822	\N	97dd1700-f4f1-4f39-b36e-0c2e59037d29	stream-started:97dd1700-f4f1-4f39-b36e-0c2e59037d29
fbd14457-ba27-481a-a7bd-62986e71aa85	3961fabe-1345-4426-bd8a-ca0a5eac3aac	STREAM_STARTED	JamesConnor is live now	JamesConnor started: My Live Stream	{"title": "My Live Stream", "streamId": "40a0a34e-b7a6-4086-84e9-32d5f8ad0cc3", "startedAt": "2026-04-03T01:35:52.528Z", "hostUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "visibility": "PUBLIC", "hostUsername": "JamesConnor", "hostAvatarUrl": null, "hostDisplayName": "JamesConnor"}	2026-04-03 01:35:52.565	\N	40a0a34e-b7a6-4086-84e9-32d5f8ad0cc3	stream-started:40a0a34e-b7a6-4086-84e9-32d5f8ad0cc3
08b40fb4-2127-4987-a360-a08767c62d12	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	JamesConnor is live now	JamesConnor started: My Live Stream	{"title": "My Live Stream", "streamId": "40a0a34e-b7a6-4086-84e9-32d5f8ad0cc3", "startedAt": "2026-04-03T01:35:52.528Z", "hostUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "visibility": "PUBLIC", "hostUsername": "JamesConnor", "hostAvatarUrl": null, "hostDisplayName": "JamesConnor"}	2026-04-03 01:35:52.565	\N	40a0a34e-b7a6-4086-84e9-32d5f8ad0cc3	stream-started:40a0a34e-b7a6-4086-84e9-32d5f8ad0cc3
959cac91-454f-4ca7-95c9-3d16395bdc8b	3961fabe-1345-4426-bd8a-ca0a5eac3aac	STREAM_STARTED	JamesConnor is live now	JamesConnor started: My Live Stream	{"title": "My Live Stream", "streamId": "ced55ebf-ceca-4ba3-9455-717e57d6ee14", "startedAt": "2026-04-03T02:07:06.367Z", "hostUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "visibility": "PUBLIC", "hostUsername": "JamesConnor", "hostAvatarUrl": null, "hostDisplayName": "JamesConnor"}	2026-04-03 02:07:06.4	\N	ced55ebf-ceca-4ba3-9455-717e57d6ee14	stream-started:ced55ebf-ceca-4ba3-9455-717e57d6ee14
f54df194-3f6a-4500-be0f-6f946f2887ba	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	JamesConnor is live now	JamesConnor started: My Live Stream	{"title": "My Live Stream", "streamId": "ced55ebf-ceca-4ba3-9455-717e57d6ee14", "startedAt": "2026-04-03T02:07:06.367Z", "hostUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "visibility": "PUBLIC", "hostUsername": "JamesConnor", "hostAvatarUrl": null, "hostDisplayName": "JamesConnor"}	2026-04-03 02:07:06.4	\N	ced55ebf-ceca-4ba3-9455-717e57d6ee14	stream-started:ced55ebf-ceca-4ba3-9455-717e57d6ee14
b0d4945e-17dc-418c-98d7-8d09e8b9f25b	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: My Live Stream	{"title": "My Live Stream", "streamId": "d80774e1-d6b5-4da7-841b-d3ff095b7ba8", "startedAt": "2026-04-03T02:08:04.024Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-03 02:08:04.049	\N	d80774e1-d6b5-4da7-841b-d3ff095b7ba8	stream-started:d80774e1-d6b5-4da7-841b-d3ff095b7ba8
b01dbb54-f71f-468b-88df-a24becc325db	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: My Live Stream	{"title": "My Live Stream", "streamId": "d80774e1-d6b5-4da7-841b-d3ff095b7ba8", "startedAt": "2026-04-03T02:08:04.024Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-03 02:08:04.049	\N	d80774e1-d6b5-4da7-841b-d3ff095b7ba8	stream-started:d80774e1-d6b5-4da7-841b-d3ff095b7ba8
fc0169f8-4729-4c12-9840-c9d1341c597d	281ac0c9-d22b-4ece-895a-9d2c86a8f315	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: My Live Stream	{"title": "My Live Stream", "streamId": "d80774e1-d6b5-4da7-841b-d3ff095b7ba8", "startedAt": "2026-04-03T02:08:04.024Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-03 02:08:04.049	\N	d80774e1-d6b5-4da7-841b-d3ff095b7ba8	stream-started:d80774e1-d6b5-4da7-841b-d3ff095b7ba8
feaf6da7-1e84-4e55-8bfc-1beb57b20992	c5c904e8-da40-4458-b8bf-5c2cc97348b1	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: My Live Stream	{"title": "My Live Stream", "streamId": "d80774e1-d6b5-4da7-841b-d3ff095b7ba8", "startedAt": "2026-04-03T02:08:04.024Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-03 02:08:04.049	\N	d80774e1-d6b5-4da7-841b-d3ff095b7ba8	stream-started:d80774e1-d6b5-4da7-841b-d3ff095b7ba8
3898e7b0-364b-424d-b788-a2e79c90d9ec	3961fabe-1345-4426-bd8a-ca0a5eac3aac	STREAM_STARTED	JamesConnor is live now	JamesConnor started: My Live Stream	{"title": "My Live Stream", "streamId": "6e4971ff-7e58-4c78-be5b-f7fd7b3d7373", "startedAt": "2026-04-03T02:54:31.061Z", "hostUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "visibility": "PUBLIC", "hostUsername": "JamesConnor", "hostAvatarUrl": null, "hostDisplayName": "JamesConnor"}	2026-04-03 02:54:31.094	\N	6e4971ff-7e58-4c78-be5b-f7fd7b3d7373	stream-started:6e4971ff-7e58-4c78-be5b-f7fd7b3d7373
a2d5fa36-6c94-47a2-9f59-9ce61dd69e91	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	JamesConnor is live now	JamesConnor started: My Live Stream	{"title": "My Live Stream", "streamId": "6e4971ff-7e58-4c78-be5b-f7fd7b3d7373", "startedAt": "2026-04-03T02:54:31.061Z", "hostUserId": "47d9c408-1a3c-46c1-aecf-6f1746615499", "visibility": "PUBLIC", "hostUsername": "JamesConnor", "hostAvatarUrl": null, "hostDisplayName": "JamesConnor"}	2026-04-03 02:54:31.094	\N	6e4971ff-7e58-4c78-be5b-f7fd7b3d7373	stream-started:6e4971ff-7e58-4c78-be5b-f7fd7b3d7373
0c62f57f-5240-45c1-8485-4ae39e78a5b8	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: My Live Stream	{"title": "My Live Stream", "streamId": "5300c527-4d0c-4d4a-87de-65872b40b423", "startedAt": "2026-04-04T04:06:39.313Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-04 04:06:39.349	\N	5300c527-4d0c-4d4a-87de-65872b40b423	stream-started:5300c527-4d0c-4d4a-87de-65872b40b423
fdc211ec-c9b6-4bc4-9c8a-3c86e8076553	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: My Live Stream	{"title": "My Live Stream", "streamId": "5300c527-4d0c-4d4a-87de-65872b40b423", "startedAt": "2026-04-04T04:06:39.313Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-04 04:06:39.349	\N	5300c527-4d0c-4d4a-87de-65872b40b423	stream-started:5300c527-4d0c-4d4a-87de-65872b40b423
7b055f0e-ee43-4511-9793-62a592e65906	281ac0c9-d22b-4ece-895a-9d2c86a8f315	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: My Live Stream	{"title": "My Live Stream", "streamId": "5300c527-4d0c-4d4a-87de-65872b40b423", "startedAt": "2026-04-04T04:06:39.313Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-04 04:06:39.349	\N	5300c527-4d0c-4d4a-87de-65872b40b423	stream-started:5300c527-4d0c-4d4a-87de-65872b40b423
1d54a1e7-c408-4098-98ff-561f4e6c5a82	c5c904e8-da40-4458-b8bf-5c2cc97348b1	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: My Live Stream	{"title": "My Live Stream", "streamId": "5300c527-4d0c-4d4a-87de-65872b40b423", "startedAt": "2026-04-04T04:06:39.313Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-04 04:06:39.349	\N	5300c527-4d0c-4d4a-87de-65872b40b423	stream-started:5300c527-4d0c-4d4a-87de-65872b40b423
989d3608-8106-4081-ba51-94f9be51251e	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: My Live Stream	{"title": "My Live Stream", "streamId": "aecbabc9-20a5-4860-9800-dec04c2a3be2", "startedAt": "2026-04-04T04:35:39.741Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-04 04:35:39.78	\N	aecbabc9-20a5-4860-9800-dec04c2a3be2	stream-started:aecbabc9-20a5-4860-9800-dec04c2a3be2
344379cb-d385-4492-8b6e-daa8fd85add5	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: My Live Stream	{"title": "My Live Stream", "streamId": "aecbabc9-20a5-4860-9800-dec04c2a3be2", "startedAt": "2026-04-04T04:35:39.741Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-04 04:35:39.78	\N	aecbabc9-20a5-4860-9800-dec04c2a3be2	stream-started:aecbabc9-20a5-4860-9800-dec04c2a3be2
f153f4bd-55a0-4188-8bab-478275c948fb	281ac0c9-d22b-4ece-895a-9d2c86a8f315	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: My Live Stream	{"title": "My Live Stream", "streamId": "aecbabc9-20a5-4860-9800-dec04c2a3be2", "startedAt": "2026-04-04T04:35:39.741Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-04 04:35:39.78	\N	aecbabc9-20a5-4860-9800-dec04c2a3be2	stream-started:aecbabc9-20a5-4860-9800-dec04c2a3be2
95511a97-8d41-47d1-9c87-0ea8843a08a2	c5c904e8-da40-4458-b8bf-5c2cc97348b1	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: My Live Stream	{"title": "My Live Stream", "streamId": "aecbabc9-20a5-4860-9800-dec04c2a3be2", "startedAt": "2026-04-04T04:35:39.741Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-04 04:35:39.78	\N	aecbabc9-20a5-4860-9800-dec04c2a3be2	stream-started:aecbabc9-20a5-4860-9800-dec04c2a3be2
2547aa6e-0894-4aa7-9c99-8f31207e8797	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: My Live Stream	{"title": "My Live Stream", "streamId": "f27bbc6e-ec14-42ca-9967-e0c59af47a35", "startedAt": "2026-04-04T04:55:27.246Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-04 04:55:27.275	\N	f27bbc6e-ec14-42ca-9967-e0c59af47a35	stream-started:f27bbc6e-ec14-42ca-9967-e0c59af47a35
3ac8f455-15b4-4f15-b215-4e3da598185c	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: My Live Stream	{"title": "My Live Stream", "streamId": "f27bbc6e-ec14-42ca-9967-e0c59af47a35", "startedAt": "2026-04-04T04:55:27.246Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-04 04:55:27.275	\N	f27bbc6e-ec14-42ca-9967-e0c59af47a35	stream-started:f27bbc6e-ec14-42ca-9967-e0c59af47a35
3eadac27-173a-4673-93d7-7e928e922a3b	281ac0c9-d22b-4ece-895a-9d2c86a8f315	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: My Live Stream	{"title": "My Live Stream", "streamId": "f27bbc6e-ec14-42ca-9967-e0c59af47a35", "startedAt": "2026-04-04T04:55:27.246Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-04 04:55:27.275	\N	f27bbc6e-ec14-42ca-9967-e0c59af47a35	stream-started:f27bbc6e-ec14-42ca-9967-e0c59af47a35
186bfa00-fde9-4b92-97ec-a3202c9c7a8b	c5c904e8-da40-4458-b8bf-5c2cc97348b1	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: My Live Stream	{"title": "My Live Stream", "streamId": "f27bbc6e-ec14-42ca-9967-e0c59af47a35", "startedAt": "2026-04-04T04:55:27.246Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-04 04:55:27.275	\N	f27bbc6e-ec14-42ca-9967-e0c59af47a35	stream-started:f27bbc6e-ec14-42ca-9967-e0c59af47a35
53d768ef-a5fb-4232-a156-d35199eed4f0	47d9c408-1a3c-46c1-aecf-6f1746615499	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: My Live Stream	{"title": "My Live Stream", "streamId": "d69a323a-014b-454b-b94e-84333754ff95", "startedAt": "2026-04-04T06:22:05.740Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-04 06:22:05.773	\N	d69a323a-014b-454b-b94e-84333754ff95	stream-started:d69a323a-014b-454b-b94e-84333754ff95
5a5fdce3-dbd9-4d7f-bad0-6913ef3945f7	9f70646e-c63e-4a08-a4fa-8786204bbf4e	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: My Live Stream	{"title": "My Live Stream", "streamId": "d69a323a-014b-454b-b94e-84333754ff95", "startedAt": "2026-04-04T06:22:05.740Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-04 06:22:05.773	\N	d69a323a-014b-454b-b94e-84333754ff95	stream-started:d69a323a-014b-454b-b94e-84333754ff95
38502c72-40e4-4861-9f43-69938e5c9967	281ac0c9-d22b-4ece-895a-9d2c86a8f315	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: My Live Stream	{"title": "My Live Stream", "streamId": "d69a323a-014b-454b-b94e-84333754ff95", "startedAt": "2026-04-04T06:22:05.740Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-04 06:22:05.773	\N	d69a323a-014b-454b-b94e-84333754ff95	stream-started:d69a323a-014b-454b-b94e-84333754ff95
4ae5dc88-078d-46a7-8998-5953b757ebae	c5c904e8-da40-4458-b8bf-5c2cc97348b1	STREAM_STARTED	🎬 H!M is live now	🎬 H!M started: My Live Stream	{"title": "My Live Stream", "streamId": "d69a323a-014b-454b-b94e-84333754ff95", "startedAt": "2026-04-04T06:22:05.740Z", "hostUserId": "3961fabe-1345-4426-bd8a-ca0a5eac3aac", "visibility": "PUBLIC", "hostUsername": "BigDaddy", "hostAvatarUrl": "/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png", "hostDisplayName": "🎬 H!M"}	2026-04-04 06:22:05.773	\N	d69a323a-014b-454b-b94e-84333754ff95	stream-started:d69a323a-014b-454b-b94e-84333754ff95
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: liveapp
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
d2cb750b-3761-4df2-9164-c5ed6a82adf7	84a32b8d4112c4ec9200cc14866f3c1412a378f4baa43f566dcb4c9bcb58c028	2026-03-29 03:45:29.710455+00	20260320190333_add_direct_messages	\N	\N	2026-03-29 03:45:29.603948+00	1
ebb7b006-51f1-48ac-bff3-1e9b7ab91b32	c9386d0a658d062490a8eb7d11446be514e3b117e665a0099b5de4c3149917b7	2026-03-29 03:45:28.243635+00	20260301000000_init	\N	\N	2026-03-29 03:45:28.092887+00	1
cfccb355-d1a9-4d65-afef-d615f333fbd5	bc048fead9f3da84775b35633b4ecd79c94e88810f8d14d0be1663b0d22541f4	2026-03-29 03:45:29.331928+00	20260310170000_profile_wifw_username_publicid	\N	\N	2026-03-29 03:45:29.303849+00	1
30368cec-f912-4536-ba86-394aa4618a48	d672853aee6c9dad6e584b28e655901fc0669730c38b3c8fd45270809113ba6e	2026-03-29 03:45:28.350908+00	20260301003000_phase4_schedule_milestones	\N	\N	2026-03-29 03:45:28.24884+00	1
360e7e7f-518f-40fb-a4de-1ea4131c65fb	c1d23b85201a5ef287a8a16f1e24e2d5120d637337e9bfce23d9b5887b7994c8	2026-03-29 03:45:28.459906+00	20260301020000_phase5_streams_presence	\N	\N	2026-03-29 03:45:28.356355+00	1
1c61cd2e-acc2-4c06-b1ec-a37bcf5a7da9	95f407e2ff8ac93d8edbc017b00cf3a1420934ee9488068e27d10ee94a0da3a2	2026-03-29 03:45:28.488425+00	20260301023000_phase6_video_metadata	\N	\N	2026-03-29 03:45:28.464707+00	1
fd9dd493-a74a-435b-869d-00b15a58aa0c	70a3bd74af5c72107cb9e25c66efaf6f7bac3da2dc09531018e911c4b0968a82	2026-03-29 03:45:29.379789+00	20260311162000_phase14_favorites	\N	\N	2026-03-29 03:45:29.336857+00	1
843d10b0-3224-4958-a0af-c9082fcbf4d0	e215e3360dcbe0eec0947c772bc9a14e181c30ebe8ff3b889d2b1ba8b9912b4e	2026-03-29 03:45:28.548537+00	20260301030000_phase7_chat_messages	\N	\N	2026-03-29 03:45:28.493168+00	1
acccfd1f-4f09-4262-a6d4-35ea6fa17a33	d700525674315b09349d0210fc870902c26475abf8c305c0e5cb58533f2e68b6	2026-03-29 03:45:28.590146+00	20260301103000_phase7_chat_messages	\N	\N	2026-03-29 03:45:28.554012+00	1
8816192e-f939-4deb-b35a-b99d96964e47	4fc0dae6fe2c33d9618917d913de1846d39baacd9039a255438f0c33c9125a99	2026-04-02 00:18:50.870909+00	20260402001850_add_stream_goal	\N	\N	2026-04-02 00:18:50.856233+00	1
852ca6ba-974d-42c6-bd08-9c58ff13b941	85af5cb973638abed6282775c1bb71edbf815c94ae7985f37d8dddeef43a3583	2026-03-29 03:45:28.702914+00	20260301105709_phase8_roles_moderation	\N	\N	2026-03-29 03:45:28.59497+00	1
f246c7a4-ecb4-40f3-a374-7d031f9801b3	d85073a76cb750c252205d76547a8e194564de22eaecdc0d40ba43c289e0a668	2026-03-29 03:45:29.43347+00	20260317000000_baseline_sync	\N	\N	2026-03-29 03:45:29.384949+00	1
44b8ace8-56ae-4730-b8ce-b156343f4d26	7ee9ecd09379b6b29729b2a070656c6672bb3676e7449f95fafc7a182a66c9e4	2026-03-29 03:45:28.853918+00	20260301160000_phase9_economy	\N	\N	2026-03-29 03:45:28.707333+00	1
5c96fc99-acfb-49ef-882a-6879fe43ae57	8e0745f48bd8a19f70c9ca9c69aa3ca5a98a5e3516f92c96b80aac5378376559	2026-03-29 03:45:28.952873+00	20260301180000_phase10_battles	\N	\N	2026-03-29 03:45:28.859174+00	1
a60d16c6-31d1-4ec9-a23c-31c09a634229	a01e4e70156b80b29124b46ad6c7aaa55ea029a7ef1e4d72e9b9e356a66c668f	2026-03-29 03:45:29.733682+00	20260320191229_make_streamid_optional	\N	\N	2026-03-29 03:45:29.715839+00	1
47b13bea-4cd3-4059-86a1-d617aaa3cd65	aa34c4e87cff26924e010617d83585880e11283fa1bf90e2bcd3d330d994f737	2026-03-29 03:45:29.109367+00	20260301180000_phase8_roles_moderation	\N	\N	2026-03-29 03:45:28.957886+00	1
a2d67d48-e45b-4a0e-baae-7c9cd78fbbcb	8261840631e79dc9d50c276195712594640af766bba4b87e237a21afc0da2d95	2026-03-29 03:45:29.454855+00	20260317000001_add_2fa_logic	\N	\N	2026-03-29 03:45:29.439145+00	1
e59b8aaa-e25d-47da-93ba-984ed568fa8b	9657e12bd2ddcb976048c041aca162f39fcb9d42155ca387148dcb8958592aff	2026-03-29 03:45:29.168365+00	20260302053344_phase12_notifications	\N	\N	2026-03-29 03:45:29.113693+00	1
36362899-ce0c-43d7-b2b1-069c6c7dff69	6e7520d25c90da66ffe4b2b347add391b45e0f14ea867cc8a1f65b173237e331	2026-03-29 03:45:29.25693+00	20260302071247_phase13_payments	\N	\N	2026-03-29 03:45:29.172652+00	1
1199967f-c18b-4664-bd91-6000fc3d6d81	fcd3eaa4da7e34070b192fc5ea1110c333eed80f543a1d8f5ae59f2bba5f2353	2026-03-29 03:45:29.298523+00	20260302081755_phase13_2_iap_foundation	\N	\N	2026-03-29 03:45:29.261519+00	1
a0a8801b-258d-43ed-a675-03590b7c6df3	9f409bcb494b860502d7787bfedf6474dcc716acf6d2a6e36d223b83d1d1d40f	2026-03-29 03:45:29.474459+00	20260318052754_add_2fa_backup_codes	\N	\N	2026-03-29 03:45:29.459725+00	1
31daea4e-2b62-4386-8517-414030d48442	62cf8f815e05ceab3d70a6d08c892cf6ee05e6fe09e341892420c1a39d1a1e50	2026-03-29 03:45:29.944469+00	20260326010000_push_device_tokens	\N	\N	2026-03-29 03:45:29.884816+00	1
ed50d347-f595-442e-a444-8ec2974fe2c6	050980c81d1b144c3f69ee2152c605dc06fc35dcccfce7f921aeaddb49c4132d	2026-03-29 03:45:29.538499+00	20260318060945_enable_cascade_deletion	\N	\N	2026-03-29 03:45:29.480123+00	1
f45a9cf4-ca17-4a10-8d49-2d84bf401348	e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855	2026-03-29 03:45:29.750916+00	20260322000000_resolve_drift	\N	\N	2026-03-29 03:45:29.739138+00	1
46b95472-1350-42a0-903c-b1b173a555bc	bcb03bd31ce9a3c7d07d22e29669e07120159075da74a59718eedfd6d84823aa	2026-03-29 03:45:29.570693+00	20260318064316_add_user_blocks	\N	\N	2026-03-29 03:45:29.542637+00	1
093aebbf-887d-4b7c-ab1d-feb96f44e774	d423285d5b0d136313b3a4f443dda30165d8a770ba66f175a0dcb392d814b9fb	2026-03-29 03:45:29.598934+00	20260319143805_add_participant_composite_index	\N	\N	2026-03-29 03:45:29.575769+00	1
ddf2ee64-ff46-4ccb-b678-3f23be25d81a	0daef7e4be28b931aeb03ded1251e34e0f13d3267388ccb7ac5079f5c4fd057b	2026-03-29 03:45:29.836932+00	20260322083024_add_payout_economy	\N	\N	2026-03-29 03:45:29.756157+00	1
7cba1c0f-8bbb-44b7-9e83-669e785fcd25	1c041806f8c8db0cdce88b2477a69d32bcb9b121ddb3e906e9f6f6bf842605ef	2026-03-29 03:45:29.965652+00	20260326211852_push_device_tokens	\N	\N	2026-03-29 03:45:29.95005+00	1
8ecb390f-4e82-41a8-8428-f0cd8e26987c	2d1a8d79008db893b38923d5aaf0a4c629495d5727135f173202b355941002b7	2026-03-29 03:45:29.857825+00	20260324033607_add_stream_color	\N	\N	2026-03-29 03:45:29.841994+00	1
8ae1d1a0-4a42-4839-ac58-4c15c543412c	77dfbcdda1ae9236392471b6af17d25fe785278a8b4b61c08f44572cea9d8b28	2026-03-29 03:45:29.879654+00	20260326000000_notification_preferences	\N	\N	2026-03-29 03:45:29.863016+00	1
73c1aadb-076e-4e2e-ab84-621a7f50b72a	caf72a0daf1914e79fa3dc33744324d48d28e2419669032b91dfa09b9d7e0047	\N	20260403120000_add_dev_coin_package_fields	A migration failed to apply. New migrations cannot be applied before the error is recovered from. Read more about how to resolve migration issues in a production database: https://pris.ly/d/migrate-resolve\n\nMigration name: 20260403120000_add_dev_coin_package_fields\n\nDatabase error code: 42701\n\nDatabase error:\nERROR: column "for_dev_use" of relation "coin_packages" already exists\n\nDbError { severity: "ERROR", parsed_severity: Some(Error), code: SqlState(E42701), message: "column \\"for_dev_use\\" of relation \\"coin_packages\\" already exists", detail: None, hint: None, position: None, where_: None, schema: None, table: None, column: None, datatype: None, constraint: None, file: Some("tablecmds.c"), line: Some(7347), routine: Some("check_for_column_name_collision") }\n\n   0: sql_schema_connector::apply_migration::apply_script\n           with migration_name="20260403120000_add_dev_coin_package_fields"\n             at schema-engine/connectors/sql-schema-connector/src/apply_migration.rs:113\n   1: schema_commands::commands::apply_migrations::Applying migration\n           with migration_name="20260403120000_add_dev_coin_package_fields"\n             at schema-engine/commands/src/commands/apply_migrations.rs:95\n   2: schema_core::state::ApplyMigrations\n             at schema-engine/core/src/state.rs:260	2026-04-03 09:17:08.561077+00	2026-04-03 08:59:39.573973+00	0
c7596d9c-fe70-42d1-b841-5f8e7edd778d	caf72a0daf1914e79fa3dc33744324d48d28e2419669032b91dfa09b9d7e0047	2026-04-03 09:17:08.566504+00	20260403120000_add_dev_coin_package_fields		\N	2026-04-03 09:17:08.566504+00	0
315c40df-377a-4fb0-ad1d-3193c31be92c	dbb3078a4d67385dfbfe4f4a5c359a7d56d9f6d58a715ce4124c6d23c01ef46a	2026-04-04 03:53:17.358301+00	20260404000100_add_profile_badge_fields		\N	2026-04-04 03:53:17.358301+00	0
64baf2e6-6e77-4bc2-8052-7889a14dd71d	8457583fbdd523e2f8a486eb36c932ef1cd813b398432ab11f405979119957ce	2026-04-03 12:34:27.839704+00	20260403143000_add_coin_package_presentation_fields	\N	\N	2026-04-03 12:34:27.827252+00	1
\.


--
-- Data for Name: battle_contributions; Type: TABLE DATA; Schema: public; Owner: liveapp
--

COPY public.battle_contributions (id, battle_id, gift_tx_id, sender_user_id, recipient_user_id, diamond_value, created_at) FROM stdin;
\.


--
-- Data for Name: battles; Type: TABLE DATA; Schema: public; Owner: liveapp
--

COPY public.battles (id, stream_id, host_user_id, opponent_user_id, winner_user_id, status, duration_seconds, host_score, opponent_score, created_at, updated_at, started_at, ends_at, ended_at) FROM stdin;
\.


--
-- Data for Name: chat_messages; Type: TABLE DATA; Schema: public; Owner: liveapp
--

COPY public.chat_messages (id, stream_id, user_id, text, reply_to_message_id, badges_json, created_at) FROM stdin;
6f66a2ec-4f49-4b1f-96a9-c46b58f6084d	f95d9d98-2a21-4211-bda1-11573a7c3af5	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Viguficiccjc	\N	null	2026-03-29 09:22:38.76
55acc490-8dd3-4294-89df-8b2791511e5e	02a9d097-1bce-479f-b4e3-a2e941c55369	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Fudbfhr	\N	null	2026-03-30 01:50:14.292
4c05127d-e09f-4b09-ad9f-3f71681e21b0	02a9d097-1bce-479f-b4e3-a2e941c55369	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Fjieiwknfjckwke	\N	null	2026-03-30 01:50:22.907
18e2c317-31c2-4c34-8278-fd69194398ad	ca347a9f-b6d8-498e-a455-5804fd34f781	281ac0c9-d22b-4ece-895a-9d2c86a8f315	Yooo	\N	null	2026-04-01 09:10:29.597
a8367130-2709-4998-8263-d6c5cac6fbb2	ca347a9f-b6d8-498e-a455-5804fd34f781	281ac0c9-d22b-4ece-895a-9d2c86a8f315	Yes	\N	null	2026-04-01 09:10:35.097
429de4a3-5ded-4f3e-b8f0-e66511df874f	ca347a9f-b6d8-498e-a455-5804fd34f781	281ac0c9-d22b-4ece-895a-9d2c86a8f315	Naw	\N	null	2026-04-01 09:11:38.931
99ee099d-05a5-4812-a326-2f325b860088	e7c18482-912b-4e3d-936b-ce153022829e	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Yea	\N	null	2026-04-01 09:12:35.766
866dcd2a-8c68-44f9-a30b-742da0b91694	e7c18482-912b-4e3d-936b-ce153022829e	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Ok the guest box broke	\N	null	2026-04-01 09:12:45.637
a27bf7a2-34a5-4412-be15-16e1d5fa7038	e7c18482-912b-4e3d-936b-ce153022829e	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Flip cam	\N	null	2026-04-01 09:13:12.567
640ead80-4b24-4841-bfa4-c37d1d0c0ca0	e7c18482-912b-4e3d-936b-ce153022829e	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Point the cam at a light	\N	null	2026-04-01 09:13:50.271
a9e0a6c4-9170-4e28-bee4-394ff81ddde4	e7c18482-912b-4e3d-936b-ce153022829e	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Ok turn cam off	\N	null	2026-04-01 09:14:11.546
e7a08d28-7f69-498d-8238-b7c8f29a8b38	e7c18482-912b-4e3d-936b-ce153022829e	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Ok now mute then speak	\N	null	2026-04-01 09:14:34.494
3d341aef-fdc8-41c5-b81d-880f0d1ff2a0	e7c18482-912b-4e3d-936b-ce153022829e	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Ok	\N	null	2026-04-01 09:14:48.559
657b0ce0-068b-4956-8ee4-343fc84a1aa7	e7c18482-912b-4e3d-936b-ce153022829e	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Unmute	\N	null	2026-04-01 09:14:52.334
f2086fd6-ad53-4ac9-a470-a57aef1233c2	e7c18482-912b-4e3d-936b-ce153022829e	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Turn cam on	\N	null	2026-04-01 09:14:55.352
7e8d7a58-c69c-4a22-bf13-baa9a3f09350	e7c18482-912b-4e3d-936b-ce153022829e	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Is the chat covering ya whole screen?	\N	null	2026-04-01 09:15:10.913
d6346e19-5fa8-4f08-bd9c-260d0924b9c2	e7c18482-912b-4e3d-936b-ce153022829e	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Unmute	\N	null	2026-04-01 09:15:25.444
9d1ae8c0-528b-41da-a172-3a885be1a20c	e7c18482-912b-4e3d-936b-ce153022829e	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Ok gotta fix that	\N	null	2026-04-01 09:15:43.588
cf604601-14d6-449f-a4be-6ba8d7bdaa52	e7c18482-912b-4e3d-936b-ce153022829e	3961fabe-1345-4426-bd8a-ca0a5eac3aac	No 1 m	\N	null	2026-04-01 09:16:01.937
cce17aab-eaf3-4b54-8481-b685010d930b	e7c18482-912b-4e3d-936b-ce153022829e	3961fabe-1345-4426-bd8a-ca0a5eac3aac	But the count is off	\N	null	2026-04-01 09:16:06.267
7fe93de3-dd37-4b46-ad98-c97d2e52abdc	e7c18482-912b-4e3d-936b-ce153022829e	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Click it	\N	null	2026-04-01 09:16:08.578
95fd9373-fa00-4242-9ff1-e7e97a214913	e7c18482-912b-4e3d-936b-ce153022829e	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Click 3 dots and check dms	\N	null	2026-04-01 09:16:40.595
2e4f877d-6aaa-4eb3-8e4a-4eb76d193f25	e7c18482-912b-4e3d-936b-ce153022829e	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Yup	\N	null	2026-04-01 09:16:55.616
01fc1af2-bb53-43dd-b52a-3eda9a4ad441	e7c18482-912b-4e3d-936b-ce153022829e	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Click the likes at the top	\N	null	2026-04-01 09:17:14.989
c62d2204-ec79-4d02-9109-fddeaed79e7e	e7c18482-912b-4e3d-936b-ce153022829e	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Yup	\N	null	2026-04-01 09:17:29.542
7805d771-9cc7-446c-b751-d4ce5e02c68d	e7c18482-912b-4e3d-936b-ce153022829e	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Check dms	\N	null	2026-04-01 09:17:49.926
730af613-7225-4902-bef9-839ef518b6b4	e7c18482-912b-4e3d-936b-ce153022829e	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Yup	\N	null	2026-04-01 09:18:11.092
3fdd2739-ab4b-4fe8-a240-535afce4082d	e7c18482-912b-4e3d-936b-ce153022829e	3961fabe-1345-4426-bd8a-ca0a5eac3aac	One sec dont end	\N	null	2026-04-01 09:18:24.19
48eb598e-3ae9-4209-9ffb-9da1fedb50b1	e7c18482-912b-4e3d-936b-ce153022829e	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Ok gotta fix the share links	\N	null	2026-04-01 09:18:49.2
97b805b6-f2ea-4c60-9233-bc16d6235490	e7c18482-912b-4e3d-936b-ce153022829e	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Click the view count and watch it. Lemme know when u watching it	\N	null	2026-04-01 09:19:06.277
a074f427-1b74-4315-88ce-d395fc694ad7	e7c18482-912b-4e3d-936b-ce153022829e	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Top	\N	null	2026-04-01 09:19:23.133
278e6de6-2e4e-4620-b24d-6f5645cd1bdd	e7c18482-912b-4e3d-936b-ce153022829e	3961fabe-1345-4426-bd8a-ca0a5eac3aac	The eye ball	\N	null	2026-04-01 09:19:30.819
6c5c6a67-9004-4551-aeb4-3f61192b89e1	e7c18482-912b-4e3d-936b-ce153022829e	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Yup	\N	null	2026-04-01 09:19:43.51
f2579147-8153-416f-b17b-62272dd4ef27	e7c18482-912b-4e3d-936b-ce153022829e	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Its a real-time view count	\N	null	2026-04-01 09:19:50.074
d0d66d58-cbb0-4f38-ae43-57ee366f5217	e7c18482-912b-4e3d-936b-ce153022829e	3961fabe-1345-4426-bd8a-ca0a5eac3aac	And you'll always see me in the history tab on the view count	\N	null	2026-04-01 09:20:01.427
55bac627-33c5-48fd-8660-098587f18f7c	e7c18482-912b-4e3d-936b-ce153022829e	3961fabe-1345-4426-bd8a-ca0a5eac3aac	So it shows everyone who came in since you started the stream	\N	null	2026-04-01 09:20:12.397
1cf91585-3bd2-4cb9-a16e-906509cb07ef	e7c18482-912b-4e3d-936b-ce153022829e	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Watch the history tab when I leave	\N	null	2026-04-01 09:20:26.495
4764c000-78e0-4335-9451-33e674439259	e7c18482-912b-4e3d-936b-ce153022829e	9f70646e-c63e-4a08-a4fa-8786204bbf4e	hi	\N	null	2026-04-01 09:21:04.006
dc1d06bd-7c9a-4380-bae0-bf0a8644efee	e7c18482-912b-4e3d-936b-ce153022829e	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Click here profile and click 3 dots at top right then block	\N	null	2026-04-01 09:21:22.121
0c199eaf-bf3a-4b48-9d60-61e9625b7db0	e7c18482-912b-4e3d-936b-ce153022829e	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Yes	\N	null	2026-04-01 09:21:51.652
339b8a01-ca5f-40fa-a87d-422d29886d4f	e7c18482-912b-4e3d-936b-ce153022829e	3961fabe-1345-4426-bd8a-ca0a5eac3aac	She can no longer see you anywhere on the app	\N	null	2026-04-01 09:22:01.649
e76b221d-59bf-4f1e-8873-a6e929634f1d	e7c18482-912b-4e3d-936b-ce153022829e	3961fabe-1345-4426-bd8a-ca0a5eac3aac	End I'll show you. Come to my stream	\N	null	2026-04-01 09:22:17.201
c37b397d-996e-4ff0-b88c-50dd01498cf9	e7c18482-912b-4e3d-936b-ce153022829e	3961fabe-1345-4426-bd8a-ca0a5eac3aac	No	\N	null	2026-04-01 09:22:18.753
6997fe5c-c431-4b63-8346-3fad8d198f77	96233155-9731-4913-9dae-dfe7ba7269d7	281ac0c9-d22b-4ece-895a-9d2c86a8f315	Iight	\N	null	2026-04-01 09:22:55.955
66dcb27c-feb4-4343-a4b5-831b15222281	c54155e7-1039-4597-b336-3a7097a63284	281ac0c9-d22b-4ece-895a-9d2c86a8f315	Yea	\N	null	2026-04-01 09:23:38.741
2c03c294-ea39-48b9-b9d1-a4980cc5b587	c54155e7-1039-4597-b336-3a7097a63284	281ac0c9-d22b-4ece-895a-9d2c86a8f315	Good	\N	null	2026-04-01 09:24:04.715
5c8b2237-572e-423f-b083-c8192850d732	c54155e7-1039-4597-b336-3a7097a63284	281ac0c9-d22b-4ece-895a-9d2c86a8f315	Ima flirt hard asl then block 🤣🤣	\N	null	2026-04-01 09:24:32.245
09796575-1e59-48d0-ad0b-01897d50144a	c54155e7-1039-4597-b336-3a7097a63284	281ac0c9-d22b-4ece-895a-9d2c86a8f315	Aw yeah it's up	\N	null	2026-04-01 09:26:31.987
d820ec6b-eba4-406e-ab73-5668177a1fe0	c54155e7-1039-4597-b336-3a7097a63284	281ac0c9-d22b-4ece-895a-9d2c86a8f315	Yea	\N	null	2026-04-01 09:27:04.065
5f4a2602-c61d-4466-b74a-9ae68031b0e3	c54155e7-1039-4597-b336-3a7097a63284	281ac0c9-d22b-4ece-895a-9d2c86a8f315	Yea	\N	null	2026-04-01 09:27:11.294
cf521d45-cb8b-4d74-be29-e17513a0d4e0	c54155e7-1039-4597-b336-3a7097a63284	281ac0c9-d22b-4ece-895a-9d2c86a8f315	Stream goal didn't pop up	\N	null	2026-04-01 09:27:30.826
9bac2849-1ae8-4691-8e53-54d72b321608	c54155e7-1039-4597-b336-3a7097a63284	281ac0c9-d22b-4ece-895a-9d2c86a8f315	Aw ok bet	\N	null	2026-04-01 09:27:38.451
08a855e2-6dc2-4a8b-bcb4-b6a13fb0101d	c54155e7-1039-4597-b336-3a7097a63284	281ac0c9-d22b-4ece-895a-9d2c86a8f315	Yea I see it	\N	null	2026-04-01 09:27:58.357
45d32ad3-6399-4f75-87d4-8a2936f378ea	2d2e25f5-33bd-4adf-b69e-150d53b5b108	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Click 3 dots and set the stream goal	\N	null	2026-04-01 09:28:35.773
1ff31e1c-d528-4e87-913c-5647c5e90f72	2d2e25f5-33bd-4adf-b69e-150d53b5b108	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Click ya profile and at the bottom where it says scroll over to milestones	\N	null	2026-04-01 09:29:26.577
b32063cc-a050-4d49-8185-14ed2974d08c	2d2e25f5-33bd-4adf-b69e-150d53b5b108	3961fabe-1345-4426-bd8a-ca0a5eac3aac	See ua milestone	\N	null	2026-04-01 09:29:51.42
01a4cbc6-bae3-4c49-b972-5d84ecb80d8a	2d2e25f5-33bd-4adf-b69e-150d53b5b108	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Look at ya milestones again	\N	null	2026-04-01 09:30:20.974
2a40518b-c1b0-4848-aba5-25edd7978a7e	2d2e25f5-33bd-4adf-b69e-150d53b5b108	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Yea	\N	null	2026-04-01 09:30:43.031
e622c23e-fe1d-4350-9ebb-38d17a331c79	2d2e25f5-33bd-4adf-b69e-150d53b5b108	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Click my profile and go to my stream schedule	\N	null	2026-04-01 09:30:51.378
d1fe9e0b-657d-4a67-9c1c-f8ef5d5f7a37	2d2e25f5-33bd-4adf-b69e-150d53b5b108	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Yea and your goal will restart	\N	null	2026-04-01 09:31:07.381
4e7ad585-62c2-4edc-b419-44a772b874e7	2d2e25f5-33bd-4adf-b69e-150d53b5b108	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Automatically	\N	null	2026-04-01 09:31:10.634
6d267a78-1587-4485-8737-89e4b3fcf52c	2d2e25f5-33bd-4adf-b69e-150d53b5b108	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Yea unless you change it in the settings	\N	null	2026-04-01 09:31:25.524
c8f99b1d-9e9b-49ca-9582-3990e8390f62	2d2e25f5-33bd-4adf-b69e-150d53b5b108	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Milestones is only for milli snatch	\N	null	2026-04-01 09:31:43.328
4be6bdc5-e684-4ba5-959c-0228e427765e	2d2e25f5-33bd-4adf-b69e-150d53b5b108	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Just like tagged	\N	null	2026-04-01 09:31:53.732
de53c07f-efac-4a10-a5b5-dac302ce66ac	2d2e25f5-33bd-4adf-b69e-150d53b5b108	3961fabe-1345-4426-bd8a-ca0a5eac3aac	You see my stream schedule on my progile	\N	null	2026-04-01 09:32:10.343
72d32158-bea4-40bd-bd67-6d4ab0c55d0f	2d2e25f5-33bd-4adf-b69e-150d53b5b108	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Profile	\N	null	2026-04-01 09:32:16.175
c64945bf-e256-4efa-90c6-926cae228e7d	2d2e25f5-33bd-4adf-b69e-150d53b5b108	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Same area you scroll for milestones	\N	null	2026-04-01 09:32:39.747
262c2e47-b4b1-4d3b-afcf-8ff74eac63bf	2d2e25f5-33bd-4adf-b69e-150d53b5b108	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Scroll over	\N	null	2026-04-01 09:32:42.935
48bb2232-7d4f-4be5-a577-dc4fc7af8f90	2d2e25f5-33bd-4adf-b69e-150d53b5b108	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Notice in the dms you have one called saved messages or	\N	null	2026-04-01 09:33:38.029
6c923bf0-b643-4342-be04-c4a716d5abc4	2d2e25f5-33bd-4adf-b69e-150d53b5b108	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Those are like notes you can save for yourself	\N	null	2026-04-01 09:33:48.847
43cab16f-cddf-4cfc-9773-f705e186654e	2d2e25f5-33bd-4adf-b69e-150d53b5b108	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Click ya profile and send yourself a message	\N	null	2026-04-01 09:34:28.677
19410411-9208-4d3f-8658-dfd9ecc4cf58	2d2e25f5-33bd-4adf-b69e-150d53b5b108	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Yea	\N	null	2026-04-01 09:34:41.967
f72bd43b-c213-4e04-be6a-48d0c5d4bf14	2d2e25f5-33bd-4adf-b69e-150d53b5b108	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Those saved messages will always be at the top of ya dms	\N	null	2026-04-01 09:34:54.982
8de985d7-2fd4-4b6a-904d-7b19f038e7aa	2d2e25f5-33bd-4adf-b69e-150d53b5b108	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Bots wont wxist	\N	null	2026-04-01 09:35:10.236
a3a40d3b-170f-41ff-b9cf-f1305b42882a	2d2e25f5-33bd-4adf-b69e-150d53b5b108	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Gotta upload pic of ya id to create an account	\N	null	2026-04-01 09:35:21.976
afbfeb3c-78f9-428a-a221-fb7c4d6f24bf	2d2e25f5-33bd-4adf-b69e-150d53b5b108	3961fabe-1345-4426-bd8a-ca0a5eac3aac	And you can set ya dms to require a gift in the dms before they can dm you	\N	null	2026-04-01 09:35:42.949
b9e05094-6245-4ece-b023-b36511089fc1	2d2e25f5-33bd-4adf-b69e-150d53b5b108	3961fabe-1345-4426-bd8a-ca0a5eac3aac	You can choose any gift you want	\N	null	2026-04-01 09:35:58.755
c07599a5-e455-4092-b75e-cd8e5e38d8ec	2d2e25f5-33bd-4adf-b69e-150d53b5b108	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Send me 5 dms	\N	null	2026-04-01 09:36:16.771
873a4d6b-7172-4f96-b659-7c5663f143e6	2d2e25f5-33bd-4adf-b69e-150d53b5b108	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Yes	\N	null	2026-04-01 09:37:50.307
6a1c405d-0607-424a-9283-9a590a621867	2d2e25f5-33bd-4adf-b69e-150d53b5b108	3961fabe-1345-4426-bd8a-ca0a5eac3aac	And notice you cant see the pic at first	\N	null	2026-04-01 09:37:58.218
ef452883-e34f-41a5-9821-bd682ac3260f	2d2e25f5-33bd-4adf-b69e-150d53b5b108	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Gotta tap see image or whatever	\N	null	2026-04-01 09:38:04.884
4fb76204-9652-4e32-b5b7-0e4f321d0e6d	2d2e25f5-33bd-4adf-b69e-150d53b5b108	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Go back in	\N	null	2026-04-01 09:38:14.823
17cb09e3-8d79-4614-8761-58ce3efdc848	2d2e25f5-33bd-4adf-b69e-150d53b5b108	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Oof	\N	null	2026-04-01 09:38:26.574
d130143b-d4bc-4fe7-818b-dbb85a962b11	2d2e25f5-33bd-4adf-b69e-150d53b5b108	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Also broken	\N	null	2026-04-01 09:38:29.595
a2c296b7-544e-4072-a24b-41c1d7555669	2d2e25f5-33bd-4adf-b69e-150d53b5b108	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Ok thats all. Feel free to explore the app and test shit at yo free will	\N	null	2026-04-01 09:40:56.345
1aac94a2-be4a-4958-965f-d6d68b8f487b	2d2e25f5-33bd-4adf-b69e-150d53b5b108	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Once I fix the broken shit I'll send you thr new file	\N	null	2026-04-01 09:41:16.011
eb943fd7-3229-4fa5-abbf-d2ede8be7e22	2d2e25f5-33bd-4adf-b69e-150d53b5b108	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Appreciate you	\N	null	2026-04-01 09:41:27.151
73ece4d9-e02d-4e4a-94cb-3efcfb1af4a3	2d2e25f5-33bd-4adf-b69e-150d53b5b108	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Now go brag to lavii	\N	null	2026-04-01 09:41:37.346
82dc6154-ae70-4b64-8acd-2ea266944f08	2d2e25f5-33bd-4adf-b69e-150d53b5b108	3961fabe-1345-4426-bd8a-ca0a5eac3aac	🤣🤣🤣🤣	\N	null	2026-04-01 09:41:40.923
9159d866-0dfc-46be-ae4f-641abedfbeb5	2d2e25f5-33bd-4adf-b69e-150d53b5b108	3961fabe-1345-4426-bd8a-ca0a5eac3aac	U thr first person to ever test it	\N	null	2026-04-01 09:41:51.955
89aeb23a-bdf2-422b-b6c5-3372c54d3cd7	2d2e25f5-33bd-4adf-b69e-150d53b5b108	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Of course	\N	null	2026-04-01 09:42:00.842
ca20ee82-9f1a-4d44-b5ce-36fd792badef	2d2e25f5-33bd-4adf-b69e-150d53b5b108	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Fax	\N	null	2026-04-01 09:42:03.832
8f7236cd-5550-4bf5-9f44-369294036b01	2d2e25f5-33bd-4adf-b69e-150d53b5b108	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Notcie	\N	null	2026-04-01 09:42:07.39
49878285-4891-459b-8c70-100075e21605	2d2e25f5-33bd-4adf-b69e-150d53b5b108	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Fuck	\N	null	2026-04-01 09:42:10.432
353cecf2-35e7-4d0a-b775-27727d266117	2d2e25f5-33bd-4adf-b69e-150d53b5b108	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Shit	\N	null	2026-04-01 09:42:12.17
491efa5b-50ce-4775-b1e1-23d07a5cdb18	2d2e25f5-33bd-4adf-b69e-150d53b5b108	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Faggot	\N	null	2026-04-01 09:42:14.177
ff5d3466-ab3c-4a88-b487-ca41682b44b5	2d2e25f5-33bd-4adf-b69e-150d53b5b108	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Bitch	\N	null	2026-04-01 09:42:15.976
f153eaf2-f41b-49df-9cc4-a7f3d4234fa5	2d2e25f5-33bd-4adf-b69e-150d53b5b108	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Nigga	\N	null	2026-04-01 09:42:18.148
c329427b-e97d-4c74-9690-d56acd9b60f1	2d2e25f5-33bd-4adf-b69e-150d53b5b108	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Hoe	\N	null	2026-04-01 09:42:20.565
97288c06-64bb-4e64-ae0f-2bac03394006	2d2e25f5-33bd-4adf-b69e-150d53b5b108	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Whore	\N	null	2026-04-01 09:42:23.758
87db6631-1212-408e-a013-7d053993942b	2d2e25f5-33bd-4adf-b69e-150d53b5b108	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Slut	\N	null	2026-04-01 09:42:25.825
d75b6424-4a9a-425c-98d9-1d9deae15a8a	2d2e25f5-33bd-4adf-b69e-150d53b5b108	281ac0c9-d22b-4ece-895a-9d2c86a8f315	Nigger	\N	null	2026-04-01 09:42:39.687
9be5fb08-3a49-489f-a00b-18a4e2d22aae	2d2e25f5-33bd-4adf-b69e-150d53b5b108	3961fabe-1345-4426-bd8a-ca0a5eac3aac	See	\N	null	2026-04-01 09:42:44.054
c916b08f-0120-4d7e-8b7c-9b41765db49b	2d2e25f5-33bd-4adf-b69e-150d53b5b108	3961fabe-1345-4426-bd8a-ca0a5eac3aac	🤣🤣🤣🤣🤣🤣	\N	null	2026-04-01 09:42:47.356
a8c29252-0afc-4561-904f-e98933c3a22a	2d2e25f5-33bd-4adf-b69e-150d53b5b108	3961fabe-1345-4426-bd8a-ca0a5eac3aac	🤣🤣🤣🤣🤣🤣🤣🤣🤣🤣	\N	null	2026-04-01 09:42:54.438
fe1eef0d-66fe-4637-bab1-a00f0543f2d6	2d2e25f5-33bd-4adf-b69e-150d53b5b108	3961fabe-1345-4426-bd8a-ca0a5eac3aac	You will be able to set ya own word block list in ya stream settings	\N	null	2026-04-01 09:43:06.351
69ecd7d5-8104-42d1-b4d2-65b31648f9b9	2d2e25f5-33bd-4adf-b69e-150d53b5b108	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Right	\N	null	2026-04-01 09:43:26.342
77c52d4d-a199-4ed8-aa0b-62435f042d84	2d2e25f5-33bd-4adf-b69e-150d53b5b108	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Others will care tho	\N	null	2026-04-01 09:43:31.092
42fe8322-4807-4e39-841e-e1f905d7e392	2d2e25f5-33bd-4adf-b69e-150d53b5b108	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Yup	\N	null	2026-04-01 09:43:33.797
9c28d8ad-5979-45db-8698-68ebabb61ffd	2d2e25f5-33bd-4adf-b69e-150d53b5b108	3961fabe-1345-4426-bd8a-ca0a5eac3aac	And you'll be able to set it while you're live	\N	null	2026-04-01 09:43:43.341
dcfd603f-99ae-4f3b-b449-b3f537bd9450	2d2e25f5-33bd-4adf-b69e-150d53b5b108	3961fabe-1345-4426-bd8a-ca0a5eac3aac	No	\N	null	2026-04-01 09:43:55.325
1aae7ad4-1ef9-44c6-941d-9ce6ffb4da43	2d2e25f5-33bd-4adf-b69e-150d53b5b108	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Just wont send they message	\N	null	2026-04-01 09:44:03.788
c110c0fc-be4d-4372-8a38-64b35c98f2c4	2d2e25f5-33bd-4adf-b69e-150d53b5b108	3961fabe-1345-4426-bd8a-ca0a5eac3aac	It'll say blocked word detected	\N	null	2026-04-01 09:44:09.596
3373664c-d39f-4f28-894b-3d15328ffbf3	2d2e25f5-33bd-4adf-b69e-150d53b5b108	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Eventually	\N	null	2026-04-01 09:44:45.433
d5f3a7be-4432-4950-9f30-ede3ef60f998	2d2e25f5-33bd-4adf-b69e-150d53b5b108	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Once you're able to have subs	\N	null	2026-04-01 09:45:00.627
597a3d48-a26c-4811-a216-06fc3fe2fe09	2d2e25f5-33bd-4adf-b69e-150d53b5b108	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Notice the likes color change when 2 people hold likes	\N	null	2026-04-01 09:45:20.338
80780243-9b62-429b-a42c-25fa6f01e70e	2d2e25f5-33bd-4adf-b69e-150d53b5b108	3961fabe-1345-4426-bd8a-ca0a5eac3aac	When just one person sends like, its just like 3 colors	\N	null	2026-04-01 09:45:48.844
a19e2feb-4c8d-4c6a-b362-9e5b853b73b9	2d2e25f5-33bd-4adf-b69e-150d53b5b108	3961fabe-1345-4426-bd8a-ca0a5eac3aac	When numerous people hold hearts its more colors	\N	null	2026-04-01 09:45:58.533
1908104c-feba-46f6-ba3a-50392d5e1912	2d2e25f5-33bd-4adf-b69e-150d53b5b108	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Nah just shows if there's one person holding or more people holding	\N	null	2026-04-01 09:46:23.31
2a252026-61cd-4791-ad7f-dd0af26703f1	2d2e25f5-33bd-4adf-b69e-150d53b5b108	3961fabe-1345-4426-bd8a-ca0a5eac3aac	It doesn't add colors the more people hold it. 1 person = basic colors. 2 or more people = like 6 colors or so	\N	null	2026-04-01 09:46:52.266
2cc7e0ec-f0e9-46fa-a9ce-e3324c7eca26	2d2e25f5-33bd-4adf-b69e-150d53b5b108	3961fabe-1345-4426-bd8a-ca0a5eac3aac	🤣🤣🤣🤣🤣🤣🤣🤣	\N	null	2026-04-01 09:47:36.855
84a7f57a-c703-4dea-8e09-4a33e8d47c26	2d2e25f5-33bd-4adf-b69e-150d53b5b108	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Can't even hear her i just know she said some extra shit	\N	null	2026-04-01 09:47:53.608
4f0f0fce-6252-4e97-b928-df3a7c3a7870	2d2e25f5-33bd-4adf-b69e-150d53b5b108	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Oh 🤣🤣🤣🤣	\N	null	2026-04-01 09:48:09.82
d06be0c0-2460-4ed1-81ff-e5b53d98d02f	2d2e25f5-33bd-4adf-b69e-150d53b5b108	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Not yet	\N	null	2026-04-01 09:48:14.001
f85e65eb-fb01-44fd-905b-bfba9fffbf4e	2d2e25f5-33bd-4adf-b69e-150d53b5b108	3961fabe-1345-4426-bd8a-ca0a5eac3aac	🤣🤣🤣🤣🤣🤣	\N	null	2026-04-01 09:48:20.236
2ae2a1ab-b5b7-4cff-8dc8-5c3deacd8941	2d2e25f5-33bd-4adf-b69e-150d53b5b108	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Aye	\N	null	2026-04-01 09:48:32.966
595e54e5-ef78-47ea-9a85-d45f0fa64ad7	2d2e25f5-33bd-4adf-b69e-150d53b5b108	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Go to ya phone home screen then come back in the app	\N	null	2026-04-01 09:48:42.816
63fbed00-66b3-4b6c-b6b3-18f20bcc2654	2d2e25f5-33bd-4adf-b69e-150d53b5b108	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Hola	\N	null	2026-04-01 09:48:55.611
01453857-d055-4849-a3f2-12948d281609	2d2e25f5-33bd-4adf-b69e-150d53b5b108	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Nope	\N	null	2026-04-01 09:48:59.376
fb317d77-76a5-4f06-afa2-0a43ff37cd57	2d2e25f5-33bd-4adf-b69e-150d53b5b108	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Only if you close the app completely	\N	null	2026-04-01 09:49:07.127
2d5e66c9-913f-4c37-a7a2-c1ebda19ce73	2d2e25f5-33bd-4adf-b69e-150d53b5b108	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Watch when I go live	\N	null	2026-04-01 09:49:17.519
53f515e9-e05d-4e38-a987-0f898970ebdf	2d2e25f5-33bd-4adf-b69e-150d53b5b108	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Come	\N	null	2026-04-01 09:49:19.444
c359556c-8bbd-4c13-bc8a-4fc9876882c1	e477bb1a-2d08-4e06-8455-6183aa8b6ba3	281ac0c9-d22b-4ece-895a-9d2c86a8f315	Dam	\N	null	2026-04-01 09:50:40.535
f5a9a9e3-c103-47eb-b483-ea80d9e2f154	e477bb1a-2d08-4e06-8455-6183aa8b6ba3	281ac0c9-d22b-4ece-895a-9d2c86a8f315	Nigger	\N	null	2026-04-01 09:50:50.001
e11caa7d-e582-4f4f-99f9-1416547299c9	e477bb1a-2d08-4e06-8455-6183aa8b6ba3	281ac0c9-d22b-4ece-895a-9d2c86a8f315	Repeat	\N	null	2026-04-01 09:51:29.172
6801034f-0b42-45a7-bd9c-2e537b47134d	128e8cc7-cc76-4367-b035-9423121bef49	3961fabe-1345-4426-bd8a-ca0a5eac3aac	You aint scroll down	\N	null	2026-04-01 09:52:40.063
93ef972d-6c6e-4ad0-817b-890420856b5f	128e8cc7-cc76-4367-b035-9423121bef49	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Come to my live	\N	null	2026-04-01 09:52:50.283
dbd8e543-4b57-4238-a0b7-cde2697a320e	fc805175-e93f-49ef-834e-eaac90cec00f	281ac0c9-d22b-4ece-895a-9d2c86a8f315	Yes I see blue	\N	null	2026-04-01 09:53:59.397
88b42be2-a2cb-44db-bb8d-129fd061e567	481dad7d-d73f-4dce-b9a7-f24066eb069c	3961fabe-1345-4426-bd8a-ca0a5eac3aac	See	\N	null	2026-04-01 09:54:34.24
0ea69a15-901c-49fa-9234-9ee277a68683	481dad7d-d73f-4dce-b9a7-f24066eb069c	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Yeaaaa	\N	null	2026-04-01 09:54:41.22
71d89978-fbdf-4096-b1db-d7d99f6bcd42	481dad7d-d73f-4dce-b9a7-f24066eb069c	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Imma add more colors	\N	null	2026-04-01 09:54:52.015
659885fa-b020-42f9-b6fe-973b3be4cdd0	481dad7d-d73f-4dce-b9a7-f24066eb069c	3961fabe-1345-4426-bd8a-ca0a5eac3aac	But imma jump in lavii box go ahead and go thru the app and test every thing	\N	null	2026-04-01 09:55:14.834
d9c7ce90-68e1-4706-96e5-bbd0b1ff0e8f	481dad7d-d73f-4dce-b9a7-f24066eb069c	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Wait	\N	null	2026-04-01 09:55:21.876
f607472e-85b5-42b1-80b3-8dce988b0b96	481dad7d-d73f-4dce-b9a7-f24066eb069c	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Do you have me faved on here	\N	null	2026-04-01 09:55:32.114
e191ed71-3d5a-4abc-825e-7ae3bb759e47	481dad7d-d73f-4dce-b9a7-f24066eb069c	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Did you get the notification on ya phone when I went live	\N	null	2026-04-01 09:55:48.835
fbe1bc61-931b-49a9-ac56-a6aae2ff35a4	481dad7d-d73f-4dce-b9a7-f24066eb069c	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Good	\N	null	2026-04-01 09:55:57.186
b5521fac-d91d-4c0f-b79b-31aaa2bee1c1	481dad7d-d73f-4dce-b9a7-f24066eb069c	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Ok im going to lavii	\N	null	2026-04-01 09:56:04.905
01678011-646a-4542-a9b6-7669db64b9d9	b1001c15-3e22-4d3f-b80b-08eeb774338c	9f70646e-c63e-4a08-a4fa-8786204bbf4e	dfbdsafb	\N	null	2026-04-01 10:54:36.619
86e3fe36-4aac-45b8-9ee3-e9db37f46c32	b1001c15-3e22-4d3f-b80b-08eeb774338c	9f70646e-c63e-4a08-a4fa-8786204bbf4e	sdfbsdfb	\N	null	2026-04-01 10:54:38.512
2f5f5e3d-ecb3-4bd0-a3ed-44721f20e5c3	b1001c15-3e22-4d3f-b80b-08eeb774338c	9f70646e-c63e-4a08-a4fa-8786204bbf4e	dsfbsdfb	\N	null	2026-04-01 10:54:40.817
604a048d-61bd-424e-8cd1-9658576b6155	b1001c15-3e22-4d3f-b80b-08eeb774338c	9f70646e-c63e-4a08-a4fa-8786204bbf4e	sdfbsdfb	\N	null	2026-04-01 10:54:41.931
1bcf647e-6303-4a27-a377-922febb09904	b1001c15-3e22-4d3f-b80b-08eeb774338c	9f70646e-c63e-4a08-a4fa-8786204bbf4e	sdfbsdfb	\N	null	2026-04-01 10:54:42.813
7e275374-9505-4a48-83f3-45204cd296e9	b1001c15-3e22-4d3f-b80b-08eeb774338c	9f70646e-c63e-4a08-a4fa-8786204bbf4e	sdfbsdfb	\N	null	2026-04-01 10:54:43.78
be7d8c81-912d-4e6a-855f-5e514d8dffcd	b1001c15-3e22-4d3f-b80b-08eeb774338c	9f70646e-c63e-4a08-a4fa-8786204bbf4e	sdfbsdfb	\N	null	2026-04-01 10:54:44.681
732e18d8-64f9-45da-a395-095f77cad9ca	b1001c15-3e22-4d3f-b80b-08eeb774338c	9f70646e-c63e-4a08-a4fa-8786204bbf4e	sdfbsdfb	\N	null	2026-04-01 10:54:45.546
b5a6f795-a673-4494-b9ae-0c4f670f403d	b1001c15-3e22-4d3f-b80b-08eeb774338c	9f70646e-c63e-4a08-a4fa-8786204bbf4e	sdfbdfsb	\N	null	2026-04-01 10:54:46.616
fafad0de-c3e3-45ea-b798-30c2341f7b7b	b1001c15-3e22-4d3f-b80b-08eeb774338c	9f70646e-c63e-4a08-a4fa-8786204bbf4e	sdfbsdfb	\N	null	2026-04-01 10:54:47.603
972927fa-755d-492c-9694-995b3cdc4022	b1001c15-3e22-4d3f-b80b-08eeb774338c	9f70646e-c63e-4a08-a4fa-8786204bbf4e	sdfbsdfb	\N	null	2026-04-01 10:54:48.547
4978b437-c48c-4e76-8395-d843dba162c2	b1001c15-3e22-4d3f-b80b-08eeb774338c	9f70646e-c63e-4a08-a4fa-8786204bbf4e	sdfbsdfb	\N	null	2026-04-01 10:54:49.617
9f02c96a-7d49-4153-af41-af8091210d4c	b1001c15-3e22-4d3f-b80b-08eeb774338c	9f70646e-c63e-4a08-a4fa-8786204bbf4e	sbnserv3erbsedbndbndas	\N	null	2026-04-01 10:54:53.366
3535ec77-2cbb-4980-b9c2-182d7b65d50e	dfaa6a9c-3d1f-45cb-9074-f48e4f7026e7	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Bobibi	\N	null	2026-04-01 17:45:05.483
1ce0b17a-e159-4d73-bd21-e5429b36b084	dfaa6a9c-3d1f-45cb-9074-f48e4f7026e7	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Igigug	\N	null	2026-04-01 17:45:07.63
186b68cc-639c-4036-b1da-3e699fbe78fb	e94455bd-d7a9-455b-8e7a-9b12f15bff19	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Zhhzjd	\N	null	2026-04-01 18:40:37.218
09ae9e15-b679-4a06-b2e1-4a909cefd409	e94455bd-d7a9-455b-8e7a-9b12f15bff19	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Dudhd	\N	null	2026-04-01 18:41:34.203
6cec8bfc-6dc1-4a9a-86f6-23763c8a3bbe	e94455bd-d7a9-455b-8e7a-9b12f15bff19	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Duduhd	\N	null	2026-04-01 18:41:37.103
6d5164fb-0349-407a-858b-11914cbacbde	e94455bd-d7a9-455b-8e7a-9b12f15bff19	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Djdjxbfd	\N	null	2026-04-01 18:41:39.27
8ef4dde4-c0f0-4e57-95bb-51c535a48ef4	e94455bd-d7a9-455b-8e7a-9b12f15bff19	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Dueidbfj	\N	null	2026-04-01 18:41:41.761
2d75f466-0f94-46d8-82d3-2fb97f37c996	67dca92d-3a1a-4799-87ba-a6504d628339	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Fjeinf	\N	null	2026-04-01 19:09:08.646
ccb8a8da-c426-49ea-8ae2-404a3987793b	67dca92d-3a1a-4799-87ba-a6504d628339	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Djsifjr	\N	null	2026-04-01 19:09:10.719
d1204644-b24c-4bb4-ace6-fd9a55776d99	67dca92d-3a1a-4799-87ba-a6504d628339	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Djdjsiwjd	\N	null	2026-04-01 19:09:12.94
66af63cf-edbc-4d35-847e-5d0875174fa7	67dca92d-3a1a-4799-87ba-a6504d628339	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Djeidhbr	\N	null	2026-04-01 19:09:14.973
4e394da5-7e29-401b-be7e-fac2debea3b3	67dca92d-3a1a-4799-87ba-a6504d628339	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Dueienbhf	\N	null	2026-04-01 19:09:18.937
f5e07c8f-f16f-4959-91ab-f7295c5192ba	67dca92d-3a1a-4799-87ba-a6504d628339	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Djwinfjjr	\N	null	2026-04-01 19:09:21.046
ede899bb-6f31-47dc-9466-54449a520ab3	80abe71e-5ff4-4f83-9f52-0d650aad154d	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Jfjg	\N	null	2026-04-01 19:49:30.283
22179e4c-6791-4886-a508-1d4c6a74dcfb	8fc0ae7c-4c43-46b0-aac9-44e8469aeb49	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Fufjf	\N	null	2026-04-01 22:10:33.039
9d47b442-80be-42d8-aa9f-bfa9bff50301	8fc0ae7c-4c43-46b0-aac9-44e8469aeb49	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Djdjd	\N	null	2026-04-01 22:10:35.138
7e392d64-afa0-46de-933b-1b65a3bfb9f0	8fc0ae7c-4c43-46b0-aac9-44e8469aeb49	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Dhdjdj	\N	null	2026-04-01 22:10:39.142
c7a9320d-2ccf-45bf-ba53-8be69b3587c0	8fc0ae7c-4c43-46b0-aac9-44e8469aeb49	c5c904e8-da40-4458-b8bf-5c2cc97348b1	Test	\N	null	2026-04-01 22:10:54.668
57651692-fd26-494f-aa9e-2d5475fa6f98	bdffc9c0-0103-4b5a-b3a6-0605f683ca23	c5c904e8-da40-4458-b8bf-5c2cc97348b1	Test	\N	null	2026-04-01 22:12:40.587
ce0dd27f-3d7f-484b-9953-52ff61d2eeaa	bdffc9c0-0103-4b5a-b3a6-0605f683ca23	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Fjfjf	\N	null	2026-04-01 22:12:47.197
d49678ed-9b84-4fcc-8903-35b7c39682b6	bdffc9c0-0103-4b5a-b3a6-0605f683ca23	c5c904e8-da40-4458-b8bf-5c2cc97348b1	Test	\N	null	2026-04-01 22:13:13.421
96f24b36-0920-4fa5-afed-6696485864fb	bdffc9c0-0103-4b5a-b3a6-0605f683ca23	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Ucjv	\N	null	2026-04-01 22:13:19.439
8fd65450-029f-4618-bb3f-59b3eee8d1a1	965a2f65-fc61-413e-a675-9197dcd0d373	c5c904e8-da40-4458-b8bf-5c2cc97348b1	Test	\N	null	2026-04-01 22:14:54.715
bd15849a-7ccf-4195-86ff-6164d10c2bae	965a2f65-fc61-413e-a675-9197dcd0d373	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Ucufu	\N	null	2026-04-01 22:14:57.544
ef37806f-38f4-449f-929d-27134860ab84	965a2f65-fc61-413e-a675-9197dcd0d373	3961fabe-1345-4426-bd8a-ca0a5eac3aac	😍🖕🏿‼️🤷🏼‍♂️‼️🙃🫶🏻🖕🏽💪🏻	\N	null	2026-04-01 22:15:06.448
4e11420c-936d-48b1-88f6-6952b5b0062a	66000676-e56a-4c26-a200-4a930987e019	c5c904e8-da40-4458-b8bf-5c2cc97348b1	Test	\N	null	2026-04-01 22:29:42.105
0741a0ac-e462-4fb8-955e-ac9bb7bcb4c0	27819416-1f12-4c8d-939d-318f6dc2adb7	281ac0c9-d22b-4ece-895a-9d2c86a8f315	Hh	\N	null	2026-04-01 23:10:27.194
e72073ce-709c-4bf8-b2e3-954223285bf8	27819416-1f12-4c8d-939d-318f6dc2adb7	281ac0c9-d22b-4ece-895a-9d2c86a8f315	Hh	\N	null	2026-04-01 23:10:30.183
c47593c4-35ab-429a-a926-cfc5b37c05c4	27819416-1f12-4c8d-939d-318f6dc2adb7	281ac0c9-d22b-4ece-895a-9d2c86a8f315	Drg	\N	null	2026-04-01 23:10:32.584
73c39e5f-9f78-4f5e-9da1-a38bd0387fc0	27819416-1f12-4c8d-939d-318f6dc2adb7	281ac0c9-d22b-4ece-895a-9d2c86a8f315	Ffg	\N	null	2026-04-01 23:10:35.145
cb62cda0-f6bd-404c-b310-2cf8e2c3455f	27819416-1f12-4c8d-939d-318f6dc2adb7	281ac0c9-d22b-4ece-895a-9d2c86a8f315	Gyg	\N	null	2026-04-01 23:10:37.149
9eff9edf-f1b5-4253-a77e-31373b14e86f	27819416-1f12-4c8d-939d-318f6dc2adb7	281ac0c9-d22b-4ece-895a-9d2c86a8f315	Gyh	\N	null	2026-04-01 23:10:39.145
c27dbf87-0b21-41fe-93bb-bd335338eeba	27819416-1f12-4c8d-939d-318f6dc2adb7	281ac0c9-d22b-4ece-895a-9d2c86a8f315	Yghu	\N	null	2026-04-01 23:10:41.746
673c5c10-5abd-439e-9b63-f5e4f7667fe9	954b55ba-be54-456f-81eb-31c108c42ae6	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Box	\N	null	2026-04-01 23:14:09.001
9e33dfa5-767f-4594-a169-c4f613bb0d83	954b55ba-be54-456f-81eb-31c108c42ae6	c5c904e8-da40-4458-b8bf-5c2cc97348b1	Good day!	\N	null	2026-04-01 23:15:02.638
d92f4331-8a6a-4087-946b-d0a0f2f0cf9b	954b55ba-be54-456f-81eb-31c108c42ae6	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Cg	\N	null	2026-04-01 23:19:23.309
28786534-833e-41db-b759-d6982ebca5af	b524fe7d-3e1a-42cc-9ab8-6c873b378fe0	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Ok good enough	\N	null	2026-04-01 23:22:27.819
4475ea07-c03b-414c-af38-84c0b2fc240b	b524fe7d-3e1a-42cc-9ab8-6c873b378fe0	3961fabe-1345-4426-bd8a-ca0a5eac3aac	I'll fix them issues	\N	null	2026-04-01 23:22:35.907
efee6053-515f-4d1b-9486-9bdba18694f9	b524fe7d-3e1a-42cc-9ab8-6c873b378fe0	3961fabe-1345-4426-bd8a-ca0a5eac3aac	In your inbox it works but not in stream dms	\N	null	2026-04-01 23:22:54.618
d84c27e0-69bc-45c2-88e6-d32ce9f1945e	b524fe7d-3e1a-42cc-9ab8-6c873b378fe0	3961fabe-1345-4426-bd8a-ca0a5eac3aac	I gotta fix that too	\N	null	2026-04-01 23:23:01.451
9d1d5766-fb30-41af-9de5-e095823aaf06	b524fe7d-3e1a-42cc-9ab8-6c873b378fe0	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Yea	\N	null	2026-04-01 23:23:04.655
3289697e-3701-4fcd-8dc2-813e3b510a0a	b524fe7d-3e1a-42cc-9ab8-6c873b378fe0	3961fabe-1345-4426-bd8a-ca0a5eac3aac	When I fix it, you'll have to download the app file again	\N	null	2026-04-01 23:23:15.279
4212da2a-65a0-4d91-a3e3-25573de881a5	b524fe7d-3e1a-42cc-9ab8-6c873b378fe0	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Yea	\N	null	2026-04-01 23:23:32.885
8ff9ad44-97c4-4651-b4a1-a20879f1e316	b524fe7d-3e1a-42cc-9ab8-6c873b378fe0	3961fabe-1345-4426-bd8a-ca0a5eac3aac	It mutes and turns ya cam off when you swipe up for now	\N	null	2026-04-01 23:24:05.357
3d5abe8a-c1ff-4c68-a668-1d56bbfed60b	b524fe7d-3e1a-42cc-9ab8-6c873b378fe0	3961fabe-1345-4426-bd8a-ca0a5eac3aac	You'll have to click the pip button in the 3 dot menu	\N	null	2026-04-01 23:24:16.229
00dda7d9-d5f3-46de-af7a-607ef4c9987f	b524fe7d-3e1a-42cc-9ab8-6c873b378fe0	3961fabe-1345-4426-bd8a-ca0a5eac3aac	To not mute when you swipe up	\N	null	2026-04-01 23:24:23.757
15385f09-928a-4781-8681-bb39514de79d	b524fe7d-3e1a-42cc-9ab8-6c873b378fe0	3961fabe-1345-4426-bd8a-ca0a5eac3aac	They wont see your comments	\N	null	2026-04-01 23:25:12.637
f9e08ab5-c0eb-41a0-8f8e-f636cfffc592	b524fe7d-3e1a-42cc-9ab8-6c873b378fe0	3961fabe-1345-4426-bd8a-ca0a5eac3aac	But they will see you in box	\N	null	2026-04-01 23:25:22.496
45917101-70dc-400d-be70-2fdeaa51d782	96456357-7470-40d4-bb0d-957c49561d88	9f70646e-c63e-4a08-a4fa-8786204bbf4e	ADFSSADFV	\N	null	2026-04-02 01:46:23.765
98340336-0e5f-4037-bd22-b7206d9bc051	96456357-7470-40d4-bb0d-957c49561d88	9f70646e-c63e-4a08-a4fa-8786204bbf4e	ASDVFASDV	\N	null	2026-04-02 01:46:26.305
ef8ef16d-59ad-493d-b0d5-5710fef0d799	96456357-7470-40d4-bb0d-957c49561d88	9f70646e-c63e-4a08-a4fa-8786204bbf4e	ASDVASDV	\N	null	2026-04-02 01:46:28.747
b1abe232-bfd6-421f-8935-d7a8ec006617	96456357-7470-40d4-bb0d-957c49561d88	9f70646e-c63e-4a08-a4fa-8786204bbf4e	ASDVASDV	\N	null	2026-04-02 01:46:29.921
9ce19cc3-b1c3-467f-9875-0b431b020ad6	96456357-7470-40d4-bb0d-957c49561d88	9f70646e-c63e-4a08-a4fa-8786204bbf4e	ASDVASDV	\N	null	2026-04-02 01:46:31.017
f7e07030-dc8e-434e-aca0-56bcbd815d09	96456357-7470-40d4-bb0d-957c49561d88	9f70646e-c63e-4a08-a4fa-8786204bbf4e	SADVASDV	\N	null	2026-04-02 01:46:32.232
b6926622-0fdc-4560-b2bf-41933a2c6252	02615b24-131a-4df4-953f-9802b3cd3047	9f70646e-c63e-4a08-a4fa-8786204bbf4e	advfadv	\N	null	2026-04-02 02:01:36.272
139073d0-4b8e-43a0-a4ad-f447d2ed7517	02615b24-131a-4df4-953f-9802b3cd3047	9f70646e-c63e-4a08-a4fa-8786204bbf4e	advadv	\N	null	2026-04-02 02:01:37.669
d3007dd4-d67f-4e47-ab06-40edd454c324	02615b24-131a-4df4-953f-9802b3cd3047	9f70646e-c63e-4a08-a4fa-8786204bbf4e	advadv	\N	null	2026-04-02 02:01:38.866
5f9c5c45-6a2e-4062-ab35-bb1b8e326c4a	26952696-6533-46e8-933c-2b008248ff6f	47d9c408-1a3c-46c1-aecf-6f1746615499	ascasc	\N	null	2026-04-02 03:16:41.246
fe2cba8e-375d-45a1-b523-4039566b5d03	26952696-6533-46e8-933c-2b008248ff6f	9f70646e-c63e-4a08-a4fa-8786204bbf4e	ascasc	\N	null	2026-04-02 03:16:45.886
27f2c9f7-13c7-4b7a-b8b3-dd5a5c2e0138	26952696-6533-46e8-933c-2b008248ff6f	47d9c408-1a3c-46c1-aecf-6f1746615499	asvcasc	\N	null	2026-04-02 03:16:53.017
5484bb5f-51e2-4bca-8cdc-550a4c826e0b	26952696-6533-46e8-933c-2b008248ff6f	47d9c408-1a3c-46c1-aecf-6f1746615499	egrberwbarb	\N	null	2026-04-02 03:16:56.055
5f58b0d1-b5a3-4975-bffb-27883ba5080f	53725353-c8cb-40f3-941c-343cca5b8976	47d9c408-1a3c-46c1-aecf-6f1746615499	asdvasdv	\N	null	2026-04-02 03:17:10.355
5749fcff-2a89-400a-82bc-6696f2350e42	caa0abb9-6866-4ca0-b96f-884c19bb1e6b	47d9c408-1a3c-46c1-aecf-6f1746615499	jhvhjv	\N	null	2026-04-02 04:49:20.06
73507358-20f2-4833-bd37-223bfaf8700f	caa0abb9-6866-4ca0-b96f-884c19bb1e6b	47d9c408-1a3c-46c1-aecf-6f1746615499	kjhgbjkvb	\N	null	2026-04-02 04:49:38.308
bba38862-eca1-4f22-96cd-acc88c3c5b80	caa0abb9-6866-4ca0-b96f-884c19bb1e6b	47d9c408-1a3c-46c1-aecf-6f1746615499	jkhbhkbh	\N	null	2026-04-02 04:49:41.644
1f2e00e6-25c8-4426-a980-a14969e88e69	caa0abb9-6866-4ca0-b96f-884c19bb1e6b	47d9c408-1a3c-46c1-aecf-6f1746615499	gjhvjgv	\N	null	2026-04-02 04:49:45.295
e3d9ef7d-2569-4bfd-8cd4-23b366c81c38	caa0abb9-6866-4ca0-b96f-884c19bb1e6b	47d9c408-1a3c-46c1-aecf-6f1746615499	rdsgdfh	\N	null	2026-04-02 04:49:48.877
dcbd2789-2b15-4f11-a349-90ece893f0b5	caa0abb9-6866-4ca0-b96f-884c19bb1e6b	47d9c408-1a3c-46c1-aecf-6f1746615499	dfhdfh	\N	null	2026-04-02 04:49:49.99
87733475-d12d-44d2-8a8a-595131821bd6	caa0abb9-6866-4ca0-b96f-884c19bb1e6b	47d9c408-1a3c-46c1-aecf-6f1746615499	hdfh	\N	null	2026-04-02 04:49:50.893
ecfd438e-648c-4d7e-9436-3b40781db26b	caa0abb9-6866-4ca0-b96f-884c19bb1e6b	47d9c408-1a3c-46c1-aecf-6f1746615499	fhdrfherh	\N	null	2026-04-02 04:49:52.136
b82f4b8e-6c44-4998-86b8-1268a83772b2	caa0abb9-6866-4ca0-b96f-884c19bb1e6b	47d9c408-1a3c-46c1-aecf-6f1746615499	dherh	\N	null	2026-04-02 04:49:53.431
95094358-707f-462b-ba14-f9f2adc6cf6a	caa0abb9-6866-4ca0-b96f-884c19bb1e6b	47d9c408-1a3c-46c1-aecf-6f1746615499	herherh	\N	null	2026-04-02 04:49:54.698
c2a24016-8e5c-45a2-81d2-22d30256c7e4	caa0abb9-6866-4ca0-b96f-884c19bb1e6b	47d9c408-1a3c-46c1-aecf-6f1746615499	edherheh	\N	null	2026-04-02 04:49:55.996
dca89f37-50bd-4c8f-bdc8-e522d0773506	a324b73d-282e-406c-8407-fafeb191cfb3	9f70646e-c63e-4a08-a4fa-8786204bbf4e	;kjuhj	\N	null	2026-04-02 05:37:24.982
261e123b-67f6-4a23-b39f-18fc85883e3a	16813a30-c789-445e-94f5-13b58c02b245	9f70646e-c63e-4a08-a4fa-8786204bbf4e	ggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg	\N	null	2026-04-02 05:56:43.453
fda12d49-fb75-4a81-a53f-1747012d6e49	67f6598c-24a7-4ec3-b926-6cc10daf0586	9f70646e-c63e-4a08-a4fa-8786204bbf4e	hjklbjkhbjlkh	\N	null	2026-04-02 06:13:50.439
4f612c97-aff6-40d1-af22-5fd85c98afa1	fa770eba-c6d5-4379-a889-02d245470438	47d9c408-1a3c-46c1-aecf-6f1746615499	jhvbjhv	\N	null	2026-04-02 09:24:57.23
5b28c1f1-dca7-4e28-8b60-4d2134314eb8	fa770eba-c6d5-4379-a889-02d245470438	47d9c408-1a3c-46c1-aecf-6f1746615499	51521	\N	null	2026-04-02 09:24:59.496
2986507a-0f55-44e9-b1f6-fe0769ea4141	fa770eba-c6d5-4379-a889-02d245470438	47d9c408-1a3c-46c1-aecf-6f1746615499	545564564	\N	null	2026-04-02 09:25:01.48
8ebcc8c1-e72a-4af9-8afe-08b566f086e5	fa770eba-c6d5-4379-a889-02d245470438	47d9c408-1a3c-46c1-aecf-6f1746615499	4654635	\N	null	2026-04-02 09:25:03.508
def1d1f2-82ac-4935-bd8a-8a120fb4358c	fa770eba-c6d5-4379-a889-02d245470438	47d9c408-1a3c-46c1-aecf-6f1746615499	654654563	\N	null	2026-04-02 09:25:05.338
38ecab49-ea31-468f-b996-37736b0238d2	fa770eba-c6d5-4379-a889-02d245470438	47d9c408-1a3c-46c1-aecf-6f1746615499	554154664	\N	null	2026-04-02 09:25:07.914
eaeae8ca-3a0f-405d-b7b9-e92a00d7bc3d	fa770eba-c6d5-4379-a889-02d245470438	e9134380-2da7-4a1e-bd2a-34398f85a6e5	iuyg	\N	null	2026-04-02 09:30:01.388
1cfcec08-9aa1-494c-af75-6a9cc20cab64	fa770eba-c6d5-4379-a889-02d245470438	3961fabe-1345-4426-bd8a-ca0a5eac3aac	hkjgfc	\N	null	2026-04-02 09:30:34.137
ff94d642-7e14-4123-8ff1-f8c9d999d3b8	fa770eba-c6d5-4379-a889-02d245470438	c5c904e8-da40-4458-b8bf-5c2cc97348b1	I joined	\N	null	2026-04-02 20:25:22.321
ed22bbe1-9158-40f4-8533-d39ecdc5dadd	5300c527-4d0c-4d4a-87de-65872b40b423	9f70646e-c63e-4a08-a4fa-8786204bbf4e	DFDFDFdf	\N	null	2026-04-04 04:06:55.348
\.


--
-- Data for Name: coin_packages; Type: TABLE DATA; Schema: public; Owner: liveapp
--

COPY public.coin_packages (id, coins, price_cents, currency, is_active, sort_order, created_at, updated_at, apple_product_id, google_product_id, for_dev_use, deleted_at, badge_text, color_preset, is_featured) FROM stdin;
coins_1798	1798	999	USD	t	3	2026-04-03 09:40:20.024	2026-04-03 13:10:14.212	com.sparkzlive.coins_1798	coins_1798	f	\N	Food Stamps	red	f
coins_4498	4498	2499	USD	t	4	2026-04-03 09:40:52.397	2026-04-03 13:11:16.447	com.sparkzlive.coins_4498	coins_4498	f	\N	Cheapskate	teal	f
coins_8998	8998	4999	USD	t	5	2026-04-03 09:41:42.673	2026-04-03 13:14:37.925	com.sparkzlive.coins_8998	coins_8998	f	\N	Cheap Hoe	sky	f
coins_179998	179998	99999	USD	t	9	2026-04-03 09:44:05.698	2026-04-03 13:18:03.278	com.sparkzlive.coins_179998	coins_179998	f	\N	Splenda Daddy	orange	f
coins_449998	449998	249999	USD	t	10	2026-04-03 12:03:26.451	2026-04-03 12:59:12.652	com.sparkzlive.coins_449998	coins_449998	f	\N	Baby Trick	yellow	t
coins_89998	89998	49999	USD	t	8	2026-04-03 09:43:26.23	2026-04-03 13:19:41.221	com.sparkzlive.coins_89998	coins_89998	f	\N	Suga Mami Me	violet	f
coins_178	178	99	USD	t	1	2026-04-03 09:39:22.47	2026-04-03 13:04:23.359	com.sparkzlive.coins_178	coins_178	f	\N	Brokie	neutral	f
coins_898	898	499	USD	t	2	2026-04-03 09:39:50.558	2026-04-03 13:06:35.201	com.sparkzlive.coins_898	coins_898	f	\N	Still Broke!	slate	f
coins_17998	17998	9999	USD	t	6	2026-04-03 09:42:18.133	2026-04-03 13:23:53.702	com.sparkzlive.coins_17998	coins_17998	f	\N	Ballin' On A Budget	green	f
coins_44998	44998	24999	USD	t	7	2026-04-03 09:42:56.545	2026-04-03 13:26:04.416	com.sparkzlive.coins_44998	coins_44998	f	\N	Hood Rich	lime	t
coins_18998	18998	0	USD	f	6	2026-04-03 07:02:48.027	2026-04-03 09:38:09.156	\N	\N	t	2026-04-03 09:38:09.154	\N	\N	f
coins_1000	1000	199	USD	f	10	2026-04-03 04:35:44.819	2026-04-03 09:38:11.988	com.liveapp.coins_1000	coins_1000	f	2026-04-03 09:38:11.986	\N	\N	f
coins_5000	5000	799	USD	f	20	2026-04-03 04:35:44.83	2026-04-03 09:38:14.264	com.liveapp.coins_5000	coins_5000	f	2026-04-03 09:38:14.263	\N	\N	f
coins_20000	20000	2499	USD	f	30	2026-04-03 04:35:44.835	2026-04-03 09:38:16.413	com.liveapp.coins_20000	coins_20000	f	2026-04-03 09:38:16.411	\N	\N	f
coins_899998	899998	499999	USD	t	11	2026-04-03 09:44:37.232	2026-04-04 06:34:09.423	com.sparkzlive.coins_899998	coins_899998	f	\N	Trick Daddy	emerald	f
dev_10000000	10000000	0	USD	t	30	2026-04-03 09:50:01.162	2026-04-04 06:34:59.844	\N	\N	t	\N	Biggest Sugar Daddy	cyan	f
\.


--
-- Data for Name: conversations; Type: TABLE DATA; Schema: public; Owner: liveapp
--

COPY public.conversations (id, participant_1_id, participant_2_id, interaction_count, created_at, updated_at, deleted_by_p1, deleted_by_p2) FROM stdin;
098ccdb1-8375-4e63-93ad-1e90f4605f79	3961fabe-1345-4426-bd8a-ca0a5eac3aac	e9134380-2da7-4a1e-bd2a-34398f85a6e5	1	2026-03-29 09:24:13.467	2026-03-29 09:24:13.488	f	f
c39a0924-3378-4485-b7ef-dcce70ce4c2e	3961fabe-1345-4426-bd8a-ca0a5eac3aac	3961fabe-1345-4426-bd8a-ca0a5eac3aac	1	2026-04-01 09:33:30.332	2026-04-01 09:33:30.348	f	f
1798eda1-ef5f-4629-88af-5c5cacc08d45	3961fabe-1345-4426-bd8a-ca0a5eac3aac	9f70646e-c63e-4a08-a4fa-8786204bbf4e	2	2026-04-01 10:55:16.483	2026-04-01 10:55:22.358	f	f
a76df74d-06fc-4899-8249-5b4e093ea878	3961fabe-1345-4426-bd8a-ca0a5eac3aac	47d9c408-1a3c-46c1-aecf-6f1746615499	13	2026-03-29 09:23:38.253	2026-04-01 17:51:35.997	f	f
570701d9-c8c0-4b92-9285-f12ed7f5d7e3	3961fabe-1345-4426-bd8a-ca0a5eac3aac	c5c904e8-da40-4458-b8bf-5c2cc97348b1	18	2026-04-01 22:15:28.665	2026-04-01 22:21:58.215	f	f
4551ebb6-723c-43a9-a4fd-4d15f91f874a	281ac0c9-d22b-4ece-895a-9d2c86a8f315	3961fabe-1345-4426-bd8a-ca0a5eac3aac	13	2026-04-01 09:16:33.876	2026-04-01 23:15:35.35	f	f
\.


--
-- Data for Name: diamond_milestones; Type: TABLE DATA; Schema: public; Owner: liveapp
--

COPY public.diamond_milestones (id, user_id, milestone_amount, achieved_at, giver_user_id, gift_id, gift_tx_id, created_at) FROM stdin;
06c3bd6a-3b97-4cff-ba38-5ef94c3235ce	281ac0c9-d22b-4ece-895a-9d2c86a8f315	1000000	2026-04-01 09:15:47.043	3961fabe-1345-4426-bd8a-ca0a5eac3aac	galaxy	d184d94c-c082-4c64-8d00-f2d768a6e469	2026-04-01 09:15:47.075
0915d098-2e2f-40db-a684-59345f1d9e66	3961fabe-1345-4426-bd8a-ca0a5eac3aac	1000000	2026-04-01 09:25:30.938	281ac0c9-d22b-4ece-895a-9d2c86a8f315	galaxy	bc2f4918-37d3-4ade-8dce-1193fcf6f6a1	2026-04-01 09:25:30.961
3a590a6d-e5ab-4643-a428-8d0a005d7ae5	281ac0c9-d22b-4ece-895a-9d2c86a8f315	2000000	2026-04-01 09:30:04.943	3961fabe-1345-4426-bd8a-ca0a5eac3aac	galaxy	6edb75ae-20c2-4652-b644-158e5caa1e60	2026-04-01 09:30:04.968
5fd8081c-6e77-4684-8022-2fc9fe39b928	281ac0c9-d22b-4ece-895a-9d2c86a8f315	3000000	2026-04-01 09:30:06.537	3961fabe-1345-4426-bd8a-ca0a5eac3aac	galaxy	785dfbec-cc36-4019-9e6b-00470749d2ed	2026-04-01 09:30:06.556
531939b5-3149-45db-b60b-1e9fc129b69d	281ac0c9-d22b-4ece-895a-9d2c86a8f315	4000000	2026-04-01 09:30:07.764	3961fabe-1345-4426-bd8a-ca0a5eac3aac	galaxy	6a1d1793-29b4-46a4-b3a4-da83348c7926	2026-04-01 09:30:07.783
f830abe1-03b9-4942-a0b2-7314781bcd42	281ac0c9-d22b-4ece-895a-9d2c86a8f315	5000000	2026-04-01 09:30:08.88	3961fabe-1345-4426-bd8a-ca0a5eac3aac	galaxy	6805c424-c5f5-4e83-a324-363d95cb8bd7	2026-04-01 09:30:08.899
4c163f59-2a66-4dfc-b896-9fee3d748399	281ac0c9-d22b-4ece-895a-9d2c86a8f315	6000000	2026-04-01 09:30:10.247	3961fabe-1345-4426-bd8a-ca0a5eac3aac	galaxy	a4e64831-2f1a-461b-a2b1-36784ddf2550	2026-04-01 09:30:10.265
08282e0e-5a0c-43c1-a545-2dbfde45f870	281ac0c9-d22b-4ece-895a-9d2c86a8f315	7000000	2026-04-01 09:30:11.427	3961fabe-1345-4426-bd8a-ca0a5eac3aac	galaxy	659c52b9-e263-4154-a2b1-274e7296d25e	2026-04-01 09:30:11.45
e0fe6f69-765b-46b5-acc8-745779dec0f1	281ac0c9-d22b-4ece-895a-9d2c86a8f315	8000000	2026-04-01 09:30:12.65	3961fabe-1345-4426-bd8a-ca0a5eac3aac	galaxy	d3dfb248-e464-4b9c-840f-ebc3bc0bb43b	2026-04-01 09:30:12.669
18f6fdf8-74f9-49f8-bc55-9ba6dca044ab	c5c904e8-da40-4458-b8bf-5c2cc97348b1	1000000	2026-04-01 22:09:51.636	3961fabe-1345-4426-bd8a-ca0a5eac3aac	galaxy	0a1126f0-63eb-4fa9-9b82-621e237b5d18	2026-04-01 22:09:51.659
475a8e1c-d3eb-42c5-8c99-ce9c00ccc48f	c5c904e8-da40-4458-b8bf-5c2cc97348b1	2000000	2026-04-01 22:35:50.542	47d9c408-1a3c-46c1-aecf-6f1746615499	galaxy	9f61bf5e-d73f-473d-9b1a-3d5315791b68	2026-04-01 22:35:50.568
e3ecf3a6-b312-409a-9ac0-9fddadf7f613	c5c904e8-da40-4458-b8bf-5c2cc97348b1	3000000	2026-04-01 22:35:50.542	47d9c408-1a3c-46c1-aecf-6f1746615499	galaxy	9f61bf5e-d73f-473d-9b1a-3d5315791b68	2026-04-01 22:35:50.572
4ecccc56-5de5-478b-a4db-20a320b68ddd	c5c904e8-da40-4458-b8bf-5c2cc97348b1	4000000	2026-04-01 22:35:50.542	47d9c408-1a3c-46c1-aecf-6f1746615499	galaxy	9f61bf5e-d73f-473d-9b1a-3d5315791b68	2026-04-01 22:35:50.576
b021e11d-3bc7-44a5-ab74-836a07f570bb	c5c904e8-da40-4458-b8bf-5c2cc97348b1	5000000	2026-04-01 22:35:50.542	47d9c408-1a3c-46c1-aecf-6f1746615499	galaxy	9f61bf5e-d73f-473d-9b1a-3d5315791b68	2026-04-01 22:35:50.58
ca47babb-a0ba-4b80-a8c4-56100dba92d7	281ac0c9-d22b-4ece-895a-9d2c86a8f315	9000000	2026-04-01 23:21:16.759	3961fabe-1345-4426-bd8a-ca0a5eac3aac	galaxy	25a8efa8-edab-4eee-838b-8f3941f33ec6	2026-04-01 23:21:16.785
ee790138-4891-4792-99a6-2b74e01dad30	281ac0c9-d22b-4ece-895a-9d2c86a8f315	10000000	2026-04-01 23:21:24.438	3961fabe-1345-4426-bd8a-ca0a5eac3aac	galaxy	7ab320f2-d974-41a3-a3c4-49eb127ff21e	2026-04-01 23:21:24.463
cc4215bd-0cbc-4874-a074-0e79ad28e771	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2000000	2026-04-02 00:52:51.607	47d9c408-1a3c-46c1-aecf-6f1746615499	galaxy	d1666c09-3181-49aa-bbf3-b350521c6fd6	2026-04-02 00:52:51.635
f0418569-cd72-4f86-bf0e-9bb7015e2b6f	3961fabe-1345-4426-bd8a-ca0a5eac3aac	3000000	2026-04-02 00:52:51.607	47d9c408-1a3c-46c1-aecf-6f1746615499	galaxy	d1666c09-3181-49aa-bbf3-b350521c6fd6	2026-04-02 00:52:51.64
\.


--
-- Data for Name: direct_messages; Type: TABLE DATA; Schema: public; Owner: liveapp
--

COPY public.direct_messages (id, conversation_id, sender_id, message_type, text, media_url, gift_tx_id, is_read, created_at, deleted_by_recipient, deleted_by_sender) FROM stdin;
2c888375-bb9a-43ba-9e3e-9cc858de5d68	a76df74d-06fc-4899-8249-5b4e093ea878	3961fabe-1345-4426-bd8a-ca0a5eac3aac	TEXT	Fhsjcnjnf	\N	\N	t	2026-03-29 09:23:38.264	f	f
90b65cdf-81d5-4c0b-9ab3-924db04e4068	a76df74d-06fc-4899-8249-5b4e093ea878	47d9c408-1a3c-46c1-aecf-6f1746615499	TEXT	kjhgvfhcvfg	\N	\N	t	2026-03-29 09:23:49.406	f	f
7e57ab2a-d194-4a1d-8be5-17b8199a2566	098ccdb1-8375-4e63-93ad-1e90f4605f79	e9134380-2da7-4a1e-bd2a-34398f85a6e5	GIFT	\N	\N	969bb461-0a05-4af2-ace1-b03377d2ae9e	t	2026-03-29 09:24:13.474	f	f
3debe5d9-5562-435f-b46c-45ef23814250	4551ebb6-723c-43a9-a4fd-4d15f91f874a	3961fabe-1345-4426-bd8a-ca0a5eac3aac	TEXT	Yooooooo	\N	\N	t	2026-04-01 09:16:33.882	f	f
27a3dde5-ba84-471f-81c0-446f74759b2e	4551ebb6-723c-43a9-a4fd-4d15f91f874a	281ac0c9-d22b-4ece-895a-9d2c86a8f315	TEXT	Eee	\N	\N	t	2026-04-01 09:17:02.287	f	f
713bd044-e4bb-4903-aadd-b452c92d4784	4551ebb6-723c-43a9-a4fd-4d15f91f874a	3961fabe-1345-4426-bd8a-ca0a5eac3aac	GIFT	\N	\N	3797657a-154b-4f99-b225-dd7cf9fa74be	t	2026-04-01 09:17:38.728	f	f
cfd35e97-12ad-4a97-b831-6abadf42e447	4551ebb6-723c-43a9-a4fd-4d15f91f874a	3961fabe-1345-4426-bd8a-ca0a5eac3aac	GIF	\N	https://media0.giphy.com/media/v1.Y2lkPTQ5NzM2NWZjb3JkeGxtbXhjN2tlYzhrZWIxcWt4eG44c2pxb2hyNTNxNGN0enQ5aSZlcD12MV9naWZzX3RyZW5kaW5nJmN0PWc/xT9IgG50Fb7Mi0prBC/giphy.gif	\N	t	2026-04-01 09:17:46.418	f	f
8cba4f54-1028-4158-b029-863321f7231b	c39a0924-3378-4485-b7ef-dcce70ce4c2e	3961fabe-1345-4426-bd8a-ca0a5eac3aac	TEXT	These	\N	\N	f	2026-04-01 09:33:30.338	f	f
800f223c-5ca6-4e8f-9f19-4f2c43cfd421	4551ebb6-723c-43a9-a4fd-4d15f91f874a	3961fabe-1345-4426-bd8a-ca0a5eac3aac	TEXT	Faded\nDjdhhd\nDubbed\nJdbdbjr	\N	\N	t	2026-04-01 09:36:28.363	f	f
5ab916e1-7606-44d1-92c2-d03d7a2bbbf8	4551ebb6-723c-43a9-a4fd-4d15f91f874a	3961fabe-1345-4426-bd8a-ca0a5eac3aac	TEXT	Djdjd	\N	\N	t	2026-04-01 09:36:30.982	f	f
a53c09a6-d902-4315-b193-d689f9222f25	4551ebb6-723c-43a9-a4fd-4d15f91f874a	281ac0c9-d22b-4ece-895a-9d2c86a8f315	TEXT	Yo	\N	\N	t	2026-04-01 09:36:36.521	f	f
ea967b08-2379-4043-b72a-3a7870464aa6	4551ebb6-723c-43a9-a4fd-4d15f91f874a	281ac0c9-d22b-4ece-895a-9d2c86a8f315	TEXT	Cxff	\N	\N	t	2026-04-01 09:36:47.473	f	f
7ac8f0dc-9fb6-4410-8c38-7a9fc99885f3	4551ebb6-723c-43a9-a4fd-4d15f91f874a	281ac0c9-d22b-4ece-895a-9d2c86a8f315	GIF	\N	https://media3.giphy.com/media/v1.Y2lkPTQ5NzM2NWZjd3kyd2xrbWpxMnp4OXNobDFvZXJsbWM5cnJjcHQ3amRtZDlvOXhuZyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/WcP8r2cJYTwS4/giphy.gif	\N	t	2026-04-01 09:36:58.21	f	f
c7953604-c60c-4ef7-a0d2-cbab09b36611	4551ebb6-723c-43a9-a4fd-4d15f91f874a	281ac0c9-d22b-4ece-895a-9d2c86a8f315	GIF	\N	https://media2.giphy.com/media/v1.Y2lkPTQ5NzM2NWZjNTdmZmE0NTAxYjR1Z2k1eTRqdjlsN3BlYmdobm5keHh6OXJjbnB6dyZlcD12MV9naWZzX3RyZW5kaW5nJmN0PWc/VemBX94obQMfYcKaWX/giphy.gif	\N	t	2026-04-01 09:37:02.043	f	f
ff4c28c1-9dda-4f4c-a5cc-4638f2580d47	4551ebb6-723c-43a9-a4fd-4d15f91f874a	281ac0c9-d22b-4ece-895a-9d2c86a8f315	GIF	\N	https://media4.giphy.com/media/v1.Y2lkPTQ5NzM2NWZjNTdmZmE0NTAxYjR1Z2k1eTRqdjlsN3BlYmdobm5keHh6OXJjbnB6dyZlcD12MV9naWZzX3RyZW5kaW5nJmN0PWc/kQnZt8Zk6rQsw/giphy.gif	\N	t	2026-04-01 09:37:08.411	f	f
94b482f3-d94c-49f9-a2d3-05c20c74449e	4551ebb6-723c-43a9-a4fd-4d15f91f874a	3961fabe-1345-4426-bd8a-ca0a5eac3aac	IMAGE	\N	/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/messages/f08fb330-0142-45ff-8c75-3a8c9a83e710.jpeg	\N	t	2026-04-01 09:37:26.608	f	f
c6774e31-b8e7-494c-b544-cd0011af6e3f	a76df74d-06fc-4899-8249-5b4e093ea878	47d9c408-1a3c-46c1-aecf-6f1746615499	TEXT	sadvasdvsadvsadv	\N	\N	t	2026-04-01 10:55:55.956	f	f
6e867391-1cf2-4920-9573-ed906977d324	1798eda1-ef5f-4629-88af-5c5cacc08d45	9f70646e-c63e-4a08-a4fa-8786204bbf4e	GIFT	\N	\N	c49f67bb-40a9-4738-990a-d3384ddb2b16	t	2026-04-01 10:55:16.488	f	f
1fc6c6d2-123c-4b81-b322-e73092bf58b3	1798eda1-ef5f-4629-88af-5c5cacc08d45	9f70646e-c63e-4a08-a4fa-8786204bbf4e	TEXT	sadfbvdsfb	\N	\N	t	2026-04-01 10:55:22.35	f	f
284e67bb-b2f5-4b07-8a0b-3400a8d55f92	a76df74d-06fc-4899-8249-5b4e093ea878	3961fabe-1345-4426-bd8a-ca0a5eac3aac	TEXT	Gyyu	\N	\N	t	2026-04-01 10:56:50.159	f	f
3d04275c-c731-49be-8608-f6bdf64576be	a76df74d-06fc-4899-8249-5b4e093ea878	47d9c408-1a3c-46c1-aecf-6f1746615499	TEXT	vbdsfb	\N	\N	t	2026-04-01 17:50:46.312	f	f
57ade762-cba5-4d29-80ee-ba722d9b8fcd	a76df74d-06fc-4899-8249-5b4e093ea878	47d9c408-1a3c-46c1-aecf-6f1746615499	TEXT	abab	\N	\N	t	2026-04-01 17:50:47.242	f	f
981495e7-9cb1-4ac1-9df6-026f33dbbe0e	a76df74d-06fc-4899-8249-5b4e093ea878	47d9c408-1a3c-46c1-aecf-6f1746615499	TEXT	sab	\N	\N	t	2026-04-01 17:50:48.515	f	f
f2761324-ac5d-49cc-b63e-f3e55561c04a	a76df74d-06fc-4899-8249-5b4e093ea878	47d9c408-1a3c-46c1-aecf-6f1746615499	TEXT	afbs	\N	\N	t	2026-04-01 17:50:49.76	f	f
6cf5c2af-57a3-47bd-b6ac-055816fca6de	a76df74d-06fc-4899-8249-5b4e093ea878	3961fabe-1345-4426-bd8a-ca0a5eac3aac	TEXT	Durban	\N	\N	t	2026-04-01 17:50:58.743	f	f
079feec2-bf48-4a35-94af-b8dcb2c73758	a76df74d-06fc-4899-8249-5b4e093ea878	3961fabe-1345-4426-bd8a-ca0a5eac3aac	TEXT	Duhr	\N	\N	t	2026-04-01 17:51:01.361	f	f
23bab907-5f00-423e-a2a7-b4a7ca62a8d1	a76df74d-06fc-4899-8249-5b4e093ea878	3961fabe-1345-4426-bd8a-ca0a5eac3aac	TEXT	Djdjd	\N	\N	t	2026-04-01 17:51:03.563	f	f
8bf6f1f9-6da7-4089-adfa-65b09a282fb1	a76df74d-06fc-4899-8249-5b4e093ea878	47d9c408-1a3c-46c1-aecf-6f1746615499	IMAGE	\N	/uploads/47d9c408-1a3c-46c1-aecf-6f1746615499/messages/82d7fcd6-390b-42e8-b65c-52157e096a50.png	\N	t	2026-04-01 17:51:13.691	f	f
28d36dfa-6961-4c18-915f-1a3328f7d134	a76df74d-06fc-4899-8249-5b4e093ea878	3961fabe-1345-4426-bd8a-ca0a5eac3aac	IMAGE	\N	/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/messages/31939699-b69e-40f0-a631-4ab68888763d.jpeg	\N	t	2026-04-01 17:51:35.99	f	f
826997b6-57fa-4b18-9cfb-d566528bdb81	570701d9-c8c0-4b92-9285-f12ed7f5d7e3	3961fabe-1345-4426-bd8a-ca0a5eac3aac	TEXT	Ucucucufufuf	\N	\N	t	2026-04-01 22:15:28.671	t	t
93f1f07f-2d57-417c-b014-284a60b9cba6	570701d9-c8c0-4b92-9285-f12ed7f5d7e3	3961fabe-1345-4426-bd8a-ca0a5eac3aac	GIF	\N	https://media1.giphy.com/media/v1.Y2lkPTQ5NzM2NWZjc3RrajVwY2owenR4c20yOHJzNG01dGI3YTFtNmE4MmR6YjJwd3A3diZlcD12MV9naWZzX3RyZW5kaW5nJmN0PWc/PnMNklcJbLpNo8tlyS/giphy.gif	\N	t	2026-04-01 22:16:44.039	t	t
f77fd506-5a17-4add-83e4-c9b7f258224e	570701d9-c8c0-4b92-9285-f12ed7f5d7e3	3961fabe-1345-4426-bd8a-ca0a5eac3aac	TEXT	Iviviciv	\N	\N	t	2026-04-01 22:17:02.138	t	t
7e0d8862-55e8-45d4-8427-74ddf1d44f42	570701d9-c8c0-4b92-9285-f12ed7f5d7e3	3961fabe-1345-4426-bd8a-ca0a5eac3aac	TEXT	Uviv	\N	\N	t	2026-04-01 22:17:04.907	t	t
16ede933-d8ee-4cda-8a0f-e6426f36658b	570701d9-c8c0-4b92-9285-f12ed7f5d7e3	3961fabe-1345-4426-bd8a-ca0a5eac3aac	IMAGE	\N	/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/messages/58b6d1d4-4b49-4a18-acbd-772d41a198e2.jpeg	\N	t	2026-04-01 22:17:42.559	t	t
e47712c7-6c72-4642-9502-6318b131cc58	570701d9-c8c0-4b92-9285-f12ed7f5d7e3	3961fabe-1345-4426-bd8a-ca0a5eac3aac	GIFT	\N	\N	a646c4e0-2bfb-468f-990e-4f7f0b57dd76	t	2026-04-01 22:19:44.623	t	t
d705cf51-fda1-4a36-86fc-fb36f65b0d7e	570701d9-c8c0-4b92-9285-f12ed7f5d7e3	3961fabe-1345-4426-bd8a-ca0a5eac3aac	GIFT	\N	\N	a489940f-7d4c-433c-87d4-e8e3cd9fc417	t	2026-04-01 22:19:46.661	t	t
8a920a40-2187-4252-9ec7-6ae7cc6330d7	570701d9-c8c0-4b92-9285-f12ed7f5d7e3	c5c904e8-da40-4458-b8bf-5c2cc97348b1	TEXT	Testicle	\N	\N	t	2026-04-01 22:16:24.643	t	t
836e05b4-d644-4eb1-8ecb-df95d889a876	570701d9-c8c0-4b92-9285-f12ed7f5d7e3	c5c904e8-da40-4458-b8bf-5c2cc97348b1	GIF	\N	https://media3.giphy.com/media/v1.Y2lkPTQ5NzM2NWZjd3g1c3JnODk3cmdwN3dnd3lmZzFmMW04cTZwaWt1dmxkYmtrMHlmcCZlcD12MV9naWZzX3RyZW5kaW5nJmN0PWc/Rcl05QJ4WlFiy2DoKT/giphy.gif	\N	t	2026-04-01 22:16:51.051	t	t
b886aa7c-d1b6-4907-9a56-ebd054225b02	570701d9-c8c0-4b92-9285-f12ed7f5d7e3	c5c904e8-da40-4458-b8bf-5c2cc97348b1	TEXT	Heheh	\N	\N	t	2026-04-01 22:17:08.171	t	t
40bb8be2-5b19-4d4b-b2ef-fa966b2bfe5e	570701d9-c8c0-4b92-9285-f12ed7f5d7e3	c5c904e8-da40-4458-b8bf-5c2cc97348b1	TEXT	Ok	\N	\N	t	2026-04-01 22:17:30.024	t	t
0136c2f0-3fab-4f93-bc10-0ddcc6f45e28	570701d9-c8c0-4b92-9285-f12ed7f5d7e3	c5c904e8-da40-4458-b8bf-5c2cc97348b1	TEXT	Hshd	\N	\N	t	2026-04-01 22:17:33.648	t	t
1645e1f2-7d41-4424-875c-0b2a8f8ec149	570701d9-c8c0-4b92-9285-f12ed7f5d7e3	c5c904e8-da40-4458-b8bf-5c2cc97348b1	IMAGE	\N	/uploads/c5c904e8-da40-4458-b8bf-5c2cc97348b1/messages/81f2a087-5cf9-4ec7-b51e-583f54632e2c.jpeg	\N	t	2026-04-01 22:18:05.094	t	t
c63db776-1738-4c8d-a607-a2018f5b2a1f	570701d9-c8c0-4b92-9285-f12ed7f5d7e3	c5c904e8-da40-4458-b8bf-5c2cc97348b1	GIFT	\N	\N	8c9c8878-b340-4cf5-96c9-7cf16cd39291	t	2026-04-01 22:19:35.518	t	t
1638a3a4-5b99-42cc-9efb-5cf0dd305209	570701d9-c8c0-4b92-9285-f12ed7f5d7e3	c5c904e8-da40-4458-b8bf-5c2cc97348b1	IMAGE	\N	/uploads/c5c904e8-da40-4458-b8bf-5c2cc97348b1/messages/42fbee01-8d98-461a-b976-998132d2a35c.png	\N	t	2026-04-01 22:18:24.451	t	t
bfa667c3-eb1a-42a3-94ef-53dfb45ae552	570701d9-c8c0-4b92-9285-f12ed7f5d7e3	3961fabe-1345-4426-bd8a-ca0a5eac3aac	GIFT	\N	\N	77658a63-a58e-4ee2-a28c-7bd875161d55	t	2026-04-01 22:19:48.259	t	t
6033a3bd-b1b7-4326-ac65-8155c0cba610	570701d9-c8c0-4b92-9285-f12ed7f5d7e3	3961fabe-1345-4426-bd8a-ca0a5eac3aac	TEXT	Civi	\N	\N	t	2026-04-01 22:17:07.735	t	t
9dfa2d5f-7643-4672-a0a0-8115223e8300	570701d9-c8c0-4b92-9285-f12ed7f5d7e3	3961fabe-1345-4426-bd8a-ca0a5eac3aac	TEXT	Yvuvuvu	\N	\N	t	2026-04-01 22:21:58.204	f	f
c63dd6ba-df5e-4206-aca3-96ec04d89e89	4551ebb6-723c-43a9-a4fd-4d15f91f874a	3961fabe-1345-4426-bd8a-ca0a5eac3aac	TEXT	Ucucjc	\N	\N	t	2026-04-01 23:15:35.34	f	f
\.


--
-- Data for Name: gift_transactions; Type: TABLE DATA; Schema: public; Owner: liveapp
--

COPY public.gift_transactions (id, stream_id, gift_id, sender_user_id, recipient_user_id, coin_cost, diamond_value, created_at) FROM stdin;
718ed453-19c5-4457-a1bf-621958a58757	f95d9d98-2a21-4211-bda1-11573a7c3af5	crown_goat	e9134380-2da7-4a1e-bd2a-34398f85a6e5	3961fabe-1345-4426-bd8a-ca0a5eac3aac	250	250	2026-03-29 09:20:53.057
6f0f2a5c-330d-43f7-915f-c1da6f93d4d1	f95d9d98-2a21-4211-bda1-11573a7c3af5	dragon_egg	e9134380-2da7-4a1e-bd2a-34398f85a6e5	3961fabe-1345-4426-bd8a-ca0a5eac3aac	5000	5000	2026-03-29 09:21:12.347
79e29532-aba9-467c-a9a2-3204e6315258	f95d9d98-2a21-4211-bda1-11573a7c3af5	dragon_egg	3961fabe-1345-4426-bd8a-ca0a5eac3aac	e9134380-2da7-4a1e-bd2a-34398f85a6e5	5000	5000	2026-03-29 09:21:32.556
255de527-d350-44ae-a635-a951084022d4	f95d9d98-2a21-4211-bda1-11573a7c3af5	crown_goat	e9134380-2da7-4a1e-bd2a-34398f85a6e5	3961fabe-1345-4426-bd8a-ca0a5eac3aac	250	250	2026-03-29 09:21:55.858
cca49029-ec80-417a-aba7-7e2922cf48a9	f95d9d98-2a21-4211-bda1-11573a7c3af5	dragon_egg	e9134380-2da7-4a1e-bd2a-34398f85a6e5	3961fabe-1345-4426-bd8a-ca0a5eac3aac	5000	5000	2026-03-29 09:22:01.875
c530dd89-6942-4620-9c0b-6853e1448775	f95d9d98-2a21-4211-bda1-11573a7c3af5	dragon_egg	e9134380-2da7-4a1e-bd2a-34398f85a6e5	3961fabe-1345-4426-bd8a-ca0a5eac3aac	5000	5000	2026-03-29 09:22:08.535
13d439e6-2551-4e7e-b6e6-b297270b9cde	f95d9d98-2a21-4211-bda1-11573a7c3af5	crown_goat	e9134380-2da7-4a1e-bd2a-34398f85a6e5	3961fabe-1345-4426-bd8a-ca0a5eac3aac	250	250	2026-03-29 09:22:12.34
969bb461-0a05-4af2-ace1-b03377d2ae9e	\N	crown_goat	e9134380-2da7-4a1e-bd2a-34398f85a6e5	3961fabe-1345-4426-bd8a-ca0a5eac3aac	250	250	2026-03-29 09:24:13.446
d184d94c-c082-4c64-8d00-f2d768a6e469	e7c18482-912b-4e3d-936b-ce153022829e	galaxy	3961fabe-1345-4426-bd8a-ca0a5eac3aac	281ac0c9-d22b-4ece-895a-9d2c86a8f315	1000000	1000000	2026-04-01 09:15:47.043
0604a41d-f20d-4c83-8ed2-2269cdba7d63	e7c18482-912b-4e3d-936b-ce153022829e	rose	3961fabe-1345-4426-bd8a-ca0a5eac3aac	281ac0c9-d22b-4ece-895a-9d2c86a8f315	10	10	2026-04-01 09:16:20.404
3797657a-154b-4f99-b225-dd7cf9fa74be	\N	dragon_egg	3961fabe-1345-4426-bd8a-ca0a5eac3aac	281ac0c9-d22b-4ece-895a-9d2c86a8f315	5000	5000	2026-04-01 09:17:38.718
19fd3eea-9a82-4014-a4e5-c70c5c4ff8ae	c54155e7-1039-4597-b336-3a7097a63284	rose	281ac0c9-d22b-4ece-895a-9d2c86a8f315	3961fabe-1345-4426-bd8a-ca0a5eac3aac	10	10	2026-04-01 09:25:24.52
bc2f4918-37d3-4ade-8dce-1193fcf6f6a1	c54155e7-1039-4597-b336-3a7097a63284	galaxy	281ac0c9-d22b-4ece-895a-9d2c86a8f315	3961fabe-1345-4426-bd8a-ca0a5eac3aac	1000000	1000000	2026-04-01 09:25:30.938
6edb75ae-20c2-4652-b644-158e5caa1e60	2d2e25f5-33bd-4adf-b69e-150d53b5b108	galaxy	3961fabe-1345-4426-bd8a-ca0a5eac3aac	281ac0c9-d22b-4ece-895a-9d2c86a8f315	1000000	1000000	2026-04-01 09:30:04.943
785dfbec-cc36-4019-9e6b-00470749d2ed	2d2e25f5-33bd-4adf-b69e-150d53b5b108	galaxy	3961fabe-1345-4426-bd8a-ca0a5eac3aac	281ac0c9-d22b-4ece-895a-9d2c86a8f315	1000000	1000000	2026-04-01 09:30:06.537
6a1d1793-29b4-46a4-b3a4-da83348c7926	2d2e25f5-33bd-4adf-b69e-150d53b5b108	galaxy	3961fabe-1345-4426-bd8a-ca0a5eac3aac	281ac0c9-d22b-4ece-895a-9d2c86a8f315	1000000	1000000	2026-04-01 09:30:07.764
6805c424-c5f5-4e83-a324-363d95cb8bd7	2d2e25f5-33bd-4adf-b69e-150d53b5b108	galaxy	3961fabe-1345-4426-bd8a-ca0a5eac3aac	281ac0c9-d22b-4ece-895a-9d2c86a8f315	1000000	1000000	2026-04-01 09:30:08.88
a4e64831-2f1a-461b-a2b1-36784ddf2550	2d2e25f5-33bd-4adf-b69e-150d53b5b108	galaxy	3961fabe-1345-4426-bd8a-ca0a5eac3aac	281ac0c9-d22b-4ece-895a-9d2c86a8f315	1000000	1000000	2026-04-01 09:30:10.247
659c52b9-e263-4154-a2b1-274e7296d25e	2d2e25f5-33bd-4adf-b69e-150d53b5b108	galaxy	3961fabe-1345-4426-bd8a-ca0a5eac3aac	281ac0c9-d22b-4ece-895a-9d2c86a8f315	1000000	1000000	2026-04-01 09:30:11.427
d3dfb248-e464-4b9c-840f-ebc3bc0bb43b	2d2e25f5-33bd-4adf-b69e-150d53b5b108	galaxy	3961fabe-1345-4426-bd8a-ca0a5eac3aac	281ac0c9-d22b-4ece-895a-9d2c86a8f315	1000000	1000000	2026-04-01 09:30:12.65
c49f67bb-40a9-4738-990a-d3384ddb2b16	\N	galaxy	9f70646e-c63e-4a08-a4fa-8786204bbf4e	3961fabe-1345-4426-bd8a-ca0a5eac3aac	1000000	1000000	2026-04-01 10:55:16.473
0a1126f0-63eb-4fa9-9b82-621e237b5d18	8fc0ae7c-4c43-46b0-aac9-44e8469aeb49	galaxy	3961fabe-1345-4426-bd8a-ca0a5eac3aac	c5c904e8-da40-4458-b8bf-5c2cc97348b1	1000000	1000000	2026-04-01 22:09:51.636
8c9c8878-b340-4cf5-96c9-7cf16cd39291	\N	rose	c5c904e8-da40-4458-b8bf-5c2cc97348b1	3961fabe-1345-4426-bd8a-ca0a5eac3aac	10	10	2026-04-01 22:19:35.507
a646c4e0-2bfb-468f-990e-4f7f0b57dd76	\N	galaxy	3961fabe-1345-4426-bd8a-ca0a5eac3aac	c5c904e8-da40-4458-b8bf-5c2cc97348b1	1000000	1000000	2026-04-01 22:19:44.612
a489940f-7d4c-433c-87d4-e8e3cd9fc417	\N	galaxy	3961fabe-1345-4426-bd8a-ca0a5eac3aac	c5c904e8-da40-4458-b8bf-5c2cc97348b1	1000000	1000000	2026-04-01 22:19:46.652
77658a63-a58e-4ee2-a28c-7bd875161d55	\N	galaxy	3961fabe-1345-4426-bd8a-ca0a5eac3aac	c5c904e8-da40-4458-b8bf-5c2cc97348b1	1000000	1000000	2026-04-01 22:19:48.251
9f61bf5e-d73f-473d-9b1a-3d5315791b68	8932ebc4-876d-4cb4-8fbe-d59e05767546	galaxy	47d9c408-1a3c-46c1-aecf-6f1746615499	c5c904e8-da40-4458-b8bf-5c2cc97348b1	1000000	1000000	2026-04-01 22:35:50.542
2a3cb0ff-e485-4231-a931-e28c5e0ca269	8932ebc4-876d-4cb4-8fbe-d59e05767546	dragon_egg	47d9c408-1a3c-46c1-aecf-6f1746615499	c5c904e8-da40-4458-b8bf-5c2cc97348b1	5000	5000	2026-04-01 22:35:52.265
9f19614b-fdb8-49be-84a9-fec3e17f99b7	8932ebc4-876d-4cb4-8fbe-d59e05767546	crown_goat	47d9c408-1a3c-46c1-aecf-6f1746615499	c5c904e8-da40-4458-b8bf-5c2cc97348b1	250	250	2026-04-01 22:35:53.944
25a8efa8-edab-4eee-838b-8f3941f33ec6	b524fe7d-3e1a-42cc-9ab8-6c873b378fe0	galaxy	3961fabe-1345-4426-bd8a-ca0a5eac3aac	281ac0c9-d22b-4ece-895a-9d2c86a8f315	1000000	1000000	2026-04-01 23:21:16.759
7ab320f2-d974-41a3-a3c4-49eb127ff21e	b524fe7d-3e1a-42cc-9ab8-6c873b378fe0	galaxy	3961fabe-1345-4426-bd8a-ca0a5eac3aac	281ac0c9-d22b-4ece-895a-9d2c86a8f315	1000000	1000000	2026-04-01 23:21:24.438
d1666c09-3181-49aa-bbf3-b350521c6fd6	a1587cc4-753b-4449-ab03-823d0b214d7e	galaxy	47d9c408-1a3c-46c1-aecf-6f1746615499	3961fabe-1345-4426-bd8a-ca0a5eac3aac	1000000	1000000	2026-04-02 00:52:51.607
\.


--
-- Data for Name: gifts; Type: TABLE DATA; Schema: public; Owner: liveapp
--

COPY public.gifts (id, name, diamond_value, coin_cost, media_url, media_type, is_big_gift, created_at, updated_at) FROM stdin;
rose	Rose	10	10	/gifts/rose.png	IMAGE	f	2026-03-29 09:20:38.77	2026-03-29 09:20:38.77
crown_goat	Crowned Goat	250	250	/gifts/crowned-goat.gif	GIF	f	2026-03-29 09:20:38.781	2026-03-29 09:20:38.781
dragon_egg	Dragon Egg Hatch	5000	5000	/gifts/dragon-egg.mp4	VIDEO	t	2026-03-29 09:20:38.789	2026-03-29 09:20:38.789
galaxy	Galaxy	1000000	1000000	/gifts/galaxy.mp4	VIDEO	t	2026-03-29 09:20:38.796	2026-03-29 09:20:38.796
\.


--
-- Data for Name: moderation_actions; Type: TABLE DATA; Schema: public; Owner: liveapp
--

COPY public.moderation_actions (id, stream_id, action, target_user_id, actor_user_id, reason, duration_seconds, expires_at, created_at) FROM stdin;
\.


--
-- Data for Name: payout_requests; Type: TABLE DATA; Schema: public; Owner: liveapp
--

COPY public.payout_requests (id, user_id, diamond_amount, net_amount_cents, status, payment_method, payment_details, admin_notes, created_at, updated_at, processed_at) FROM stdin;
\.


--
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: liveapp
--

COPY public.profiles (user_id, display_name, bio, avatar_url, banner_url, links_json, created_at, updated_at, wifw, badge_label, badge_tone, show_badge_on_profile) FROM stdin;
47d9c408-1a3c-46c1-aecf-6f1746615499	JamesConnor	\N	\N	\N	\N	2026-03-29 09:13:50.244	2026-03-29 09:13:50.244	\N	\N	\N	t
9f70646e-c63e-4a08-a4fa-8786204bbf4e	SarahOconnor	\N	\N	\N	\N	2026-03-29 09:20:01.306	2026-03-29 09:20:01.306	\N	\N	\N	t
e9134380-2da7-4a1e-bd2a-34398f85a6e5	FrankSinatra	\N	\N	\N	\N	2026-03-29 09:20:32.035	2026-03-29 09:20:32.035	\N	\N	\N	t
281ac0c9-d22b-4ece-895a-9d2c86a8f315	ChiDotGo	\N	\N	\N	\N	2026-04-01 09:09:37.327	2026-04-01 09:09:37.327	\N	\N	\N	t
7e2a5e6d-7021-482a-abeb-883f8ebf016b	JohnFranklin	\N	\N	\N	\N	2026-04-01 09:25:00.648	2026-04-01 09:25:00.648	\N	\N	\N	t
ee45a65d-1fea-4dae-96e6-cc0413c24c5a	ChrisKringle	\N	\N	\N	\N	2026-04-01 09:25:26.053	2026-04-01 09:25:26.053	\N	\N	\N	t
c5c904e8-da40-4458-b8bf-5c2cc97348b1	Dandy	Skeez boss\n	/uploads/c5c904e8-da40-4458-b8bf-5c2cc97348b1/profile/bd62590a-8852-4bd1-8e2b-52b099fa4f3e.jpeg	/uploads/c5c904e8-da40-4458-b8bf-5c2cc97348b1/cover/c241ed1d-cecf-4ced-95df-67ae7863c204.jpeg	null	2026-04-01 22:08:38.468	2026-04-01 22:25:29.2	[]	\N	\N	t
199cecb0-a797-4677-a949-f23276e5c330	DummyAccount	\N	/uploads/199cecb0-a797-4677-a949-f23276e5c330/profile/20df1e98-a425-48ff-ac93-d537a7db7d9f.jpeg		null	2026-04-03 10:40:35.192	2026-04-03 10:40:47.542	[]	\N	\N	t
3961fabe-1345-4426-bd8a-ca0a5eac3aac	🎬 H!M	FUCK OFF MY PAGE BITCH	/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/profile/2cf4ac5f-7609-4326-8182-b41318e9956f.png	/uploads/3961fabe-1345-4426-bd8a-ca0a5eac3aac/cover/f4081f34-b275-43e0-80f1-5a64351f6cf5.jpeg	{"website": "https://sparkzlive.com"}	2026-03-29 09:09:09.167	2026-04-04 06:34:38.768	[]	Biggest Sugar Daddy	red	t
\.


--
-- Data for Name: purchase_orders; Type: TABLE DATA; Schema: public; Owner: liveapp
--

COPY public.purchase_orders (id, user_id, package_id, provider, status, idempotency_key, provider_ref, coins, price_cents, currency, created_at, updated_at, paid_at, fulfilled_at) FROM stdin;
d240f2cf-f148-4a9f-9d1e-9fd5fe345019	3961fabe-1345-4426-bd8a-ca0a5eac3aac	coins_18998	DEV	FULFILLED	store_coins_18998_3d302713-08ea-47eb-b19d-65f07931b29c	free_dev:store_coins_18998_3d302713-08ea-47eb-b19d-65f07931b29c	18998	0	USD	2026-04-03 09:24:33.888	2026-04-03 09:24:33.916	2026-04-03 09:24:33.886	2026-04-03 09:24:33.915
2fa07d05-ee72-4dae-b758-501e7cc0282b	3961fabe-1345-4426-bd8a-ca0a5eac3aac	dev_10000000	DEV	FULFILLED	store_dev_10000000_96262901-c3d5-46d4-ac2b-195635e47ec4	free_dev:store_dev_10000000_96262901-c3d5-46d4-ac2b-195635e47ec4	10000000	0	USD	2026-04-04 03:56:19.775	2026-04-04 03:56:19.805	2026-04-04 03:56:19.774	2026-04-04 03:56:19.803
799fe914-8534-4ca4-a206-81fe413d5c7e	3961fabe-1345-4426-bd8a-ca0a5eac3aac	dev_10000000	DEV	FULFILLED	store_dev_10000000_e0cbf040-ca4c-4d7d-aed7-570f986a9570	free_dev:store_dev_10000000_e0cbf040-ca4c-4d7d-aed7-570f986a9570	10000000	0	USD	2026-04-04 06:31:30.587	2026-04-04 06:31:30.637	2026-04-04 06:31:30.586	2026-04-04 06:31:30.635
1a387ec2-b9b5-4931-bae6-1d411c2a0ac1	3961fabe-1345-4426-bd8a-ca0a5eac3aac	dev_10000000	DEV	FULFILLED	store_dev_10000000_51cd1def-6759-47b2-8b82-581d4a299813	free_dev:store_dev_10000000_51cd1def-6759-47b2-8b82-581d4a299813	10000000	0	USD	2026-04-04 06:34:38.726	2026-04-04 06:34:38.772	2026-04-04 06:34:38.724	2026-04-04 06:34:38.77
\.


--
-- Data for Name: push_device_tokens; Type: TABLE DATA; Schema: public; Owner: liveapp
--

COPY public.push_device_tokens (id, user_id, expo_push_token, platform, device_id, is_active, last_registered_at, last_sent_at, last_error, disabled_at, created_at, updated_at) FROM stdin;
aa94be54-1e54-4fad-9f71-0f3bec74b85c	e9134380-2da7-4a1e-bd2a-34398f85a6e5	ExponentPushToken[5gpy2-OZV8kSC3P7dUtqVx]	ANDROID	\N	t	2026-03-29 09:20:32.428	\N	\N	\N	2026-03-29 09:14:40.691	2026-03-29 09:20:32.43
47b77306-757d-4c51-96dc-c309b9bd84a1	3961fabe-1345-4426-bd8a-ca0a5eac3aac	ExponentPushToken[J77Bq_BaQIKCGlreIxkD0L]	ANDROID	\N	t	2026-04-01 08:10:01.224	2026-04-03 02:54:31.353	\N	\N	2026-04-01 05:59:16.818	2026-04-03 02:54:31.355
bb99e671-c1c1-4635-aa19-467466fbf609	3961fabe-1345-4426-bd8a-ca0a5eac3aac	ExponentPushToken[zc59LsJ8LSllzpzgX4nYs7]	ANDROID	\N	t	2026-04-01 08:19:55.564	2026-04-03 02:54:31.353	\N	\N	2026-04-01 08:19:55.565	2026-04-03 02:54:31.355
f6d06384-bea4-4cec-812a-4bf84978d9fd	3961fabe-1345-4426-bd8a-ca0a5eac3aac	ExponentPushToken[oGIBTuNAeRgAqxedCRK4AY]	ANDROID	\N	t	2026-03-30 01:27:02.688	2026-04-03 02:54:31.353	\N	\N	2026-03-29 09:09:11.185	2026-04-03 02:54:31.355
211faf9b-790d-4961-bb2d-952dba35c2a0	3961fabe-1345-4426-bd8a-ca0a5eac3aac	ExponentPushToken[-21kOvPXz_nO2uBPXHvjJA]	ANDROID	\N	t	2026-04-01 04:33:28.46	2026-04-03 02:54:31.353	\N	\N	2026-04-01 04:33:28.462	2026-04-03 02:54:31.355
0ef664e9-afba-42e0-b8ec-9dd7da023a0c	3961fabe-1345-4426-bd8a-ca0a5eac3aac	ExponentPushToken[GzeuSsKL0VFL7bkoCE6QCT]	ANDROID	\N	t	2026-03-29 16:50:24.478	2026-04-03 02:54:31.353	\N	\N	2026-03-29 16:50:24.463	2026-04-03 02:54:31.355
655fb3ca-e612-4c26-90bb-0585cbfce9b6	e9134380-2da7-4a1e-bd2a-34398f85a6e5	ExponentPushToken[ZWsIfNNba3PRq8C4LANR7P]	ANDROID	\N	t	2026-04-01 09:22:51.79	\N	\N	\N	2026-04-01 09:22:51.758	2026-04-01 09:22:51.792
47a8e14e-5574-447e-8f1c-77a0231a51ef	7e2a5e6d-7021-482a-abeb-883f8ebf016b	ExponentPushToken[1FOaPFIoaoP5skimeS2pT1]	ANDROID	\N	t	2026-04-01 09:25:01.812	\N	\N	\N	2026-04-01 09:25:01.785	2026-04-01 09:25:01.814
e053cb0c-2a8b-461a-a822-6118d36a8818	ee45a65d-1fea-4dae-96e6-cc0413c24c5a	ExponentPushToken[9P1AyVI3bPg3n-Y5v_7upF]	ANDROID	\N	t	2026-04-01 09:25:26.752	\N	\N	\N	2026-04-01 09:25:26.72	2026-04-01 09:25:26.753
be7fd86d-0162-4386-b6c3-356c8a9d4bd5	47d9c408-1a3c-46c1-aecf-6f1746615499	ExponentPushToken[8vAZiyBxgjoRT7Eph-7Y3f]	ANDROID	\N	t	2026-03-29 15:28:49.916	2026-04-04 06:22:06.232	\N	\N	2026-03-29 09:14:55.639	2026-04-04 06:22:06.234
30f45054-3acb-4853-ac1b-b231105965f6	47d9c408-1a3c-46c1-aecf-6f1746615499	ExponentPushToken[ewSmuZMCEsdeH_3YHBqHCy]	ANDROID	\N	t	2026-04-01 06:00:53.879	2026-04-04 06:22:06.232	\N	\N	2026-04-01 05:55:54.582	2026-04-04 06:22:06.234
ddb12019-6f3e-4a93-b0ed-48d407d9c885	281ac0c9-d22b-4ece-895a-9d2c86a8f315	ExponentPushToken[BhK5WfEmVWxEUtrgZvW9ie]	ANDROID	\N	t	2026-04-02 23:17:06.85	2026-04-04 06:22:06.232	\N	\N	2026-04-01 09:09:40.574	2026-04-04 06:22:06.234
70b04fbf-e5bb-4e93-a970-fcebd96c00b0	9f70646e-c63e-4a08-a4fa-8786204bbf4e	ExponentPushToken[F-Q-KnETMXLwYUYT8gxu27]	ANDROID	\N	t	2026-03-29 09:20:01.754	2026-04-04 06:22:06.232	\N	\N	2026-03-29 09:13:29.165	2026-04-04 06:22:06.234
ba6fc166-c28c-4d0f-b183-8e8b6302c04a	199cecb0-a797-4677-a949-f23276e5c330	ExponentPushToken[Y_PAvtJk1u9PI5yRgJ4CKA]	ANDROID	\N	t	2026-04-04 09:22:23.255	2026-04-03 02:54:31.353	\N	\N	2026-04-01 10:53:39.946	2026-04-04 09:22:23.256
9e72edf1-8001-44e0-8b05-05e4a357436c	e9134380-2da7-4a1e-bd2a-34398f85a6e5	ExponentPushToken[2-_d_VObCGCHi5Cy5TQSgx]	ANDROID	\N	t	2026-04-04 09:22:39.827	\N	\N	\N	2026-04-02 06:57:21.999	2026-04-04 09:22:39.829
ec68ec24-2e79-4003-9d73-27fd6a029191	3961fabe-1345-4426-bd8a-ca0a5eac3aac	ExponentPushToken[4gkrXMGC6yOdJ81irG_-zQ]	ANDROID	\N	t	2026-04-04 09:23:14.428	2026-04-03 02:08:04.247	\N	\N	2026-04-01 18:40:12.216	2026-04-04 09:23:14.429
6f729878-47a5-4a86-8b85-27342f473f97	9f70646e-c63e-4a08-a4fa-8786204bbf4e	ExponentPushToken[xgPAPsFZIhEYSFweaN-aXT]	ANDROID	\N	t	2026-04-01 10:53:31.426	2026-04-04 06:22:06.232	\N	\N	2026-04-01 10:53:31.389	2026-04-04 06:22:06.234
d83a1000-a647-4ba2-ae99-3a03f685664b	9f70646e-c63e-4a08-a4fa-8786204bbf4e	ExponentPushToken[zjOAaSBXfMn2q019c0__AP]	ANDROID	\N	t	2026-04-04 06:30:55.752	2026-04-04 06:22:06.232	\N	\N	2026-04-01 17:50:37.354	2026-04-04 06:30:55.753
985e2da2-39af-4cd7-8f78-37bb1c5389f5	c5c904e8-da40-4458-b8bf-5c2cc97348b1	ExponentPushToken[l5HPWjGW7MSVXa4tb0TlBs]	ANDROID	\N	t	2026-04-02 20:23:41.41	\N	\N	\N	2026-04-01 23:09:14.475	2026-04-02 20:23:41.411
cf77bfdb-2ac4-4704-b919-1bb83979dcef	3961fabe-1345-4426-bd8a-ca0a5eac3aac	ExponentPushToken[Y_YUxsMDiZ6aC2PFtNP14R]	ANDROID	\N	t	2026-03-29 17:36:12.662	2026-04-03 02:54:31.353	\N	\N	2026-03-29 17:36:12.658	2026-04-03 02:54:31.355
2107fc3e-0c94-4aa1-bd78-ab87bbd5976d	3961fabe-1345-4426-bd8a-ca0a5eac3aac	ExponentPushToken[40m15xFuL8ErQBvOU1Ek7N]	ANDROID	\N	t	2026-04-01 00:11:50.695	2026-04-03 02:54:31.353	\N	\N	2026-03-30 02:14:39.443	2026-04-03 02:54:31.355
c3a4eb8d-5ec8-43e1-bb4a-287ace5024a1	3961fabe-1345-4426-bd8a-ca0a5eac3aac	ExponentPushToken[dYnuFZGX27_y4CHBC_Fzdu]	ANDROID	\N	t	2026-04-03 02:07:59.29	2026-04-03 02:54:31.353	\N	\N	2026-04-01 08:41:13.355	2026-04-03 02:54:31.355
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: public; Owner: liveapp
--

COPY public.refresh_tokens (id, user_id, token_hash, revoked_at, expires_at, created_at) FROM stdin;
24c3c043-2706-4658-b613-e9cd06955f7b	3961fabe-1345-4426-bd8a-ca0a5eac3aac	f042051e6957793ca5757647d8dc7cafc274364564099b62cc331a888edb36f5	2026-03-29 09:13:33.511	2026-04-05 09:13:28.828	2026-03-29 09:13:28.83
c5d11e72-b760-4d48-bd5d-931457f5563f	47d9c408-1a3c-46c1-aecf-6f1746615499	38337cf0dceb9ba285be888a27619ea761e36425c4f5da7f9097cc693d2653a0	2026-03-29 09:19:37.43	2026-04-05 09:13:50.264	2026-03-29 09:13:50.265
be607adb-528f-4440-bf8c-e14d83d6d49d	47d9c408-1a3c-46c1-aecf-6f1746615499	c29faf0b2c61a28bade41c977fd2a4a1f72d3ac21b6b5310bf8405c21e26779f	2026-03-29 09:20:14.662	2026-04-05 09:14:40.385	2026-03-29 09:14:40.386
464c40a1-196d-493c-ba07-9ce9fe0b4502	e9134380-2da7-4a1e-bd2a-34398f85a6e5	4ac1911ffc888de5b3247ee1590c4f3443d74199f78688f4212be214186594a5	\N	2026-04-05 09:20:32.057	2026-03-29 09:20:32.059
db332467-c48b-4478-8b70-39ad4b3df2d5	3961fabe-1345-4426-bd8a-ca0a5eac3aac	72d443daa10f030a47c62ed873102e5239da7ec5d329744b78f1439c718b6201	2026-03-29 09:24:09.31	2026-04-05 09:09:09.215	2026-03-29 09:09:09.218
85040146-24e6-4c6e-a399-cc5d9d646065	47d9c408-1a3c-46c1-aecf-6f1746615499	13e4ec4948c77c748fd6a3c88d7b4eaa067b6cf99abf92846dcaf437693bfa04	2026-03-29 15:07:50.221	2026-04-05 09:14:55.326	2026-03-29 09:14:55.328
dcbbc406-6df4-4e89-a8c1-2e0e2f3371a5	47d9c408-1a3c-46c1-aecf-6f1746615499	729319aa189305e1301f2aa136067a9f3efb4a601baab1759cac2a4f6af41d3d	2026-03-29 15:28:49.382	2026-04-05 15:07:50.257	2026-03-29 15:07:50.259
f2ce9400-328a-469f-b4ee-57d0f86374d4	47d9c408-1a3c-46c1-aecf-6f1746615499	f8a0544f1d684e3a074f249fe71ad888b33514d3cc6fd9abec855e66189be099	2026-03-29 15:43:52.119	2026-04-05 15:28:49.414	2026-03-29 15:28:49.416
972d2bb1-6b4c-4d1a-8333-0a06af21deee	47d9c408-1a3c-46c1-aecf-6f1746615499	23c834ca457df4130b371f293900a308d91eb8df23ecb8d9ada462dc8d09a679	2026-03-29 15:59:13.321	2026-04-05 15:43:52.146	2026-03-29 15:43:52.148
c9703b1f-0672-4d1b-bec5-e6d14dba6a92	47d9c408-1a3c-46c1-aecf-6f1746615499	9f969a83ac011c793f2f76a235d308de71b58416bbcb048961ba2d00b79240fe	2026-03-29 16:14:15.875	2026-04-05 15:59:13.357	2026-03-29 15:59:13.359
e27bec2c-d8e2-47c7-a4ec-6d8c272f9ef8	47d9c408-1a3c-46c1-aecf-6f1746615499	c120856e8f77760aad11b673b5956d3e7701167bcc08f481c87704cb4f55b0bb	2026-03-29 16:29:16.226	2026-04-05 16:14:15.91	2026-03-29 16:14:15.912
7d0ec1d2-781a-41ff-b851-38ce90fbf64c	47d9c408-1a3c-46c1-aecf-6f1746615499	5f9d960ce10885b0c25748c1041644e5f62eb569194df759be56c6dd5e58f5ab	2026-03-29 16:44:18.217	2026-04-05 16:29:16.258	2026-03-29 16:29:16.26
3f11a53c-a3cf-4d96-8bf7-4b5930118518	47d9c408-1a3c-46c1-aecf-6f1746615499	c6216a24f4ef46e4ea24daec146ce6a0d219529a66b1c378288a579b2431c123	\N	2026-04-05 16:44:18.276	2026-03-29 16:44:18.278
7b20b63e-d0dd-4741-ac90-04823fb62108	9f70646e-c63e-4a08-a4fa-8786204bbf4e	fc14db1ed30618ce7ac7d6aedbdb8314829b85df2b854e33f8595aebe3022a75	2026-03-29 16:49:28.438	2026-04-05 09:20:01.327	2026-03-29 09:20:01.328
bf6be385-0ef1-43a6-bef1-ad994591740f	3961fabe-1345-4426-bd8a-ca0a5eac3aac	f70e98aa27c3da7cb64892d467018fa3f1fbdfba55255cc85b6d9f0ba1685e3c	2026-03-29 17:05:24.559	2026-04-05 16:50:23.523	2026-03-29 16:50:23.525
f70e19fc-a791-4a65-80df-be896c75bebf	3961fabe-1345-4426-bd8a-ca0a5eac3aac	10d1154b9c2080566ef5fc99c0d7d8f474d58edd4189b608610236da1ff5dff9	2026-03-29 17:20:26.52	2026-04-05 17:05:24.587	2026-03-29 17:05:24.589
0d57b60f-6e60-4f1e-8fc9-7500837d2ce4	3961fabe-1345-4426-bd8a-ca0a5eac3aac	35d923a16c4510e5dbf431b7ab2db948c72791270e0914e2e020a8b597ec9e85	2026-03-29 17:35:28.365	2026-04-05 17:20:26.548	2026-03-29 17:20:26.55
59069250-811c-470c-ab5a-ec6c37fa8b4d	3961fabe-1345-4426-bd8a-ca0a5eac3aac	b4bb35a022912e5ffaf91d4e9c8660158d2cf1d24620381101a160e19c1f31c5	\N	2026-04-05 17:35:28.393	2026-03-29 17:35:28.395
cb330e8e-259b-4bc8-93c9-0aa1aba27f87	3961fabe-1345-4426-bd8a-ca0a5eac3aac	4f4bb3b41dc491bdfe711845585c600284fe84dbb59a749eadbb01f8cd048966	2026-03-29 17:38:40.847	2026-04-05 09:24:09.334	2026-03-29 09:24:09.336
5745c7b6-d872-43df-81d9-4d1e0277fa03	3961fabe-1345-4426-bd8a-ca0a5eac3aac	c5468c6d188808c3f118f770c93e2f59a50ce0fff991f37275854b6a4beaaefa	2026-03-29 17:38:41.688	2026-04-05 17:38:40.868	2026-03-29 17:38:40.87
0a3d38f7-62db-4533-abf0-fe65861712ea	3961fabe-1345-4426-bd8a-ca0a5eac3aac	fa18b61cc85006047dda27e5f5572b8db7955b5e15c8a857c466e8f8fce3a725	2026-03-29 17:51:13.62	2026-04-05 17:36:12.134	2026-03-29 17:36:12.136
44418c37-bb3f-4b81-8647-1cb05aa9fdf7	3961fabe-1345-4426-bd8a-ca0a5eac3aac	ee3954f6b73be00d1ba8d1a50da13882de0310740564b7ab50e31683a5a69ed8	2026-03-29 18:06:15.589	2026-04-05 17:51:13.654	2026-03-29 17:51:13.656
46aebd49-6e97-44d4-b1d5-48b0b1efdc2c	3961fabe-1345-4426-bd8a-ca0a5eac3aac	42b0b32cc80bdf7816f59a19d989dffc47fca108ba79b86d1273565a842bc4e9	2026-03-29 18:21:17.546	2026-04-05 18:06:15.618	2026-03-29 18:06:15.62
0ca7a9b3-1c72-4607-a42b-54993bf64e3d	3961fabe-1345-4426-bd8a-ca0a5eac3aac	be418b4a652b7fccc8b4499c4e024f2980b0c5e646a0a4ee51a34982b578abf7	2026-03-29 18:36:19.492	2026-04-05 18:21:17.577	2026-03-29 18:21:17.579
a42b1d24-bad6-4168-8f74-e2c2ad30cc31	3961fabe-1345-4426-bd8a-ca0a5eac3aac	f88ba7cea369fa28d3fe3687138921ab8f1f50ae52177df44b9f260e0bd7d302	2026-03-29 18:51:21.426	2026-04-05 18:36:19.525	2026-03-29 18:36:19.527
d7c5a640-8e1d-4185-951b-88daf9020377	3961fabe-1345-4426-bd8a-ca0a5eac3aac	3f7fd3d089d673e75d998706696b40fcc8b967db4a55b6307620cdc51968c6e1	2026-03-29 19:06:23.4	2026-04-05 18:51:21.456	2026-03-29 18:51:21.458
ccb1e33e-4e5f-4ec7-a450-d8202ae92b0b	3961fabe-1345-4426-bd8a-ca0a5eac3aac	738c73371aba5f4ab835e54056524f3ae341b38915c6d9f7a0b84acf29953db6	2026-03-29 19:21:25.337	2026-04-05 19:06:23.432	2026-03-29 19:06:23.434
193ccf9c-ed5c-44a2-9da8-25f88df5e24f	3961fabe-1345-4426-bd8a-ca0a5eac3aac	6bd470eb3f4181e95e85e6a5b2804a8f49997269610411003ee38b9a55c34f09	2026-03-29 19:36:27.303	2026-04-05 19:21:25.365	2026-03-29 19:21:25.367
bdd13f3b-dee6-4c26-becb-de5d2b23a9ee	3961fabe-1345-4426-bd8a-ca0a5eac3aac	e05a9bb5c22593e77393df615fd84516d03e86cabd8d46aca7ba0a883dc51575	2026-03-29 19:51:29.271	2026-04-05 19:36:27.328	2026-03-29 19:36:27.33
97270148-dfba-472f-9963-56f3d7f449a5	3961fabe-1345-4426-bd8a-ca0a5eac3aac	c7dde2eba9e9e79f01b758a675b73c1db5b98bdc39e2fabcef8ac15d12513226	2026-03-29 20:06:31.235	2026-04-05 19:51:29.301	2026-03-29 19:51:29.303
29e5501c-f076-4468-b004-ce60bf507163	3961fabe-1345-4426-bd8a-ca0a5eac3aac	ce21ca29442dcf15ebc5ef550ac92ac550484ddb6ba6bad1ad5df9ba070c4100	2026-03-29 20:21:33.174	2026-04-05 20:06:31.262	2026-03-29 20:06:31.264
0182c9a3-d186-4d68-8b39-7ac250be0e17	3961fabe-1345-4426-bd8a-ca0a5eac3aac	ca8eaa2ef80ae9aa1e7d8f0d6ba0323637661f6ebe5abc0c21526388cb319376	2026-03-29 20:36:35.119	2026-04-05 20:21:33.201	2026-03-29 20:21:33.203
d30dcb0d-3cfa-4217-9221-ad0d5d40fc97	3961fabe-1345-4426-bd8a-ca0a5eac3aac	92cb86908e3c12804a54be731c9259f50caafe96d1fe51c9f9506b1e3bd2e7bc	2026-03-29 20:51:37.074	2026-04-05 20:36:35.148	2026-03-29 20:36:35.15
82fb86d6-f09a-40d0-83c3-73b90ee34b6d	3961fabe-1345-4426-bd8a-ca0a5eac3aac	59170fa96adadc169a32f0eff327d08e9e2a6ff52c9d28a8a52f92f1948cf44d	2026-03-29 21:06:39.014	2026-04-05 20:51:37.101	2026-03-29 20:51:37.103
2f300fd4-6724-43e4-bae7-0a048a9273d7	3961fabe-1345-4426-bd8a-ca0a5eac3aac	b510435f1055b1040aa0a0c14a94b1df609ef949c40a59f8177406531cb3b3d2	2026-03-29 21:21:40.97	2026-04-05 21:06:39.04	2026-03-29 21:06:39.042
d68f594f-a6c4-4b5e-97a3-da221f2d6768	3961fabe-1345-4426-bd8a-ca0a5eac3aac	19563a6c560ffc4425d026a8ffa20fb0c0fa95b6aecfaa9606a7b18dd6789b75	2026-03-29 21:36:42.934	2026-04-05 21:21:40.999	2026-03-29 21:21:41.001
386c05d6-4c32-40d4-9d34-28422e2c5eed	3961fabe-1345-4426-bd8a-ca0a5eac3aac	24e558fa0b8a77ade793def409a5a34fdf547aa408b1bb11f2f4e98b8540bf91	2026-03-29 21:51:44.904	2026-04-05 21:36:42.976	2026-03-29 21:36:42.978
a896ca0b-d464-4aae-969a-c3e1082e8702	3961fabe-1345-4426-bd8a-ca0a5eac3aac	1a32ecb07e48586ad0cfa493dbf8cf277fb537a294b94ea5b11591a559fed816	2026-03-29 21:54:30.973	2026-04-05 17:38:41.765	2026-03-29 17:38:41.767
81478709-ba73-4d17-b8ef-02fd54b9cd50	3961fabe-1345-4426-bd8a-ca0a5eac3aac	571768f18ec5d9de38007e4909e146d6505c2ba0cff162a1057c78be417eef9a	2026-03-29 22:06:46.903	2026-04-05 21:51:44.931	2026-03-29 21:51:44.933
384b5eea-94e3-4177-9b74-05a593641abc	3961fabe-1345-4426-bd8a-ca0a5eac3aac	4b2e3fa9a369f7f043fade3fb5f57ec3fc82d716a38f961dc1be65098697654a	2026-03-29 22:09:33.209	2026-04-05 21:54:31.007	2026-03-29 21:54:31.009
6cb07f6c-855f-4ccd-b12b-4b83fd84b417	3961fabe-1345-4426-bd8a-ca0a5eac3aac	eccfe743f89b2b618aeb60bdc30158b266a22f8be9a074cb42203fca1109deca	2026-03-29 22:21:48.773	2026-04-05 22:06:46.94	2026-03-29 22:06:46.943
a6443de7-8b49-4a2c-9392-4fd4bd762fec	3961fabe-1345-4426-bd8a-ca0a5eac3aac	d74035b7aff57b5686c14343daafd2bab9a9095790180f7024a5120cd3a6a067	2026-03-29 22:28:12.947	2026-04-05 22:09:33.234	2026-03-29 22:09:33.235
d4e4a410-88e7-4cd3-9a0b-8e70df80c565	3961fabe-1345-4426-bd8a-ca0a5eac3aac	d1e1f81692d6457bc7439c55e5745a616eff59959a156b983f5fbcab3976f531	2026-03-29 22:36:50.715	2026-04-05 22:21:48.805	2026-03-29 22:21:48.806
5b8d48a4-6b75-4f97-9193-23e99deae388	3961fabe-1345-4426-bd8a-ca0a5eac3aac	e2c5cb16a06da60a065508897352cc2850879e947c83d4f30cb660e2bff2a74a	2026-03-29 22:43:14.077	2026-04-05 22:28:12.975	2026-03-29 22:28:12.977
4f09ed94-970a-4954-bfa2-970d32ed933f	3961fabe-1345-4426-bd8a-ca0a5eac3aac	7c08f09a0ea14aa41b9164c4a154fbedc61a7f387d75869e8a6024f560c92681	2026-03-29 22:51:52.681	2026-04-05 22:36:50.744	2026-03-29 22:36:50.746
ebb8396e-834e-46a4-a518-a8bede346002	3961fabe-1345-4426-bd8a-ca0a5eac3aac	b994f33a25440e8cac245ee0d2d57dcde657804882552271238bc817b4a54313	2026-03-29 22:58:14.354	2026-04-05 22:43:14.112	2026-03-29 22:43:14.114
a0a0269e-37d0-4260-ba78-28d0e8cd09d7	3961fabe-1345-4426-bd8a-ca0a5eac3aac	8fb740bf41f71b8fffc4cc30c70ccad5840df91f22a072e422fca8b13d3fc5af	2026-03-29 23:06:54.637	2026-04-05 22:51:52.714	2026-03-29 22:51:52.716
d50e85fc-b7aa-45c3-acb3-14a64be4b289	3961fabe-1345-4426-bd8a-ca0a5eac3aac	647e006edd7a6770b48b46a6c8f00edfda9aae0ce35351e5b425e053de6cc1f1	2026-03-29 23:13:14.63	2026-04-05 22:58:14.383	2026-03-29 22:58:14.385
618e0471-0e7c-4cce-9046-27f3198d9b57	3961fabe-1345-4426-bd8a-ca0a5eac3aac	1e03e54b949418ef0b395952eb21186880712a7a1513bc0435f114c22de82385	2026-03-29 23:21:56.314	2026-04-05 23:06:54.663	2026-03-29 23:06:54.665
efaba637-0ea9-45f9-b650-0c02f03708a4	9f70646e-c63e-4a08-a4fa-8786204bbf4e	f15c6fcb6c046604dc850eaf6e7d80fa47381bf28916f98672f3bce1ca9987e2	2026-03-31 22:41:36.178	2026-04-05 16:49:28.464	2026-03-29 16:49:28.466
a2ceb1c2-5c0a-4b5a-bd70-f58d2ff6d4c5	3961fabe-1345-4426-bd8a-ca0a5eac3aac	f89659b79d8b6ba3cc31f2b65d18c7cf66b01ecd7f1af204c62eee66bc4e422c	2026-03-29 23:36:58.28	2026-04-05 23:21:56.344	2026-03-29 23:21:56.345
76dffebd-377d-44ee-80c5-37f5baa47782	3961fabe-1345-4426-bd8a-ca0a5eac3aac	5be8eb080f0c353bf0323b1a075623faad97ff7ceebb4d38dd5e37a760294fbd	2026-03-29 23:52:00.227	2026-04-05 23:36:58.321	2026-03-29 23:36:58.323
5de17f93-03da-4618-9456-2d622deec529	3961fabe-1345-4426-bd8a-ca0a5eac3aac	7486b302a62b9e5f468e36d7cfcbaf276f2af12709b5bee3275cb4f809e1def1	2026-03-29 23:56:21.224	2026-04-05 23:13:14.653	2026-03-29 23:13:14.655
ca3f6ae1-f078-418f-bf08-26a4278f04af	3961fabe-1345-4426-bd8a-ca0a5eac3aac	eee27ca3b0b016fca6056d9e01eaec24d69b939c74e234104138a284e68aa172	2026-03-30 00:07:02.11	2026-04-05 23:52:00.258	2026-03-29 23:52:00.26
bfcc0095-b28a-4431-afaf-88dc7d180cdf	3961fabe-1345-4426-bd8a-ca0a5eac3aac	ef2d917da5c0a1deb96283b690e7f06cd0634fae939514fcf369aaf1ffa7eb63	2026-03-30 00:11:49.012	2026-04-05 23:56:21.249	2026-03-29 23:56:21.25
5094f18b-aae2-4d51-a2f3-38a1a12bd042	3961fabe-1345-4426-bd8a-ca0a5eac3aac	1868bcfd28828c7fc7dcdf6b13e5620b188e92c330c2260340edf4f3e7cecedd	2026-03-30 00:22:04.093	2026-04-06 00:07:02.137	2026-03-30 00:07:02.139
7e0cf284-3fe8-4769-bcab-6b29d2cd2864	3961fabe-1345-4426-bd8a-ca0a5eac3aac	9a97b50e06428b1e0badc211d68cf7ff5b9b80d82329f1a4cb1d0a9edfff64ee	2026-03-30 00:37:06.033	2026-04-06 00:22:04.12	2026-03-30 00:22:04.122
93267ff7-d692-4838-83e0-621e3927a1a3	3961fabe-1345-4426-bd8a-ca0a5eac3aac	029a3ff301ebb0e3f0e12602ba6a63c8f86fb2a9943508f33bfffb95453a2eea	2026-03-30 00:52:07.998	2026-04-06 00:37:06.063	2026-03-30 00:37:06.065
d6084e14-d838-43b3-94da-89a955664935	3961fabe-1345-4426-bd8a-ca0a5eac3aac	f31bb14b8ce683728c70e043b7affce177f7247a9b7986b0cbae47492e6b7f5a	2026-03-30 00:56:46.128	2026-04-06 00:11:49.038	2026-03-30 00:11:49.04
b29a7e41-29e8-4d8e-9fa1-e03591a8e936	3961fabe-1345-4426-bd8a-ca0a5eac3aac	ae0895d5615e5742a73e706c15e121985682254631d9944e6e1ef3b36c25b06f	2026-03-30 01:07:09.845	2026-04-06 00:52:08.032	2026-03-30 00:52:08.034
dd45eed1-c3c7-4f8a-8be0-d528adcfbd82	3961fabe-1345-4426-bd8a-ca0a5eac3aac	91d8b5eeafd23215ee17469728f8427c991c28cb29726ff5d53688c2d4dbe4cc	2026-03-30 01:11:55.95	2026-04-06 00:56:46.155	2026-03-30 00:56:46.157
8b75f7c5-657b-4bbf-8461-a24eab805224	3961fabe-1345-4426-bd8a-ca0a5eac3aac	0ae95efed9ae7fdaec8c93728123b9047a52dda3096418290431971101239d55	2026-03-30 01:22:11.721	2026-04-06 01:07:09.886	2026-03-30 01:07:09.888
42945704-c4f8-4235-a518-026fa25978fb	3961fabe-1345-4426-bd8a-ca0a5eac3aac	045e6a3b99a04accfa5adff4916bc293cf0527ffc674f51488281a1a9414ad4b	2026-03-30 01:27:02.238	2026-04-06 01:11:55.97	2026-03-30 01:11:55.972
18eca3ba-bb52-423e-ae03-0d71628a0be8	3961fabe-1345-4426-bd8a-ca0a5eac3aac	6dba20af147cd1d82fa54da2e41f03c61cbb09ada4a506673d4f7b014baf6a93	2026-03-30 01:37:13.567	2026-04-06 01:22:11.747	2026-03-30 01:22:11.749
d3e5b5be-fec5-4cd2-bf68-bdd1b2fdfd36	3961fabe-1345-4426-bd8a-ca0a5eac3aac	947ae9b0823644980b0d46ac23290f96c64862a9572b45679894385e0630c850	2026-03-30 01:45:50.017	2026-04-06 01:27:02.266	2026-03-30 01:27:02.268
1a9e7df9-2d99-49f5-ac7b-f285eca657cc	3961fabe-1345-4426-bd8a-ca0a5eac3aac	adecf6112f8ebae1f7a9e01ace61324bbf326b931fef5de6a2d33053a524d170	\N	2026-04-06 01:45:50.045	2026-03-30 01:45:50.047
23f2c7ee-85b9-4d8a-b015-843366bbdb9f	3961fabe-1345-4426-bd8a-ca0a5eac3aac	075be08deb1e28d5e2a260f043a389aa4558881eaa983ff51f5c24237032081d	2026-03-30 01:52:15.484	2026-04-06 01:37:13.593	2026-03-30 01:37:13.595
3cc1b9dc-e8e7-454f-ae49-fec196523c27	3961fabe-1345-4426-bd8a-ca0a5eac3aac	26d3ed510fe398ba5e8a83e0d19698af6c94b578c2ae11041a79ddbe9992c63a	2026-03-30 02:07:17.516	2026-04-06 01:52:15.506	2026-03-30 01:52:15.508
12fed9f2-b9d2-4da0-b6d0-324391bd4e8a	3961fabe-1345-4426-bd8a-ca0a5eac3aac	d2049477c110c6b049791db208434ac7098f2fc3e1798f01a63c8f0ab064394a	2026-03-30 02:22:19.421	2026-04-06 02:07:17.543	2026-03-30 02:07:17.545
d8ca3d05-053d-4821-b78c-2871233e4c19	3961fabe-1345-4426-bd8a-ca0a5eac3aac	87f1f7a53bb7191c9a72e8c62cc1f509b9cab917e8124b4bcf2069f8f997a6dc	2026-03-30 02:37:21.37	2026-04-06 02:22:19.446	2026-03-30 02:22:19.447
aa3cf28c-308f-4951-ad95-eb35a9e58b4f	3961fabe-1345-4426-bd8a-ca0a5eac3aac	be6ebd5b859572a7a619ba2a115f16773d1881df301029ef433fdfe4a84ebf45	2026-03-30 02:52:23.323	2026-04-06 02:37:21.402	2026-03-30 02:37:21.404
99fe90bc-f82d-41af-b441-57a285bf471f	3961fabe-1345-4426-bd8a-ca0a5eac3aac	52009b47fe41bcfdf9a2d68e8797ccfc09785580873ec213a7ccfcaabc9a932f	2026-03-30 03:07:25.281	2026-04-06 02:52:23.354	2026-03-30 02:52:23.356
01d0d273-2e75-4d79-a418-11834273bda3	3961fabe-1345-4426-bd8a-ca0a5eac3aac	9a8a5a0015ea4944487e5953a3b79c3e21ee46f504c3b5525584924f69444e6d	2026-03-30 03:22:27.241	2026-04-06 03:07:25.308	2026-03-30 03:07:25.31
7361abfd-727b-4fff-954c-6aeace1413e9	3961fabe-1345-4426-bd8a-ca0a5eac3aac	ca88f842ddc0938f388e71d31f39b91c7e3bf72c47f2fd547a5255351f8f67db	2026-03-30 03:37:29.203	2026-04-06 03:22:27.273	2026-03-30 03:22:27.275
695de83e-f9aa-4de7-90cf-da563d480613	3961fabe-1345-4426-bd8a-ca0a5eac3aac	e97450653818b1f0d5e3740cbc7c2c4ba753c4856ecbd41fb72c2a43bd167f28	2026-03-30 03:52:31.157	2026-04-06 03:37:29.232	2026-03-30 03:37:29.234
2822c136-10cc-4af7-aa0f-e3f4017e0355	3961fabe-1345-4426-bd8a-ca0a5eac3aac	90c70828154df3574603e456ec36e4275cb403badd27a46079f64d51c7929e84	2026-03-30 04:07:33.108	2026-04-06 03:52:31.183	2026-03-30 03:52:31.184
694d2008-4649-4e31-88b0-87b320e0ead9	3961fabe-1345-4426-bd8a-ca0a5eac3aac	46b2bd49350e269b4bfdc5a6a189f254cb65b958e3e07fa3809c0679007a11f8	2026-03-30 04:22:35.05	2026-04-06 04:07:33.135	2026-03-30 04:07:33.138
8c5c71da-2237-4802-afbe-172134ffba5b	3961fabe-1345-4426-bd8a-ca0a5eac3aac	c90f80b2b97ceecb3207664b8d18a4b91a289ec7fadca5b6eb365bc975937843	2026-03-30 04:37:37.013	2026-04-06 04:22:35.08	2026-03-30 04:22:35.082
bcd80df6-da47-4d54-9bac-27399c4ebbee	3961fabe-1345-4426-bd8a-ca0a5eac3aac	57cc604ebabe1e4eebca54b8984740c233f97e91f19525545695f5377e4cf913	2026-03-30 04:52:38.97	2026-04-06 04:37:37.045	2026-03-30 04:37:37.047
63c64f4b-7610-4578-9d12-8604e200f9b7	3961fabe-1345-4426-bd8a-ca0a5eac3aac	a9d9229511e743e18a5ce8ae7d651aaafabed1dbd07c572f96fad6730783b52e	2026-03-30 05:07:40.936	2026-04-06 04:52:38.999	2026-03-30 04:52:39
ab465e18-5597-4161-b321-2c7275491e47	3961fabe-1345-4426-bd8a-ca0a5eac3aac	f941d4ba9622874c9213d5430ab58d0f99345d6336a31d7857d00b2f1aa97864	2026-03-30 05:22:42.885	2026-04-06 05:07:40.964	2026-03-30 05:07:40.966
0e07c256-fa18-48d2-81f1-a7b440f979bd	3961fabe-1345-4426-bd8a-ca0a5eac3aac	dbe44f371ef20c078eb3d9e9eb2d0dae188659aec38639ffebd4ca7ad4b7c5ff	2026-03-30 05:37:44.847	2026-04-06 05:22:42.912	2026-03-30 05:22:42.914
46761b22-70e0-4fc8-8c7c-6ee7374ba54a	3961fabe-1345-4426-bd8a-ca0a5eac3aac	77be119b49423d4346b1612d426e9aa13a40d4a6d1bf17b55bb25938aa584d78	2026-03-30 05:52:46.809	2026-04-06 05:37:44.878	2026-03-30 05:37:44.88
4e21f126-e09d-4544-b74a-fe6de40a8e04	3961fabe-1345-4426-bd8a-ca0a5eac3aac	e0d9679d93a1bcab6b89dcc961c695cff3e20a960d1fac4627357adc821649de	2026-03-30 06:07:48.757	2026-04-06 05:52:46.835	2026-03-30 05:52:46.837
31ce9d14-fb24-4ea6-b635-54622221e5f1	3961fabe-1345-4426-bd8a-ca0a5eac3aac	b9ea3fb723c856d310a5badb7c80da81fdff258d8f2000feeeef57cd64e2636e	2026-03-30 06:22:50.655	2026-04-06 06:07:48.783	2026-03-30 06:07:48.784
9b732c34-bb8a-4ce0-8f9b-68f2f693522e	3961fabe-1345-4426-bd8a-ca0a5eac3aac	890b1039a0eb0cf6e5b0d7f8b0334724523961532ebabc1da56aa89b8f081dc3	2026-03-30 06:37:52.608	2026-04-06 06:22:50.682	2026-03-30 06:22:50.684
c125a4c5-22ed-45c2-b5c5-eb5e6e63dfb8	3961fabe-1345-4426-bd8a-ca0a5eac3aac	a07ab56da9678e365cc1acff3880cd9b07dfcb68b0955279b83fa282a584ec9b	2026-03-30 06:52:54.575	2026-04-06 06:37:52.635	2026-03-30 06:37:52.637
52710377-1f08-46d8-92d5-9f56f5ce5ba3	3961fabe-1345-4426-bd8a-ca0a5eac3aac	8ea6c277339378cacca0370ee9ed3d56e6c587d40162dfd8d2719f3c7263d9d1	2026-03-30 07:07:56.526	2026-04-06 06:52:54.602	2026-03-30 06:52:54.603
acfc95b9-bc89-4f3c-8547-7333217eec22	3961fabe-1345-4426-bd8a-ca0a5eac3aac	4aa3cf89b7acad37b3f365a5b1999a0a799f387b32df802c7a8e448a1dddc985	2026-03-30 07:22:58.502	2026-04-06 07:07:56.559	2026-03-30 07:07:56.561
9b06cbfc-7be4-4040-826f-417601c655b2	3961fabe-1345-4426-bd8a-ca0a5eac3aac	36aa0c710fe7ac685f1f1b1c2eb1b14c073676f0b10fbadf6ec30b6688a721dd	2026-03-30 07:38:00.448	2026-04-06 07:22:58.527	2026-03-30 07:22:58.529
9ce1f50d-891c-45b8-8dac-462b220f3c7c	3961fabe-1345-4426-bd8a-ca0a5eac3aac	303109484c141b8a490fc1c64814dcc636a9d784b6449fe666ba82ffed722420	2026-03-30 07:53:02.405	2026-04-06 07:38:00.488	2026-03-30 07:38:00.49
1f149b68-b3e0-4490-a892-39c42e67f7db	3961fabe-1345-4426-bd8a-ca0a5eac3aac	80c65fb913e77db1ce5aa9db7627ad467b4e34f5098b012f4f8bfdd9d7eb0e2d	2026-03-30 08:08:04.363	2026-04-06 07:53:02.431	2026-03-30 07:53:02.432
0e076af7-6946-477a-a383-eef6809c4d2c	3961fabe-1345-4426-bd8a-ca0a5eac3aac	1be80295b025f9e0f06adf24d9270afa7cfea2124c9eeb0f1a94b978f989d1ff	2026-03-30 08:23:06.335	2026-04-06 08:08:04.39	2026-03-30 08:08:04.391
316504fa-0517-4b4f-9a4b-03ff81f8a69a	3961fabe-1345-4426-bd8a-ca0a5eac3aac	9e81f6becd4f4853d087ca8030ce03830f7534946c6d51efc6fd5010932ae4e0	2026-03-30 08:38:08.153	2026-04-06 08:23:06.365	2026-03-30 08:23:06.367
99e8c15c-34de-4ffd-89ac-daae4dcc428b	3961fabe-1345-4426-bd8a-ca0a5eac3aac	83e066b7a399bb89a1a6a6ba229fe9757d0960cb248043558863e6d07a327632	2026-03-30 08:53:10.176	2026-04-06 08:38:08.18	2026-03-30 08:38:08.182
5cdfb1a5-5509-40ee-912b-bd97a8d7b394	3961fabe-1345-4426-bd8a-ca0a5eac3aac	7cc9eb88259b18a46b9efae7dc0a8a30bf05854a4c07e5dad5ad0f4424609df7	2026-03-30 09:08:12.038	2026-04-06 08:53:10.202	2026-03-30 08:53:10.204
0f08d4a5-0b5e-4ca6-a37d-d1b65fd61e91	3961fabe-1345-4426-bd8a-ca0a5eac3aac	551320700ffd7d68251857546128aff40ea1f2b70f72acc151f48165ec755580	2026-03-30 09:23:14.035	2026-04-06 09:08:12.063	2026-03-30 09:08:12.064
2a53ba92-3c2b-4813-b1a7-e0d65dc25157	3961fabe-1345-4426-bd8a-ca0a5eac3aac	71fc91617784c1d3d59f1fe069ccbba722af2f2d497c203901ca5936c39c1c6c	2026-03-30 09:38:16.005	2026-04-06 09:23:14.062	2026-03-30 09:23:14.064
7fe5b77f-c3a1-4b40-8179-2523fa2dab97	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2638396402cbbaba0ff04e1ca9743bec0cad5085ec9b0ee01fb4a82afbabadbe	2026-03-30 09:53:18.065	2026-04-06 09:38:16.032	2026-03-30 09:38:16.033
7aa20216-01a2-45fe-a8fe-db563e8d65fa	3961fabe-1345-4426-bd8a-ca0a5eac3aac	f7bd7629dc398295f6e49f9b39dc613409f8de1391c90e0db7f3012aff68e5eb	2026-03-31 01:50:26.461	2026-04-06 02:14:37.448	2026-03-30 02:14:37.45
314a5251-bc9f-4be2-969f-84ba9f6d479f	3961fabe-1345-4426-bd8a-ca0a5eac3aac	aa82b04f58f2b9971cad586f6cfbcb75bd8dc403ff79a18c53044b988c217cfa	2026-03-30 10:08:19.901	2026-04-06 09:53:18.091	2026-03-30 09:53:18.092
715b18d0-00c7-41a2-971a-cd8dcdbf4d94	3961fabe-1345-4426-bd8a-ca0a5eac3aac	1bc3aa9a905e7338fbb31f79677b8d55fc40bb3edd090a4f5ff6845fff9c247b	2026-03-30 10:23:21.857	2026-04-06 10:08:19.928	2026-03-30 10:08:19.93
4d6494ea-ef2f-4b5d-b728-6704bc3755bc	3961fabe-1345-4426-bd8a-ca0a5eac3aac	c6b049f519208e99c0d8c13c129c14532c63123d6af491b413d5ef096819d60c	2026-03-30 10:38:23.817	2026-04-06 10:23:21.886	2026-03-30 10:23:21.888
9d868f39-c9d6-4408-86ee-99a333281c59	3961fabe-1345-4426-bd8a-ca0a5eac3aac	ea95395c2a4c382888f8a5089b50e5465bec76257407311de07ce9bffc46e45d	2026-03-30 10:53:25.76	2026-04-06 10:38:23.843	2026-03-30 10:38:23.845
3e4671a4-7ae0-4f34-8940-8cdbfc097cde	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2edd6f3d6a806b608888eb8c51bcd15e6cae48b093f8c9e4d208906beb1098e6	2026-03-30 11:08:27.709	2026-04-06 10:53:25.787	2026-03-30 10:53:25.789
a0513bbb-7e4b-4a4f-9e9e-30f5beaa95d1	3961fabe-1345-4426-bd8a-ca0a5eac3aac	139350011ba8538fde3563c10b9c5dfaa5ccdb7eb1855307e8f6a43bab5a380c	2026-03-30 11:23:29.651	2026-04-06 11:08:27.762	2026-03-30 11:08:27.764
5ee019fa-3fd0-4ee6-b1bc-ef802831b971	3961fabe-1345-4426-bd8a-ca0a5eac3aac	a8ff157b2b849f9eb6e08bb05bda4c3fd192fffa76bbc9d350ef10f5d65513e2	2026-03-30 11:38:31.613	2026-04-06 11:23:29.677	2026-03-30 11:23:29.679
196000bc-3a35-4139-b1ff-ea7d73c4c661	3961fabe-1345-4426-bd8a-ca0a5eac3aac	5e210ead8aa4e4b5b9933c6f85884f78dbeb2b618e1a42406c61e329f33f04ba	2026-03-30 11:53:33.577	2026-04-06 11:38:31.64	2026-03-30 11:38:31.642
3974aa09-6b2f-4df0-b3cc-8a109ce2b3a2	3961fabe-1345-4426-bd8a-ca0a5eac3aac	13f1193eab13ebd1c491a36f7d89a2e91003ad928f03484907c658d1dcba2180	2026-03-30 12:08:35.537	2026-04-06 11:53:33.603	2026-03-30 11:53:33.605
3c9e6eab-0805-49c5-af0b-36581d18c364	3961fabe-1345-4426-bd8a-ca0a5eac3aac	84ecabdc51acd0063023164844a7408e8333f2411bf92f5d649b1e5101a2be44	2026-03-30 12:23:37.509	2026-04-06 12:08:35.565	2026-03-30 12:08:35.567
b077011a-d3a0-4ad5-863a-c10fd00aee99	3961fabe-1345-4426-bd8a-ca0a5eac3aac	95e7ab0521fb601863d98b005540b12d5f09996ceb67da391880e40f3ea01199	2026-03-30 12:38:39.446	2026-04-06 12:23:37.539	2026-03-30 12:23:37.541
46f8961d-0c6a-41d0-a909-d43aa5438ff0	3961fabe-1345-4426-bd8a-ca0a5eac3aac	a1c1504b5ed25effa1c604818ab59f643d982d4c04cf86e059d3b5e23f3f0028	2026-03-30 12:53:41.394	2026-04-06 12:38:39.472	2026-03-30 12:38:39.474
d7bd8cb2-709f-4978-94ce-41868e3336a2	3961fabe-1345-4426-bd8a-ca0a5eac3aac	805bbcec13b457ab48876189b3357409037167f49546f5ddfa80ca44017f6380	2026-03-30 13:08:43.35	2026-04-06 12:53:41.434	2026-03-30 12:53:41.436
e5333439-11fa-40e4-a596-e22aee8e8202	3961fabe-1345-4426-bd8a-ca0a5eac3aac	5fa66a13c1fe9be5310260260bfb1b69d677b0931b18022f587f625f67963902	2026-03-30 13:23:45.271	2026-04-06 13:08:43.378	2026-03-30 13:08:43.38
632f31f8-01dd-4c5c-a582-3b0b91c47bf2	3961fabe-1345-4426-bd8a-ca0a5eac3aac	9d6b3ff71b37bf6939cdf1dacdbc6bb20c77e534699a75adb473f1e1e3a2d19d	2026-03-30 13:38:47.237	2026-04-06 13:23:45.322	2026-03-30 13:23:45.324
29a8ba45-9e19-4974-b4c8-ba49e2285d84	3961fabe-1345-4426-bd8a-ca0a5eac3aac	cf3cb02e812236f7ac228927a77abd6d6bafe0993883619f6113789ce5853dec	2026-03-30 13:53:49.184	2026-04-06 13:38:47.265	2026-03-30 13:38:47.267
3c6c022e-386d-4239-9190-e9071aabc089	3961fabe-1345-4426-bd8a-ca0a5eac3aac	89ad5c81325aae294aa0ffdada556368e77b1cc0c996954f914423f8ea5c3c5c	2026-03-30 14:08:51.185	2026-04-06 13:53:49.215	2026-03-30 13:53:49.216
a02c6991-c1ab-45ba-a1c1-75806837138f	3961fabe-1345-4426-bd8a-ca0a5eac3aac	78dda3103364f8aaee36345a692dd2e7d09a98c1a75576575c5fc9d7330e2166	2026-03-30 14:23:53.119	2026-04-06 14:08:51.214	2026-03-30 14:08:51.215
368dbe2d-048f-42fb-accf-b59efcc55edc	3961fabe-1345-4426-bd8a-ca0a5eac3aac	e6e9f5cd24da4f32653b86dab55edc473bb414b5aad0f1881ebc9910dae1e866	\N	2026-04-06 14:23:53.176	2026-03-30 14:23:53.178
5cceadf7-0f93-420f-b586-4b3850c8c24e	9f70646e-c63e-4a08-a4fa-8786204bbf4e	97cd6c96e6a6e3d8ba387ca0d2088fc2f50aba8233a00ff4b8cabe3418680d93	\N	2026-04-07 22:41:36.201	2026-03-31 22:41:36.202
a2ce6aa4-630b-4e07-afe4-1bf4d34d894a	3961fabe-1345-4426-bd8a-ca0a5eac3aac	d1f2315c5bc70625d6de26f5493329a86670cd34d44dc9cb373ab7005b10e340	2026-03-31 23:03:46.7	2026-04-07 01:50:26.499	2026-03-31 01:50:26.501
766eabd7-10c8-4759-b0e6-284522920bc6	3961fabe-1345-4426-bd8a-ca0a5eac3aac	92ddef3632fb8bf231261d7ce553ef74d66c5932e8a73e0d4e2a642a466f2f15	2026-04-01 00:11:50.119	2026-04-07 23:03:46.718	2026-03-31 23:03:46.719
bc6a34a8-d625-4fcb-b829-9f357d045c1c	3961fabe-1345-4426-bd8a-ca0a5eac3aac	7689de73577a9314913b793989a1396dce5f1f858aa533e2fbe656716023b32f	\N	2026-04-08 00:11:50.141	2026-04-01 00:11:50.142
4cc9335c-13ee-4e72-838a-4cae7aa05544	3961fabe-1345-4426-bd8a-ca0a5eac3aac	9a737fa9a64c0e7ceec944287c7d4e0697d47349453efe886edc9c19cb5e161f	2026-04-01 02:13:02.05	2026-04-08 01:58:01.361	2026-04-01 01:58:01.362
a2afaf39-172f-43f3-822a-bf3e8f047287	3961fabe-1345-4426-bd8a-ca0a5eac3aac	8fbdf64925d72da080f44adbeb050bd636795700ddb6ae089046d5de90329834	2026-04-01 02:29:02.265	2026-04-08 02:13:02.069	2026-04-01 02:13:02.071
20edee5b-f232-477f-9458-a0ba658134d3	3961fabe-1345-4426-bd8a-ca0a5eac3aac	1ce54a552b1dd17597393bbe30afe92f959f52d751308c77b7a832a177b8baee	2026-04-01 02:44:03.92	2026-04-08 02:29:02.282	2026-04-01 02:29:02.283
219027ab-5b5f-4263-b2a9-b500d55d5b4e	3961fabe-1345-4426-bd8a-ca0a5eac3aac	53c2896d1fbb4025efda05a13a8e6aad393eedcfdef4614fedc320e043c77fd5	2026-04-01 02:59:03.865	2026-04-08 02:44:03.938	2026-04-01 02:44:03.939
3218ad03-8b53-481d-9a6c-6ca013a82534	3961fabe-1345-4426-bd8a-ca0a5eac3aac	ee8e5308862812bb86e13bea18c11a57059d32c7395239fbbcaf3a2e69c5050e	2026-04-01 03:14:05.978	2026-04-08 02:59:03.881	2026-04-01 02:59:03.883
2004ed6e-398d-4667-959c-4e43d1cf0041	3961fabe-1345-4426-bd8a-ca0a5eac3aac	0f73851cc95089c5539ca8217a293cac6e457eb24c42e2c5d6770fe421b25a8a	2026-04-01 03:35:59.799	2026-04-08 03:14:05.994	2026-04-01 03:14:05.995
2aebe3f2-e5e5-48bc-bc03-952b22389eb1	3961fabe-1345-4426-bd8a-ca0a5eac3aac	ebf1f8612137915dd2b488062dbeb8a643c18f62789ae66f6466b1a630ced818	2026-04-01 03:51:01.799	2026-04-08 03:35:59.817	2026-04-01 03:35:59.818
4f995521-f1d3-412c-9e98-1ff2e50314da	3961fabe-1345-4426-bd8a-ca0a5eac3aac	15180f8fe334c4134bf57c4d13b14c7fb502265a8afd9de16c6043d8d52f8f9e	2026-04-01 04:15:43.676	2026-04-08 03:51:01.814	2026-04-01 03:51:01.816
cebfc866-85d0-476e-a63d-7bc12cf97e18	3961fabe-1345-4426-bd8a-ca0a5eac3aac	1abddba3d4a182e872e15212748aa20190367b2bb3c949e3efd8c7f9d21dcd4d	2026-04-01 04:30:45.688	2026-04-08 04:15:43.695	2026-04-01 04:15:43.696
e8298c98-5807-4274-adfa-6e729e3505e6	3961fabe-1345-4426-bd8a-ca0a5eac3aac	f330a32da1926b3ccf50752fd2809010509832e24b9a05507310d7a658b2fc83	2026-04-01 04:46:01.657	2026-04-08 04:30:45.706	2026-04-01 04:30:45.707
628ce083-2dd7-43ab-99a6-1909f182a434	3961fabe-1345-4426-bd8a-ca0a5eac3aac	b7f8944409e360e69639054ed1ded37381e17e4773d1ed73a05ca184f400dbc2	2026-04-01 05:01:01.629	2026-04-08 04:46:01.677	2026-04-01 04:46:01.678
8b70dbee-ca34-4974-b91c-ba74baa564bf	3961fabe-1345-4426-bd8a-ca0a5eac3aac	9c6d56e327cd36a452da9b08fc2353356233f6ffff7b1f296ffd76d403d0675b	2026-04-01 05:16:01.604	2026-04-08 05:01:01.646	2026-04-01 05:01:01.647
0d027349-9691-4743-a1f5-530bffc223e7	3961fabe-1345-4426-bd8a-ca0a5eac3aac	6dfaf135cd142ba4f59e40abd57984b628b61ec430a75eaab087950dfaf80877	2026-04-01 05:39:03.376	2026-04-08 05:16:01.621	2026-04-01 05:16:01.622
8db65eb6-f6df-4644-8da4-682b5d5461da	3961fabe-1345-4426-bd8a-ca0a5eac3aac	b911caa576dcaae19df308e60c95a719eb2ac3506bb1f01ddf3b2a1c7118503d	\N	2026-04-08 05:39:03.395	2026-04-01 05:39:03.396
828f62a9-66b3-416f-ae11-cfcb4006640f	3961fabe-1345-4426-bd8a-ca0a5eac3aac	d5942405c40494afae01ad6754381fb82638cda148e85ace42f314d38ba83c1d	2026-04-01 05:45:44.813	2026-04-08 04:33:24.012	2026-04-01 04:33:24.014
6d20a117-8d70-4f63-b289-6b26379892db	3961fabe-1345-4426-bd8a-ca0a5eac3aac	622906d351815e09f68ce9c89818a4f39e6f2c334908b6bca8215d849366885f	\N	2026-04-08 05:45:44.826	2026-04-01 05:45:44.827
74d16ef0-5749-45d9-af3a-86acda1fff1d	47d9c408-1a3c-46c1-aecf-6f1746615499	1a430c930df219d6488a7477a123dd68a8a5caa335596c64567b065115dd4747	\N	2026-04-08 05:55:44.945	2026-04-01 05:55:44.946
92f8c749-d47f-47d1-b11a-989c4102cc33	47d9c408-1a3c-46c1-aecf-6f1746615499	8caf8aa1ba22a13223d1e142a5071368e89db0669cd88c3ff0ed615520342a86	2026-04-01 06:03:27.837	2026-04-08 05:46:26.83	2026-04-01 05:46:26.832
03bd1319-df04-4ab7-ae4b-3c4c377fd9b7	47d9c408-1a3c-46c1-aecf-6f1746615499	f84eb39e8068f5689781ad03d7543a57817c0c03b4a0670afecea783b0fc4326	\N	2026-04-08 06:03:27.852	2026-04-01 06:03:27.853
f634e6ff-8e33-4157-bcd5-e2212786a5ea	3961fabe-1345-4426-bd8a-ca0a5eac3aac	998410c8419d95932e4717c615f96e88c8bf8566be725382654ee63516298fce	2026-04-01 07:23:20.896	2026-04-08 05:59:14.915	2026-04-01 05:59:14.916
1f75e4f5-519a-49e2-9979-e602c0e4e2f2	3961fabe-1345-4426-bd8a-ca0a5eac3aac	76514cdd727dc37776ea41fc920bc8a386032730f7631f1c729c486f76ff8500	2026-04-01 07:47:58.793	2026-04-08 07:23:20.916	2026-04-01 07:23:20.917
61494286-e961-4156-ba33-2cd6aaf92338	3961fabe-1345-4426-bd8a-ca0a5eac3aac	9645e8df9dabd864827d49654025e35e345f393413714b9245a1adb9409301c0	2026-04-01 08:09:54.904	2026-04-08 07:47:58.812	2026-04-01 07:47:58.813
daeeaa4d-a3ac-450d-9376-74f51742286f	3961fabe-1345-4426-bd8a-ca0a5eac3aac	90c6164464ae420822bf8b845ac83547fe41c848f9ca0036a01e8ef6e920b660	\N	2026-04-08 08:09:54.923	2026-04-01 08:09:54.924
9741664b-59d7-4549-94c9-ecd380745e54	3961fabe-1345-4426-bd8a-ca0a5eac3aac	e12a8faa04811c86a139f9502ae793bb5b9b11ff3723b4e615ea245c180d77b5	\N	2026-04-08 08:19:53.86	2026-04-01 08:19:53.861
885452fe-f9a1-4124-b76b-8f1493e582c3	3961fabe-1345-4426-bd8a-ca0a5eac3aac	28695a45c4ed8f2feada33eef56f62e37490300033f8682e7c7f8c9db85a0ca2	2026-04-01 09:09:40.916	2026-04-08 08:41:11.357	2026-04-01 08:41:11.358
11ab98f5-818f-45ac-aaff-637ccd9ff57d	3961fabe-1345-4426-bd8a-ca0a5eac3aac	6d3f22db58fb5897ffa850cf2ad9d0c9bfc6d1eab7f190b246ae94bccc12a69d	2026-04-01 09:24:42.262	2026-04-08 09:09:40.934	2026-04-01 09:09:40.935
f768aeeb-bb43-4248-b154-094bfbf40b09	281ac0c9-d22b-4ece-895a-9d2c86a8f315	8bebaf3500a256f37f8582846ee52176fe72aeb30ae81ff1600957458ac07d36	2026-04-01 09:24:49.657	2026-04-08 09:09:37.343	2026-04-01 09:09:37.345
c019da04-47ec-4aa7-b154-026bae9fe97e	9f70646e-c63e-4a08-a4fa-8786204bbf4e	1307cd5a33294311c2d172197af835c5785045db27c2735ead65d839624f808c	2026-04-01 09:20:57.665	2026-04-08 06:04:01.333	2026-04-01 06:04:01.335
49de28aa-67b8-4532-b5cd-190374f7c198	9f70646e-c63e-4a08-a4fa-8786204bbf4e	180f948b075afd47feee3474e739b9fab0cb4fcbc7ee314b81547528169cbc82	\N	2026-04-08 09:20:57.682	2026-04-01 09:20:57.683
fc1a19ea-b2b7-4fce-8607-054bacb99c11	281ac0c9-d22b-4ece-895a-9d2c86a8f315	86ede283c5da48e6c8fd31017e6210bc62e455b6e641675900ee42b75dc66282	2026-04-01 09:39:51.97	2026-04-08 09:24:49.67	2026-04-01 09:24:49.672
6841af7e-1573-42b4-a5bb-fbeaef63de40	3961fabe-1345-4426-bd8a-ca0a5eac3aac	310a5bf512b47ed4205cbb20aa85089c465a5d4e36f466bad80012fdd9b3f534	2026-04-01 09:39:56.663	2026-04-08 09:24:42.278	2026-04-01 09:24:42.279
a64bc275-e041-4b33-8066-9df36afb91f6	ee45a65d-1fea-4dae-96e6-cc0413c24c5a	a3ed6d86ede8b0a39e4c8c1922730a4e6f2a8dbc857efe4a1c701a8ca10c0116	2026-04-01 09:45:04.556	2026-04-08 09:25:26.066	2026-04-01 09:25:26.067
e3b14494-9f53-4bc6-9bf0-a75a5bf5aea1	ee45a65d-1fea-4dae-96e6-cc0413c24c5a	d2867e6db8378315e2fba3048c0227007ab892db022d2c75e7000504ed552b5c	\N	2026-04-08 09:45:04.571	2026-04-01 09:45:04.573
a12c29bd-c50e-4d50-814e-36df650c46e6	281ac0c9-d22b-4ece-895a-9d2c86a8f315	4a5d832ea62b2e7d456dba042fcf86e37d56cd7a02b6adaf0308bb9fffbbbf70	2026-04-01 09:54:53.526	2026-04-08 09:39:51.985	2026-04-01 09:39:51.987
beb34317-a1a3-4fe3-bd98-5a0b749190e7	3961fabe-1345-4426-bd8a-ca0a5eac3aac	1aa7f5feb6c73943bfd20574cad4a1d76390ba0b60b9c7075a84b0a9e0c4b448	2026-04-01 09:55:00.792	2026-04-08 09:39:56.677	2026-04-01 09:39:56.678
000eb516-35be-4657-a03f-650105efdd50	3961fabe-1345-4426-bd8a-ca0a5eac3aac	ef6827f35c1f7fadd39f32e9357a34deb8c430353c29cae77aacdad5c92718de	2026-04-01 10:52:32.503	2026-04-08 09:55:00.806	2026-04-01 09:55:00.807
943a7be6-cc83-458e-a49a-14cb076055b1	7e2a5e6d-7021-482a-abeb-883f8ebf016b	4774040e0afad5f937b367d7b0b579ed0df81585d07d8fc4275e336a099629df	2026-04-01 10:53:05.737	2026-04-08 09:25:00.659	2026-04-01 09:25:00.661
97bbf237-ae6c-4096-91d8-92961a7cc3d1	7e2a5e6d-7021-482a-abeb-883f8ebf016b	8faf8b4e19c82ffe6ae8c6cf31307ca030af384c849c5dbdfa621e0c4c07a761	\N	2026-04-08 10:53:05.753	2026-04-01 10:53:05.755
1271fd12-1ba3-4c5b-8bda-4b10b96c901b	9f70646e-c63e-4a08-a4fa-8786204bbf4e	083021a47882bb8ed66464c7e214740710bc2718a7ca7e0cd7a8e9bf72d72cd0	2026-04-01 11:08:31.398	2026-04-08 10:53:30.727	2026-04-01 10:53:30.728
fc4e7f88-1f13-419f-9159-995c78b45312	47d9c408-1a3c-46c1-aecf-6f1746615499	7239cd6ce9b09338a43106c6ed427e1493d911b7ca7c2cad2fa60e8186ec5a49	2026-04-01 11:08:41.207	2026-04-08 10:53:39.299	2026-04-01 10:53:39.301
ebcac679-9433-401c-b215-072aff2c4592	9f70646e-c63e-4a08-a4fa-8786204bbf4e	e3c1fdf3a7141579b43a07a377f8555d8422edf6fa358192abf042e3e6b0f0a3	2026-04-01 11:23:33.357	2026-04-08 11:08:31.415	2026-04-01 11:08:31.416
48b2b3d8-25ea-42b2-867f-082939991d5e	47d9c408-1a3c-46c1-aecf-6f1746615499	e4f843bc6ec17cfa051896338368dd2549b6dc5cbc69e9c84f4edbdb2cb73ea1	2026-04-01 11:23:43.153	2026-04-08 11:08:41.223	2026-04-01 11:08:41.224
083d1213-61e2-4900-8dce-374a7ecf153b	9f70646e-c63e-4a08-a4fa-8786204bbf4e	814dc3703f38757c7007ad40e29fd0cd2414a0de9ac99d6b231dad01ee34e283	2026-04-01 11:38:35.334	2026-04-08 11:23:33.374	2026-04-01 11:23:33.376
66823ebe-df0d-430d-822c-63ff22195cd1	47d9c408-1a3c-46c1-aecf-6f1746615499	9047c7a5dc6b4ca7abd7f01c9ea366598802a625aca0c0cdd02e61ad92eb051d	2026-04-01 11:38:45.089	2026-04-08 11:23:43.169	2026-04-01 11:23:43.17
1647b0e2-bceb-471e-9317-580d670a302b	9f70646e-c63e-4a08-a4fa-8786204bbf4e	cc507f45076788b1e60d8a1013703a17d5a3ef12259e6b9c1aaa5e68aa718865	2026-04-01 11:53:37.294	2026-04-08 11:38:35.353	2026-04-01 11:38:35.354
ea5711de-9d3d-4ade-b243-4eb3946a9272	47d9c408-1a3c-46c1-aecf-6f1746615499	e4c774a682b3c5731e3891a13954361fa3950dc9acb0a3f8363e99638b22f186	2026-04-01 11:53:47.065	2026-04-08 11:38:45.102	2026-04-01 11:38:45.104
9b67d270-4632-464e-9871-c042a8c99de2	9f70646e-c63e-4a08-a4fa-8786204bbf4e	2c3d3faeeb3c67bfd0c62439319cdc955cb1b9b7de0d96013484b15b8af81abc	2026-04-01 12:08:39.253	2026-04-08 11:53:37.312	2026-04-01 11:53:37.313
ac0cf32e-c62a-4e72-bcee-877447c1f05a	47d9c408-1a3c-46c1-aecf-6f1746615499	cb66821cf6e2ff8bcab90d5397036c4ea92a95fd59858529092e2b1cb4c3ae96	2026-04-01 12:08:49.018	2026-04-08 11:53:47.079	2026-04-01 11:53:47.08
e1b987ab-7d63-49b7-abb4-42fa3e2a7e1a	9f70646e-c63e-4a08-a4fa-8786204bbf4e	747c7bbb9f18315d50072fd118dbd822ac75332b0c8db9b383a3be1995099155	2026-04-01 12:23:41.218	2026-04-08 12:08:39.269	2026-04-01 12:08:39.271
8f1177c0-b5f7-4ebb-9cff-ca116d7039b0	47d9c408-1a3c-46c1-aecf-6f1746615499	d6845953e479c545c21e754c3a527353f76ad9bfc170a714d87de1b0f8bf8883	2026-04-01 12:23:50.989	2026-04-08 12:08:49.031	2026-04-01 12:08:49.033
d1cb345f-5eea-4e96-82d3-9a045ac2c565	9f70646e-c63e-4a08-a4fa-8786204bbf4e	bfc71b819a7fb764f1f3b249e6388f410c83b525c5d22edfc72ed31e6335b6af	2026-04-01 12:38:43.173	2026-04-08 12:23:41.236	2026-04-01 12:23:41.237
a531e82a-0cdf-4f46-a450-7ab13803941f	47d9c408-1a3c-46c1-aecf-6f1746615499	0036a26302d62d5855fef36b93fbe7f00894cfec3aa846d54d8df4b1e85d34e0	2026-04-01 12:38:52.95	2026-04-08 12:23:51.002	2026-04-01 12:23:51.003
375b983d-1be0-457f-bea1-12ef7362e5f1	9f70646e-c63e-4a08-a4fa-8786204bbf4e	be87b406eae9bedc75ab37cb9525d85fbcd35aa6570526780861c56e56e3df6b	2026-04-01 12:53:45.115	2026-04-08 12:38:43.19	2026-04-01 12:38:43.191
d704fc08-8b1a-4576-b364-6d70e6d0dea6	47d9c408-1a3c-46c1-aecf-6f1746615499	9c50d1a05ca61d8c95da1961bfe440bde4afbb97452361b8d36a1efab6b3bb32	2026-04-01 12:53:54.909	2026-04-08 12:38:52.963	2026-04-01 12:38:52.964
16eef0ec-f4f2-40af-8057-fd56e44e1dec	9f70646e-c63e-4a08-a4fa-8786204bbf4e	c3503c0599e868468f470c5a04da8d08ab6157036f12fc0a80acac42c2cc4e27	2026-04-01 13:08:47.084	2026-04-08 12:53:45.132	2026-04-01 12:53:45.134
9a271c81-bd0c-48ca-a1a4-1307e9928177	47d9c408-1a3c-46c1-aecf-6f1746615499	a9f451017ce9065c67b92bd9cfd57066e24d3a00e0e69e85a2fb3a29c4b75f9e	2026-04-01 13:08:56.845	2026-04-08 12:53:54.923	2026-04-01 12:53:54.924
f45caead-7e8d-4a6b-b5e7-4d673079a951	9f70646e-c63e-4a08-a4fa-8786204bbf4e	466f687fd3a58c16097499cb96d6f7eb3569a8530f9b6ebdfe809b6c34bc55b2	2026-04-01 13:24:16.154	2026-04-08 13:09:16.362	2026-04-01 13:09:16.364
f716839a-3bf3-4ddf-bb4a-5085dbf60451	47d9c408-1a3c-46c1-aecf-6f1746615499	f27ef57b6fc25692196555eeb65d6baf587b91bef143a6d86936a8fd2f940f91	2026-04-01 13:24:16.858	2026-04-08 13:09:16.367	2026-04-01 13:09:16.368
d255b282-7945-4555-b89d-0774f0adcd4e	9f70646e-c63e-4a08-a4fa-8786204bbf4e	3ed4a6d57b9862c7e3ba114d98e5e56b0c5b7aa55185f70a81d27d864eeb74b6	2026-04-01 13:39:18.036	2026-04-08 13:24:16.172	2026-04-01 13:24:16.173
d6f1cae4-755f-4373-ba61-16a9d10c4df3	47d9c408-1a3c-46c1-aecf-6f1746615499	62efc84b35df0bf0075e8d452c0bfa813a1c5f14a9b9482cadede62d1061269c	2026-04-01 13:39:18.813	2026-04-08 13:24:16.871	2026-04-01 13:24:16.872
76a51118-7796-4b5f-a40c-5f8e6cfd58cb	9f70646e-c63e-4a08-a4fa-8786204bbf4e	52275241e94c7c77b127442b289d08f1b6bda458ce78497defedb416e321536f	2026-04-01 13:54:20.019	2026-04-08 13:39:18.053	2026-04-01 13:39:18.054
87f641b2-4424-4f78-b1e4-6fadf117b867	47d9c408-1a3c-46c1-aecf-6f1746615499	52dab887fcafd1956b3bb083fc43a2197233588777f24897925e8fb8b04a3fa9	2026-04-01 13:54:20.756	2026-04-08 13:39:18.826	2026-04-01 13:39:18.827
f76e4663-5db1-4428-bc06-4ca607cd662e	9f70646e-c63e-4a08-a4fa-8786204bbf4e	d3d0b4372d37fab4cdd577287f02473855ef516d08bbf74210c9e0edb923911f	2026-04-01 14:09:21.984	2026-04-08 13:54:20.034	2026-04-01 13:54:20.036
6aefdcb1-5ff5-429e-b22c-b9d187fab4a0	47d9c408-1a3c-46c1-aecf-6f1746615499	6d359903ba0f4f51ebec81071ab6ba05d18a8800f3178e084eb1c41b375b1004	2026-04-01 14:09:22.731	2026-04-08 13:54:20.769	2026-04-01 13:54:20.77
e28b8489-2a37-4a22-b386-e40b47399a7e	9f70646e-c63e-4a08-a4fa-8786204bbf4e	67cd3af24ec3e8a8e035a1ce7353a321dbc4da52428271000568e3199ce81edf	2026-04-01 14:24:23.934	2026-04-08 14:09:22.002	2026-04-01 14:09:22.003
66194dbd-cd52-4f9f-8544-83eed6479c46	47d9c408-1a3c-46c1-aecf-6f1746615499	a5bac94cee6e9522450d8cea0f1a35d1427c3a6bf1ca68b4c17f544494dab480	2026-04-01 14:24:24.689	2026-04-08 14:09:22.744	2026-04-01 14:09:22.745
e846b586-6730-4551-9867-67317e8b8054	9f70646e-c63e-4a08-a4fa-8786204bbf4e	135dea064ae2203f3a8bd2ebe792f3527e6684a050d8d4cdb522c4f7e3e265b2	2026-04-01 14:39:25.873	2026-04-08 14:24:23.953	2026-04-01 14:24:23.956
99d15d33-4d3e-4ad2-b963-20fd6708372a	47d9c408-1a3c-46c1-aecf-6f1746615499	5d5136b3b7da2917601ca51c5e618e832694b3bafe23f72159e49c86a5eee930	2026-04-01 14:39:26.649	2026-04-08 14:24:24.702	2026-04-01 14:24:24.703
f9cbf7e8-d8a8-440f-9725-ecccdb408600	9f70646e-c63e-4a08-a4fa-8786204bbf4e	d4a304d64f8768184ba926cfaf1ac8fcf6fb2beefb2e5fc1e21a55ff0260937c	2026-04-01 14:54:27.849	2026-04-08 14:39:25.89	2026-04-01 14:39:25.891
6b24996b-63c1-4eff-8487-8ef26685a22e	47d9c408-1a3c-46c1-aecf-6f1746615499	e4a0b16863cfb683298491a1b85aad09ce3cdc12c73b9789f1562feda03a21c4	2026-04-01 14:54:28.603	2026-04-08 14:39:26.702	2026-04-01 14:39:26.704
27c96fab-6942-4d7b-9f9c-6581716d7284	9f70646e-c63e-4a08-a4fa-8786204bbf4e	a99c2757489ac2391a3498a0fccb6d2465832320b447fbff5284e612c75e1e17	2026-04-01 15:09:29.788	2026-04-08 14:54:27.866	2026-04-01 14:54:27.868
9454d330-9b4d-4976-bbcd-287f3dab8862	47d9c408-1a3c-46c1-aecf-6f1746615499	3d5a141a9edec89e9aecae355d76d4215b01310f1efa99ca5bd24cab58b69631	2026-04-01 15:09:30.562	2026-04-08 14:54:28.616	2026-04-01 14:54:28.618
13dd86b4-b9d7-4c02-9cfe-4e15a594a130	9f70646e-c63e-4a08-a4fa-8786204bbf4e	1b664922503b81adaa7c1c6617a1b650b4f3fb741bc5715366e29a7151f90d07	2026-04-01 15:24:31.763	2026-04-08 15:09:29.805	2026-04-01 15:09:29.807
a37c41de-47df-468f-bd02-c76d94bc4be2	47d9c408-1a3c-46c1-aecf-6f1746615499	53f96e0cca736a962e50ba3cc03d6ed337aac2804e122aa4799ed6069e47a0fe	2026-04-01 15:24:32.522	2026-04-08 15:09:30.575	2026-04-01 15:09:30.577
8cf4cb7c-fa42-4e71-9c71-bd4e448a7e08	281ac0c9-d22b-4ece-895a-9d2c86a8f315	7c4e56f386aa7b782e4852d2905cd9e0e0c2b5e9a5f15d8ac91c9c43b81da684	2026-04-01 15:48:29.692	2026-04-08 09:54:53.54	2026-04-01 09:54:53.541
e51a5b42-3f62-4d0f-bc98-f144eecc14e8	3961fabe-1345-4426-bd8a-ca0a5eac3aac	890d80688de1e04a9655091f00357962d8836f0611aa678bc396a2984479c4f2	2026-04-01 16:18:58.084	2026-04-08 10:52:32.522	2026-04-01 10:52:32.524
fb5367d2-73a2-4d9a-90f7-b8e88e628970	e9134380-2da7-4a1e-bd2a-34398f85a6e5	3aa7232d77d827ae351709dcb85fb49ed5c4270c4c74c5668ce042a486432ab8	2026-04-01 17:50:00.073	2026-04-08 09:22:51.241	2026-04-01 09:22:51.242
eb11d814-3235-41aa-960d-26fe2be405d2	9f70646e-c63e-4a08-a4fa-8786204bbf4e	54f8b038ac64d6e31942c5b6a85f18465a8d3c803e9ce1fb9166a629f128aa3c	2026-04-01 15:39:33.724	2026-04-08 15:24:31.78	2026-04-01 15:24:31.781
13e583fd-19ed-40e1-8113-492b956c4b68	47d9c408-1a3c-46c1-aecf-6f1746615499	d171c81aec3cbbf389dfdc880262b2530426b4af888c8a43609fa299d984df5d	2026-04-01 15:39:34.463	2026-04-08 15:24:32.535	2026-04-01 15:24:32.536
7eddf657-fdc6-45e2-a371-0372a5eff247	9f70646e-c63e-4a08-a4fa-8786204bbf4e	852c175551bc7a687352276434c99ecddc8ab6b69f4147ecb26ba6f66be85956	2026-04-01 15:54:35.597	2026-04-08 15:39:33.744	2026-04-01 15:39:33.745
d4f5ec79-5644-4f99-ae0c-7296922ac227	47d9c408-1a3c-46c1-aecf-6f1746615499	ac88dd421374a60ef8c6762b3de57b76fbf9622805a25ad4fe85b2901a5962d4	2026-04-01 15:54:36.356	2026-04-08 15:39:34.477	2026-04-01 15:39:34.479
49b5ae5d-c275-473a-98bc-5124919f60db	9f70646e-c63e-4a08-a4fa-8786204bbf4e	0e80aede52996342e8c4229cc522aa688f9cb6466399e42195339deb0d7b1b9c	2026-04-01 16:09:37.554	2026-04-08 15:54:35.613	2026-04-01 15:54:35.614
9d6c5a6d-f685-48db-b9ae-aa75d0f31bd2	47d9c408-1a3c-46c1-aecf-6f1746615499	b8976a3edf9eccb7fe88f4e85b8cd2a4d48833bb252b2f7a3a947793fed304dc	2026-04-01 16:09:38.33	2026-04-08 15:54:36.369	2026-04-01 15:54:36.37
52b33700-36ab-4049-b2a2-641151a802db	9f70646e-c63e-4a08-a4fa-8786204bbf4e	0b455899c32006f089a4b3c0a7356f006cf993d320cfe8cd97306119b527870e	2026-04-01 16:24:39.491	2026-04-08 16:09:37.571	2026-04-01 16:09:37.572
42a577fc-a14d-4439-a094-cdeaf848cea4	47d9c408-1a3c-46c1-aecf-6f1746615499	a2c8c7d6134e6ac2b80106c775d6bab32ebd4bef9e88cddf60c9b85c054da2e7	2026-04-01 16:24:40.284	2026-04-08 16:09:38.345	2026-04-01 16:09:38.346
505cea6b-05e7-47f4-bad7-749724e96b3b	9f70646e-c63e-4a08-a4fa-8786204bbf4e	c486af43fa6c2426d2d85a4359c6c6f3c3c426889fd87e535a06ce0dfa4f70ce	2026-04-01 16:39:41.453	2026-04-08 16:24:39.507	2026-04-01 16:24:39.508
dd1e694d-842a-46c0-9ff9-6720bd41efc9	47d9c408-1a3c-46c1-aecf-6f1746615499	caef8de10710b5d8041032913f78f9dec48b6f8d520a6f0d85590ca7cbbddd34	2026-04-01 16:39:42.243	2026-04-08 16:24:40.297	2026-04-01 16:24:40.298
dc37d581-4eb8-4f48-80c7-d28a1291a258	9f70646e-c63e-4a08-a4fa-8786204bbf4e	eedef6389dd27d0cd5b04ba5a2798b46dcffc8bf241f019d9891d0775cfe1539	2026-04-01 16:54:43.41	2026-04-08 16:39:41.469	2026-04-01 16:39:41.47
fa6922f2-0fee-493e-8e6a-bd503aa18dcd	47d9c408-1a3c-46c1-aecf-6f1746615499	0fae6eb273d2753d71f233b111de490fd68f0e5adb8925cf81dd24c0d32f4b62	2026-04-01 16:54:44.201	2026-04-08 16:39:42.256	2026-04-01 16:39:42.258
00e9ac2b-c4a5-4cf6-b7b6-cb25b5167993	9f70646e-c63e-4a08-a4fa-8786204bbf4e	b5de2af73eca69873ec8a82326420d7ee01a795d425fdfa3e1fea8181b24cecf	2026-04-01 17:09:45.392	2026-04-08 16:54:43.428	2026-04-01 16:54:43.43
e5c745a1-db3e-4f43-8781-0a619b1a9d54	47d9c408-1a3c-46c1-aecf-6f1746615499	e2181f1a2fb3f5fb725a3f14b7b39821004fc34776c6b001ac52515763e02314	2026-04-01 17:09:46.157	2026-04-08 16:54:44.214	2026-04-01 16:54:44.215
56bf7f54-38bf-4fde-8179-e4a76c144836	9f70646e-c63e-4a08-a4fa-8786204bbf4e	d715d61002dc5038f240d6b4aecd87f4d084e8f4f58f01d3fcb587dc56070330	2026-04-01 17:24:47.347	2026-04-08 17:09:45.409	2026-04-01 17:09:45.41
29619078-981c-4445-baf2-01cdcedefc36	47d9c408-1a3c-46c1-aecf-6f1746615499	22a11853aeb390ed8e25a73758a6a24da16be76c29175c5b197c6315781fceb4	2026-04-01 17:24:48.102	2026-04-08 17:09:46.17	2026-04-01 17:09:46.171
5d62c78a-d034-4a54-94fe-49b5a39032b4	9f70646e-c63e-4a08-a4fa-8786204bbf4e	d3348d6c7c62fb7cc2da005ef6d4d96ffe8ef5eba22697bcd74c71dc2e6f9661	2026-04-01 17:39:49.3	2026-04-08 17:24:47.365	2026-04-01 17:24:47.367
a6c77fb6-3fba-4fd7-b6e9-74deb7fc4ce7	47d9c408-1a3c-46c1-aecf-6f1746615499	6bd111f4fe28ff9f89839bbb68f1cbaab0c2d395d6d17006d658fc1734b7474f	2026-04-01 17:39:50.065	2026-04-08 17:24:48.115	2026-04-01 17:24:48.117
cf25d676-75df-443c-8037-4390178c737c	3961fabe-1345-4426-bd8a-ca0a5eac3aac	a6b14f8f0bf8b52c2bda0199d983d3306fde0a9b8d13dd3e31383215f15b47e8	2026-04-01 17:44:57.735	2026-04-08 16:18:58.102	2026-04-01 16:18:58.104
0691549e-8dfe-40ab-9a87-1d69265b685b	e9134380-2da7-4a1e-bd2a-34398f85a6e5	edb72857b125daac724a79dbde781d15466143e19e5d5b52465cc16ff3a7f748	\N	2026-04-08 17:50:00.09	2026-04-01 17:50:00.091
4052c5dd-1efe-4eb4-873d-7f391a61adca	9f70646e-c63e-4a08-a4fa-8786204bbf4e	e3de37d94bef7981606f70c8af918092d93a3cce5417794ac941ac2045d21c79	2026-04-01 17:54:51.266	2026-04-08 17:39:49.316	2026-04-01 17:39:49.318
df429ea6-3107-4727-a6b7-8990148c9959	47d9c408-1a3c-46c1-aecf-6f1746615499	56a0eb3e63deae5f0f9901071c9eeaa85741f539a184dda1d7523d5d51c479a9	2026-04-01 17:54:51.981	2026-04-08 17:39:50.078	2026-04-01 17:39:50.08
ab4cd935-e181-4c0e-bf8e-cd3bdf5404d8	47d9c408-1a3c-46c1-aecf-6f1746615499	691947d703f205412d5f1d6b697f35cb31885b97a8fa7eb6ac2f6123ea88ab64	2026-04-01 18:05:36.295	2026-04-08 17:50:36.664	2026-04-01 17:50:36.666
7a19fef4-03ad-49f4-a0a8-37f222b5babe	9f70646e-c63e-4a08-a4fa-8786204bbf4e	c5235ecc6fce2e5f3841bc679332192746b73dc2a67bfa2597d7241f4a043578	2026-04-01 18:09:53.051	2026-04-08 17:54:51.281	2026-04-01 17:54:51.282
a2f6d53c-9087-44eb-9a6d-428aff222d9f	9f70646e-c63e-4a08-a4fa-8786204bbf4e	9cb2c99e483b03b025f1a3493860f024a376751b23bdec46ba6419d509e2b224	\N	2026-04-08 18:09:53.067	2026-04-01 18:09:53.069
0809f48d-c529-443e-a581-51715737eaec	47d9c408-1a3c-46c1-aecf-6f1746615499	64a276da3038ba007491ed48e7277dd883dfe03563af4241762eee6afecdcfde	2026-04-01 18:09:53.875	2026-04-08 17:54:51.994	2026-04-01 17:54:51.995
4fa38a38-6386-4102-912e-8e9f47219f6c	47d9c408-1a3c-46c1-aecf-6f1746615499	4f8a9ad0f95fbf05f709a98f2872eb600dece51842440ab8dc164b533c099191	2026-04-01 18:20:39.874	2026-04-08 18:05:36.313	2026-04-01 18:05:36.314
9fd6e2dd-1d48-4640-87aa-34f189f6919f	3961fabe-1345-4426-bd8a-ca0a5eac3aac	44a660886d49f8db1269d6450e7f3e5b9b205e6725543fc937f685d8a64983b6	2026-04-01 18:22:27.908	2026-04-08 17:44:57.751	2026-04-01 17:44:57.752
0283958a-4cda-4c10-8581-a0c9759cc2d1	47d9c408-1a3c-46c1-aecf-6f1746615499	4babac2d77ce9dacb9d54ef421821c40afef5792300243611c6e73f227ee181a	2026-04-01 18:24:55.84	2026-04-08 18:09:53.887	2026-04-01 18:09:53.888
feb9706f-ed11-466a-a5c8-c73e13e17bd7	47d9c408-1a3c-46c1-aecf-6f1746615499	d0b98b109bb5564f991f4c58356c10d47af3c7baec2371f14dd05f77db00858d	2026-04-01 18:35:39.447	2026-04-08 18:20:39.891	2026-04-01 18:20:39.892
e8fa8496-eb8b-442b-ba79-26618674a0a5	47d9c408-1a3c-46c1-aecf-6f1746615499	0df02dba57c7bc4de186c5cfa9c9d118481a1ca4af7be3977332a20930f0a696	2026-04-01 18:39:57.614	2026-04-08 18:24:55.856	2026-04-01 18:24:55.858
ed6d0f7f-b77c-43fd-b7ba-90557e656d83	3961fabe-1345-4426-bd8a-ca0a5eac3aac	788954bd7465cd7287ff493900cad661338a125b1a3ecd2546bc81c2515013b6	2026-04-01 18:40:14.27	2026-04-08 18:22:27.922	2026-04-01 18:22:27.923
0899fc61-a2b8-4e2c-9f22-06d343c446e2	47d9c408-1a3c-46c1-aecf-6f1746615499	8a24a06d2b7cb218f765e91631ff02ef9c8ecce14c9589bf2ca94387395ecb8e	2026-04-01 18:50:39.51	2026-04-08 18:35:39.464	2026-04-01 18:35:39.465
ff04130c-91b1-4fe9-a9b9-dfca399dfda8	47d9c408-1a3c-46c1-aecf-6f1746615499	08fabfe91b3f7d5a3a630c65ed1c154830652e7c5ce6dd5a865a00b57faf21fd	2026-04-01 18:54:59.589	2026-04-08 18:39:57.627	2026-04-01 18:39:57.629
272db854-5efd-470a-b40c-411a659b1e4a	47d9c408-1a3c-46c1-aecf-6f1746615499	2b8701793ebbab1472c5d9758c7330707f9a60110551f0e967ac73d31bcf7400	2026-04-01 18:55:12.808	2026-04-08 18:40:11.546	2026-04-01 18:40:11.547
e6c85649-ccef-4c1a-a7e7-4fae9cf379d7	47d9c408-1a3c-46c1-aecf-6f1746615499	5de1d1ae1a7d7225b459989313ffbc627ec8dd952415ac80b4053f9871a78fe7	2026-04-01 19:05:42.764	2026-04-08 18:50:39.528	2026-04-01 18:50:39.529
6d632586-26d7-466b-959a-889d301ff30c	3961fabe-1345-4426-bd8a-ca0a5eac3aac	d4fc070a578fa32079fa4693ba803e786e00a360ac1a0b60366b9b9e3b6c3621	2026-04-01 19:08:09.206	2026-04-08 18:40:14.283	2026-04-01 18:40:14.285
18ba70e7-0b9f-4556-b04f-d45154aa8ba5	47d9c408-1a3c-46c1-aecf-6f1746615499	69df2173d74a3762f30e8e280444cc7ceafd0955a97675813e8d545979817451	2026-04-01 19:10:01.502	2026-04-08 18:54:59.607	2026-04-01 18:54:59.608
88a98ca0-0df4-43b9-ad9e-273575be509d	47d9c408-1a3c-46c1-aecf-6f1746615499	750c3674bd3106a88ae64d809101d6d643c89f11d0c8727f222ba43a06cbf651	2026-04-01 19:10:14.384	2026-04-08 18:55:12.822	2026-04-01 18:55:12.823
c7fb856b-8dd5-4115-bc5e-897aa87acc62	47d9c408-1a3c-46c1-aecf-6f1746615499	249d6b7dc85dd2bc8ccd6a45359f6e0dc8cf6a7eb52f209b4cd2d02fa37909d0	2026-04-01 19:20:42.489	2026-04-08 19:05:42.78	2026-04-01 19:05:42.781
4751e8bd-8d7e-419f-8422-306554696ff8	47d9c408-1a3c-46c1-aecf-6f1746615499	55c3a5c3ea51a8ee16ce819d69c63295d9afacf5600117bd9996bbf192705cc6	2026-04-01 19:25:03.443	2026-04-08 19:10:01.516	2026-04-01 19:10:01.517
adf55057-44f5-4676-9c1e-684b25f9df5d	47d9c408-1a3c-46c1-aecf-6f1746615499	9b166fd58a20818e9425fd8b165d21c92e7e0bc842c621b089974de52ac8a7be	2026-04-01 19:25:16.346	2026-04-08 19:10:14.399	2026-04-01 19:10:14.4
df983dde-c5f1-4378-a477-9acedbb6a99f	47d9c408-1a3c-46c1-aecf-6f1746615499	04b46dfb51e0b2a8032a75ecaa1fcb6f5f250a0f17b026812219ffe5f89c9b79	2026-04-01 19:35:42.202	2026-04-08 19:20:42.508	2026-04-01 19:20:42.509
820bae44-987a-4bda-9e91-f728485975c4	47d9c408-1a3c-46c1-aecf-6f1746615499	212fe8f8ccdde3a4184152515c631aaf9321a9c8ab5746c5412b6a51cb355fce	2026-04-01 19:40:05.43	2026-04-08 19:25:03.461	2026-04-01 19:25:03.462
03d1c2f0-6cc5-4dfb-9350-da30224770fe	47d9c408-1a3c-46c1-aecf-6f1746615499	fbd6c05c04bb0ac051446559d2e0e93ce7c8be787e61c54fa2c86b36962a1a90	2026-04-01 19:40:18.299	2026-04-08 19:25:16.36	2026-04-01 19:25:16.361
215c49b9-f446-4348-b422-bd54beabf32b	3961fabe-1345-4426-bd8a-ca0a5eac3aac	983cf014222f803a62231f779538ad8b489b84bb07c076bee5a76f3132c4f75c	2026-04-01 19:46:37.751	2026-04-08 19:08:09.223	2026-04-01 19:08:09.224
bbe09e7a-ac96-4155-a58a-1cdd09006a33	47d9c408-1a3c-46c1-aecf-6f1746615499	8545689ab1ce6bca2807764b466d70cda5803c4d9f5dbb3e08228c265cb15f60	2026-04-01 19:50:45.828	2026-04-08 19:35:42.218	2026-04-01 19:35:42.22
53ea7511-3be4-473b-8f8f-3ec136f8a983	47d9c408-1a3c-46c1-aecf-6f1746615499	b67a90cbda3979fbef1943fff012bcc7faf9d001adca0f52176685d9515d03f1	2026-04-01 19:55:07.228	2026-04-08 19:40:05.446	2026-04-01 19:40:05.447
62443ad1-ac4e-4c54-a8ac-8b422ee7dc9b	47d9c408-1a3c-46c1-aecf-6f1746615499	5b1310624edcf21178e1812417835069fa513e2247f07e03a3bac060254ee3bd	2026-04-01 19:55:18.504	2026-04-08 19:40:18.313	2026-04-01 19:40:18.315
55562b4d-2803-4f26-a379-af0afe5ffd15	281ac0c9-d22b-4ece-895a-9d2c86a8f315	94c276186054c85abc9007ee9abb29483a7dd44eb2d6ca48adf8f16933390172	2026-04-01 22:29:38.89	2026-04-08 15:48:29.709	2026-04-01 15:48:29.71
b83cc00b-022a-42a1-9457-13bfca9e8b57	47d9c408-1a3c-46c1-aecf-6f1746615499	7c6fec6e63b388096281ca96bef6e376b77dafae528c198c8e1e7ba50dcdc3a4	2026-04-01 20:05:45.498	2026-04-08 19:50:45.844	2026-04-01 19:50:45.846
74e7a4b2-4395-4b99-9272-cc9db7ff6a52	3961fabe-1345-4426-bd8a-ca0a5eac3aac	dd4a1aa8dbb6d41b64c20e0b4e1f15909bd183a0678daf1ab05da241af1da404	2026-04-01 20:06:15.087	2026-04-08 19:46:37.767	2026-04-01 19:46:37.769
39b7602c-5ed2-44dd-bf3c-f544a46f9de4	47d9c408-1a3c-46c1-aecf-6f1746615499	69378579751d1177e8042669a8328b0546fa08a14f47cbf157a8d1ce952afa6b	2026-04-01 20:10:08.864	2026-04-08 19:55:07.245	2026-04-01 19:55:07.246
704a1986-7f04-48e7-ad4a-0cc63c3b84de	47d9c408-1a3c-46c1-aecf-6f1746615499	baf27e64a64597282409ee6832ffb88ff6bb38489b42609e497abd5ec1bc8ffb	2026-04-01 20:10:19.47	2026-04-08 19:55:18.517	2026-04-01 19:55:18.519
27c74374-4b74-4b3d-a64a-bd2f550a52d2	47d9c408-1a3c-46c1-aecf-6f1746615499	8f4d31fda1eacef750671441285ec35c53fb6dfe77913f38f05dc68b82bec5ec	2026-04-01 20:20:48.885	2026-04-08 20:05:45.514	2026-04-01 20:05:45.515
5a537498-890a-4e18-9831-b8835210587c	47d9c408-1a3c-46c1-aecf-6f1746615499	35ef7bfdf978a8e05b5aea6f0da2ef0d47dc14c0e172ea58ab8baab59910f820	2026-04-01 20:25:10.722	2026-04-08 20:10:08.878	2026-04-01 20:10:08.879
b7cfb340-b240-4593-b800-7aa09632341d	3961fabe-1345-4426-bd8a-ca0a5eac3aac	853d779e117bb2c393feff9b1efe705dbe008d22ee51320801596eef2d8e1bcb	2026-04-01 20:31:38.984	2026-04-08 20:06:15.1	2026-04-01 20:06:15.102
6e82de99-3dac-45e0-a595-0d8daa256cd7	47d9c408-1a3c-46c1-aecf-6f1746615499	7155e012ece87e5dfb01e002ea1e2d3eaaa2fc19b36a4cf8b48ae01811af4f76	2026-04-01 20:33:16.445	2026-04-08 20:10:19.484	2026-04-01 20:10:19.486
29e402b0-ae47-4b02-9b01-1e0da9041a55	47d9c408-1a3c-46c1-aecf-6f1746615499	f6c21f84d29763fad9c7f2bebf6f035d524e6435e9b51dea3428afd4c30c115a	2026-04-01 20:35:48.417	2026-04-08 20:20:48.902	2026-04-01 20:20:48.903
97d7c63e-3903-46e2-a9da-f8ed13a4318d	47d9c408-1a3c-46c1-aecf-6f1746615499	aff274ef0cb1778e5a9b0d433a444fe949ad33363cee672bc31e4384ecbec1a5	2026-04-01 20:40:12.502	2026-04-08 20:25:10.739	2026-04-01 20:25:10.74
90e84ff3-c231-48e3-8807-71fa673a7468	47d9c408-1a3c-46c1-aecf-6f1746615499	e09784725a92e38202008029a05032d12a28f3a6a99cd378d3e932c119e526ae	2026-04-01 20:48:16.494	2026-04-08 20:33:16.461	2026-04-01 20:33:16.462
28246b4f-4ba0-46f9-8272-61e4e0047eac	47d9c408-1a3c-46c1-aecf-6f1746615499	01cda5df364176f9c23e3d024a0745385db035dc79815e5c1419f611c4460b85	2026-04-01 20:50:51.991	2026-04-08 20:35:48.431	2026-04-01 20:35:48.433
1e0034d4-42f3-469b-b71e-d926201b58b9	3961fabe-1345-4426-bd8a-ca0a5eac3aac	a8c32528304b6d95b547e7ebc716f6633197205b6b695e903230cab9e892a8db	2026-04-01 20:53:02.727	2026-04-08 20:31:39.001	2026-04-01 20:31:39.002
a50c9e25-d9e8-4387-937f-a12e2950969f	47d9c408-1a3c-46c1-aecf-6f1746615499	2714b3173a57b6ba509efba37e5dd5fb999430b4c5656f9566a82d410fa8e553	2026-04-01 20:55:14.321	2026-04-08 20:40:12.518	2026-04-01 20:40:12.519
a69eaaca-f26d-48c7-ad28-dc744b1ff1b9	47d9c408-1a3c-46c1-aecf-6f1746615499	6ca432fb7e770290f1ec073e240b1b8037290c6cf0a0e0f24cc61cd3508358c9	2026-04-01 21:05:55.68	2026-04-08 20:50:52.007	2026-04-01 20:50:52.009
0dbe1a89-73ae-445c-a2c1-a7db724a9d17	47d9c408-1a3c-46c1-aecf-6f1746615499	f3914618547b14c25a7af433771f9ea33db692ad5732239875e7477c705be57b	2026-04-01 21:10:16.295	2026-04-08 20:55:14.336	2026-04-01 20:55:14.337
065d36c2-90a0-42c9-9974-8bd62da21780	47d9c408-1a3c-46c1-aecf-6f1746615499	8bb67c9ce38c059b38a6241c2d12278910404ee202f473de5a7a6a2f99c3698a	2026-04-01 21:20:55.388	2026-04-08 21:05:55.697	2026-04-01 21:05:55.698
f7f4f3c4-35a1-4773-b8cb-0e9a1a54fd80	47d9c408-1a3c-46c1-aecf-6f1746615499	9098f86b5f34219dfc4925281b28f3e799bf804dfc1f42b3437347ed3dd06582	2026-04-01 21:25:18.129	2026-04-08 21:10:16.313	2026-04-01 21:10:16.314
b0122595-7b9a-43b1-b153-6a2c4b67c074	47d9c408-1a3c-46c1-aecf-6f1746615499	af585a345a93be53885c4224ab8051e1be873d222d20f2310068d13c2faab383	2026-04-01 21:35:58.867	2026-04-08 21:20:55.405	2026-04-01 21:20:55.407
6f481eb2-3a45-4c5a-a006-2b00c3ef87c1	3961fabe-1345-4426-bd8a-ca0a5eac3aac	39ca510dc1494b5e6b4a9998bac3e3390b477f2899bb13768261cae4947da3b3	2026-04-01 21:36:54.908	2026-04-08 20:53:02.741	2026-04-01 20:53:02.743
401f4e95-a2f1-4d71-a12d-a8623249b3cd	47d9c408-1a3c-46c1-aecf-6f1746615499	5303562cf99b80611136fd6f529deb959b4921e026716f1ef66b478c30bb7d2a	2026-04-01 21:36:59.728	2026-04-08 20:48:16.51	2026-04-01 20:48:16.511
20f720af-bd41-4c33-af7d-e691720201c9	47d9c408-1a3c-46c1-aecf-6f1746615499	e6323561cff47e6917f63b9824ce26aa40653fac28609ea9ca0bd6940cfab748	2026-04-01 21:40:20.058	2026-04-08 21:25:18.144	2026-04-01 21:25:18.146
388abaf0-a876-47d8-b054-7a663dfa2fe4	47d9c408-1a3c-46c1-aecf-6f1746615499	d4f241abb3acb43452891d2650f48e02dd97b0adc123e1466463026ec5328a8c	2026-04-01 21:50:58.592	2026-04-08 21:35:58.883	2026-04-01 21:35:58.885
6d659286-6f86-4872-800a-5f3dbb0c66ce	47d9c408-1a3c-46c1-aecf-6f1746615499	7b9dc6e96887661aa94e683ac779ef9f0d3f74a6687a4ac28e9b9926269b0729	2026-04-01 21:51:59.717	2026-04-08 21:36:59.744	2026-04-01 21:36:59.746
55408e2c-71ad-49be-8fea-177dccb21ec4	47d9c408-1a3c-46c1-aecf-6f1746615499	c48ee0185e9ed8483c2e116a1003bc8ade4e046caca80cb8fdbafeffa2d3db9d	2026-04-01 21:55:22.006	2026-04-08 21:40:20.075	2026-04-01 21:40:20.076
e5514075-90ec-46c3-87df-394b45b1fe29	47d9c408-1a3c-46c1-aecf-6f1746615499	ad2067aeddf4b9670ca16b4abb1d981840b2e9c3b4a4cc8e3c7414431aac7d3f	2026-04-01 22:05:58.306	2026-04-08 21:50:58.609	2026-04-01 21:50:58.61
c3cd0d35-cfbf-4ffb-88c5-8115793c9e6e	47d9c408-1a3c-46c1-aecf-6f1746615499	080a50111ecf339871b240a3f8bc80fc781997232a6572272737e5b5097af053	2026-04-01 22:07:01.676	2026-04-08 21:51:59.73	2026-04-01 21:51:59.732
2e3ca9df-d6c7-46c2-a4f7-2320123767a6	3961fabe-1345-4426-bd8a-ca0a5eac3aac	3c2c3882be2c82914913f626df46d64ed234eabc7fb3557b6e30ea65c20a1959	2026-04-01 22:08:53.618	2026-04-08 21:36:54.922	2026-04-01 21:36:54.923
1fc2e6b8-3dd1-47f6-b1d4-fa634efa2ccc	47d9c408-1a3c-46c1-aecf-6f1746615499	9c906a0ae555335144b9621b6595f2c80bcabb25b769fff50ae2e3a566123e7a	2026-04-01 22:10:23.965	2026-04-08 21:55:22.023	2026-04-01 21:55:22.024
0fbc48ab-27f8-4eb9-ab2a-d3dc3dca2b1c	47d9c408-1a3c-46c1-aecf-6f1746615499	056dc2ba4949464ef9f3c6b77d1fc5c048d1f6321dcb0a01de756a971d5d67a5	2026-04-01 22:21:02.029	2026-04-08 22:05:58.323	2026-04-01 22:05:58.325
3b221d2b-71fe-4b1d-9da6-d1fd75431c5b	c5c904e8-da40-4458-b8bf-5c2cc97348b1	5fc155a35afdadaea4c6ceaba7f7cca4ba849118613225645a835c5006bcdd25	2026-04-01 22:23:53.453	2026-04-08 22:08:38.481	2026-04-01 22:08:38.482
37bee843-f1db-48e6-b8d3-6c8a9f970279	3961fabe-1345-4426-bd8a-ca0a5eac3aac	49b8c6e1ae6be60abed74bbc8a5be04a1e7703bd4bd614c47148d89d33953d95	2026-04-01 22:24:07.573	2026-04-08 22:08:53.634	2026-04-01 22:08:53.635
502de36d-ef60-44e5-92c3-edcea861a1b2	47d9c408-1a3c-46c1-aecf-6f1746615499	be368cbb7eba890d387abc505f15ac56414f8693260dfc436164fe9416d518e2	2026-04-01 22:25:25.922	2026-04-08 22:10:23.981	2026-04-01 22:10:23.982
6d7987b6-54f2-4581-91c5-ca66269abca7	47d9c408-1a3c-46c1-aecf-6f1746615499	d7dfcf7c0509d247676493a2702e40a2b280873aa5b8418367798d99d59b9c28	2026-04-01 22:32:03.907	2026-04-08 22:07:01.691	2026-04-01 22:07:01.693
828b713a-5407-4f65-b973-8f8d6077efe3	47d9c408-1a3c-46c1-aecf-6f1746615499	8b5497329dd39ca27ead92518fe10a0009b8cfbba8f0b07f0d502a63cd6807fc	2026-04-01 22:36:05.754	2026-04-08 22:21:02.045	2026-04-01 22:21:02.046
cf04aa13-a69c-4e3e-b9ee-aee2780f31b9	47d9c408-1a3c-46c1-aecf-6f1746615499	0e347d13ff2fe3d8a2bcc2316bc40f2cd6996081c5c6c52719d72365aa1b62e3	2026-04-01 22:40:27.748	2026-04-08 22:25:25.938	2026-04-01 22:25:25.939
3a858069-2f64-436b-9bc6-f63a1d1a6b98	47d9c408-1a3c-46c1-aecf-6f1746615499	d30ddcd3ff16a2feb03d0f9232eaab2b6acc858f2e33ca6e62fba81f97a18057	2026-04-01 22:47:03.927	2026-04-08 22:32:03.923	2026-04-01 22:32:03.924
b238cfa8-9124-4376-8f57-6dd6c3935354	c5c904e8-da40-4458-b8bf-5c2cc97348b1	0494b66df6e3bc5447e11e8447afd5779bae6f5cb8f2bc099208612969fa087b	2026-04-01 22:48:15.019	2026-04-08 22:23:53.467	2026-04-01 22:23:53.469
3db201ca-eab7-490d-bf87-dd560e7fab2c	47d9c408-1a3c-46c1-aecf-6f1746615499	eda07f2f456d524cff49e3264adf7ced4f1108884c055bf8066015c3f0d555d3	2026-04-01 22:51:05.406	2026-04-08 22:36:05.768	2026-04-01 22:36:05.77
cc044b25-569d-4e0e-8399-1acfd40aef2e	47d9c408-1a3c-46c1-aecf-6f1746615499	741be3eed15760ec5502de00d51e1af29b7de11e2f70bea4ece640763dc07bf6	2026-04-01 22:55:29.716	2026-04-08 22:40:27.764	2026-04-01 22:40:27.766
2440ab36-028d-43c3-9477-7055f88dfd5b	47d9c408-1a3c-46c1-aecf-6f1746615499	285f60cb565cbb8b81aa8fd211960106c490d9f9af5cec56a820beab631139a5	2026-04-01 23:06:05.118	2026-04-08 22:51:05.421	2026-04-01 22:51:05.422
ef06a8a6-278f-4131-ab52-40a6f8a8ad57	c5c904e8-da40-4458-b8bf-5c2cc97348b1	bdf629e5eeaaf53eae13652b640ef0f7ee0d18bd58188de9e75327714d53ead2	2026-04-01 23:06:13.407	2026-04-08 22:48:15.032	2026-04-01 22:48:15.033
6af0857a-6bdc-49fd-ad80-052f5e7b696b	3961fabe-1345-4426-bd8a-ca0a5eac3aac	e0910ddfe509a692b23e91e09a2c28f26f97ab98d5c177f2d8f86723418af0fc	2026-04-01 23:06:36.278	2026-04-08 22:24:07.585	2026-04-01 22:24:07.587
413b1f8b-b4dd-4546-aa3a-bf519db8365d	47d9c408-1a3c-46c1-aecf-6f1746615499	ef80d5245210037dfe96598217cd4a836efb4f3ad25659287f999d80fea9f20f	2026-04-01 23:09:06.527	2026-04-08 22:47:03.945	2026-04-01 22:47:03.946
e7c63799-fc78-4e10-810c-255447d4ec81	281ac0c9-d22b-4ece-895a-9d2c86a8f315	9905ad3228d8ba4bbcf7a09721a807446d7617ccfcb28d94d69cd442a638f221	2026-04-01 23:09:13.816	2026-04-08 22:29:38.905	2026-04-01 22:29:38.907
ea9972da-005d-4f94-8a1d-1b34f9b71f43	47d9c408-1a3c-46c1-aecf-6f1746615499	6700c94f2aeac6cdb9a8462a7dd2341cb11bf51c5cb0fa897bc5673868de463f	2026-04-01 23:10:31.669	2026-04-08 22:55:29.732	2026-04-01 22:55:29.734
f3596ce5-fb20-4f4a-bde7-0da03757caac	47d9c408-1a3c-46c1-aecf-6f1746615499	00299d9c76e11174fe0a47e531cd1ad1434803c6b81749613b0ef0e8ed764b74	2026-04-01 23:21:08.842	2026-04-08 23:06:05.136	2026-04-01 23:06:05.137
0b302f69-c24c-4a4c-8888-dd96590deb40	3961fabe-1345-4426-bd8a-ca0a5eac3aac	4cc44de7b4a06a6d5fb07d796ac81307f728bdcb9580e1d4d69db56895e72d0b	2026-04-01 23:21:37.793	2026-04-08 23:06:36.294	2026-04-01 23:06:36.296
6c66714e-439c-4a09-92ec-bfdeb4515b7d	47d9c408-1a3c-46c1-aecf-6f1746615499	5fc3f299bb7af690da8d9f37fabd7b2777c49fecea84265d4424ceee8cd487ae	2026-04-02 00:51:06.443	2026-04-08 23:09:06.545	2026-04-01 23:09:06.547
0d65795f-c197-4df6-94c8-78f446dccb27	c5c904e8-da40-4458-b8bf-5c2cc97348b1	89e83c3032cf61ec542ba4a1b135c6c29b0a7723f8c78ad4fa9939bd50f399b9	2026-04-02 20:23:40.895	2026-04-08 23:06:13.421	2026-04-01 23:06:13.422
38f1e1a5-dd14-47d1-aadd-c3c7b1b2ee50	281ac0c9-d22b-4ece-895a-9d2c86a8f315	93048566f35f21cac4362781105123ceee72cdd91d89d2a25298db55fdcde7cb	2026-04-01 23:24:14.115	2026-04-08 23:09:13.83	2026-04-01 23:09:13.832
06eeb5ed-80f7-48aa-b909-e4061e27b002	47d9c408-1a3c-46c1-aecf-6f1746615499	618ea7b03b1f5b341cb80c7929e0b741bf7c36bc39f8afacb564d364dac5ab96	2026-04-01 23:25:33.623	2026-04-08 23:10:31.684	2026-04-01 23:10:31.686
e67db508-7c64-49a8-ac73-6fe7e70fb479	47d9c408-1a3c-46c1-aecf-6f1746615499	11a3f9a0f64336f13768aaad870428b5fc4ad5271feba067c977772bc96f1177	2026-04-01 23:36:08.553	2026-04-08 23:21:08.857	2026-04-01 23:21:08.859
d9bc3519-633e-44d2-ae1a-9d12b1d6162d	47d9c408-1a3c-46c1-aecf-6f1746615499	a90963697029b74272ff9d1db953ba3ff3bc3344d3f5c3d3b0552ac4ce73ce6d	2026-04-01 23:40:35.588	2026-04-08 23:25:33.637	2026-04-01 23:25:33.638
b85749d2-20c4-430c-a046-e3960ee2420a	47d9c408-1a3c-46c1-aecf-6f1746615499	186c90ff1cc063a69db841f7115328d4bd1cf4d5bd1af6ffa9d60e6cf228a5da	2026-04-01 23:51:08.26	2026-04-08 23:36:08.569	2026-04-01 23:36:08.57
ad9c75aa-6ffc-4d05-a2da-552544e4d2a7	47d9c408-1a3c-46c1-aecf-6f1746615499	d23a183395ab7fa4029df27f75dbc4dfb5ae662364174f030c251f25d20f3d53	2026-04-01 23:55:37.542	2026-04-08 23:40:35.605	2026-04-01 23:40:35.606
c9a6293c-657d-47a4-a63b-24d52e83fd41	47d9c408-1a3c-46c1-aecf-6f1746615499	32194f8ff38bde4d9fb99b73185a8f634153ec4a5bcb6c637f725e68063d565b	2026-04-02 00:06:11.971	2026-04-08 23:51:08.279	2026-04-01 23:51:08.281
82c894d8-28f6-4dcb-ab48-b4fca70fdc5a	47d9c408-1a3c-46c1-aecf-6f1746615499	d77a3f6f6ca0935421add65eeff5fc274314e39d35882cde0fd22b1a53a45fab	2026-04-02 00:10:39.519	2026-04-08 23:55:37.557	2026-04-01 23:55:37.558
84478234-279b-474f-84b4-c85de9d25b78	47d9c408-1a3c-46c1-aecf-6f1746615499	26e3fba529566c73901a67bcc6b1daf19322a160545e917d0440119bb0c1e76e	2026-04-02 00:21:11.726	2026-04-09 00:06:11.988	2026-04-02 00:06:11.989
c3c9c729-8267-4e77-a4dc-5b8ea3d174cf	47d9c408-1a3c-46c1-aecf-6f1746615499	5a1a0348787fac9a7f038637b55285cae827c5b86fa8be12b5d4959e9f59012c	2026-04-02 00:25:41.498	2026-04-09 00:10:39.535	2026-04-02 00:10:39.536
564f068b-0cd4-4491-82ae-281d4fa4ed3c	47d9c408-1a3c-46c1-aecf-6f1746615499	9865cc6a5b3e925bf2b0765ff2d828f66538bd20552aa5c02e5393b05a239d9f	2026-04-02 00:36:11.31	2026-04-09 00:21:11.751	2026-04-02 00:21:11.752
dec4a532-7a57-425f-9eae-9691abdd8311	47d9c408-1a3c-46c1-aecf-6f1746615499	b6ae5af2a28b14d85022b326794328c38e00f57886c470306b1e8b34dff10757	2026-04-02 00:40:43.287	2026-04-09 00:25:41.523	2026-04-02 00:25:41.525
69eadf56-2377-4b24-8fcc-ee45cc679e80	3961fabe-1345-4426-bd8a-ca0a5eac3aac	910b274fa1c6f2a9c9ab9ca0d35d5cbbecd6154a54fc6c32da74785d99893307	2026-04-02 00:51:12.216	2026-04-08 23:21:37.809	2026-04-01 23:21:37.81
d0b813c9-58f7-432e-8a0b-4f69a2cc3668	47d9c408-1a3c-46c1-aecf-6f1746615499	721267e23ae4e75775abe846dd9bd39cba3d1acd3d15dd00e8c6c15fce412ff1	2026-04-02 00:51:14.993	2026-04-09 00:36:11.329	2026-04-02 00:36:11.33
4b3f48d0-9333-4f9f-ae55-104de8fb9d29	47d9c408-1a3c-46c1-aecf-6f1746615499	2de49ec27efd42c45b696570ff8bcbceff43ca33eac497bbc0183a6a62fbfcfe	2026-04-02 00:55:45.195	2026-04-09 00:40:43.307	2026-04-02 00:40:43.308
b8550fd5-386f-42ba-9fe4-15c1f707dca2	47d9c408-1a3c-46c1-aecf-6f1746615499	03fd5898eea65a2b75a9cee6de5a8cb200281889525a36f3373a7e67f2528cd2	2026-04-02 01:06:18.624	2026-04-09 00:51:15.008	2026-04-02 00:51:15.009
5890a5b7-244c-4a9a-8fb0-ab1c9ec28ce9	47d9c408-1a3c-46c1-aecf-6f1746615499	9a4eb673633d0307e5f1132b417ff998931405ac3403208ecf47b000baf83797	2026-04-02 01:10:47.074	2026-04-09 00:55:45.211	2026-04-02 00:55:45.213
bec392a0-6521-4044-a1a2-e48ffd6ac0da	47d9c408-1a3c-46c1-aecf-6f1746615499	f8a4f972aebc2c08f5d99bc8e527b234f88e775349f7a0e7f03f2b547b141a89	2026-04-02 01:21:18.328	2026-04-09 01:06:18.644	2026-04-02 01:06:18.646
f5424320-adc3-4878-a917-486e194f3781	47d9c408-1a3c-46c1-aecf-6f1746615499	551a9d804eb274634cdd1f85308287ae29431868bd69f3e7db0a414120a521f1	2026-04-02 01:25:49.047	2026-04-09 01:10:47.094	2026-04-02 01:10:47.095
dffd42e9-d30b-4788-b54a-bc30181e31ac	47d9c408-1a3c-46c1-aecf-6f1746615499	6fecc216da46e413eb52cddad27a4f276eb4c979dcf2867139703496c8c59484	2026-04-02 01:38:42.743	2026-04-09 01:21:18.345	2026-04-02 01:21:18.347
65f1b61e-5a57-4ec2-a99c-32ded4d476a9	47d9c408-1a3c-46c1-aecf-6f1746615499	cc8d814d41b9b203a1412fe043ee7a34e69574d98b871900ff767c8b5a904384	2026-04-02 01:40:50.882	2026-04-09 01:25:49.064	2026-04-02 01:25:49.066
01291119-d9f5-4e35-9314-b8c14d75499c	47d9c408-1a3c-46c1-aecf-6f1746615499	1cf390a3b3aad2fe2374223c9031856eee237fd40005b02a00e073f1ddade2e6	2026-04-02 01:43:37.77	2026-04-09 00:51:06.461	2026-04-02 00:51:06.462
37d36d7a-c7cb-4112-add6-c4bc23a18dda	47d9c408-1a3c-46c1-aecf-6f1746615499	b57c5320c3a49991bafcec810f8e25e05083b2d60de12ac6ca1ffca5b9426e2c	2026-04-02 01:44:43.342	2026-04-09 01:38:42.772	2026-04-02 01:38:42.774
0d2595f1-e7ea-4889-ac3a-3e15e71f10c8	47d9c408-1a3c-46c1-aecf-6f1746615499	c1c468e09412f987ab908392428d02df97a54657873054bd51ff67c8108c3408	2026-04-02 01:55:52.81	2026-04-09 01:40:50.898	2026-04-02 01:40:50.9
e12399aa-1a2f-4307-96e3-6dba1661455d	47d9c408-1a3c-46c1-aecf-6f1746615499	b481144b71249a836586c91daa812425aaa701157dbda3f4f9e651f0f6da065d	2026-04-02 01:58:38.996	2026-04-09 01:43:37.789	2026-04-02 01:43:37.791
6ec9617f-75fa-4b6a-a931-b27f3f97edc4	9f70646e-c63e-4a08-a4fa-8786204bbf4e	8fd46ee9520e4bf8ed2f2e3d63b773fde1593ae1f56a8a685f678af91476c844	2026-04-02 01:59:51.114	2026-04-09 01:44:51.095	2026-04-02 01:44:51.097
f47fc340-9bc1-4c2a-bef5-c890bc300895	47d9c408-1a3c-46c1-aecf-6f1746615499	1f4b663fb1d01345531a6536d0711ff31fa9193c02a924c16442129956b7cb05	2026-04-02 02:10:54.775	2026-04-09 01:55:52.83	2026-04-02 01:55:52.831
470fb00e-3f1e-4240-b9c9-e08a54b178f1	47d9c408-1a3c-46c1-aecf-6f1746615499	5e3ed2433cc3325df668e0ac9ba217ece3fb84d3c99c73909ac84b475d86b9c3	2026-04-02 02:13:40.105	2026-04-09 01:58:39.012	2026-04-02 01:58:39.014
dff8f5bd-c950-4044-857e-93a4f36c5ddb	9f70646e-c63e-4a08-a4fa-8786204bbf4e	8c7663e047bedefd99fe97fe4d928cef8e1795fd37d7caf2b7fb53bf19e6c9ca	2026-04-02 02:14:52.968	2026-04-09 01:59:51.132	2026-04-02 01:59:51.133
95da0633-2ea7-4170-95ba-28e5a5efc4e6	47d9c408-1a3c-46c1-aecf-6f1746615499	ef5ca438265a7f0cfb78a7e8c5f8521e5b6f5d37ddaa206ef301ac038688edac	2026-04-02 02:25:56.735	2026-04-09 02:10:54.793	2026-04-02 02:10:54.794
e21dbe16-1f7b-4cd9-b8c2-2e7f4321fdf6	47d9c408-1a3c-46c1-aecf-6f1746615499	7ee4b0e0507042ba2ba94e2baa88e39203d9d13420a400980bc031ef2a83a088	2026-04-02 02:28:42.071	2026-04-09 02:13:40.126	2026-04-02 02:13:40.127
568a716a-b03b-43a1-b95c-72d701cc59d9	9f70646e-c63e-4a08-a4fa-8786204bbf4e	5c6d22963bc6839f031795d1fe7c0d3d54adffa2a998f8da161cdfdaae31140a	2026-04-02 02:29:54.943	2026-04-09 02:14:52.983	2026-04-02 02:14:52.985
45fa536d-d9a2-4a1b-9fc1-02ddcc6a44eb	47d9c408-1a3c-46c1-aecf-6f1746615499	c2f8cdf553e81a548e4e88090638d9936febbfa1e99d6a8ae5f6c40ec299a5a6	2026-04-02 02:40:58.69	2026-04-09 02:25:56.753	2026-04-02 02:25:56.755
18a54f03-4fb2-49db-8867-9f608df50f11	47d9c408-1a3c-46c1-aecf-6f1746615499	47249c6f0bfe2c68c4270f1a3e508a9c3c125b482ca120c825ad6b8673b785d1	2026-04-02 02:43:44.017	2026-04-09 02:28:42.088	2026-04-02 02:28:42.089
4b6a0d5d-3cde-4ce0-bcc0-a8e4e690812f	9f70646e-c63e-4a08-a4fa-8786204bbf4e	17af6deea2c104ff878aa44e9776d04d37f637297719ebf95375f8bd4b8dfc40	2026-04-02 02:44:56.904	2026-04-09 02:29:54.959	2026-04-02 02:29:54.96
0c905b51-eb7c-4048-ad0d-d8dc2d597af9	47d9c408-1a3c-46c1-aecf-6f1746615499	1fcac01cf635d924d9840161c9e577a30f25d1655f1c346aeb08b5423a97901a	2026-04-02 02:56:00.644	2026-04-09 02:40:58.708	2026-04-02 02:40:58.709
527a2559-aa91-41bc-b8ed-3e9c629f924f	47d9c408-1a3c-46c1-aecf-6f1746615499	dad07331f618cd4e95118964314831734b62faf8194166c9f639479b2923d2ee	2026-04-02 02:58:45.978	2026-04-09 02:43:44.033	2026-04-02 02:43:44.034
12cf5348-2907-46d0-92c7-d4b73b70f300	9f70646e-c63e-4a08-a4fa-8786204bbf4e	4173107fccdcb47e2cef702010dc8d68eaedfc0e0d9b3e812eb736ca8d396e36	2026-04-02 02:59:58.849	2026-04-09 02:44:56.919	2026-04-02 02:44:56.92
3fe6274a-f271-4ae9-956d-578cc02ccc1a	47d9c408-1a3c-46c1-aecf-6f1746615499	cb9c52d42b81c0583ee0b1500ec4c0b15c290c623a3933a3f857464bada8e4af	2026-04-02 03:11:02.486	2026-04-09 02:56:00.661	2026-04-02 02:56:00.663
282ec132-ceb7-4819-9838-e0ed503dc318	47d9c408-1a3c-46c1-aecf-6f1746615499	a16c1af327eca033be640691585ef0ddd77d9522de746979ec96416670cf9db9	2026-04-02 03:13:47.731	2026-04-09 02:58:45.993	2026-04-02 02:58:45.995
7e166f03-a90b-4a96-a23e-8aeef11a49c1	9f70646e-c63e-4a08-a4fa-8786204bbf4e	4efd96bab289b289c89235ec0b548108d003a9c0acf63cb9d3be715957f03719	2026-04-02 03:15:00.586	2026-04-09 02:59:58.865	2026-04-02 02:59:58.866
cdd03716-386d-4d50-9fb3-ccf65605c1d6	47d9c408-1a3c-46c1-aecf-6f1746615499	16a196c0c8fc9ef0022f25ccc730f524059eb7c552481b1343ecf2c85a5d22ce	2026-04-02 03:26:04.198	2026-04-09 03:11:02.51	2026-04-02 03:11:02.511
f9b1a09c-fb68-4ecc-931f-bdd831030082	47d9c408-1a3c-46c1-aecf-6f1746615499	7a4e8ffdd4f638161090a034100c967d52bafb857e679920390c392960a30639	2026-04-02 03:28:49.382	2026-04-09 03:13:47.749	2026-04-02 03:13:47.75
f491e068-0c25-4409-beab-53a64b4e25d0	9f70646e-c63e-4a08-a4fa-8786204bbf4e	ad5f99eaa97b8a7da07dc5ae70c638e9f07336e6687f747b12b9711bb4092031	2026-04-02 03:30:00.745	2026-04-09 03:15:00.6	2026-04-02 03:15:00.601
78bba343-5b10-4ecf-a8b5-2e28ba63f7a8	47d9c408-1a3c-46c1-aecf-6f1746615499	7ea0a812b1e4ab0c9a257649581603dfb4389aa4bea603c95ac7106a7859cc89	2026-04-02 03:41:06.152	2026-04-09 03:26:04.22	2026-04-02 03:26:04.221
39ef5058-99a7-4998-9bb4-b52a43b26db4	47d9c408-1a3c-46c1-aecf-6f1746615499	a89f25acaf46a5d832c8383a28c81a2334386a180d9be96da231bcc238e83203	2026-04-02 03:43:51.358	2026-04-09 03:28:49.4	2026-04-02 03:28:49.401
df7d5e68-8b14-4128-961e-1d156585bcea	9f70646e-c63e-4a08-a4fa-8786204bbf4e	df579a337cdc0679d6d47d505c7dff98b1ddc77616ffdbad981d9fa92b66ddf8	2026-04-02 03:45:02.706	2026-04-09 03:30:00.758	2026-04-02 03:30:00.759
97273ced-103b-474d-88de-c170ab3f7c69	47d9c408-1a3c-46c1-aecf-6f1746615499	facd6ad3db115d07354622609dc88a6861dc984d482488b956f50c1e01492f37	2026-04-02 03:56:08.101	2026-04-09 03:41:06.173	2026-04-02 03:41:06.174
4730be0c-6344-47df-a7a7-5efda66a65fd	3961fabe-1345-4426-bd8a-ca0a5eac3aac	79a52f40c37baeaf3f8b052c915405492558c7af162e503d3e34543af01f35d0	2026-04-02 11:00:54.13	2026-04-09 00:51:12.233	2026-04-02 00:51:12.234
d29f9250-f982-4103-a801-95ebd4d63f4c	281ac0c9-d22b-4ece-895a-9d2c86a8f315	50d07822648f5fcda32d4ef0bff4007a274aa746c32736a555cb542eeee767f7	2026-04-02 23:14:03.622	2026-04-08 23:24:14.129	2026-04-01 23:24:14.131
21c02d59-9b39-4574-84ee-e17f91584a40	47d9c408-1a3c-46c1-aecf-6f1746615499	b7247f75f1a599624035dcd1fa31c20a720b52264d5f27a354b444b9a0880a8f	2026-04-02 03:58:53.315	2026-04-09 03:43:51.375	2026-04-02 03:43:51.377
73ee1d2d-9a99-488b-b0d8-d83461470abf	9f70646e-c63e-4a08-a4fa-8786204bbf4e	a06ed50b881954595963a7c11ac1fb18b1f4b0df7595e700045e65844648efab	2026-04-02 04:00:04.67	2026-04-09 03:45:02.72	2026-04-02 03:45:02.722
c19edbb2-7ccf-4a7e-8c87-c5add0c669f9	47d9c408-1a3c-46c1-aecf-6f1746615499	9b2f4b9cc4d9c3a191e717475d1e51faa1578319a24f320c6d366bd49ed7b07c	2026-04-02 04:11:10.075	2026-04-09 03:56:08.119	2026-04-02 03:56:08.121
167dd2fb-50b4-4e31-af1f-7c07438ded5c	47d9c408-1a3c-46c1-aecf-6f1746615499	69315f3d49fa6e9dbfdf0330391754fce3566a2e37bdf47f8e5246eed709a1e3	2026-04-02 04:13:55.26	2026-04-09 03:58:53.333	2026-04-02 03:58:53.334
4acdab5a-6bb7-4d40-aad1-5b91b501f238	9f70646e-c63e-4a08-a4fa-8786204bbf4e	06ee5a270f0a415e1354b38b3c04ebe54dafb03f935b34ed663fbbccef1edfca	2026-04-02 04:15:06.628	2026-04-09 04:00:04.687	2026-04-02 04:00:04.688
1b898d97-4728-4cc6-93dc-49cc7098673b	47d9c408-1a3c-46c1-aecf-6f1746615499	1272bbc452b9960e2f5af8497f10213e558fbd8e74e6404b3e0b46040528366a	2026-04-02 04:26:12.038	2026-04-09 04:11:10.092	2026-04-02 04:11:10.093
a672e3a5-8769-43f4-849d-8b6a1583c4e9	47d9c408-1a3c-46c1-aecf-6f1746615499	7e221ee379eb8ba040b7741c19be2874a33d43efd7881e96819ddf81fc2650d6	2026-04-02 04:28:56.319	2026-04-09 04:13:55.279	2026-04-02 04:13:55.28
891c3ef7-9fa8-43d6-945c-edfb6c5468f1	9f70646e-c63e-4a08-a4fa-8786204bbf4e	66e0f5831b73c6b3f49796318d48076f1393b70b6d7801c6052001d752aa6294	2026-04-02 04:30:08.589	2026-04-09 04:15:06.645	2026-04-02 04:15:06.646
4b66982d-2ce6-4416-8324-f675e5eb8410	47d9c408-1a3c-46c1-aecf-6f1746615499	eae7e291a08aa4eef81912fea0d038956346c1fb0bc3647aea6ad177cb76a84b	2026-04-02 04:41:13.827	2026-04-09 04:26:12.055	2026-04-02 04:26:12.056
90b0e6a4-6180-43e4-98d7-b11885794ea0	47d9c408-1a3c-46c1-aecf-6f1746615499	5854c850abc248ea320da26ac353690ebc98dabce02b68b586bcbcf1b492c62f	2026-04-02 04:43:57.214	2026-04-09 04:28:56.335	2026-04-02 04:28:56.337
1dbba676-85ce-47ad-b42e-97b7a50c626b	9f70646e-c63e-4a08-a4fa-8786204bbf4e	13df97df486114cde9f538a88519194e80e46b859ab629d886006dc07d68b8fc	2026-04-02 04:45:10.414	2026-04-09 04:30:08.602	2026-04-02 04:30:08.604
5a1d6a4a-0134-4c20-bb27-aeeaae167eff	47d9c408-1a3c-46c1-aecf-6f1746615499	c6cb111ca7c3170a373a887be43922245fbc03cf6eb70cd48ed7ac13126c9098	2026-04-02 04:56:15.832	2026-04-09 04:41:13.844	2026-04-02 04:41:13.845
d50a4916-394a-4b2b-81b1-cb07ef92544f	47d9c408-1a3c-46c1-aecf-6f1746615499	a12fa8aa191c40e0d9916c1b40029731239c49fad84688787fd3bea78800a297	2026-04-02 04:58:58.523	2026-04-09 04:43:57.23	2026-04-02 04:43:57.231
40ad4364-1d21-4f0e-959e-8a1496691881	9f70646e-c63e-4a08-a4fa-8786204bbf4e	d0a818fe7860f808009dccbebffbf9a41da1c447f632442d4b273a35be23715e	2026-04-02 05:00:12.307	2026-04-09 04:45:10.428	2026-04-02 04:45:10.43
3bc25104-6944-4bdc-95a6-d7505bdd23bc	47d9c408-1a3c-46c1-aecf-6f1746615499	b811105c3e5d06994183443cc308104ae0d7df4ed915d32859f88f93998efe85	2026-04-02 05:11:17.742	2026-04-09 04:56:15.848	2026-04-02 04:56:15.849
d5c4892e-1c73-4a86-91a9-138949f35d89	47d9c408-1a3c-46c1-aecf-6f1746615499	b80e51db11dfdc962516574f677276ba3e1eeb926e745e94fe3c27de7de9e28c	2026-04-02 05:14:00.483	2026-04-09 04:58:58.538	2026-04-02 04:58:58.539
b368eff1-4f4b-44d7-bca7-5391cb547ae5	9f70646e-c63e-4a08-a4fa-8786204bbf4e	3aec0968334a868499db006ac57894eac595c7ad76c02e097ec18fb016239498	2026-04-02 05:15:14.247	2026-04-09 05:00:12.323	2026-04-02 05:00:12.325
a62975ce-47bc-4edf-8e09-f55c5c2e6826	47d9c408-1a3c-46c1-aecf-6f1746615499	a3d5b5a819b9e76eae46908489d062b94110e6c0fc111eb38bc1cf3fef9c9af6	2026-04-02 05:26:19.55	2026-04-09 05:11:17.757	2026-04-02 05:11:17.759
2f43b413-f211-417a-8369-26714dce3d09	47d9c408-1a3c-46c1-aecf-6f1746615499	7c93bd15e7ed9b4e94eb9ae99ed93fb0337eeb8339ae2aafd9d153943c037fee	2026-04-02 05:29:01.672	2026-04-09 05:14:00.499	2026-04-02 05:14:00.501
ad375cf7-a6df-4145-a100-f585b82c49fb	9f70646e-c63e-4a08-a4fa-8786204bbf4e	5448236dd93baa85a6dc778481345f099d28376c25231090fb0ec8fd6a2b4247	2026-04-02 05:30:14.302	2026-04-09 05:15:14.263	2026-04-02 05:15:14.264
67cc4b99-1b34-4fae-b935-27718e513aae	47d9c408-1a3c-46c1-aecf-6f1746615499	a73076c4fdb114e273ae95cac8e343e589c9d278bb36b3699dd78094c9b22baa	2026-04-02 05:41:21.311	2026-04-09 05:26:19.565	2026-04-02 05:26:19.567
1ba4b30a-0bdc-4ae4-a955-1697f87c9609	47d9c408-1a3c-46c1-aecf-6f1746615499	a5ca35dd5bbc520817477c76823de784b98de5420cbfbbf044c403d9f6934e9e	2026-04-02 05:44:02.521	2026-04-09 05:29:01.689	2026-04-02 05:29:01.69
b72ede7d-8910-4844-8bdb-46d99f24e56e	9f70646e-c63e-4a08-a4fa-8786204bbf4e	1b5111407a41999850ad85bbf3a871d98cb19cbfa5f22d5bd0867c84d895efb9	2026-04-02 05:45:16.44	2026-04-09 05:30:14.315	2026-04-02 05:30:14.317
4442f992-342b-4858-93dd-d3605a20e6fc	47d9c408-1a3c-46c1-aecf-6f1746615499	e090e7b0a919a4d5c152ffad8fcdd278769908239ee1513aedc3e09adf115b90	2026-04-02 05:56:23.07	2026-04-09 05:41:21.326	2026-04-02 05:41:21.328
94f7ef72-f76f-4595-932e-ad829216120b	47d9c408-1a3c-46c1-aecf-6f1746615499	758fc0d658ae8b2f3af25b1ffc5e57d59143c19bbfdc0ee9a8492c3c982f5df0	2026-04-02 05:59:02.903	2026-04-09 05:44:02.538	2026-04-02 05:44:02.54
19af2841-9ec6-47b6-bbee-530650f0969b	9f70646e-c63e-4a08-a4fa-8786204bbf4e	ee6430b588f70558a036dab293776a3ccdbd4b2536ccf8bb23411f34448feab7	2026-04-02 06:00:18.65	2026-04-09 05:45:16.454	2026-04-02 05:45:16.455
11ef7fce-b588-4aef-b682-92a51d4f9b72	47d9c408-1a3c-46c1-aecf-6f1746615499	6f1f2f6ea249cf79efc2412e02cec37ab1d5945cc929c7f0db50ad30deaafc53	2026-04-02 06:11:24.913	2026-04-09 05:56:23.085	2026-04-02 05:56:23.087
8af55161-0961-4a8c-a020-758c946b61ea	47d9c408-1a3c-46c1-aecf-6f1746615499	2d75f4c2c5221a0934c03e48cf0301828c7bb35304bc481bfbe8847dec7120bf	2026-04-02 06:14:02.728	2026-04-09 05:59:02.918	2026-04-02 05:59:02.919
6e6f48d1-5bfa-4254-9a15-3a72014577a1	9f70646e-c63e-4a08-a4fa-8786204bbf4e	4af90c892eae5603055f429ecf8dc9cebe0e5965abe1dcf497ff15127a1c1a39	2026-04-02 06:15:18.763	2026-04-09 06:00:18.666	2026-04-02 06:00:18.667
fee6b7cf-399d-4a7e-9477-022c297235d2	47d9c408-1a3c-46c1-aecf-6f1746615499	6c6eaa28b373ec6cc361796372c819b052917f5f21838337dded4c42b862f11f	2026-04-02 06:26:26.878	2026-04-09 06:11:24.93	2026-04-02 06:11:24.931
6209e2df-ac68-4696-a2cd-00f5facf21b1	47d9c408-1a3c-46c1-aecf-6f1746615499	aa261f7ce4b5ded9de134401755c24e813a4a93d5cb694ec1ea9f26f013bb627	2026-04-02 06:29:05.04	2026-04-09 06:14:02.742	2026-04-02 06:14:02.743
9a98e95f-1413-4f4f-8574-b45f026c2bcb	9f70646e-c63e-4a08-a4fa-8786204bbf4e	454bb71fe9f91001a04e791c0ceab15220ebc28e399b87cb058965da2f99b06b	2026-04-02 06:30:19.538	2026-04-09 06:15:18.779	2026-04-02 06:15:18.78
e5aebad1-4540-4fa8-b702-0a18a8ea3635	47d9c408-1a3c-46c1-aecf-6f1746615499	20a5bc3d930a0445852e7ff29e604f11935467b63ea9cb37940e0302cce7bae1	2026-04-02 06:41:28.848	2026-04-09 06:26:26.894	2026-04-02 06:26:26.896
53b47926-b9c4-4776-b645-049a289e3849	47d9c408-1a3c-46c1-aecf-6f1746615499	df0388abe25844150ab0c70df3ef814c16e36726a91433d689ea54b3ff675b78	2026-04-02 06:44:06.763	2026-04-09 06:29:05.057	2026-04-02 06:29:05.058
c940d4b1-f815-425e-8108-e4218e575357	9f70646e-c63e-4a08-a4fa-8786204bbf4e	dd816ee2258e32e662e160c726788a5f683d2f10485bcb5b0cee73cad4f1d882	2026-04-02 06:45:19.678	2026-04-09 06:30:19.555	2026-04-02 06:30:19.556
62d9c9d6-e5e2-4e66-ac04-be20a95e2942	47d9c408-1a3c-46c1-aecf-6f1746615499	a8273801c080ad12ccbcb5a77b699dc923525f5d4b0c05c6865cd36e9b51395e	2026-04-02 06:56:30.783	2026-04-09 06:41:28.864	2026-04-02 06:41:28.865
60e7d857-1b8f-4193-a39d-04dd44674d11	47d9c408-1a3c-46c1-aecf-6f1746615499	7cc63867bf4964501435a3eea5a86db94e85c3b3e79e2c199e84303b922a9b03	2026-04-02 06:58:17.673	2026-04-09 06:56:30.799	2026-04-02 06:56:30.801
c6b0f045-6394-44b0-bc29-86ffafbbc074	47d9c408-1a3c-46c1-aecf-6f1746615499	094cb2337653c7b0ac486c2eca9d5431a9c3002f56ba17a38791062603c8b216	2026-04-02 06:59:08.684	2026-04-09 06:44:06.777	2026-04-02 06:44:06.779
b0a98336-1d70-48fc-a61f-193c4f03b095	9f70646e-c63e-4a08-a4fa-8786204bbf4e	bd6b407fb9f2701b238a8d19a88b2203727ffe781e36a1d848fd8f6ce9a0765f	2026-04-02 07:00:19.588	2026-04-09 06:45:19.695	2026-04-02 06:45:19.697
cbb15c90-facb-40fd-9f8e-156c858c6046	e9134380-2da7-4a1e-bd2a-34398f85a6e5	4b7d76ef6004ae71815642eef5caf12c261cf12545b7895b32d4ba2e75a63ad7	2026-04-02 07:12:22.212	2026-04-09 06:57:21.354	2026-04-02 06:57:21.355
77b301be-3248-4720-94fc-c02335114725	7e2a5e6d-7021-482a-abeb-883f8ebf016b	976aae5a9cdc9ac8cd35061ceca319234603b3c89059710988d3c3dff3c21f7c	2026-04-02 07:13:33.169	2026-04-09 06:58:33.356	2026-04-02 06:58:33.357
61e9acbd-67f9-4ef8-a4fc-74cfb226c1dc	47d9c408-1a3c-46c1-aecf-6f1746615499	f20e0eb2d27a649af4597668674250707d16fdf4956f742c2c5dd94411e35b0d	2026-04-02 07:14:10.658	2026-04-09 06:59:08.699	2026-04-02 06:59:08.701
793229fd-81d2-43ce-8977-adcbfc76817d	9f70646e-c63e-4a08-a4fa-8786204bbf4e	5c089f1f99a42d2d9109437a230981993b6b5201b8b2cee80de187bcc10987e6	2026-04-02 07:15:20.316	2026-04-09 07:00:19.603	2026-04-02 07:00:19.604
853c2694-5f3a-4c02-8b97-4da234dad94b	e9134380-2da7-4a1e-bd2a-34398f85a6e5	a47eb1170feded5b15665f923c0ca682e7c71c5363b17047e346f76a9dfc86c8	2026-04-02 07:27:24.101	2026-04-09 07:12:22.228	2026-04-02 07:12:22.229
21d0d0b2-e313-4e20-8e45-6d5b5bf0d012	7e2a5e6d-7021-482a-abeb-883f8ebf016b	1dc4c833ce993cfdee4cbe40185b9be1def76e526a6e30cb91e8d43c18de8788	2026-04-02 07:28:35.051	2026-04-09 07:13:33.183	2026-04-02 07:13:33.185
b141c44c-daa9-40d1-9779-2e7eb425349d	47d9c408-1a3c-46c1-aecf-6f1746615499	617ad293ffe0757cfe5b5a6b3e2259f90f000275331252483a76bb097b41e1a7	2026-04-02 07:29:12.072	2026-04-09 07:14:10.674	2026-04-02 07:14:10.675
6ab27e58-60ec-4cac-ac15-b8fabb3f00a9	9f70646e-c63e-4a08-a4fa-8786204bbf4e	464d8a2756e5d96658c1d0dfaa97e433bfd2d37c6b826aa8b73c5e47d23b9153	2026-04-02 07:30:22.226	2026-04-09 07:15:20.332	2026-04-02 07:15:20.333
b1cc64ed-5920-48b0-aaae-453b25fcd81e	e9134380-2da7-4a1e-bd2a-34398f85a6e5	f5f7b0cd06edd4c3765abeae596b51f24d750764c6e3617f317b3eda4ac93a62	2026-04-02 07:42:26.011	2026-04-09 07:27:24.118	2026-04-02 07:27:24.119
7d0e1af3-be53-45cb-b05b-cd49ddb2dd1f	7e2a5e6d-7021-482a-abeb-883f8ebf016b	7ffd8beb81138bb3d975f7fb6d4891fa57439f3decfd752c6e1d8c61d096bc9e	2026-04-02 07:43:37.104	2026-04-09 07:28:35.067	2026-04-02 07:28:35.069
1da09811-383f-49d1-a60f-d959aaafef1a	47d9c408-1a3c-46c1-aecf-6f1746615499	8b11b0936c0cc754bf6ae3cc47037eca944ac7883deb9d328cb1ddafae252e3e	2026-04-02 07:44:13.044	2026-04-09 07:29:12.09	2026-04-02 07:29:12.091
18d9d89c-77b9-4011-8bb6-f20e5531e78f	9f70646e-c63e-4a08-a4fa-8786204bbf4e	3623b8231601482b82193c85d5bea95427a2c694d2dfc0cfe626bc90a4d00cf3	2026-04-02 07:45:24.079	2026-04-09 07:30:22.24	2026-04-02 07:30:22.241
e2f5472a-6976-4e0b-94f6-49790a0a1a7a	e9134380-2da7-4a1e-bd2a-34398f85a6e5	8aa2e7dc177a474483956d2576fc07e0a0541fd84543747472ad2258ae30e069	2026-04-02 07:57:27.607	2026-04-09 07:42:26.028	2026-04-02 07:42:26.03
dacb877e-8234-483c-a47a-789afdcadc86	e9134380-2da7-4a1e-bd2a-34398f85a6e5	62d3fde8a4125c4967f359901d52c217a1a0a697644a66496ec9f792260a8ea7	2026-04-02 07:57:27.752	2026-04-09 07:57:27.628	2026-04-02 07:57:27.63
400ff759-7337-4660-8452-0c5ea1dfdab4	7e2a5e6d-7021-482a-abeb-883f8ebf016b	845aa393106c615a3ea65382a744c95fce613ce89c449be4208770e87492d7ea	2026-04-02 07:58:38.768	2026-04-09 07:43:37.12	2026-04-02 07:43:37.122
b36bce52-eda0-494a-b7f1-bf353d221463	9f70646e-c63e-4a08-a4fa-8786204bbf4e	f786f86f7032c043d2fe45f26a903cfbf2d2fa3a0c07d2971fa635416dd490c5	2026-04-02 08:00:25.848	2026-04-09 07:45:24.093	2026-04-02 07:45:24.094
0f7766bd-9359-4e16-9750-cc177047c69c	47d9c408-1a3c-46c1-aecf-6f1746615499	bd587f897dbfea71b9ada8b189b172b0d675292b5a86636332ee09c485a563c1	2026-04-02 08:00:41.4	2026-04-09 07:44:13.06	2026-04-02 07:44:13.061
1972b189-74e9-47c4-abf0-8b69c32253c3	e9134380-2da7-4a1e-bd2a-34398f85a6e5	98b3bffc2b7960e8a045d651def2db481594c7c9695ed88a298466d06275f395	2026-04-02 08:12:28.219	2026-04-09 07:57:27.766	2026-04-02 07:57:27.768
8a941014-8842-48b0-ada2-2e8b46515bff	7e2a5e6d-7021-482a-abeb-883f8ebf016b	c43e5f1631f553dd0632b138e14d29ee493bcdc5083fdcea447011aa8d7f5159	2026-04-02 08:13:40.702	2026-04-09 07:58:38.785	2026-04-02 07:58:38.786
02713324-903c-41fa-94ff-d5bbe988075b	9f70646e-c63e-4a08-a4fa-8786204bbf4e	a917a891b69f96a2da87ccfa1dcc780ca40d37bfb579771b790614197b6794a2	2026-04-02 08:15:25.351	2026-04-09 08:00:25.864	2026-04-02 08:00:25.866
4a8d0971-8005-4e19-b326-0edbfddce4b3	47d9c408-1a3c-46c1-aecf-6f1746615499	7f219907123fdfe8b96b48220a1930d9e1315f5457ec8f3c0854031d7cdbb031	2026-04-02 08:15:41.565	2026-04-09 08:00:41.415	2026-04-02 08:00:41.417
367b877d-8b28-4014-9413-1c8e35030767	e9134380-2da7-4a1e-bd2a-34398f85a6e5	260d1b8c9ed8e8e535fc9445cb60d4421f36972cf31db3265ca18201ab714ccd	2026-04-02 08:27:29.971	2026-04-09 08:12:28.239	2026-04-02 08:12:28.24
9c7f41de-6ba9-4166-b00a-af5047225b6f	7e2a5e6d-7021-482a-abeb-883f8ebf016b	b308a30c08e7c47f506027eaf16137be5c2e93cc58519d815343e0f1b10f6a80	2026-04-02 08:28:42.555	2026-04-09 08:13:40.72	2026-04-02 08:13:40.721
769f8880-01e0-4122-8e22-33214f839793	9f70646e-c63e-4a08-a4fa-8786204bbf4e	b006e7e4fb8da14508bd1b8004a63c83e05ec5a9f91f83f13f08c16624825f85	2026-04-02 08:30:27.273	2026-04-09 08:15:25.367	2026-04-02 08:15:25.369
f4a8efc6-eee7-4ca5-8c71-4b364da57bbc	47d9c408-1a3c-46c1-aecf-6f1746615499	3547a25274e8e68a64b708aa748a471a77dcce0ef6ea97ea8ea20fbce9785dd0	2026-04-02 08:30:43.465	2026-04-09 08:15:41.579	2026-04-02 08:15:41.58
98943cf2-c648-4949-9a54-c7742939e748	e9134380-2da7-4a1e-bd2a-34398f85a6e5	48f5182dc8e30b443072d61ec67f90679e42b3b5bdc7e5c6a6ff4dfab89ff9dc	2026-04-02 08:42:31.937	2026-04-09 08:27:29.992	2026-04-02 08:27:29.993
2101ae28-5169-45fa-9757-e1af40ee5788	7e2a5e6d-7021-482a-abeb-883f8ebf016b	22263febad478af69218fa329aa0ba217554a355dfe11982080d67aada93661e	2026-04-02 08:43:44.508	2026-04-09 08:28:42.574	2026-04-02 08:28:42.576
fd4dc90a-e892-49ef-a4d9-0ec22699b8f2	9f70646e-c63e-4a08-a4fa-8786204bbf4e	53d0d8fbeb624d19768f6cd024d6dc4d40644f1a0afbfa326312461f2f3cac75	2026-04-02 08:45:29.233	2026-04-09 08:30:27.289	2026-04-02 08:30:27.291
add106f2-e65c-4585-8fd6-3832b3c17cbb	47d9c408-1a3c-46c1-aecf-6f1746615499	67edb62d3a334530328292597285b50fadf3cb3da1769671f99b54aa733dce11	2026-04-02 08:45:45.423	2026-04-09 08:30:43.481	2026-04-02 08:30:43.482
8c316c23-059c-43f5-875f-6e82a77230ef	e9134380-2da7-4a1e-bd2a-34398f85a6e5	c6e6b314b9f8b199eb2685d5f65b33f0f29c89b0b8546501fa2b7d99f2562ee1	2026-04-02 08:57:33.884	2026-04-09 08:42:31.958	2026-04-02 08:42:31.96
d1c22c7a-c69e-4d66-a46c-88388fad0b18	7e2a5e6d-7021-482a-abeb-883f8ebf016b	506d36ca7bc5ae734e4c034487255b301137991e73506e0a5aa0513b39ec2379	2026-04-02 08:58:46.465	2026-04-09 08:43:44.524	2026-04-02 08:43:44.526
d599edd1-ed7f-4956-9e85-b8d171f5d741	9f70646e-c63e-4a08-a4fa-8786204bbf4e	0d98e395dbf24b8f381741f34d04dd791554b624b21e5f2d776caeb2df1a16e1	2026-04-02 09:00:30.936	2026-04-09 08:45:29.251	2026-04-02 08:45:29.252
ee49a7cf-cd39-4d7c-86e7-375bdaa3a371	47d9c408-1a3c-46c1-aecf-6f1746615499	d7eefaf20250b5e435a58fd83a72d7fc25ba644b67c24dd7650118be98ecf344	2026-04-02 09:00:47.381	2026-04-09 08:45:45.44	2026-04-02 08:45:45.442
743b67de-7ce9-4867-a3b7-89a2121cfcce	7e2a5e6d-7021-482a-abeb-883f8ebf016b	c8f8ba89f2a2deb386938d91a5aae107e32a6a615cd53cdc320956add22ab978	2026-04-02 09:13:48.423	2026-04-09 08:58:46.481	2026-04-02 08:58:46.483
b18aae34-2aad-4e24-b6f2-e307dbea3ae3	e9134380-2da7-4a1e-bd2a-34398f85a6e5	916abfa38e4495c9d2a54faa0bebf40e216e39a69475ffb5cf23b4e708af27a6	2026-04-02 09:22:40.094	2026-04-09 08:57:33.903	2026-04-02 08:57:33.905
35b5d1c4-061c-414f-8178-2331621a3cfe	47d9c408-1a3c-46c1-aecf-6f1746615499	bd3aedcb4e18689e13afb27f97668fd89d673334a1b6aff2127773e4ab56ed18	2026-04-02 09:22:47.601	2026-04-09 09:00:47.394	2026-04-02 09:00:47.396
c0dc8c27-faae-415a-b958-a84f287b6d01	9f70646e-c63e-4a08-a4fa-8786204bbf4e	a2d6cc573a7afeace8287297978dd491bac2c8f965d1072c20aebf1d893d1787	2026-04-02 09:23:15.466	2026-04-09 09:00:30.953	2026-04-02 09:00:30.955
ee5aa0d9-0628-4f39-a7d0-e8b8897bb3eb	7e2a5e6d-7021-482a-abeb-883f8ebf016b	f0a07e00e1bee36e22fc1fb85dde3e2c83892e33439b83dc61f118a8e4a795b9	2026-04-02 09:28:50.377	2026-04-09 09:13:48.444	2026-04-02 09:13:48.445
07b99c22-49ac-4afc-b9f0-0ceb57cc6e23	7e2a5e6d-7021-482a-abeb-883f8ebf016b	dcf31df11e8e6385033d082571204d932cdf47057cff5d4158b62294298d5db2	\N	2026-04-09 09:28:50.394	2026-04-02 09:28:50.395
f809f94f-ae25-4f31-919f-8ba142008f63	e9134380-2da7-4a1e-bd2a-34398f85a6e5	1426375e5170a746e72d4d571efa1b38a9db808d3d00c25cbb2ccb4e3e860f06	2026-04-02 09:37:42.401	2026-04-09 09:22:40.114	2026-04-02 09:22:40.116
89fc2dae-9c32-4cd9-a982-24179fbdf3ba	47d9c408-1a3c-46c1-aecf-6f1746615499	fa6eb0737f3dd042b73351cd201d2207351e80646f7ff2bee69a6e194e57799c	2026-04-02 09:37:47.27	2026-04-09 09:22:47.615	2026-04-02 09:22:47.616
c0ad0376-51df-4439-ba7c-6f10153658c9	9f70646e-c63e-4a08-a4fa-8786204bbf4e	a79ab4469e84f5dbdeab9502b9d392dd1218ae77136fe6b316984b4749ac7cfb	2026-04-02 09:38:18.005	2026-04-09 09:23:15.486	2026-04-02 09:23:15.487
81475f95-6ab5-4ebb-b3cd-67797679de91	3961fabe-1345-4426-bd8a-ca0a5eac3aac	a7d56e0dcf712d594c930d49ffe530606f3fc8936a274400c2e300a7109cc992	2026-04-02 09:45:27.807	2026-04-09 09:30:26.145	2026-04-02 09:30:26.146
ddad3634-9e4d-457f-9c2c-c324eb556f14	e9134380-2da7-4a1e-bd2a-34398f85a6e5	4056c3ca22cf01424f400e45934633ad743677c1878f3da59ee40b18bf344eea	2026-04-02 09:52:44.361	2026-04-09 09:37:42.418	2026-04-02 09:37:42.419
d1693059-4040-4dff-9097-f84de4aeb2d3	47d9c408-1a3c-46c1-aecf-6f1746615499	7543d639fab8d4dfcccf3e7e0b218a37458e066a28700b3b650450f8db7dd9b7	2026-04-02 09:52:49.232	2026-04-09 09:37:47.286	2026-04-02 09:37:47.287
160f84a6-7174-40d8-adef-91b08972e9df	9f70646e-c63e-4a08-a4fa-8786204bbf4e	0791530b42bdde16840f50fc295fac05f190dcb806c4ae138af68f5fc2694a6b	2026-04-02 09:53:19.886	2026-04-09 09:38:18.021	2026-04-02 09:38:18.022
6ac944fb-483f-4412-b29b-8e84e786d4b7	3961fabe-1345-4426-bd8a-ca0a5eac3aac	68ef0766b8153321e19237bc83260477281daf64e5f31789b83d058f00063048	2026-04-02 10:00:29.749	2026-04-09 09:45:27.823	2026-04-02 09:45:27.825
2d225969-9814-4133-966e-1b3ffc623aba	e9134380-2da7-4a1e-bd2a-34398f85a6e5	76e391e337f8fe81a769579ec2a9452f06c199926df56af545c21d3d28b4b219	2026-04-02 10:07:46.322	2026-04-09 09:52:44.377	2026-04-02 09:52:44.379
722d48ae-ff4e-4dd3-9801-7fb268a4c637	47d9c408-1a3c-46c1-aecf-6f1746615499	8ab4466ef4015931aff6365b713ec80a7c65e9610813d6fc545c51cdb1bb4439	2026-04-02 10:07:51.176	2026-04-09 09:52:49.248	2026-04-02 09:52:49.249
7ceda555-f09a-452f-b363-53163cc7b8e7	9f70646e-c63e-4a08-a4fa-8786204bbf4e	79cd508847c2d78456f366e16511d049f5c7081a02eeb21a273de32399a649c9	2026-04-02 10:08:20.878	2026-04-09 09:53:19.902	2026-04-02 09:53:19.904
27131c21-9526-455c-8a5d-d82f53ca839a	3961fabe-1345-4426-bd8a-ca0a5eac3aac	b97d747aa93ba7cff04d98c6cb5c7be3d78881bc27a7188085589f286173508c	2026-04-02 10:15:31.661	2026-04-09 10:00:29.767	2026-04-02 10:00:29.768
6931499c-26a0-4541-8e92-76bba12b92f5	e9134380-2da7-4a1e-bd2a-34398f85a6e5	8683d8a063d3ba7b0eb72f4777e3ca078949d32b95545c2e806ae93380d3c0c4	2026-04-02 10:22:48.23	2026-04-09 10:07:46.338	2026-04-02 10:07:46.34
c6d9ddf6-8fc4-41fe-b16d-7f32c357620c	47d9c408-1a3c-46c1-aecf-6f1746615499	444158309d327377079180aa81b4365621440e8d01f379c84c69561c4748efc7	2026-04-02 10:22:52.218	2026-04-09 10:07:51.194	2026-04-02 10:07:51.196
da40eaf3-51bf-44c5-87a3-204dff2a12a4	9f70646e-c63e-4a08-a4fa-8786204bbf4e	9870eb558b3cfb6c4fa3d0128136cde3082a260ffe9ec0e88b73041985bf04e5	2026-04-02 10:23:20.851	2026-04-09 10:08:20.891	2026-04-02 10:08:20.893
181be2ab-7605-4afb-beed-1b05101f19fa	3961fabe-1345-4426-bd8a-ca0a5eac3aac	5b32dfab91e4b8b45d413a35f02ca3d3a2751dfdf133dfb936604596e524d2ad	2026-04-02 10:30:32.811	2026-04-09 10:15:31.677	2026-04-02 10:15:31.679
08e365fc-6144-4280-9d7b-2c6b2d2900d4	e9134380-2da7-4a1e-bd2a-34398f85a6e5	deecf2b188736461058a84e12375319317bd75e0f678ebeb3a921f414141f8e2	2026-04-02 10:37:50.184	2026-04-09 10:22:48.246	2026-04-02 10:22:48.248
48d094b2-9bfa-4a66-a24a-5329063272d4	47d9c408-1a3c-46c1-aecf-6f1746615499	ad0abcbc058edf7a791c18476c1379072d76c3f479c0e1c5c90d80b14dc1355e	2026-04-02 10:37:53.172	2026-04-09 10:22:52.234	2026-04-02 10:22:52.236
e090eaec-553f-4e79-bbcb-09b8efd667d7	9f70646e-c63e-4a08-a4fa-8786204bbf4e	ebf556f440b7a3fc500e4f5e60c60945f1bac1dddb214bccd7f15f17181eec17	2026-04-02 10:38:22.813	2026-04-09 10:23:20.867	2026-04-02 10:23:20.868
b82712b6-ab91-4f7f-8bc4-49ac4a398ef0	3961fabe-1345-4426-bd8a-ca0a5eac3aac	fd9d1496bda665fc7638e2a1a4ea56818435b0b5127b07d388d54589549e15f9	2026-04-02 10:45:32.492	2026-04-09 10:30:32.828	2026-04-02 10:30:32.83
58984e86-7d1a-4340-9d46-05abc5194c6a	e9134380-2da7-4a1e-bd2a-34398f85a6e5	8caae5d3360896069b1cbcc0ef3bf7b678e05cd432450b088760c61720bdfb9d	2026-04-02 10:52:52.146	2026-04-09 10:37:50.199	2026-04-02 10:37:50.201
61c4bd24-c6cc-48b2-9f70-b65780b02313	47d9c408-1a3c-46c1-aecf-6f1746615499	3402479d0ae6482f5b23e08b7c4f42879bab5874a7e3ae109e44dbafb2be6117	2026-04-02 10:52:53.963	2026-04-09 10:37:53.188	2026-04-02 10:37:53.189
3c00f0c4-491f-43d6-9edc-3681f3a84989	9f70646e-c63e-4a08-a4fa-8786204bbf4e	a2744906db501a4b2c11fac3615da47355cac85a10a9cf01adebcea8f3222e41	2026-04-02 10:53:23.804	2026-04-09 10:38:22.827	2026-04-02 10:38:22.828
7989c948-a200-4d24-9429-f2863f4a06f7	3961fabe-1345-4426-bd8a-ca0a5eac3aac	0a716a99079ee6608263500c35d38821af2c823eb78d805cafd60c1caf08ca38	2026-04-02 11:00:34.454	2026-04-09 10:45:32.51	2026-04-02 10:45:32.512
be34e1ba-a226-40a3-ab79-654463148495	e9134380-2da7-4a1e-bd2a-34398f85a6e5	f473ebdc5a8ef19eb6aa7f92296c39f61c78f94fcfb6094d11556edc98ccd2d0	2026-04-02 11:07:52.888	2026-04-09 10:52:52.161	2026-04-02 10:52:52.163
596732e5-83e0-4444-a03e-711e97021114	47d9c408-1a3c-46c1-aecf-6f1746615499	99f2aa545cbcdbf951d9826685b44ab8378a7ead3c9d7d8ac6b713db4ff9ff1e	2026-04-02 11:07:55.125	2026-04-09 10:52:53.976	2026-04-02 10:52:53.978
8e64bcfd-3011-4563-97d1-69be7839ea89	9f70646e-c63e-4a08-a4fa-8786204bbf4e	5ce23d3cb98ed6b6cafaca64edf7c8c5e34c0c7ab191a25586f58cbbef6802e5	2026-04-02 11:08:23.717	2026-04-09 10:53:23.821	2026-04-02 10:53:23.822
3dc3020c-e4ae-4f51-83c0-9083b84c08b7	3961fabe-1345-4426-bd8a-ca0a5eac3aac	73e738cbb89164d3645d651cb5d1735f8451857bc45b4078a1140343b2e0d250	2026-04-02 11:15:35.742	2026-04-09 11:00:34.473	2026-04-02 11:00:34.474
faadcd31-1ae5-4580-9dc9-79d71de42f85	e9134380-2da7-4a1e-bd2a-34398f85a6e5	0ea7a0aa89463ac1921643ccda50797dee8dd78dd704c50c0234fade60bc29ab	2026-04-02 11:22:54.848	2026-04-09 11:07:52.906	2026-04-02 11:07:52.908
602c2ad8-fc39-40f6-8baf-d65cc1f91c82	47d9c408-1a3c-46c1-aecf-6f1746615499	0a69886b8ffcaeeb6a02aa4bb3318c7f5416a13baae3a4b7f1180ec097d1701f	2026-04-02 11:22:56.114	2026-04-09 11:07:55.138	2026-04-02 11:07:55.14
e7ca9785-64f1-46f0-ae34-a4bf87035a2c	9f70646e-c63e-4a08-a4fa-8786204bbf4e	4a9f7741782faf63d584fced238b7268e7a7118a5e890bd7d067b7e7e9fdcdda	2026-04-02 11:23:25.666	2026-04-09 11:08:23.732	2026-04-02 11:08:23.734
ad82ba89-1d04-4b1d-b4ad-28f021c4e924	3961fabe-1345-4426-bd8a-ca0a5eac3aac	49757ee22a82017428549ef634216e7b9d97bb93cd5a68b8626db72f7718a11c	2026-04-02 11:30:35.52	2026-04-09 11:15:35.759	2026-04-02 11:15:35.76
676e670c-9214-42d1-a8b9-21ad25d34951	e9134380-2da7-4a1e-bd2a-34398f85a6e5	e93a3a73d9151547aa3234a253bc6cad7e873a755641c4ec21363ec3ca0965b6	2026-04-02 11:37:56.8	2026-04-09 11:22:54.864	2026-04-02 11:22:54.866
551d5ef7-eb4b-41d9-8032-160aa1f999ce	47d9c408-1a3c-46c1-aecf-6f1746615499	091f79da10221973bb17a45253e0708bd05b9601ed8e4803b3ff23f708d52794	2026-04-02 11:37:56.838	2026-04-09 11:22:56.127	2026-04-02 11:22:56.129
4d27c4b5-d53c-4da4-9e34-63194e494765	9f70646e-c63e-4a08-a4fa-8786204bbf4e	7c5209de74c9ca7d85582da770150940186e3e1e1f9f358cb813ab1da174869d	2026-04-02 11:38:26.726	2026-04-09 11:23:25.683	2026-04-02 11:23:25.684
9540c905-158d-4ea3-9e61-d91ad6d07800	3961fabe-1345-4426-bd8a-ca0a5eac3aac	1c7cebdf5693520f6f4bf62ce70c6c6d17fba81526dea136ff7f323cd1381007	2026-04-02 11:45:37.471	2026-04-09 11:30:35.54	2026-04-02 11:30:35.541
6c3a586a-c2da-412f-aa2e-a92e03387de4	47d9c408-1a3c-46c1-aecf-6f1746615499	000f3fbdd670f13bf11db04d9fb69ed94e53910ed7f277cf8af8af92e0c9fca9	2026-04-02 11:52:58.066	2026-04-09 11:37:56.852	2026-04-02 11:37:56.853
fc94913a-3d1e-4001-b604-f691340acd7f	e9134380-2da7-4a1e-bd2a-34398f85a6e5	52a3dddf6d4503fe9091668bf0bf240d3009e157bbaf29832d1dd15c2c1c22c8	2026-04-02 11:52:58.755	2026-04-09 11:37:56.815	2026-04-02 11:37:56.817
8ae53c1b-5fdc-4aa4-ae97-e7218ed9291b	9f70646e-c63e-4a08-a4fa-8786204bbf4e	2dd3c9893d1a939b44ed2f29cf92fcdc988134dc1bebf5d226a6ea96949608ea	2026-04-02 11:53:26.565	2026-04-09 11:38:26.739	2026-04-02 11:38:26.741
842024f3-ab1a-46a1-8ccb-d6425fcdc354	3961fabe-1345-4426-bd8a-ca0a5eac3aac	9a19f36745d701f14e641f51a61ae7c2504d2d95f4eecd854f6fc382b1c4b398	2026-04-02 12:00:38.647	2026-04-09 11:45:37.49	2026-04-02 11:45:37.492
aecbc5a7-e423-46ba-9ef1-b52fdb957008	47d9c408-1a3c-46c1-aecf-6f1746615499	e7bfa07db24ce8e4ac26f7bbec2d7b7af85ec192156f240e11aafd3e9f80b647	2026-04-02 12:07:59.042	2026-04-09 11:52:58.082	2026-04-02 11:52:58.084
4afb8215-74eb-4fec-b011-20bb709f5d5d	e9134380-2da7-4a1e-bd2a-34398f85a6e5	fe084865d4731c86fbc5affd38c3c5d42068720acfc0c02601a1f6c84223b053	2026-04-02 12:07:59.737	2026-04-09 11:52:58.769	2026-04-02 11:52:58.77
4f68e572-5a5d-4b6c-af1f-6ddcef7dd97e	9f70646e-c63e-4a08-a4fa-8786204bbf4e	d62892ab52489c0025908312b5a13dfa9821401b03ef583a4d19662cf6a9ebb4	2026-04-02 12:08:28.519	2026-04-09 11:53:26.581	2026-04-02 11:53:26.583
8f3cb6e1-c954-460f-bf72-9d2ed7783201	9f70646e-c63e-4a08-a4fa-8786204bbf4e	9c76d70ef8c03a7e74bd5c84d13cc2c2a74c6a16e284c0d96d97d0e5ba31e141	2026-04-02 12:08:28.673	2026-04-09 12:08:28.532	2026-04-02 12:08:28.534
82ec4ea5-1b48-4102-9fc3-bfd8c8954cf9	3961fabe-1345-4426-bd8a-ca0a5eac3aac	893b062ee0aa3a0d80c007e6176991dc8992e9764106f65a51b5042b95b934ee	2026-04-02 12:15:38.368	2026-04-09 12:00:38.664	2026-04-02 12:00:38.666
21109f05-5ad2-4ef8-914c-d1b4096d66a0	e9134380-2da7-4a1e-bd2a-34398f85a6e5	ed80275d507960ee7e45caf4c53e13de130c783eefd3d8083c21cdb6ddf7d4b5	2026-04-02 12:22:59.642	2026-04-09 12:07:59.752	2026-04-02 12:07:59.753
b9e82b1e-8e50-4673-a13c-c7bb6b79f4d4	47d9c408-1a3c-46c1-aecf-6f1746615499	c12112d6466e0f9c44cb11c907d261b1efbd043e8397feab8540e41bf3e3d3da	2026-04-02 12:22:59.672	2026-04-09 12:07:59.059	2026-04-02 12:07:59.06
6ddbd653-4101-49a3-9388-b9f03dda1235	9f70646e-c63e-4a08-a4fa-8786204bbf4e	e4ca806c38375047287c2f3903c861def77c5c470c3ee6d573888cabb8d22316	2026-04-02 12:23:29.645	2026-04-09 12:08:28.686	2026-04-02 12:08:28.687
8b431385-de82-4b61-8a75-26bb2b755b15	3961fabe-1345-4426-bd8a-ca0a5eac3aac	ad4001d13148118e9c5ca594b773c36d55d540dcfd4cbfef04c0a74ec6a4166f	2026-04-02 12:30:40.315	2026-04-09 12:15:38.384	2026-04-02 12:15:38.386
c422be7e-6bce-49f3-b7dd-ad67d019edab	47d9c408-1a3c-46c1-aecf-6f1746615499	6585ed2829809f56fbafbe489dd193d50c701fa59607990a936d8cfb76c83a03	2026-04-02 12:38:00.973	2026-04-09 12:22:59.686	2026-04-02 12:22:59.687
2c98eb06-d9ff-4041-9227-d95bd32777e5	e9134380-2da7-4a1e-bd2a-34398f85a6e5	425238f310d1ff6423cf7e419b798c0a2aebdf6b5d99b9242c5bff17f3c52c87	2026-04-02 12:38:01.465	2026-04-09 12:22:59.659	2026-04-02 12:22:59.66
d18babd0-88fc-4f69-af8a-8f9c4a0da04f	9f70646e-c63e-4a08-a4fa-8786204bbf4e	3554a4bab0132d4485b0dbb83fec1aad6266740cf13de00a41a1eb7525b00f1e	2026-04-02 12:38:29.388	2026-04-09 12:23:29.659	2026-04-02 12:23:29.661
416bfeac-d2da-4aa4-9eb5-47d4af79395f	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2cd9e075c60d8cd95f9ddcfc423dc1cb44a99d729cd023c2c8619ed77798d8c0	2026-04-02 12:45:41.536	2026-04-09 12:30:40.332	2026-04-02 12:30:40.333
ed296f5a-1d23-487c-9ad6-d6ede1c5f226	47d9c408-1a3c-46c1-aecf-6f1746615499	0910d78be121c747d963ff41a0ad26371ee87f9875dbc2b735a92ff58061ac14	2026-04-02 12:53:00.542	2026-04-09 12:38:00.988	2026-04-02 12:38:00.99
78961ff8-0aec-4231-a989-8ef223316a42	e9134380-2da7-4a1e-bd2a-34398f85a6e5	38a391b4083aece9f9f01a325b015825f6b650fa82de2d1f26ea3890b99e36c1	2026-04-02 12:53:02.644	2026-04-09 12:38:01.476	2026-04-02 12:38:01.478
377df3d6-859b-4b2f-b722-afa3655adaff	9f70646e-c63e-4a08-a4fa-8786204bbf4e	b48f24f101ab754aba71b34685791aa439678a122231ad705c3731b70d15737b	2026-04-02 12:53:31.298	2026-04-09 12:38:29.404	2026-04-02 12:38:29.405
0da4d38b-bcb9-4fd4-b3c3-7661b0c508fd	3961fabe-1345-4426-bd8a-ca0a5eac3aac	53854742b7b38048f51ec7cdf505ba75ca524b978e340de55c82f253b4983d99	2026-04-02 13:00:41.151	2026-04-09 12:45:41.553	2026-04-02 12:45:41.554
d9290ce7-8034-406c-812a-971fbf9f0851	e9134380-2da7-4a1e-bd2a-34398f85a6e5	e10c06d4d4fe75b9deb5b6be90d1eed2168aea723e8e128bde5bcd3582a1433e	2026-04-02 13:08:02.373	2026-04-09 12:53:02.659	2026-04-02 12:53:02.661
e51e4159-6e9a-4ed6-9b62-dfd206bfc6ef	47d9c408-1a3c-46c1-aecf-6f1746615499	e02f8d61fcd610fde8dae253a30d04fe563c5e3d3b601ea1685991cca7a266b0	2026-04-02 13:08:02.483	2026-04-09 12:53:00.558	2026-04-02 12:53:00.56
9e4e9dca-ad53-45ef-a501-755837be4d47	9f70646e-c63e-4a08-a4fa-8786204bbf4e	3f4dc53fab6501bb2cfb9c7d06938586702f17d5db2e2ae34a3de2c9723ae42c	2026-04-02 13:08:32.583	2026-04-09 12:53:31.319	2026-04-02 12:53:31.323
2a876101-513f-4610-b756-2b457aace71a	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2552aa16d8f3b1186462e3497159e9a1b1bb9e61c38d0dc5e1634b9ec3080487	2026-04-02 13:15:43.108	2026-04-09 13:00:41.168	2026-04-02 13:00:41.17
def6c283-62c5-4418-aebb-20f75d2e2da6	47d9c408-1a3c-46c1-aecf-6f1746615499	fdc7e198e20310c65208275c892a6684b301c420d006ca1ab9c16eb62613b227	2026-04-02 13:23:03.904	2026-04-09 13:08:02.538	2026-04-02 13:08:02.54
cb30b295-223a-440f-a298-f5f481ed2f46	e9134380-2da7-4a1e-bd2a-34398f85a6e5	7abcd7216279aeb5fea4e8c402afa707ad0ec1b68c3a3de64ca5f1cf82d6b11c	2026-04-02 13:23:04.412	2026-04-09 13:08:02.391	2026-04-02 13:08:02.392
4df2b833-502e-4d1f-be81-db503bcd54f0	9f70646e-c63e-4a08-a4fa-8786204bbf4e	f705520e436d9783aa164bc1c1b7205a863048facf5681fd2b937828504b77f6	2026-04-02 13:23:32.209	2026-04-09 13:08:32.599	2026-04-02 13:08:32.6
96918808-7c1a-47bb-951d-cd9c0b333fe8	3961fabe-1345-4426-bd8a-ca0a5eac3aac	1a879aaa8c48daf0408703d8965c66443d9a4b2089beb7b1416be6cde8d2db71	2026-04-02 13:30:44.468	2026-04-09 13:15:43.125	2026-04-02 13:15:43.126
3f2946d8-ed13-43e3-b5eb-f4bdc5f127d0	47d9c408-1a3c-46c1-aecf-6f1746615499	cb2b8c831c82413d58efbe7bf4ce4ded96e0ca7d8513732452dda392b4ec71de	2026-04-02 13:38:03.394	2026-04-09 13:23:03.92	2026-04-02 13:23:03.922
32b59e02-557f-4b86-84a9-5c181a2429f1	e9134380-2da7-4a1e-bd2a-34398f85a6e5	9dea7922a7dfa1451a230a52e16ac54248862f6ac2badd8e7fdadff086fca28b	2026-04-02 13:38:05.573	2026-04-09 13:23:04.431	2026-04-02 13:23:04.433
5262c7d5-0f8b-4ef8-ba8f-c1751e68b9f4	9f70646e-c63e-4a08-a4fa-8786204bbf4e	2a42b662e638e27f59ab43b6a65f1183a5c7cbe84d714cac4d0fe93a665b8cbd	2026-04-02 13:38:34.16	2026-04-09 13:23:32.225	2026-04-02 13:23:32.226
8b065275-e007-4356-b55f-46a53387c4d7	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2e0819486443c3b844ff5171f06a7aee80f9f28356a4330962011f5ae9ad079f	2026-04-02 13:45:45.446	2026-04-09 13:30:44.484	2026-04-02 13:30:44.485
d99b9703-6774-4074-8c0c-2f66afc35a62	e9134380-2da7-4a1e-bd2a-34398f85a6e5	2afe1e2d2f36bd396aab044488871381b4a8efbb9931efef5866732706c5dea8	2026-04-02 13:53:05.233	2026-04-09 13:38:05.589	2026-04-02 13:38:05.59
86e2458c-e0ef-417a-a077-3ea4fc75b9c0	47d9c408-1a3c-46c1-aecf-6f1746615499	aea17dbde0312533b769e2d2fb24836f7af758b2c1da925e47c4ef7e6d7cdaed	2026-04-02 13:53:05.341	2026-04-09 13:38:03.409	2026-04-02 13:38:03.411
04779d0e-63d6-448c-a79d-c842f6cce588	3961fabe-1345-4426-bd8a-ca0a5eac3aac	c2b2273266e6eb576f69e6125f586397a30f26ef8fa370aa8e3ae4252d4c50ad	2026-04-02 20:26:17.005	2026-04-09 11:00:54.145	2026-04-02 11:00:54.146
171bc030-0243-4740-9d2d-cb11a9258d81	9f70646e-c63e-4a08-a4fa-8786204bbf4e	b55c96f2e6b2a8e1e8e2a3142f97488e878fba69530d6972c1eb638a6930b169	2026-04-02 13:53:35.504	2026-04-09 13:38:34.173	2026-04-02 13:38:34.174
e7c6a992-0861-43e3-8338-4a2f6f97a897	3961fabe-1345-4426-bd8a-ca0a5eac3aac	e68128c179be54f9c1dfbaef37a63b3a20f203c85720f42171400451a6022dc1	2026-04-02 14:00:45.968	2026-04-09 13:45:45.463	2026-04-02 13:45:45.465
4aa6c606-464c-41f1-8824-a39e54319635	47d9c408-1a3c-46c1-aecf-6f1746615499	c8a6db26990927d187263f6f2ea313efdd7099391bca79488024af3b6d358e29	2026-04-02 14:08:06.827	2026-04-09 13:53:05.354	2026-04-02 13:53:05.356
a248a98e-13a4-4ea3-8473-5dbb015493d2	e9134380-2da7-4a1e-bd2a-34398f85a6e5	2b0ba7c22102eb67f4e0c5f63eeaa3b94033657def01ed88b3cb17be98b5ea81	2026-04-02 14:08:07.194	2026-04-09 13:53:05.249	2026-04-02 13:53:05.25
56ea3099-4959-4f8a-a499-97b0afcd471a	9f70646e-c63e-4a08-a4fa-8786204bbf4e	fc46050d0efcd3ba6162c2a3296776c214c829de4e75e08e55f90bed25c0cae4	2026-04-02 14:08:36.487	2026-04-09 13:53:35.521	2026-04-02 13:53:35.523
cf7d5fd8-a465-4b00-9eb6-d115c8c37d03	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2fdd4a0f0bb023c626cf26894e44096776a4717cc74e0cbf337e78eeda230490	2026-04-02 14:15:47.393	2026-04-09 14:00:45.983	2026-04-02 14:00:45.985
7428c703-59f0-47d2-bfdb-2d510bc02b51	47d9c408-1a3c-46c1-aecf-6f1746615499	0dffcb418c4b854fe7d660eb220035b9f77b05bcd3673db0364822ef5a782246	2026-04-02 14:23:06.238	2026-04-09 14:08:06.844	2026-04-02 14:08:06.845
aeac8112-c48c-4b63-83d9-9a2e789a9d5d	e9134380-2da7-4a1e-bd2a-34398f85a6e5	a78d357d92d118b3efb8f9e513591aca481438d6d36f6eb6ba94b67acccca9e1	2026-04-02 14:23:08.491	2026-04-09 14:08:07.207	2026-04-02 14:08:07.209
a5c6c36c-3a44-40fd-b26f-e08512cb8b4f	9f70646e-c63e-4a08-a4fa-8786204bbf4e	d4df72d6de5bb1dfa89ac2a1b9b3b8470accf9a75b3fbb579e164d0ec5fd99be	2026-04-02 14:23:37.015	2026-04-09 14:08:36.505	2026-04-02 14:08:36.506
832f55f5-d25d-43cf-b1ec-e0d45fc68560	3961fabe-1345-4426-bd8a-ca0a5eac3aac	dee89553145573fb3788193bef0a90005cc8ad271eadad1ca3e88182459a73a4	2026-04-02 14:30:48.364	2026-04-09 14:15:47.411	2026-04-02 14:15:47.412
f2921508-9330-4832-8bb5-6bdbe1d5307c	e9134380-2da7-4a1e-bd2a-34398f85a6e5	f992d731312d4b6a0a751eab3ff4ee56b06cd4938ae8b73c4972fd204fe85f2e	2026-04-02 14:38:08.086	2026-04-09 14:23:08.503	2026-04-02 14:23:08.505
1db3fa75-b978-4672-8e64-cd029940b120	47d9c408-1a3c-46c1-aecf-6f1746615499	a11cde26cce295b310b85fd3e45aedbd4e89f8f2f76a54073fdf8a07e29cd966	2026-04-02 14:38:08.184	2026-04-09 14:23:06.254	2026-04-02 14:23:06.255
8670ef48-5bbd-4d9d-bd88-41e9a1175c7e	9f70646e-c63e-4a08-a4fa-8786204bbf4e	a5b5c1bfcd2396a3ed874cc380472422e628cf7d659bbd50e715d9de3f5ee3d9	2026-04-02 14:38:38.421	2026-04-09 14:23:37.03	2026-04-02 14:23:37.031
c42fa490-c80d-49bd-8b0e-d184fd8d0a68	3961fabe-1345-4426-bd8a-ca0a5eac3aac	c3b3606f658167fd712c886dac7d30ca0b25e64973b8d0388b974078c5c0ae29	2026-04-02 14:45:48.824	2026-04-09 14:30:48.38	2026-04-02 14:30:48.382
5f564959-a020-4833-a4eb-799f31f1b895	47d9c408-1a3c-46c1-aecf-6f1746615499	43be3d5ecaa9f487e9e63907c3c8914b6a9c428595564c5d9c2b79b9d295c819	2026-04-02 14:53:09.754	2026-04-09 14:38:08.197	2026-04-02 14:38:08.198
a5a810ba-b69d-4143-ab48-20ff50bb0b32	e9134380-2da7-4a1e-bd2a-34398f85a6e5	62eb42ce827106b24bc9f056dae23026488a3a662c10f83c9a820571fd5df478	2026-04-02 14:53:10.051	2026-04-09 14:38:08.104	2026-04-02 14:38:08.105
ef34276b-e9ce-4dae-b4b7-3f38aeb637dc	9f70646e-c63e-4a08-a4fa-8786204bbf4e	e246c7b1ab9017dc0e80765072a75214681045a53ad183f53ba0b1a9dcd7910c	2026-04-02 14:53:39.404	2026-04-09 14:38:38.437	2026-04-02 14:38:38.439
58af5cc6-df50-4a93-8181-70b001bdb16e	3961fabe-1345-4426-bd8a-ca0a5eac3aac	c2285a00afb49ac164b6a8287256274288c4c562f2cc9039ca94fe0e5c6238b0	2026-04-02 15:00:50.3	2026-04-09 14:45:48.84	2026-04-02 14:45:48.842
70d4ef82-ec5f-4928-887e-a0474ac4b548	47d9c408-1a3c-46c1-aecf-6f1746615499	e4f48898f4c063bbd8f6345b9edeb558d6d24f06a005bf959482fcf8989db723	2026-04-02 15:08:10.728	2026-04-09 14:53:09.77	2026-04-02 14:53:09.771
b96de705-5568-4841-8c43-2dc80f8a4b27	e9134380-2da7-4a1e-bd2a-34398f85a6e5	aff9f3e2984c9a4b67e839e3ef039e4b6ed9010671a902016cc95bb4ef9b7709	2026-04-02 15:08:11.425	2026-04-09 14:53:10.065	2026-04-02 14:53:10.066
830c14b4-9484-413e-8375-805f1d0ac139	9f70646e-c63e-4a08-a4fa-8786204bbf4e	176f4f6ceec77e5cda0a826f9e7c960deb15a698207af73d0201f3bec1bc99fb	2026-04-02 15:08:39.812	2026-04-09 14:53:39.419	2026-04-02 14:53:39.42
c3f21136-e1d9-4cc6-abba-e54c2d3a712c	3961fabe-1345-4426-bd8a-ca0a5eac3aac	b02e541d0a4baad87ae30bf43a9ab050e4ec4515b71a5146aac4d25e59c479e7	2026-04-02 15:15:51.277	2026-04-09 15:00:50.317	2026-04-02 15:00:50.318
ff998d4d-e6c1-4f01-9961-688d0dbe9157	47d9c408-1a3c-46c1-aecf-6f1746615499	72283419460d91361e64831d4959d04304721bb44dc287d14fcbe74cddc6c3d5	2026-04-02 15:23:11.003	2026-04-09 15:08:10.744	2026-04-02 15:08:10.745
421f0258-d9b2-4bf2-900b-81d59edafe1c	e9134380-2da7-4a1e-bd2a-34398f85a6e5	c83f478ef99a9238b8afd4c08203ada9b41c98979de597d396e8fca6cb0ba1a5	2026-04-02 15:23:12.391	2026-04-09 15:08:11.44	2026-04-02 15:08:11.441
def3c355-8aaf-41f4-83a1-36522e29f846	9f70646e-c63e-4a08-a4fa-8786204bbf4e	d9b2130a801e5df910f5d261208834ce331fedf8a550229af59df356db17028f	2026-04-02 15:23:41.353	2026-04-09 15:08:39.826	2026-04-02 15:08:39.828
a63a2677-1e7b-4e9c-ba25-d33ee41ee4e4	3961fabe-1345-4426-bd8a-ca0a5eac3aac	be04e42cd3497dcd77c23a5b7bab330011e623da58743ca3254caf3e23b46018	2026-04-02 15:30:51.623	2026-04-09 15:15:51.292	2026-04-02 15:15:51.294
6e1a9b82-121b-4b9c-be8c-29799d1ad933	47d9c408-1a3c-46c1-aecf-6f1746615499	fe23c20a8d705eb8551caca938fb632b2b3c641f82029c3894aca7c795176142	2026-04-02 15:38:12.68	2026-04-09 15:23:11.02	2026-04-02 15:23:11.022
5daead75-08b8-4e06-854a-b869b603779a	e9134380-2da7-4a1e-bd2a-34398f85a6e5	31f4f9ca05dba67ded0a3224f2cb64a13afdbf2d2f98abd43515ab236fa0077c	2026-04-02 15:38:12.951	2026-04-09 15:23:12.405	2026-04-02 15:23:12.406
4acc9358-32dd-4ec5-a1b8-596b51016b57	9f70646e-c63e-4a08-a4fa-8786204bbf4e	e68b5faa99a70c2563c420e96d8bf758f6693d6c77e6964006272397b51f9d7f	2026-04-02 15:38:42.328	2026-04-09 15:23:41.367	2026-04-02 15:23:41.368
ce3f0e37-1341-47aa-8a87-368e1609e107	3961fabe-1345-4426-bd8a-ca0a5eac3aac	74fac0270abbe60733264f2754b8e286df9f7dfa5858932cc15d12cd8a77e40d	2026-04-02 15:45:53.228	2026-04-09 15:30:51.641	2026-04-02 15:30:51.642
e341096a-1673-420d-92c7-815dae6ffbd1	47d9c408-1a3c-46c1-aecf-6f1746615499	96601105584734ce7bb1d006f90b91e5450a6f8afaf09e46166a18fd2ee4aa51	2026-04-02 15:53:13.651	2026-04-09 15:38:12.697	2026-04-02 15:38:12.698
b7102722-dabc-4205-a94b-d62f30bcce7f	e9134380-2da7-4a1e-bd2a-34398f85a6e5	1990837b2893aa4e229ac3b3afe2c200062f23f914bfaaed59c0377bb39a6143	2026-04-02 15:53:14.33	2026-04-09 15:38:12.968	2026-04-02 15:38:12.97
779687ee-7d75-4e28-ae5c-d0704185766f	9f70646e-c63e-4a08-a4fa-8786204bbf4e	0b21ae5bb8eaca0e835d7b6adc5d21c18de0575bd54baa80de1dcbce4a9e6eca	2026-04-02 15:53:42.669	2026-04-09 15:38:42.342	2026-04-02 15:38:42.344
78a769b1-0294-4be0-92ae-0a7e5e4e6351	3961fabe-1345-4426-bd8a-ca0a5eac3aac	3d0bfc17e819c60a7e602031a236068d84309792eda683f4e7f8a9bad0cec739	2026-04-02 16:00:54.202	2026-04-09 15:45:53.246	2026-04-02 15:45:53.247
477d1184-830c-4cf5-8060-5243b1af78fd	47d9c408-1a3c-46c1-aecf-6f1746615499	aea862e82baac1a42546b7db188c3bcde663efe69a0cd8ad81724db67a52675c	2026-04-02 16:08:13.868	2026-04-09 15:53:13.667	2026-04-02 15:53:13.669
1c1ecd7c-64a9-4dce-96af-0659a5ecdb8a	e9134380-2da7-4a1e-bd2a-34398f85a6e5	aeca61e90b6b58a80a3cb623d88d4b43e473dcd61ff8d90be2ee680ecffefb27	2026-04-02 16:08:15.311	2026-04-09 15:53:14.343	2026-04-02 15:53:14.344
139e149d-bda8-441d-99ee-323a746a5ba1	9f70646e-c63e-4a08-a4fa-8786204bbf4e	4725d19fe2b5736a41333abea57a7e20ae742c9dd98c7cef33ad11cdd307c04b	2026-04-02 16:08:44.279	2026-04-09 15:53:42.684	2026-04-02 15:53:42.685
23b8433c-6fb2-4f52-8f6a-77bbc0798449	3961fabe-1345-4426-bd8a-ca0a5eac3aac	5c1c96c2ea7f0a35af933d90d6bda70807ab31bb44d206daff0e8bc9d3366ae8	2026-04-02 16:15:54.486	2026-04-09 16:00:54.218	2026-04-02 16:00:54.22
9055a2f2-8cb9-4287-8512-d6102b240806	47d9c408-1a3c-46c1-aecf-6f1746615499	cc81e3cdd83f20d150d34643a803fd65ecea9fb5f839b345fa34b2317c69f42d	2026-04-02 16:23:15.603	2026-04-09 16:08:13.885	2026-04-02 16:08:13.887
a2423f3d-07be-4fff-9da8-1ee54140c382	e9134380-2da7-4a1e-bd2a-34398f85a6e5	6305040e60e758cd9d92c32c69a41cecb211f6b42ef8f0a548e9360c8a691396	2026-04-02 16:23:15.772	2026-04-09 16:08:15.325	2026-04-02 16:08:15.326
2884807c-f2f6-4452-8ff1-6aa5b87ce30d	9f70646e-c63e-4a08-a4fa-8786204bbf4e	a1860c6902a9f462a3ff2c00d5e826ce887844c89ef82e556f4ded4b86456a7d	2026-04-02 16:23:45.26	2026-04-09 16:08:44.293	2026-04-02 16:08:44.294
f7a52528-0418-438d-b0e1-a59ad417d0e7	3961fabe-1345-4426-bd8a-ca0a5eac3aac	f9853499be57a126ef7d30f548c6b0668537d3c656b86ab7c5d88d03590f616c	2026-04-02 16:30:56.154	2026-04-09 16:15:54.502	2026-04-02 16:15:54.504
6d789d56-e722-493a-8f13-5b2828577760	47d9c408-1a3c-46c1-aecf-6f1746615499	6dad9dfbeaed70fea22a8497ef75bea1412d7b8bc5759a17397e3e0a4c34799e	2026-04-02 16:38:16.581	2026-04-09 16:23:15.62	2026-04-02 16:23:15.622
d94df4ed-8c43-4e1e-9935-1bb149e27cae	e9134380-2da7-4a1e-bd2a-34398f85a6e5	d8ed4c53af8f78e97d47e610c2ab86dd3cecbd0f1ce053c76b2659de69290cf6	2026-04-02 16:38:17.255	2026-04-09 16:23:15.785	2026-04-02 16:23:15.786
7f85bf62-92f5-4681-b606-66b0e3487af0	9f70646e-c63e-4a08-a4fa-8786204bbf4e	aefaa630369ccc8d49ec83564c628b03d59a1e2a167f13bf410a27ac8006bf52	2026-04-02 16:38:45.529	2026-04-09 16:23:45.279	2026-04-02 16:23:45.28
7b2bbc2b-313a-48b7-9216-33e595bf289f	3961fabe-1345-4426-bd8a-ca0a5eac3aac	514ba725a3360b44f3de4f89e11d1066602ddc14a8ac2823608c186c68d2bcec	2026-04-02 16:45:57.116	2026-04-09 16:30:56.17	2026-04-02 16:30:56.171
e6080a0b-53e0-43f2-a530-2fb1b55f6640	47d9c408-1a3c-46c1-aecf-6f1746615499	1557f8bc571b3be47f9cb32ea106c527ed527188e0bd8d5d7c9f64bc77b90039	2026-04-02 16:53:16.723	2026-04-09 16:38:16.599	2026-04-02 16:38:16.6
14e578e8-9a80-4611-a3e8-34c2c9b82163	e9134380-2da7-4a1e-bd2a-34398f85a6e5	95bd91d40bf3421ca88b8d691f687080f549b89e9e7479ad8ddfd2ae93585f4a	2026-04-02 16:53:18.235	2026-04-09 16:38:17.268	2026-04-02 16:38:17.269
088b7200-ce89-4adb-9541-eb121ff9f1b9	9f70646e-c63e-4a08-a4fa-8786204bbf4e	fa9812d25f7ef46178ba703b8a9c402a829ebcfd01f21a106bbc3207722a4305	2026-04-02 16:53:47.206	2026-04-09 16:38:45.543	2026-04-02 16:38:45.544
2052088c-73ff-4644-b781-a34dd8d602b3	3961fabe-1345-4426-bd8a-ca0a5eac3aac	819a13b5a30a917e809ec8a118ff0e991c30d5c803959a600e44ff172fece0bc	2026-04-02 17:00:57.335	2026-04-09 16:45:57.131	2026-04-02 16:45:57.133
651f8af0-f4f0-4b27-b4ac-f559483d9ffc	47d9c408-1a3c-46c1-aecf-6f1746615499	f22025fa63107ee3c04f37fead2865dac3270d27821d3439d977ddc628b792ca	2026-04-02 17:08:18.528	2026-04-09 16:53:16.739	2026-04-02 16:53:16.74
8cd71645-058b-4d2d-aa7e-08a6797a7f7c	e9134380-2da7-4a1e-bd2a-34398f85a6e5	0b83829e311148adbd6059da2015e7cbd97a5fb956b70cf9b75b38515bd651f1	2026-04-02 17:08:18.631	2026-04-09 16:53:18.254	2026-04-02 16:53:18.255
ce7b7e61-c729-4e02-80a1-62edc94b7b4e	47d9c408-1a3c-46c1-aecf-6f1746615499	d9c9795e0324bc93beb1be99f8d2d681176b142c9b49defa236a93a2d54526ee	2026-04-02 17:08:18.675	2026-04-09 17:08:18.545	2026-04-02 17:08:18.546
bf69980d-1f96-4318-82c2-055bdceb24a3	9f70646e-c63e-4a08-a4fa-8786204bbf4e	aaa2d9ee44ee91822bc766c6d0be9bf164a00cb7d049acc688532b198ba01884	2026-04-02 17:08:48.181	2026-04-09 16:53:47.219	2026-04-02 16:53:47.221
d8e8ee89-9ec9-4d83-996b-7e17ff879118	3961fabe-1345-4426-bd8a-ca0a5eac3aac	393e1815321cc3f812f373739f056cb5f1d5adea839c9d5ea37e1526352de2db	2026-04-02 17:15:59.076	2026-04-09 17:00:57.351	2026-04-02 17:00:57.352
f7d52cee-1b10-48c9-9c90-8621a24e2f7d	3961fabe-1345-4426-bd8a-ca0a5eac3aac	53de77500d994b15d30fbdccedf6e9449dc98696a4cd125ba71302f0467e03a1	2026-04-02 17:15:59.23	2026-04-09 17:15:59.093	2026-04-02 17:15:59.095
36ca6d69-9429-414c-8ba8-81448ae90310	47d9c408-1a3c-46c1-aecf-6f1746615499	6e394dd3389c90b1c637612b4eb932f52221b321e15d6fbbc86643685c6e06f4	2026-04-02 17:23:19.484	2026-04-09 17:08:18.688	2026-04-02 17:08:18.69
b47287f6-4d08-4d76-b02f-2b11e3b53229	e9134380-2da7-4a1e-bd2a-34398f85a6e5	75483f28e9886a46f09a0d6368e6e9559dda308bcc464ed84545c0e3283c6d1a	2026-04-02 17:23:20.179	2026-04-09 17:08:18.647	2026-04-02 17:08:18.648
b48430b5-26ed-4f36-84ed-58981744ed83	9f70646e-c63e-4a08-a4fa-8786204bbf4e	980731fa767e625e28514e6efe34aba8c35ca4d9709d65af988fb72ad136228d	2026-04-02 17:23:48.318	2026-04-09 17:08:48.194	2026-04-02 17:08:48.196
76d1135d-b0da-4e39-9d23-2467277a371a	3961fabe-1345-4426-bd8a-ca0a5eac3aac	33dd852058734f5923b9bf95d100c8eaa192fd2ccd63de5231b74509d4a10279	2026-04-02 17:31:00.054	2026-04-09 17:15:59.244	2026-04-02 17:15:59.245
d07d1980-22e2-4211-8b95-0b6811f8fcc9	47d9c408-1a3c-46c1-aecf-6f1746615499	3e6dc821af30ef729160d3660079e900622c6aded6a1fa34b559db7704e726a1	2026-04-02 17:38:19.462	2026-04-09 17:23:19.5	2026-04-02 17:23:19.501
ddc709cb-8339-4fd0-8efe-5e06d4e547b2	e9134380-2da7-4a1e-bd2a-34398f85a6e5	581f56c509923fef5b3830832982b8845933f70cc06b96e916ffe09a787100ea	2026-04-02 17:38:21.158	2026-04-09 17:23:20.193	2026-04-02 17:23:20.194
7442ce2c-3169-4541-a50d-c7e67841647e	9f70646e-c63e-4a08-a4fa-8786204bbf4e	cc68da7dde211304e4522003f673b5059a5e6305d5faa50553acdf47e293c775	2026-04-02 17:38:50.131	2026-04-09 17:23:48.333	2026-04-02 17:23:48.334
e0da6291-daf9-4264-86ea-44c8acdd05c7	9f70646e-c63e-4a08-a4fa-8786204bbf4e	815df72d8a2dc140e23ad9ebcd53e74a6af13912f98478520b5d806bbe86098c	2026-04-02 17:38:50.276	2026-04-09 17:38:50.147	2026-04-02 17:38:50.148
8b4429b3-4fc0-4738-8bf5-2c4e2f9042a3	3961fabe-1345-4426-bd8a-ca0a5eac3aac	de08717a7dad7b6468e03117ce309b2168165b5880526a651868f2b8d932b8b1	2026-04-02 17:46:00.151	2026-04-09 17:31:00.071	2026-04-02 17:31:00.073
76954acb-2bb9-4301-9b3f-b513811c7049	e9134380-2da7-4a1e-bd2a-34398f85a6e5	56f32297262dc80d098cac1d3dad635996638ad07ea9e3d508bdbffaabcf42c2	2026-04-02 17:53:21.416	2026-04-09 17:38:21.175	2026-04-02 17:38:21.176
02bf8efd-3ab1-4468-a8a5-ff86f124a591	47d9c408-1a3c-46c1-aecf-6f1746615499	9489f262f07b426074b2f1e8689121407146f5fe695e6db4a88c7d5974449cee	2026-04-02 17:53:21.435	2026-04-09 17:38:19.479	2026-04-02 17:38:19.48
51babba3-c81e-4d4f-9f3a-e69e90a0757a	9f70646e-c63e-4a08-a4fa-8786204bbf4e	6016dd9a7608432dd301f5be9482e287fec0d0b75f0d826ceeb546d47e68e4c6	2026-04-02 17:53:51.1	2026-04-09 17:38:50.289	2026-04-02 17:38:50.291
b57c8ab4-6a67-4909-b129-a55b021ad90f	3961fabe-1345-4426-bd8a-ca0a5eac3aac	a9b519fe2fbee5d02407fbe6dda4a5e4cf1bdcee8e6d6d9892b02b257d32b891	2026-04-02 18:01:02.004	2026-04-09 17:46:00.168	2026-04-02 17:46:00.169
4c06fda7-904c-4ea8-b2d4-5ffaf8f7c5d6	47d9c408-1a3c-46c1-aecf-6f1746615499	8a50da8b87f0cf22a25f3655e80bed6e37ddb305dc8bf30afd39473c0819affb	2026-04-02 18:08:22.424	2026-04-09 17:53:21.45	2026-04-02 17:53:21.452
b0cee390-372f-4437-8688-1952f25c408f	e9134380-2da7-4a1e-bd2a-34398f85a6e5	230d3da219bcb4bf2406b452be4cee73298ae9e380dc2d40a283af23bae2b4ea	2026-04-02 18:08:23.104	2026-04-09 17:53:21.435	2026-04-02 17:53:21.436
ba8a940a-e43e-475d-aa8c-ca63361659d8	9f70646e-c63e-4a08-a4fa-8786204bbf4e	881256c4c6d18f46509524c0550e0d36c030684a230053926d89d677f2d3b472	2026-04-02 18:08:51.18	2026-04-09 17:53:51.113	2026-04-02 17:53:51.114
9df1bc62-318c-4145-8bfe-cbfb09e2157a	3961fabe-1345-4426-bd8a-ca0a5eac3aac	01e6e462d99c28ee4c1cdc0a0a0eb9e30550c0179916f9a94fd6564d1df610c8	2026-04-02 18:16:02.975	2026-04-09 18:01:02.021	2026-04-02 18:01:02.022
5295db95-7500-4c5d-8bb2-a87f2cee8878	47d9c408-1a3c-46c1-aecf-6f1746615499	98c3ad93ffb805d455a8f9a0cc47b5128df07fffd67da315ab0cc292323a04a4	2026-04-02 18:23:22.325	2026-04-09 18:08:22.44	2026-04-02 18:08:22.441
4c922531-cd20-4087-8067-f96ffbadeb1b	e9134380-2da7-4a1e-bd2a-34398f85a6e5	bbaa79f12bafe093da6f7afbebf462e5b03e7e7d3f5cbd1d521a5e8eb39b6a30	2026-04-02 18:23:24.087	2026-04-09 18:08:23.116	2026-04-02 18:08:23.118
19732673-7c61-453d-a48d-9d5edc46eb4d	9f70646e-c63e-4a08-a4fa-8786204bbf4e	3087c767fbc68b196e88fc5ec611d444979524609d1912c9878eb4fb248f0883	2026-04-02 18:23:53.063	2026-04-09 18:08:51.194	2026-04-02 18:08:51.196
e82b4919-2198-4d9c-8003-88d116f118b3	3961fabe-1345-4426-bd8a-ca0a5eac3aac	7b024220f55fcfb548f0ee762c45202b791eb95f78e4fdcc83dede7bec84f310	2026-04-02 18:31:02.986	2026-04-09 18:16:02.991	2026-04-02 18:16:02.993
7dbfb6b3-3180-424f-800b-13cc8868eb1e	e9134380-2da7-4a1e-bd2a-34398f85a6e5	3a1a6c959abe22cf0eb98029414078b64de44a5eccd1ce21d825c6be94190d09	2026-04-02 18:38:24.277	2026-04-09 18:23:24.1	2026-04-02 18:23:24.101
44799d9c-2485-4881-8bd6-344d46289657	47d9c408-1a3c-46c1-aecf-6f1746615499	1e28058c6847a885730a6dacbdd86a5959f87a6168fb93648d3fe3a21efe8d88	2026-04-02 18:38:24.297	2026-04-09 18:23:22.341	2026-04-02 18:23:22.343
fa133307-106a-4118-9bb5-ef4256b9cb2e	9f70646e-c63e-4a08-a4fa-8786204bbf4e	1815b98dd7e11e828430bd985ab98c3576eaa56312a9b84ba0160c64833c937b	2026-04-02 18:38:54.033	2026-04-09 18:23:53.079	2026-04-02 18:23:53.08
86cf37d0-b5c7-4dd8-aa8f-341b48b49cff	3961fabe-1345-4426-bd8a-ca0a5eac3aac	de85b165f4169cae8e340cb3cd48225f47354cd30b9e1a6af87f537852d5edf8	2026-04-02 18:46:04.924	2026-04-09 18:31:03.003	2026-04-02 18:31:03.004
37f50970-e0f6-41bf-b85b-15f4f07d3a6c	47d9c408-1a3c-46c1-aecf-6f1746615499	fc63381f7d500ac6f9519c8829cfadb352dc5d2015262d1336e26e9725d38874	2026-04-02 18:53:25.43	2026-04-09 18:38:24.315	2026-04-02 18:38:24.318
c649ae5e-3525-4814-8e9e-f18e2eb9ba5c	e9134380-2da7-4a1e-bd2a-34398f85a6e5	fd4f1bd855165bd8b1897728fdacfff102ba3f879bcff20cbdb07c31ea14b326	2026-04-02 18:53:26.051	2026-04-09 18:38:24.296	2026-04-02 18:38:24.298
490847e5-12be-46d6-bb8c-7560dc404b21	9f70646e-c63e-4a08-a4fa-8786204bbf4e	4ef4369bc842220983fb42daf58febfa2cd00bdf637847499f70b9e47feac82c	2026-04-02 18:53:55.009	2026-04-09 18:38:54.049	2026-04-02 18:38:54.051
e81f6eb2-d545-4240-90e7-afc5cbb6932f	3961fabe-1345-4426-bd8a-ca0a5eac3aac	15cb34e2affb2f650b7dcd382379c7dd4fd0f0146bcf5c039e85118965845ce7	2026-04-02 19:01:05.911	2026-04-09 18:46:04.941	2026-04-02 18:46:04.942
82fe2e4b-5ae5-4020-a7b4-24e745c83af9	47d9c408-1a3c-46c1-aecf-6f1746615499	b35b64ef5bde9b71211b04d441d31b715c0ae23ab0c0beec9cddbf8d68f28b9d	2026-04-02 19:08:25.181	2026-04-09 18:53:25.446	2026-04-02 18:53:25.448
699743cf-bf79-4ee2-a6d9-63194d8a2346	e9134380-2da7-4a1e-bd2a-34398f85a6e5	813bce73ab4898955287ed06cf3d97b14c13db2960a44d96c326a7bb2737e7c0	2026-04-02 19:08:27.008	2026-04-09 18:53:26.065	2026-04-02 18:53:26.066
6316a1ce-623f-4b6a-8cd8-c3dfd338eab4	9f70646e-c63e-4a08-a4fa-8786204bbf4e	40b2f37315968fdbf30ba3f21a4f3c8c865e7757a37a2ac0af10edb5e658a903	2026-04-02 19:08:55.988	2026-04-09 18:53:55.023	2026-04-02 18:53:55.024
19d9573c-5232-458e-924b-3b9286073440	3961fabe-1345-4426-bd8a-ca0a5eac3aac	f0f1e869d66e3b2a09b47b1c7f2f43847b14b93610b849e2cea545deea833196	2026-04-02 19:16:05.849	2026-04-09 19:01:05.928	2026-04-02 19:01:05.929
128c5ea8-b87c-499d-b7ed-829f7ed82ce5	e9134380-2da7-4a1e-bd2a-34398f85a6e5	3d567b243207c48fe1ef89a099d1e35d545029c4b7c221596786161577d05c20	2026-04-02 19:23:27.135	2026-04-09 19:08:27.024	2026-04-02 19:08:27.025
04d976bc-1c88-4fce-9eac-0584ced4b081	47d9c408-1a3c-46c1-aecf-6f1746615499	fb84ee0256200b7e0d04f72410adcad9630954dcc074c2358b7a83099ae2fddd	2026-04-02 19:23:27.172	2026-04-09 19:08:25.197	2026-04-02 19:08:25.198
dce960d0-d939-46d2-9f73-827cee754c30	47d9c408-1a3c-46c1-aecf-6f1746615499	deb0638b8f35651b5a6fc5936f04544021d6edaca762e65d61d095baaa84c2a9	2026-04-02 19:23:27.304	2026-04-09 19:23:27.184	2026-04-02 19:23:27.186
0408bc60-2cae-4b21-89ed-ccb7daa31ea4	9f70646e-c63e-4a08-a4fa-8786204bbf4e	15b5d113644419aceb963331d25bd9ea5e3bd3aac19f52fd15a4244b93a51c79	2026-04-02 19:23:56.959	2026-04-09 19:08:56.001	2026-04-02 19:08:56.003
e7674279-2486-48d4-9d05-af0a2bfa18f5	3961fabe-1345-4426-bd8a-ca0a5eac3aac	625c902392d06e9d42e0f9019dba72acb49c3a7c7d3119a51a85bb45be099aa0	2026-04-02 19:31:08.767	2026-04-09 19:16:05.865	2026-04-02 19:16:05.867
3e5ddbcc-623c-41a2-8bd8-afde8ebed0f5	47d9c408-1a3c-46c1-aecf-6f1746615499	cfc1a1f99778f433749d52c7389363f9a4b77d310773ffb5062d1473203720c2	2026-04-02 19:38:28.261	2026-04-09 19:23:27.319	2026-04-02 19:23:27.321
ac85d902-7c1a-470a-ac70-f37c0957e6db	e9134380-2da7-4a1e-bd2a-34398f85a6e5	1dd8f6524afb5f9e8495357ba9ab1bbab1a460c4337f5ad8f0f1349a9efd5905	2026-04-02 19:38:28.948	2026-04-09 19:23:27.15	2026-04-02 19:23:27.151
f9c6a419-dde4-4089-a5ff-3b326a388091	e9134380-2da7-4a1e-bd2a-34398f85a6e5	2dc0d5a32d5e759c165bf3fae2c60a120624c89c89ab5bef03ef085b6c3c4c7c	2026-04-02 19:38:29.04	2026-04-09 19:38:28.961	2026-04-02 19:38:28.962
4500bbc1-7558-4ba6-9057-e4bd71e92aee	9f70646e-c63e-4a08-a4fa-8786204bbf4e	367daaf49cdca6adae8b60b7172fb137e3723bcdd102467c3af5a1e305fefac2	2026-04-02 19:38:56.879	2026-04-09 19:23:56.973	2026-04-02 19:23:56.975
07de81e6-9825-4e3b-b713-ca3a62e116ca	3961fabe-1345-4426-bd8a-ca0a5eac3aac	d3a54ec865b89b9427df15cbbdc9411ce7cdab28bf501c6a99a7e8da6bf0f4d7	2026-04-02 19:46:08.813	2026-04-09 19:31:08.784	2026-04-02 19:31:08.785
f79f043e-0b24-4fa1-b5e2-4886598f8f3d	47d9c408-1a3c-46c1-aecf-6f1746615499	52e719da96c1c261d4096e2e514497b432fdb0cfc7c2e33734d08dea0cac6704	2026-04-02 19:53:29.249	2026-04-09 19:38:28.276	2026-04-02 19:38:28.278
ce6ee325-f335-488f-af49-92cfb119942f	e9134380-2da7-4a1e-bd2a-34398f85a6e5	748ba6ab6c708f2ce5ee1b2c4bb18b44ef5156608153de08d1ae03d95b82bfaf	2026-04-02 19:53:29.9	2026-04-09 19:38:29.053	2026-04-02 19:38:29.055
b798caf5-c155-4972-b343-f1d9b408b784	9f70646e-c63e-4a08-a4fa-8786204bbf4e	742885ffdfe0e69747145752f99d4b11863c93284cef24c90b7e5c724a29e338	2026-04-02 19:53:58.858	2026-04-09 19:38:56.892	2026-04-02 19:38:56.894
f921908e-c803-4d86-8ab1-56c215772e48	3961fabe-1345-4426-bd8a-ca0a5eac3aac	7626f9ff3690a7fa28edbcfd4908818805ef92cac642224d0f40d956a3b12b06	2026-04-02 20:01:08.672	2026-04-09 19:46:08.829	2026-04-02 19:46:08.83
ae8bfef1-0ec8-4817-a3c4-94bae1dbbe74	47d9c408-1a3c-46c1-aecf-6f1746615499	f02e04025ed5b488f5fe4c06bc0198ac237cc0fda8a65f015f09ec749790a1fb	2026-04-02 20:08:29.932	2026-04-09 19:53:29.264	2026-04-02 19:53:29.265
f96065d1-6219-43b4-8f2e-ef4311869fa3	e9134380-2da7-4a1e-bd2a-34398f85a6e5	7147e91454fdd425c91793e2d3c00cf08700f7debfee7aade5e9f66b4884dd49	2026-04-02 20:08:29.941	2026-04-09 19:53:29.914	2026-04-02 19:53:29.915
3de1b7e4-782a-452c-a2e1-c0b180081d03	9f70646e-c63e-4a08-a4fa-8786204bbf4e	0eae17b02fc98301ab06dcfbb66a4f36c6be8e438f6a44011f2e269aa1c6f2de	2026-04-02 20:08:59.884	2026-04-09 19:53:58.874	2026-04-02 19:53:58.875
913e936e-ea99-477e-8d4d-de7000c8f958	3961fabe-1345-4426-bd8a-ca0a5eac3aac	3062091ab6ed69207089475f884397bdf3958d8306d5f15442bd05dcde8a525f	2026-04-02 20:16:10.631	2026-04-09 20:01:08.689	2026-04-02 20:01:08.69
fd9cdb16-22f6-4b22-9eb5-0f7466397d46	3961fabe-1345-4426-bd8a-ca0a5eac3aac	1352fafd399a0d313ce813ef3d9fca3522729156d2f2b28ff3f4861d899f4982	2026-04-02 20:16:10.762	2026-04-09 20:16:10.648	2026-04-02 20:16:10.65
c701eab2-55ce-41d2-a0a4-6846da5bac12	47d9c408-1a3c-46c1-aecf-6f1746615499	66913a0ee444c0d9d639e4274b6cabb1ea74e6f390fb4ac5ad37c8898b03f463	2026-04-02 20:23:31.191	2026-04-09 20:08:29.952	2026-04-02 20:08:29.953
690e5e7a-2465-483f-a01c-f6e9059b07cc	e9134380-2da7-4a1e-bd2a-34398f85a6e5	36bccb3593aaeb7179a757e4a0e29072da798546c6ab7751a995ee0a3e8e16b1	2026-04-02 20:23:31.868	2026-04-09 20:08:29.957	2026-04-02 20:08:29.958
8286e85f-a5f4-4e3b-81da-fcc0977f887c	c5c904e8-da40-4458-b8bf-5c2cc97348b1	584211407be175a86d49fe5edf7a1f4d88d0a25ec577aaa74f5631614100c49b	\N	2026-04-09 20:23:40.911	2026-04-02 20:23:40.913
0ee6a7dc-21e8-4244-87a2-65b18739f20c	9f70646e-c63e-4a08-a4fa-8786204bbf4e	95392be1f088c5f2f190bf0785788ec0602194e059f4a12568ea0a0720e59a2a	2026-04-02 20:23:59.743	2026-04-09 20:08:59.939	2026-04-02 20:08:59.94
13ae97c9-1562-49f8-9a2b-88bcc2ef13bb	e9134380-2da7-4a1e-bd2a-34398f85a6e5	c75c273f4b8d171befb4ce6d2e7cd75b7e2388453affde811ce6a8fbcbf3ef9e	2026-04-02 20:38:33.567	2026-04-09 20:23:31.881	2026-04-02 20:23:31.883
768756cb-5781-45f9-a16f-6718a2cc9d6f	9f70646e-c63e-4a08-a4fa-8786204bbf4e	6ecddbd488dfee3e848b3dd4ca3856adc7ce2968032b1e796b8ea7d81da6040f	2026-04-02 20:39:02.057	2026-04-09 20:23:59.758	2026-04-02 20:23:59.76
8ae65742-e106-4ef0-8106-8a5066e52abb	e9134380-2da7-4a1e-bd2a-34398f85a6e5	b022d76c0b27fcc346f31c1cf88d5eec14e9b4db4920feb94977ecbd6f8e0360	2026-04-02 20:53:35.526	2026-04-09 20:38:33.584	2026-04-02 20:38:33.586
7f6ebdac-c497-4365-9746-ce96bb2228f8	9f70646e-c63e-4a08-a4fa-8786204bbf4e	59720e756ecde835f13de32d1323d6abf520035f3e910f3c37eca5d1f5e04a29	2026-04-02 20:54:04.007	2026-04-09 20:39:02.074	2026-04-02 20:39:02.075
c0400538-b9b2-4757-86b1-b71be797e1f7	9f70646e-c63e-4a08-a4fa-8786204bbf4e	c14706eaa911fcc982a76e1f6996796a0be573a498001472edeea92d40f115a6	2026-04-02 21:09:05.974	2026-04-09 20:54:04.023	2026-04-02 20:54:04.024
0a30a06f-b2ff-44a4-b217-54c6d5d7a1b6	e9134380-2da7-4a1e-bd2a-34398f85a6e5	a1d7b6a604d7546a7597d2845357665c3f42d21719bfcad366043904da3d28f6	2026-04-02 21:15:37.129	2026-04-09 20:53:35.543	2026-04-02 20:53:35.544
aa7b468f-f525-4711-adc9-6d454f2af8ca	3961fabe-1345-4426-bd8a-ca0a5eac3aac	3a921d508be43cb11338497df671039f73cf94999af7ff9eb55e55c405a55b38	2026-04-02 21:15:44.432	2026-04-09 20:26:17.021	2026-04-02 20:26:17.022
043d5b94-e434-4c34-95e8-90eacb066f83	9f70646e-c63e-4a08-a4fa-8786204bbf4e	7f6f0a90729bf08ecb5f1537aef090ebe5956dfcda6ef7e1dad17bfa45f5b3ef	2026-04-02 21:24:07.901	2026-04-09 21:09:05.991	2026-04-02 21:09:05.993
98cad037-6975-4a1d-bbb8-f954fa54783d	47d9c408-1a3c-46c1-aecf-6f1746615499	257b5a1dd56ffd812d2523a8c26bc7bedef8e1f3986f446c7f9819016d44d0c6	2026-04-02 21:38:39.474	2026-04-09 20:23:31.207	2026-04-02 20:23:31.208
ea7a814e-3aa9-4263-96c9-653085c2260b	3961fabe-1345-4426-bd8a-ca0a5eac3aac	1334c12740a47d98151c70fda75b2699ce24d24b803ea26779c203e5a9582431	2026-04-02 21:38:50.909	2026-04-09 21:15:44.449	2026-04-02 21:15:44.451
bb08009b-648e-41f3-8090-bd7543ace0f3	9f70646e-c63e-4a08-a4fa-8786204bbf4e	034ea7c954a3233a09cff2a62f1e732ad734c235087b0f5d8df54961b7fe3e46	2026-04-02 21:39:09.589	2026-04-09 21:24:07.922	2026-04-02 21:24:07.923
dfbcba1d-96ea-47a4-a477-fa8d645135b0	9f70646e-c63e-4a08-a4fa-8786204bbf4e	78843bc0a00c3b2adfccd600940a4e958768584617d4f15f881c79d17c92c611	2026-04-02 21:54:11.477	2026-04-09 21:39:09.605	2026-04-02 21:39:09.607
abc6e152-745c-409c-8652-45afc28a813b	47d9c408-1a3c-46c1-aecf-6f1746615499	283046be368f0c23cd199bb9a6b17244cc1e6a4f3ed48bf168bfb7670ea02584	2026-04-02 21:59:54.874	2026-04-09 21:38:39.493	2026-04-02 21:38:39.497
f714188b-b39e-4031-b6b7-cd6b7e856689	3961fabe-1345-4426-bd8a-ca0a5eac3aac	acce5531381dce89eae54035b95fc029e633de30e98b847813e7af69ffeab90b	2026-04-02 22:00:07.484	2026-04-09 21:38:50.926	2026-04-02 21:38:50.927
3b6ed3a9-b5ca-4928-a93c-00ddedc07450	9f70646e-c63e-4a08-a4fa-8786204bbf4e	ee4a1c0784289a046e8c5344bf37feda001104cde7fd459b0fe84e81200e7abd	2026-04-02 22:09:13.206	2026-04-09 21:54:11.501	2026-04-02 21:54:11.503
99a70bbf-756c-4d4d-9a53-03929a235204	47d9c408-1a3c-46c1-aecf-6f1746615499	8a0ab5690d7d20dbda0ec6c8ab375d73c0e1205df8da6ca9d6706cf2af776956	2026-04-02 22:14:56.283	2026-04-09 21:59:54.89	2026-04-02 21:59:54.892
8f83f665-b4fe-4e74-9a9e-4439acfcc964	9f70646e-c63e-4a08-a4fa-8786204bbf4e	c90f023337fcc953dc6231a6eec0455e6e0a4372c45a9505b85c9cffb74371e8	2026-04-02 22:24:15.033	2026-04-09 22:09:13.226	2026-04-02 22:09:13.228
02862350-f086-4754-a050-b7ec4e6ef73f	3961fabe-1345-4426-bd8a-ca0a5eac3aac	05f7e8fd7d3d3d9affef4cf88cd1eec0e01d09542659ce600816dd145ddd95b8	2026-04-02 22:28:20.523	2026-04-09 22:00:07.503	2026-04-02 22:00:07.504
e6fab9d6-ee89-4fd7-869b-aa6a3f41b6d0	47d9c408-1a3c-46c1-aecf-6f1746615499	640d04cbbe0343117bbdeab14958c99f716d90d34a6bf2218304c2379e21f794	2026-04-02 22:34:36.789	2026-04-09 22:14:56.301	2026-04-02 22:14:56.302
489c8613-3021-4fa6-b4e8-5a0aae628cf0	47d9c408-1a3c-46c1-aecf-6f1746615499	77d1a75c0182bd4d827f4b0703387801d540734cae7a86e39171bf0f8b399103	2026-04-02 22:55:39.042	2026-04-09 22:34:36.808	2026-04-02 22:34:36.809
683667a6-143a-46fd-b546-adedd8276fb0	3961fabe-1345-4426-bd8a-ca0a5eac3aac	78ca3e7f70a19e6f6e4563a401fc10d55c773158f22a0956b6db950b324df9f3	2026-04-02 22:55:49.927	2026-04-09 22:28:20.541	2026-04-02 22:28:20.542
688164d9-5f0b-406e-b562-c7d2627a8f60	281ac0c9-d22b-4ece-895a-9d2c86a8f315	5d2a30107f92de7feaf1f3d3406dd4ced27ea4bd127a70b4f1e1045c9083ef7e	\N	2026-04-09 23:14:03.642	2026-04-02 23:14:03.644
98846ef1-5cd8-4c66-9641-d2fdf506711d	47d9c408-1a3c-46c1-aecf-6f1746615499	b9b1950690e84caebdc273f7f468196972e0c33f657331a8d592ade0ba5d4c12	2026-04-03 01:33:10.607	2026-04-09 22:55:39.062	2026-04-02 22:55:39.064
24cb4319-0613-42f7-a344-4cd1ae9ea055	3961fabe-1345-4426-bd8a-ca0a5eac3aac	9175f0d9de9c5f79a8fa59e8cee86dcc709103f5aef082c6ee560fdfc08a2e4f	2026-04-03 01:34:13.132	2026-04-09 22:55:49.943	2026-04-02 22:55:49.944
27969bfe-2e71-4071-8c27-4fe0a599818c	47d9c408-1a3c-46c1-aecf-6f1746615499	9c38cbeda5e9ae01b1559588af7fec0ef2e5a74d7f8ccf0eb726d4a791101b0d	2026-04-03 01:48:12.264	2026-04-10 01:33:10.628	2026-04-03 01:33:10.629
dfacd82e-3303-47b3-97aa-41380791bdae	47d9c408-1a3c-46c1-aecf-6f1746615499	6a1fa90bde2d71aac03e83218564a05cedf5f8c2aad404be5b57484baf31f213	2026-04-03 02:06:23.878	2026-04-10 01:48:12.288	2026-04-03 01:48:12.289
0bac4d25-cd42-49c4-97bc-9a736710817e	3961fabe-1345-4426-bd8a-ca0a5eac3aac	8067b54fa45a894d29559cf14214cd81491255ac4f3739bcdf11fad69a60f77b	2026-04-03 02:06:44.662	2026-04-10 01:34:13.149	2026-04-03 01:34:13.15
26e2ba49-c94f-48ff-9737-24b379f3e57b	3961fabe-1345-4426-bd8a-ca0a5eac3aac	994b02cea9207d72abf87b33ce20ced51fb1e2f6b5db62f6afad6ca5417d7063	2026-04-03 02:06:44.805	2026-04-10 02:06:44.682	2026-04-03 02:06:44.683
f939cd85-9881-46a0-8b41-a9e2507be50a	3961fabe-1345-4426-bd8a-ca0a5eac3aac	b2d949df25d24d5ef6d6f120f3a9769c0d6010e7f4eaa8c749ed7ee5389ff7e5	\N	2026-04-10 02:06:44.821	2026-04-03 02:06:44.823
b1405cce-8c19-491f-a51c-f5ef1fd62648	47d9c408-1a3c-46c1-aecf-6f1746615499	c58736a183e266804b12928aa45e9f9c619cf8bb75ac55525f901dc4ecda2809	2026-04-03 02:21:25.837	2026-04-10 02:06:23.908	2026-04-03 02:06:23.91
3dbc1fe7-0121-458f-806d-0fb4dc708f38	47d9c408-1a3c-46c1-aecf-6f1746615499	c18a6800bd740f9a1de12b75849dd06acc046cbc282003898edafcaf139e0cf5	2026-04-03 02:36:27.662	2026-04-10 02:21:25.858	2026-04-03 02:21:25.86
2e5072ea-dc17-47d1-b4b5-d204088cf255	47d9c408-1a3c-46c1-aecf-6f1746615499	dc2cdbd4119736b208dc4dae1740f499c73ea6736c12edead0717805b44432c8	2026-04-03 02:51:29.632	2026-04-10 02:36:27.68	2026-04-03 02:36:27.682
0702dcde-b437-4cd6-930e-3c4c622c0e2d	9f70646e-c63e-4a08-a4fa-8786204bbf4e	8b0a65c07a2910f37c2a15130e2234c848356c55680e8d0ab5ee43746fc5cf6d	2026-04-03 02:54:28.026	2026-04-09 22:24:15.051	2026-04-02 22:24:15.052
629cf027-374b-480f-b854-4102af7d382b	47d9c408-1a3c-46c1-aecf-6f1746615499	37b936e55424380afc19c9a890bda85f61d8c39eef6a4ab92356363a5795dfa3	2026-04-03 03:06:29.298	2026-04-10 02:51:29.651	2026-04-03 02:51:29.653
5e542a2c-83c2-42a2-b2a2-1d8502310c27	47d9c408-1a3c-46c1-aecf-6f1746615499	123dde2007e02c48d42d9f3ec167576027231e2f83fa4bb726d87bff9ef13824	2026-04-03 03:06:29.464	2026-04-10 03:06:29.317	2026-04-03 03:06:29.319
b3bebe3a-791d-4a0a-a9d6-f2d6aee4e146	9f70646e-c63e-4a08-a4fa-8786204bbf4e	520e55f70c4a682ee4f6a9f547bfb1be96782d87e2b74cc8b4b37620d8b0f7ed	2026-04-03 03:09:28.315	2026-04-10 02:54:28.043	2026-04-03 02:54:28.044
f3478cf9-af12-4957-908b-281a18f23d08	3961fabe-1345-4426-bd8a-ca0a5eac3aac	d2d17e98f08848e11480f95c3cb8eeb8d608b8eb8971d84af871d2b3da3dc2ad	2026-04-03 05:09:15.136	2026-04-09 20:16:10.775	2026-04-02 20:16:10.776
f6493776-5c6c-4f85-8ef8-e3107bcee2bd	e9134380-2da7-4a1e-bd2a-34398f85a6e5	329c0d6d5b82b34f53bd2e4b6d17c584393e27697ec1ed3b9bbc7d06e3c8fab2	2026-04-04 09:22:39.379	2026-04-09 21:15:37.178	2026-04-02 21:15:37.18
6af6845d-84ef-4238-a9bd-fc7b412afa57	47d9c408-1a3c-46c1-aecf-6f1746615499	50e76e22de3b5abed69be93458531214fcd99df360af73e25f82430ebbbdeba5	2026-04-03 03:21:30.039	2026-04-10 03:06:29.477	2026-04-03 03:06:29.478
74a7b49e-0431-4d97-8797-12071c3ceb3d	9f70646e-c63e-4a08-a4fa-8786204bbf4e	44274b26279415d9634ee51c51f2f0794c10a995a50b6a2efca78ebde690fb0d	2026-04-03 03:24:29.054	2026-04-10 03:09:28.33	2026-04-03 03:09:28.332
91c51103-f1c7-4ebc-aa26-1f0f7faa4bb8	47d9c408-1a3c-46c1-aecf-6f1746615499	e028089d5417e9bf9e6535961e7c95fe468c76e8adf6690020abdbbee7bf3cea	2026-04-03 03:36:30.362	2026-04-10 03:21:30.059	2026-04-03 03:21:30.06
3e287f22-eeda-4c44-aba5-02c706d01416	9f70646e-c63e-4a08-a4fa-8786204bbf4e	3791611b2b5a20e744d8fb9a068934f51fc83111b708c77444053cf54878376a	2026-04-03 03:39:29.791	2026-04-10 03:24:29.07	2026-04-03 03:24:29.072
a0579e67-11dc-4780-be30-904dbdc0d733	47d9c408-1a3c-46c1-aecf-6f1746615499	2a1ad2646aac5f0a17567f2e917f23d456f96ed396c4fb80060391c2ccececb1	2026-04-03 03:51:30.527	2026-04-10 03:36:30.382	2026-04-03 03:36:30.383
4b895ce7-b80b-455d-8dd1-d51f683c2ffc	9f70646e-c63e-4a08-a4fa-8786204bbf4e	6a33fbbd54d4c3dac7218b6214875f7f9cfe41bf2b8336bec4a562d1134149ad	2026-04-03 03:54:29.521	2026-04-10 03:39:29.809	2026-04-03 03:39:29.81
f0f8d7c4-0114-4150-87cd-07d71487608c	47d9c408-1a3c-46c1-aecf-6f1746615499	516537f0f8468c482e05cbef044744fdc43187b40e681d2cc9aad77123f80e88	2026-04-03 04:06:30.239	2026-04-10 03:51:30.549	2026-04-03 03:51:30.55
cf228dee-677a-4d51-b539-6e597fd2f089	9f70646e-c63e-4a08-a4fa-8786204bbf4e	3e8880df13a5aef1a53c62ca464302659ed7a2462dbff39550289ec38dae2d5e	2026-04-03 04:09:29.251	2026-04-10 03:54:29.537	2026-04-03 03:54:29.538
48412f97-59f4-4bc4-82aa-20daaa85edc4	47d9c408-1a3c-46c1-aecf-6f1746615499	51c132beee5b71c7d55b081b0eb7c11c4335fd95b12030cca4e15e825ba1d1b9	2026-04-03 04:21:30.189	2026-04-10 04:06:30.261	2026-04-03 04:06:30.262
757083b5-cbff-4235-9aec-4ac404b396f2	9f70646e-c63e-4a08-a4fa-8786204bbf4e	c24a4b7133660e5d4fac4bb803b38395a56c3b1099e272f1a301e5765bbabe16	2026-04-03 04:24:29.988	2026-04-10 04:09:29.269	2026-04-03 04:09:29.27
7415e26b-2b15-4e84-a66a-0ba8e7cb2679	3961fabe-1345-4426-bd8a-ca0a5eac3aac	614c15017680190aa8c27144ce7152dca7924c6c799b428251096f9bf41eb00f	2026-04-03 04:35:59.257	2026-04-10 04:35:44.418	2026-04-03 04:35:44.419
79d90f85-5a2f-4296-8d09-400fbd33e9d1	47d9c408-1a3c-46c1-aecf-6f1746615499	5ad9975d04950488d32509fb0b9121e8265678ec4962d74482cec10d0b77c5b1	2026-04-03 04:36:30.701	2026-04-10 04:21:30.21	2026-04-03 04:21:30.211
dbe29a56-d99c-4500-9dcd-d4ed0443c708	9f70646e-c63e-4a08-a4fa-8786204bbf4e	cdf909c763dcbd60405b6f426909394fb435a44134a8b9c88ec133a69616f725	2026-04-03 04:39:30.586	2026-04-10 04:24:30.006	2026-04-03 04:24:30.008
cbdebd63-5f24-4702-aab4-243e2114702c	47d9c408-1a3c-46c1-aecf-6f1746615499	314821a6d93a68a5b4dd465b753dc5f9175bf406147d355da30430a97f4ffb71	2026-04-03 04:51:30.36	2026-04-10 04:36:30.715	2026-04-03 04:36:30.716
b5bd7a77-4ea3-4c24-936e-fbde4aa1c18e	3961fabe-1345-4426-bd8a-ca0a5eac3aac	fae3ebbc5e36c143c55b03a3cbb281e5ee7763427fa2b3211a3e6f91613502bf	2026-04-03 04:54:25.881	2026-04-10 04:36:03.848	2026-04-03 04:36:03.855
80a5a797-e2c1-45e0-90a8-2ec0f880e2ff	9f70646e-c63e-4a08-a4fa-8786204bbf4e	9dd3de21d982456b49318fd4f761d634b7d9054002913fc75b3545e8c05f3a16	2026-04-03 04:54:30.254	2026-04-10 04:39:30.608	2026-04-03 04:39:30.61
81efc203-f2e9-4443-bf98-332d136ee62d	47d9c408-1a3c-46c1-aecf-6f1746615499	80c0b4903cbe2c76c57c4783b3356336c302369a6d8eda2a51ccc822eabe5839	2026-04-03 05:06:30.098	2026-04-10 04:51:30.38	2026-04-03 04:51:30.382
d9aa25c4-0c25-4bfa-b58e-cab8c754cf67	3961fabe-1345-4426-bd8a-ca0a5eac3aac	f5f041676be9ba79ff80cde4e4049d61a407a2c3f2babe7c95bced7a3c6203f8	2026-04-03 05:09:18.46	2026-04-10 05:09:15.153	2026-04-03 05:09:15.154
d4e6102f-9ef2-4185-a013-7082e12f0a3c	9f70646e-c63e-4a08-a4fa-8786204bbf4e	28ed6e184dd492a99ea4282031272034b95361d64eff6ffdac83e01fde22f07a	2026-04-03 05:09:30.996	2026-04-10 04:54:30.271	2026-04-03 04:54:30.273
ef0b2d7b-76d7-4149-af06-b48f03f166c7	3961fabe-1345-4426-bd8a-ca0a5eac3aac	57654bc9dd882fab1a7d13c5db437a058efc2cac91b820c5f330d1d931628843	2026-04-03 05:11:26.922	2026-04-10 05:03:48.299	2026-04-03 05:03:48.3
4a4d165d-4f2b-437f-9093-4e56028a765c	3961fabe-1345-4426-bd8a-ca0a5eac3aac	9790e9f13e81823f92e6aa1b6e10b56fa6741d84c73ab1da1219b2633061dcfe	\N	2026-04-10 05:11:51.903	2026-04-03 05:11:51.904
add60821-58f4-405c-8328-829b1698d9c0	47d9c408-1a3c-46c1-aecf-6f1746615499	4242cc3660d869a223b0b671e3a81575f99f29d57bceed136146186ae636d84b	\N	2026-04-10 05:14:04.281	2026-04-03 05:14:04.282
d78a6320-4334-4fc7-8118-33242c52cc1b	47d9c408-1a3c-46c1-aecf-6f1746615499	3a0b4fc7b154949b4296349c00c4f8409d091633ccff285ddac05726297db9e8	2026-04-03 05:21:30.832	2026-04-10 05:06:30.116	2026-04-03 05:06:30.117
cd7cc2fb-fdce-44da-ae54-f6eb030446c2	9f70646e-c63e-4a08-a4fa-8786204bbf4e	f42d4ccc6745ae868eceeba0c7e1137f2d67e43bf49abeaf742b98849bc99306	2026-04-03 05:24:31.738	2026-04-10 05:09:31.013	2026-04-03 05:09:31.015
b6e6dfd7-1f2d-4bd4-b2d9-1c9720c0fe87	47d9c408-1a3c-46c1-aecf-6f1746615499	87be6e1b69062600e5834d805fae23f0538adaaa39801618319b63a40ac35f7d	2026-04-03 05:36:30.564	2026-04-10 05:21:30.852	2026-04-03 05:21:30.854
70b24fb5-309a-4b0d-8bd7-53eee5259a73	9f70646e-c63e-4a08-a4fa-8786204bbf4e	0dd35bfc72f4843b144948d6d0c14e32c32b704e811f055db48d71520be92ac7	2026-04-03 05:39:31.463	2026-04-10 05:24:31.754	2026-04-03 05:24:31.756
03de03bc-56e4-4fc2-af47-c9b517baa318	47d9c408-1a3c-46c1-aecf-6f1746615499	815748afae1c05c923bd91cf8ea000384b41e79be37b7d06c37d7c2b35598580	2026-04-03 05:51:30.287	2026-04-10 05:36:30.583	2026-04-03 05:36:30.586
d96f4846-3fe7-4c47-a991-eafd2956187b	9f70646e-c63e-4a08-a4fa-8786204bbf4e	e3805c7e2372ed49b08911ab40cbe06acea1400f10aa27e3b25c12f06660f70c	2026-04-03 05:54:31.184	2026-04-10 05:39:31.479	2026-04-03 05:39:31.481
82868775-c8b0-493c-9efd-0029375223c6	47d9c408-1a3c-46c1-aecf-6f1746615499	caaa1881e9ea935080ef4e045556a413a87218df31c0a1c3016055df6e5f5f5b	2026-04-03 06:06:31.027	2026-04-10 05:51:30.306	2026-04-03 05:51:30.307
264bc362-9bf0-4d61-af34-d79f5877df4f	9f70646e-c63e-4a08-a4fa-8786204bbf4e	2231e644663c25435120e986c85c9d9874ce8b8d575b3b2c3c522e0a1cee4866	2026-04-03 06:09:31.924	2026-04-10 05:54:31.201	2026-04-03 05:54:31.202
8643463a-6ad1-4edf-9b97-9d8d31df7991	47d9c408-1a3c-46c1-aecf-6f1746615499	0938feb801269f83904039c5cbef374b25dd193dff9993e7308ba083c07136ad	2026-04-03 06:21:31.729	2026-04-10 06:06:31.046	2026-04-03 06:06:31.047
91413836-1fa1-450d-b965-6dfbbadb3ae5	9f70646e-c63e-4a08-a4fa-8786204bbf4e	a1ba2e591499b5242080fc49e26431bb140c2ea4a54c18fcd0225411a5304b17	2026-04-03 06:24:31.644	2026-04-10 06:09:31.939	2026-04-03 06:09:31.941
b477462d-35fe-41d6-a73d-42e0e91daed1	3961fabe-1345-4426-bd8a-ca0a5eac3aac	ee56a338effcb0e30aba493531afdd0da66fb5d0dbdc0f80794df12efd50cee3	\N	2026-04-10 06:27:05.981	2026-04-03 06:27:05.982
52a93fff-bd25-4ed9-b9ca-06667e7b463e	47d9c408-1a3c-46c1-aecf-6f1746615499	8df6401f2e30a25573862e76f7bd1bb44a9cb84331f6034c0c85dce9bbe226bd	2026-04-03 06:36:31.46	2026-04-10 06:21:31.748	2026-04-03 06:21:31.75
700a7073-c9cc-4d75-8f62-27402ec942b0	9f70646e-c63e-4a08-a4fa-8786204bbf4e	87c77ef294a6683e9b390acce63aa3fd337f57388db1c4b3744ee17cf4a3cea1	2026-04-03 06:39:31.359	2026-04-10 06:24:31.659	2026-04-03 06:24:31.661
33488d8a-cfd4-4078-9d4e-4c211d4d28e4	47d9c408-1a3c-46c1-aecf-6f1746615499	a68c259f35a9467f37f38e0543c43ed93fab270ed27e650ac0d6de2e55f47d5b	2026-04-03 06:55:32.996	2026-04-10 06:36:31.479	2026-04-03 06:36:31.48
97b66025-8238-45f6-b72d-f88921b255c2	9f70646e-c63e-4a08-a4fa-8786204bbf4e	f6d97020e856bb13fece3fa45bbd0d14b542b45801d88550fa96c669ba418734	2026-04-03 06:55:33.038	2026-04-10 06:39:31.375	2026-04-03 06:39:31.377
090ba67e-cbb1-4f56-bddc-ad12bb989830	3961fabe-1345-4426-bd8a-ca0a5eac3aac	97e2cb7e7d35c1924d8bd9029fedfd56c63032f41a4e407407de99b07fb21aef	\N	2026-04-10 06:55:34.568	2026-04-03 06:55:34.57
b24cdcce-0215-4bc2-a1b2-7fb868998660	47d9c408-1a3c-46c1-aecf-6f1746615499	457e390b58199fd2c21ac0618ef7e6296c33477af639174992006b9f2cd29e1b	2026-04-03 07:11:13.861	2026-04-10 06:55:33.027	2026-04-03 06:55:33.029
a2c9dd42-cf1a-4703-a212-4835a736cbda	9f70646e-c63e-4a08-a4fa-8786204bbf4e	ee47838c8922525d3200d972f6d7e1dccf78dfe17a505250afda3a9f28a01466	2026-04-03 07:44:10.773	2026-04-10 06:55:33.055	2026-04-03 06:55:33.056
f6042da6-af46-47ab-a2c8-83e2277b7ae4	9f70646e-c63e-4a08-a4fa-8786204bbf4e	670538c79de92ee2759ed97cd6f3ed40b8bf0b32dca3ee968108aa68686a3743	2026-04-03 07:44:56.952	2026-04-10 07:44:10.799	2026-04-03 07:44:10.8
b4d5f954-cb7a-4e26-82a8-d737d68f3e9f	9f70646e-c63e-4a08-a4fa-8786204bbf4e	0952aad7b9ed3c6ed172561b192c80ca1cbd29fb1f4c7a2403140a283f4be10d	2026-04-03 07:59:57.427	2026-04-10 07:44:56.969	2026-04-03 07:44:56.97
698c7dbd-7104-4e48-a9c0-2107efc7c159	9f70646e-c63e-4a08-a4fa-8786204bbf4e	796b41fcc74420793125038090862a242ca5fe5dcb4ac49157ec1e85eed4d652	2026-04-03 08:14:59.383	2026-04-10 07:59:57.448	2026-04-03 07:59:57.449
99489427-92a7-411c-93ac-6f36a36db10b	9f70646e-c63e-4a08-a4fa-8786204bbf4e	42224f7c1ad56f5daf67b826ccd0fa9f658a6a435939f9ca70554e3de3fabaca	2026-04-03 08:30:01.336	2026-04-10 08:14:59.402	2026-04-03 08:14:59.403
1cfdec83-1e38-4687-a67c-d526b5503e12	9f70646e-c63e-4a08-a4fa-8786204bbf4e	02147123dc2ad965c4688a82f646e9aad94d70f201c766e66bb15620a277f17e	2026-04-03 08:45:03.279	2026-04-10 08:30:01.359	2026-04-03 08:30:01.36
ef262e49-72a2-4abd-afca-0b8eb9301974	9f70646e-c63e-4a08-a4fa-8786204bbf4e	ef9cb8be830339b8d579fd06aa6d5ee7747e30f6e9c325989eebf57ad73b7c78	2026-04-03 09:17:16.965	2026-04-10 08:45:03.303	2026-04-03 08:45:03.305
d11c86bb-4b9b-4309-9721-5d4e11ee58fe	3961fabe-1345-4426-bd8a-ca0a5eac3aac	80153564f40719136fe45dd33eb16c5c3f66b06a8ab50e35e8a6ec3ae8ee108b	\N	2026-04-10 09:18:57.6	2026-04-03 09:18:57.601
20d16760-46cd-49a8-a79f-470c911c4778	47d9c408-1a3c-46c1-aecf-6f1746615499	10e01a13d273d3b12c8b86c7f762f2e6056bdaf0f075258b9b9c95a7ad0fbdaa	2026-04-03 09:24:14.489	2026-04-10 07:11:13.878	2026-04-03 07:11:13.88
521fa7c3-c3fd-4b01-bc6d-20d4215f8baf	47d9c408-1a3c-46c1-aecf-6f1746615499	d94234ae796baadf95d7024e8af3af6fd16cc111c13b2722df86381258b6e90a	\N	2026-04-10 09:24:14.504	2026-04-03 09:24:14.505
7823fbde-2920-4236-83a9-5de2b514a9cd	3961fabe-1345-4426-bd8a-ca0a5eac3aac	8b85435aace3ff5c3f54e9f9b0c2a5b50d6cc8447eb99c9e94581a318522df13	2026-04-04 04:06:11.485	2026-04-10 09:24:25.222	2026-04-03 09:24:25.224
49bd049d-b7f0-4da7-9b50-d050c3a704af	9f70646e-c63e-4a08-a4fa-8786204bbf4e	9bd04a4dc98113696e257e8b6463efd8385e058b8d0ca8d48de92c801e3945c9	2026-04-03 09:32:18.655	2026-04-10 09:17:16.996	2026-04-03 09:17:16.998
fe3dda96-521b-40da-823c-c026878656ed	3961fabe-1345-4426-bd8a-ca0a5eac3aac	1abcc01342c72069086b5d44cee6708b6516df180ed49df416e8a3175c633b51	\N	2026-04-10 09:38:06.629	2026-04-03 09:38:06.63
1c41600e-ae49-400d-9488-dd28753fd099	9f70646e-c63e-4a08-a4fa-8786204bbf4e	6a6342e97fb1b9a00fb79993f47376f776f61b599bf9dac507b429714685f088	2026-04-03 09:47:20.623	2026-04-10 09:32:18.674	2026-04-03 09:32:18.675
ca966857-486e-4675-879b-2f266ac60662	9f70646e-c63e-4a08-a4fa-8786204bbf4e	477b2f237167468692855361453a1e8bc3d57735d35d3264d78fce5f45822355	2026-04-03 10:02:22.58	2026-04-10 09:47:20.641	2026-04-03 09:47:20.642
1dcbcf65-c79c-4526-aa5d-0838dea52701	3961fabe-1345-4426-bd8a-ca0a5eac3aac	401066e4cac19cdcdd76c02fa49759329ce4cd1bf31743b22f66a4b751c4f6c9	2026-04-03 10:11:13.743	2026-04-10 10:10:46.114	2026-04-03 10:10:46.116
2369fe88-c961-44d5-874d-f0e86d17767b	9f70646e-c63e-4a08-a4fa-8786204bbf4e	2a02cc04a2b0cf2f9b438ee5e1c167b9237cae5a244cd49d76824b876aeafe57	2026-04-03 10:17:24.54	2026-04-10 10:02:22.598	2026-04-03 10:02:22.6
9604fa1b-510d-4a88-a85a-e846366e4c51	9f70646e-c63e-4a08-a4fa-8786204bbf4e	fccd4817a9906a648e4644c33e9ede76891e352174f3a52e67cc29cb7597532a	2026-04-03 10:32:26.496	2026-04-10 10:17:24.556	2026-04-03 10:17:24.557
32e4985f-8f5d-4429-99d2-e8b64953b2b1	47d9c408-1a3c-46c1-aecf-6f1746615499	f1a591e75eda705d9a2c22df0106f12d48ffed7121e4fb1d14ec0c983984b938	2026-04-03 10:43:13.531	2026-04-10 10:11:19.913	2026-04-03 10:11:19.915
88bdd60e-324d-46b1-8c55-51d01af0e1c2	199cecb0-a797-4677-a949-f23276e5c330	a610b100731325ab82dc2d935cc19378e2e8d03b347bfa9d7148e59f0da3b329	\N	2026-04-10 10:45:50.437	2026-04-03 10:45:50.439
a31f4cae-4a74-4c3f-9d62-5796ad8b9cf8	199cecb0-a797-4677-a949-f23276e5c330	bbfcf8f649c558b179672f756b5dcfa080b30e6a75de2f382e9e8e339a544207	\N	2026-04-10 10:45:52.002	2026-04-03 10:45:52.003
1d437045-c110-4d51-a50e-83c70fbf2b51	9f70646e-c63e-4a08-a4fa-8786204bbf4e	63f5a359dc74ac71257429fc16af97449c9955d5c6054b65fa6793e2145f7959	2026-04-03 10:47:28.459	2026-04-10 10:32:26.513	2026-04-03 10:32:26.514
7c0adac7-d111-4bde-9f37-7a475bb3237b	199cecb0-a797-4677-a949-f23276e5c330	f889e3f4110660c2f81639e354f566c9e82e65577b1ed924592362b03398d79e	\N	2026-04-10 10:48:21.144	2026-04-03 10:48:21.145
a152c0fc-e4b2-4cd2-9555-5755bd49da3c	9f70646e-c63e-4a08-a4fa-8786204bbf4e	eea17945f6eda8842136d5491b7d32cff5ecd304e5051e03b71ef00061d91f72	2026-04-03 11:02:30.418	2026-04-10 10:47:28.477	2026-04-03 10:47:28.478
b29bc56b-083d-4629-bf7c-3c66ba2a9a7e	199cecb0-a797-4677-a949-f23276e5c330	f870cd70322aecb070e275ed7f1e1e19f175dab4f13be498c92fb474ee83dfc3	\N	2026-04-10 11:16:17.756	2026-04-03 11:16:17.757
bbda6a72-620d-47d2-b3a6-21b47065c789	9f70646e-c63e-4a08-a4fa-8786204bbf4e	527865b85d890e16e932528c36bac1eb1631ee92391585df93becdd69999c7aa	2026-04-03 11:17:32.353	2026-04-10 11:02:30.435	2026-04-03 11:02:30.436
90f852d4-ad1a-4476-b50b-88cafb02b4f4	9f70646e-c63e-4a08-a4fa-8786204bbf4e	18946bda65e7b70a38dd077ea4ae75109924c0f4355a29348f9af32a9ab31911	2026-04-03 11:32:34.327	2026-04-10 11:17:32.368	2026-04-03 11:17:32.37
f19907e2-9dee-4c49-8072-f4c2ba416e6b	9f70646e-c63e-4a08-a4fa-8786204bbf4e	26a1efbd9574018a738cf320fbc85f19be9f85b7b320f1fa30beee09760d5dff	2026-04-03 11:47:36.269	2026-04-10 11:32:34.343	2026-04-03 11:32:34.345
2c205210-20b6-49ba-873c-66945383315c	3961fabe-1345-4426-bd8a-ca0a5eac3aac	9186d8f78e12fc270c481a90b635fcade1cc5bebacd24603735005356cd4325d	\N	2026-04-10 11:59:28.065	2026-04-03 11:59:28.067
437eb045-6214-4ab8-a4ef-b13e1e1b55ac	9f70646e-c63e-4a08-a4fa-8786204bbf4e	54905e57d2f99b67b0eadc32572dd8f84d7bbe898676201ba6fca3471b43998c	2026-04-03 12:02:38.229	2026-04-10 11:47:36.288	2026-04-03 11:47:36.289
f85aa07f-e9f4-4255-931d-e8791c4b75c0	9f70646e-c63e-4a08-a4fa-8786204bbf4e	f3319d7f4db6d39a16a4afadbf767ae7cafcdcc4d685152745293fa916a75a89	2026-04-03 12:17:40.194	2026-04-10 12:02:38.245	2026-04-03 12:02:38.246
aeac5f81-a6dd-4a1e-b5ad-06330f7ee19a	9f70646e-c63e-4a08-a4fa-8786204bbf4e	427b658f3ecb67932c713464b39af91ede23d2e9845652b3940f02718f7c98ec	2026-04-03 12:32:42.202	2026-04-10 12:17:40.211	2026-04-03 12:17:40.212
d4c9ffc0-5ea2-4833-b96e-72da244b83a4	9f70646e-c63e-4a08-a4fa-8786204bbf4e	720cfc4ec3fab015008ba354d596b0b73602bf8f4bb674ac97570062c9177e0e	2026-04-03 12:47:43.541	2026-04-10 12:32:42.219	2026-04-03 12:32:42.221
efaa2b81-3f48-4248-a7f6-b72891ef8a54	3961fabe-1345-4426-bd8a-ca0a5eac3aac	541e90f389ef58adfab1e28c54e0b386a4e7409c9c71f32b8a2e77f184acff53	\N	2026-04-10 12:53:51.344	2026-04-03 12:53:51.346
b47f3ec2-9d70-40af-8b23-fd22e5596010	9f70646e-c63e-4a08-a4fa-8786204bbf4e	f74be1f1ecb5a67120bf21e00fb21af2a8669a6afb50db2ea0fd34180a22843e	2026-04-03 13:02:44.497	2026-04-10 12:47:43.558	2026-04-03 12:47:43.56
73aa1f90-d18f-4690-a930-220e74059b78	3961fabe-1345-4426-bd8a-ca0a5eac3aac	cfbbdd398cee381d73728462816d13a61dca7dd5663822b062b3ef6977e01787	\N	2026-04-10 13:09:10.869	2026-04-03 13:09:10.87
bd2e0815-2a29-43bb-b7ea-1fd9df7617c7	9f70646e-c63e-4a08-a4fa-8786204bbf4e	25c6f0de5bf5f621c27bebe6fcee1034803f665b92c6f87e279b6bb443ebca9c	2026-04-03 13:17:45.006	2026-04-10 13:02:44.515	2026-04-03 13:02:44.517
fe18175c-7781-4614-9e51-3cdad224b332	3961fabe-1345-4426-bd8a-ca0a5eac3aac	26ecff53b6d17b96e0b61e4c805477557f98afa5f18bde19a45a03b6379b0bff	\N	2026-04-10 13:26:00.359	2026-04-03 13:26:00.361
8941fde0-f94e-4810-9dec-4a23cf2bf79a	9f70646e-c63e-4a08-a4fa-8786204bbf4e	7910be61deea212a60631e5863174915a4d6a9495d21ea04f74909cba3fcc514	2026-04-03 13:32:46.433	2026-04-10 13:17:45.023	2026-04-03 13:17:45.025
25604d85-088e-4557-a15d-fab4b49f10e1	9f70646e-c63e-4a08-a4fa-8786204bbf4e	887a733a55936d50ab28dcc84548898248b24b7ea99d3e663c945f1345ddaeb4	2026-04-03 13:47:47.414	2026-04-10 13:32:46.453	2026-04-03 13:32:46.454
96153606-268c-47a2-b45c-f0423b21af07	9f70646e-c63e-4a08-a4fa-8786204bbf4e	f6a85604c38382b660764ebd07e2b66713c8b970189e6ab74f3776e97edf9b54	2026-04-03 14:02:47.772	2026-04-10 13:47:47.435	2026-04-03 13:47:47.436
e028e1ff-53fa-4881-9da2-ad9252939853	9f70646e-c63e-4a08-a4fa-8786204bbf4e	232de40be75f9b1a642bb927e5606455b8b651f19a8c0dc78f49f5efa0edb25e	2026-04-03 14:17:49.324	2026-04-10 14:02:47.789	2026-04-03 14:02:47.791
9ec54255-d2da-4deb-9c38-4993896855ed	9f70646e-c63e-4a08-a4fa-8786204bbf4e	24ebfeea1cdd0072bd938286218bc5e6abcfca25add135c88fce605541d1a413	2026-04-03 14:32:50.314	2026-04-10 14:17:49.343	2026-04-03 14:17:49.345
3e38f41d-1828-4e01-b238-3438de67c132	9f70646e-c63e-4a08-a4fa-8786204bbf4e	7b4ff6a51b1fb6cfe63966c285ca6b9893b512c26ab2effb7c3b565ccc431c5f	2026-04-03 14:47:50.64	2026-04-10 14:32:50.332	2026-04-03 14:32:50.334
6f69e634-4503-48d4-aa78-41f21c524c1a	3961fabe-1345-4426-bd8a-ca0a5eac3aac	0a4342bb0615882b95e68030ff1118fef3976b58f68bcbda9cf2c7f96157afc1	\N	2026-04-10 15:02:29.327	2026-04-03 15:02:29.328
6cc3f21a-e918-4a4f-8d23-8f873cbaf9f2	9f70646e-c63e-4a08-a4fa-8786204bbf4e	2d39ee51f7c8a288ab0779df547be15df0de6a9489e01d90368b95e3a68e6b29	2026-04-03 15:02:52.249	2026-04-10 14:47:50.657	2026-04-03 14:47:50.658
331a6677-a415-427b-9494-eb315bf92bbe	9f70646e-c63e-4a08-a4fa-8786204bbf4e	6839f17b0b69db17b0e7a6846805231b38a3c9325a6eaf99afeae2eef84d997d	2026-04-03 15:17:53.24	2026-04-10 15:02:52.265	2026-04-03 15:02:52.266
e152e061-a0b7-4aa6-be03-900f044a26cf	9f70646e-c63e-4a08-a4fa-8786204bbf4e	01d9a310d04bbfefaf72ff4efdcdd05c0561975e018ab34d30507483a21544c0	2026-04-03 15:32:53.502	2026-04-10 15:17:53.256	2026-04-03 15:17:53.257
1b177ee3-5d72-4f28-a05d-be44a742debe	9f70646e-c63e-4a08-a4fa-8786204bbf4e	f6b758fe7ccb20e0ab01bf2bb8e141bf641bd28a88ca7cd067757cc640e52fef	2026-04-03 15:47:55.175	2026-04-10 15:32:53.521	2026-04-03 15:32:53.522
bcff5e1f-a9d0-4d63-8d1a-8b3f704c131e	9f70646e-c63e-4a08-a4fa-8786204bbf4e	6aaf2ecae496a53df3a2b5abc0fa2b37ce2def099efc082e9bbb73e7cd68364b	2026-04-03 16:02:56.147	2026-04-10 15:47:55.193	2026-04-03 15:47:55.194
f800c032-6de8-4175-8d08-fccbc81637ba	9f70646e-c63e-4a08-a4fa-8786204bbf4e	69f8c6f027cfa9e9b7ba51168b7dda8c270b6dbbf5ab8bcde21f0cc7c8e8608e	2026-04-03 16:17:56.394	2026-04-10 16:02:56.164	2026-04-03 16:02:56.165
9efb338c-a111-439b-be4d-8be246338a39	9f70646e-c63e-4a08-a4fa-8786204bbf4e	ef71935bbbc6aa49b109233d3e3e67f60852cc0f8f9f82e15ec29271dea59169	2026-04-03 16:32:58.084	2026-04-10 16:17:56.412	2026-04-03 16:17:56.413
f6afe076-482d-4a78-8d48-5303b1247edb	9f70646e-c63e-4a08-a4fa-8786204bbf4e	0c95c05e5612086962a13543e58db9187cc9ca95a7b429d99a7b34863f7f6d92	2026-04-03 16:32:58.198	2026-04-10 16:32:58.102	2026-04-03 16:32:58.103
26d38f18-23dd-4124-9a6a-e278f434a57a	281ac0c9-d22b-4ece-895a-9d2c86a8f315	1f7b110ffe017bfa766c974e52a39441cc2396f67f62f49ec5090574b05befa6	\N	2026-04-10 16:38:50.258	2026-04-03 16:38:50.26
2b468e77-5284-4200-a544-a451635076be	9f70646e-c63e-4a08-a4fa-8786204bbf4e	2ca89ee2ef9f5627dde9b90f15710b2f1201060ee0a5e7f26be5f52df64db4aa	2026-04-03 16:47:59.06	2026-04-10 16:32:58.211	2026-04-03 16:32:58.213
833df862-7e7f-4592-a263-454ad9ade9c6	9f70646e-c63e-4a08-a4fa-8786204bbf4e	e0fca0b687e6e6d7352264cd4a8981587a7363a7840d6ced670315c61892d59e	2026-04-03 17:02:59.097	2026-04-10 16:47:59.077	2026-04-03 16:47:59.079
5792b167-e5a5-440a-abaf-08cca3cf9602	9f70646e-c63e-4a08-a4fa-8786204bbf4e	2cf8d6617fadfd6628ca3b258dc309bd89d118db539e86a075c1ad9c54357405	2026-04-03 17:18:01.005	2026-04-10 17:02:59.115	2026-04-03 17:02:59.116
4b13442d-a3c8-471a-9ec1-e8afc01252a5	199cecb0-a797-4677-a949-f23276e5c330	edc7f25791522d07d1c67e34baba611d1409a7ee745a90f1a14354463c333e81	2026-04-03 17:28:03.367	2026-04-10 17:23:16.147	2026-04-03 17:23:16.148
f7a2e53a-1a2e-4905-b549-729354b6aab2	3961fabe-1345-4426-bd8a-ca0a5eac3aac	8d2f18a5960063ce0f978098364ff47c8a020bb6702a93159f23731ded7f1fc4	2026-04-03 17:28:06.19	2026-04-10 17:23:37.527	2026-04-03 17:23:37.528
0b4923ce-59c0-407a-92a9-9133a2b9f41b	9f70646e-c63e-4a08-a4fa-8786204bbf4e	5e72cea5151958062dcffe7ee0dfb3bca6b70cd16a9e45a14d0a2268030f2b9b	2026-04-03 17:33:01.979	2026-04-10 17:18:01.021	2026-04-03 17:18:01.022
80348fdc-3c0c-4ade-9154-84030b04c619	9f70646e-c63e-4a08-a4fa-8786204bbf4e	c18fb87d1d481381b324235e838203b2dc24665d2bbc423d8870ab3cc2711068	2026-04-03 17:48:01.96	2026-04-10 17:33:01.995	2026-04-03 17:33:01.996
4474a37e-730d-4864-9597-6e8b1f232aed	199cecb0-a797-4677-a949-f23276e5c330	e02ce15035313b9e6714b812d7ad628fa9900719b7061a0d4f52969f41bf7fa5	2026-04-04 04:05:55.25	2026-04-10 10:40:35.205	2026-04-03 10:40:35.206
e5c1d6bd-b5f2-46e0-98f1-105363568717	9f70646e-c63e-4a08-a4fa-8786204bbf4e	ddfd181a73919d9ebd484a2a23ad908cf9dbaff8a7f578aa96bf378cccfeb3ce	2026-04-03 18:03:03.982	2026-04-10 17:48:01.977	2026-04-03 17:48:01.978
d1860a45-d542-401c-bcc1-ce8291cb1498	9f70646e-c63e-4a08-a4fa-8786204bbf4e	51e4783e82387084f28f2016453f0d8775c005eeb52d36c5bcf9549f3a96ec90	2026-04-03 18:18:04.936	2026-04-10 18:03:03.998	2026-04-03 18:03:03.999
5121dd7c-660b-493c-84d6-b78b77c6127d	9f70646e-c63e-4a08-a4fa-8786204bbf4e	cf5113a84e4fa8021f7506c871f301b304011e2e6dcf78ca725208b961e22708	2026-04-03 18:33:04.795	2026-04-10 18:18:04.956	2026-04-03 18:18:04.958
47009d0c-6383-4ff0-a750-c3e818f49fe2	9f70646e-c63e-4a08-a4fa-8786204bbf4e	571d77b7837a6b6428553a096f89893402592d7e201d1b9db56b1898aa9f764d	2026-04-03 18:48:06.719	2026-04-10 18:33:04.812	2026-04-03 18:33:04.813
f7eaf7ea-6f95-40cc-a57b-074bd50c76ae	9f70646e-c63e-4a08-a4fa-8786204bbf4e	da7ad458ec67a84929e4d1801d6bb12ded33231dc8602b2c705c67451df7fbdb	2026-04-03 18:48:06.836	2026-04-10 18:48:06.736	2026-04-03 18:48:06.737
82aba93a-e165-40a3-9205-3a98a83ea432	9f70646e-c63e-4a08-a4fa-8786204bbf4e	a986d7001f2c564d6b0f362be7d00cafa74d685624d632d4d5a8b8c8ebaa6e58	2026-04-03 19:03:07.826	2026-04-10 18:48:06.849	2026-04-03 18:48:06.851
bbb993c1-0e60-4411-825b-76f5484d5e46	9f70646e-c63e-4a08-a4fa-8786204bbf4e	d1c9ab3f741796e5d9c14d8defafc759e64e1dbf1035cf256fe3130b4a9ef8e6	2026-04-03 19:18:07.629	2026-04-10 19:03:07.843	2026-04-03 19:03:07.844
d9e1b332-640a-462b-b1c7-9a1a2825c0e2	9f70646e-c63e-4a08-a4fa-8786204bbf4e	0b73a79fa2857cf810dff5bb4138dd1a96eba0063a35557650ddb5d3949a59fd	2026-04-03 19:33:09.584	2026-04-10 19:18:07.646	2026-04-03 19:18:07.647
f0f280f6-c4d7-44c0-aff8-9cd386f19eeb	9f70646e-c63e-4a08-a4fa-8786204bbf4e	4810de619fb6b9c23f3653507df8bdca0ac3a7f366eb065a27c3ab7051599f15	2026-04-03 19:48:10.747	2026-04-10 19:33:09.601	2026-04-03 19:33:09.603
8b518b2f-e379-4cce-b951-214d0852076e	9f70646e-c63e-4a08-a4fa-8786204bbf4e	8cf058004156a1d62cb87980da1829f5f4a62953e915750d2e1125d40565cc3b	2026-04-03 20:03:10.479	2026-04-10 19:48:10.763	2026-04-03 19:48:10.764
aebd5820-5edc-4dce-a79e-ad9c17a63032	9f70646e-c63e-4a08-a4fa-8786204bbf4e	25ef5c8021cb8db2eb2b0b740258d7a8e55318678c8c84d2fb6c545a1581f452	2026-04-03 20:18:12.432	2026-04-10 20:03:10.495	2026-04-03 20:03:10.497
299ba7d3-cd39-44d6-b5ac-06bf353141c7	9f70646e-c63e-4a08-a4fa-8786204bbf4e	eccf52e684cfb7e8313f70a9b4edbb5c040b9745c268c6ea8c988e8142432443	2026-04-03 20:33:13.67	2026-04-10 20:18:12.449	2026-04-03 20:18:12.45
88deed32-4cc5-4fa0-8de5-4179bc5caad1	9f70646e-c63e-4a08-a4fa-8786204bbf4e	041bf85a4d0cad4198418237d54cc0d1d262360f5afc2a32676f04f7150d6569	2026-04-03 20:48:13.331	2026-04-10 20:33:13.687	2026-04-03 20:33:13.688
ce31090d-992d-42b1-b5a7-4620869ad9f4	9f70646e-c63e-4a08-a4fa-8786204bbf4e	c06326eba2ab8233d22686416a04f02fff0592b51a73bf15300141eba4a755d2	2026-04-03 21:03:15.286	2026-04-10 20:48:13.351	2026-04-03 20:48:13.352
27721878-426b-4c6c-bc5d-87e0e1de1d2d	9f70646e-c63e-4a08-a4fa-8786204bbf4e	c434f13fbd2b2d32514526918ed4f15ce863745ce1801475dc2726142cad5243	2026-04-03 21:18:16.63	2026-04-10 21:03:15.302	2026-04-03 21:03:15.303
ab6a5228-e5b5-41d4-aa38-6a926fe28d97	9f70646e-c63e-4a08-a4fa-8786204bbf4e	95acede16b659e1d6c06f5c0513553e2236f6e1b71ff5a2b401d6a496e33b082	\N	2026-04-10 21:29:55.549	2026-04-03 21:29:55.553
fd3ca7b6-2b73-4842-9a09-c371c4439631	9f70646e-c63e-4a08-a4fa-8786204bbf4e	935293e0b86fd8f8c7b6d36fbe75575b74c069baeba9cc04a2050b3d68decf4a	2026-04-03 21:33:16.191	2026-04-10 21:18:16.647	2026-04-03 21:18:16.649
d0e548b5-4fbe-40ee-9253-9cc3c86622a1	9f70646e-c63e-4a08-a4fa-8786204bbf4e	ff61e79bbdd7c4e6d7bb6113e00fba285b5c1a1d1137a721464be801377a80b5	2026-04-03 21:48:18.149	2026-04-10 21:33:16.206	2026-04-03 21:33:16.207
ddcf5bcd-32db-40eb-b2e8-3b7690a660dc	9f70646e-c63e-4a08-a4fa-8786204bbf4e	7a223518ecd01029194b21d048edeab3bdf25a20eb8f6a29e43128b899c70847	2026-04-03 22:03:19.529	2026-04-10 21:48:18.168	2026-04-03 21:48:18.169
6783bf0d-288d-4fe1-bc86-9494b3628223	9f70646e-c63e-4a08-a4fa-8786204bbf4e	610021298a9393bb0566886ba50d33673ff1d4d4336a1458ccd6f2c2d8441220	2026-04-03 22:18:20.504	2026-04-10 22:03:19.546	2026-04-03 22:03:19.548
63314ee2-f5ec-4b79-8bc6-e4d13122aa27	9f70646e-c63e-4a08-a4fa-8786204bbf4e	22e9aff02bf2a52e75bef68561e38c81039b6c46bc22613eeed44027ca64d971	2026-04-03 22:33:21.011	2026-04-10 22:18:20.521	2026-04-03 22:18:20.523
a81ab5f0-96af-4f87-ae11-6c2eec0900e1	9f70646e-c63e-4a08-a4fa-8786204bbf4e	0be83da9b39f1f60588af7848c73b6094daff1901e87d5e213ba26df17c985a3	2026-04-03 22:48:22.446	2026-04-10 22:33:21.028	2026-04-03 22:33:21.029
a5578114-202d-4aa2-93b7-f771e2448706	9f70646e-c63e-4a08-a4fa-8786204bbf4e	7badac9bb2082149241fb4afa5004bf1d8f98b1ba9a78e6fffe8aecb2b7733ba	2026-04-03 23:03:23.418	2026-04-10 22:48:22.463	2026-04-03 22:48:22.465
3f135ae4-a9c2-407d-ac49-9034ad5aff80	9f70646e-c63e-4a08-a4fa-8786204bbf4e	2bc38f8c948550e4cb1e873426fa1fc59e3dc5ec4c4b3a90f8e11f862ffcbbd5	2026-04-03 23:18:23.827	2026-04-10 23:03:23.434	2026-04-03 23:03:23.436
24c35771-00ce-4658-899b-761847e4e5b5	9f70646e-c63e-4a08-a4fa-8786204bbf4e	51efd0154424aabfcf3f9e309ad6a22b608d081d548e64fbecff34fb0827e92f	2026-04-03 23:33:25.371	2026-04-10 23:18:23.847	2026-04-03 23:18:23.849
42c1983c-8014-4c71-b89e-4bf2c6e97dbe	9f70646e-c63e-4a08-a4fa-8786204bbf4e	4fc01947fa00e0c9575d9526a4050f2a9caeb00ed1db9a0e74612d847758157d	2026-04-03 23:48:26.349	2026-04-10 23:33:25.388	2026-04-03 23:33:25.391
b24312e0-1af6-42c4-a8ea-9a062db99d87	9f70646e-c63e-4a08-a4fa-8786204bbf4e	d3f82ca0ed01deb162023425c39abdce2921baa13a5692d67f6c0d82c5de8de2	2026-04-04 00:03:26.689	2026-04-10 23:48:26.365	2026-04-03 23:48:26.366
a21c4e54-b93b-430f-8309-06b91c4cb308	9f70646e-c63e-4a08-a4fa-8786204bbf4e	c6ef9458298bfa1d9707622ea5001ab57f9eb12a33579485a0d8640a33a7fcf4	2026-04-04 00:18:28.305	2026-04-11 00:03:26.706	2026-04-04 00:03:26.708
5fa7b523-488f-4c4f-a6c2-8c00d8062115	9f70646e-c63e-4a08-a4fa-8786204bbf4e	ec3c57bf16f3140ad03466788c2f6915f7070cf3a60e173cc2c8c93822f2466f	2026-04-04 00:33:29.351	2026-04-11 00:18:28.322	2026-04-04 00:18:28.323
9a4c336e-8b87-4c34-a13d-e1b70b4a6018	9f70646e-c63e-4a08-a4fa-8786204bbf4e	608606c18d86a86566504e18507e6e0a751c8d84cd9ca4d17278e5329876a98f	2026-04-04 00:48:29.532	2026-04-11 00:33:29.368	2026-04-04 00:33:29.369
b9aab7ef-5407-40e7-9326-56d95415cf90	9f70646e-c63e-4a08-a4fa-8786204bbf4e	58e3f4b027cc13c8a1114093a2d34bbfb2a64f5e17f825728f8066b1838855d3	2026-04-04 01:03:31.225	2026-04-11 00:48:29.549	2026-04-04 00:48:29.55
d2d5ea07-fc61-411a-82a5-ea310ef7e7a4	9f70646e-c63e-4a08-a4fa-8786204bbf4e	88cc6b7a561ba2a00047e267fe54994802cc1ed6b7d8469cc39f24e0afba03b9	2026-04-04 01:18:32.199	2026-04-11 01:03:31.242	2026-04-04 01:03:31.243
0db22919-d561-4d76-a33b-f5d577d8b188	9f70646e-c63e-4a08-a4fa-8786204bbf4e	2dee4691451be0a2fd1e105a43104c0669ffdfae7c8b8efe592f96bcfcd420bd	2026-04-04 01:33:32.379	2026-04-11 01:18:32.216	2026-04-04 01:18:32.218
8f0b353c-33af-45b9-9c1e-b4d78cb4e680	9f70646e-c63e-4a08-a4fa-8786204bbf4e	dc48239772a416cec780d1ab54d066844c63b68fc660060defa2a3ba38827052	2026-04-04 01:48:34.137	2026-04-11 01:33:32.396	2026-04-04 01:33:32.398
86676425-7ff9-4c02-8b35-6332869eb02d	9f70646e-c63e-4a08-a4fa-8786204bbf4e	1e41d92b92067d913b3bad1c7b2c3337c34008afea6d17af872d16e9d073aa1b	2026-04-04 02:03:35.121	2026-04-11 01:48:34.155	2026-04-04 01:48:34.156
795ba9ad-b803-48f8-9b54-bc2b5c781b1f	9f70646e-c63e-4a08-a4fa-8786204bbf4e	0b0abffb10a59d77cd3884f44c5772d4f01c65bff2256aecba783afbe0900fc7	2026-04-04 02:18:35.249	2026-04-11 02:03:35.144	2026-04-04 02:03:35.146
f220c3df-da3f-481c-b771-da1a5d17eb49	9f70646e-c63e-4a08-a4fa-8786204bbf4e	01d53c5462556965c67f7669f9a30679f50f6d424f334d3d06ade2f304c1d5bd	2026-04-04 02:33:37.135	2026-04-11 02:18:35.267	2026-04-04 02:18:35.268
ce64be2e-2eae-4d34-b746-dda4f6771b96	9f70646e-c63e-4a08-a4fa-8786204bbf4e	857b367ecd557aa88f04005efeaa625e63d8949173d6ae2a9d1633f505aa2e13	2026-04-04 02:48:38.038	2026-04-11 02:33:37.157	2026-04-04 02:33:37.159
3eb2bde4-f635-406c-b93b-12abb2261c74	9f70646e-c63e-4a08-a4fa-8786204bbf4e	92dc48b21b653692188cf4a08eb162e4fff03d9f5fae19445914308b4ec2a63a	2026-04-04 03:03:38.091	2026-04-11 02:48:38.056	2026-04-04 02:48:38.057
9ed3c4c9-868e-4cb8-af9f-fad25276f516	9f70646e-c63e-4a08-a4fa-8786204bbf4e	56e3da039c97877c1023fa531e29edc1307e625b57b1b1182c8500d40d5275b3	2026-04-04 03:18:40.037	2026-04-11 03:03:38.109	2026-04-04 03:03:38.11
543cd491-0afa-4c2c-b169-1b66a7f6de82	9f70646e-c63e-4a08-a4fa-8786204bbf4e	d26eeea62db83184777b161cec01de6720216d67587dbf0bb46bd3457e2eceda	2026-04-04 03:33:40.958	2026-04-11 03:18:40.056	2026-04-04 03:18:40.057
e0d2db9a-5c4f-4026-9059-927d8d7006bd	9f70646e-c63e-4a08-a4fa-8786204bbf4e	d9afef60f530eb67c0494b7c34bcbbad9c3b2e26898c8997329942bb5d6ac1c1	2026-04-04 03:48:40.963	2026-04-11 03:33:40.974	2026-04-04 03:33:40.975
b1d5526e-0a60-4c66-a016-75ec8137ad0f	3961fabe-1345-4426-bd8a-ca0a5eac3aac	687fc21eb535cf6b74a3fb8503d61ee72b5ca74c18109148aa53108de663ca73	2026-04-04 03:56:09.157	2026-04-11 03:55:51.921	2026-04-04 03:55:51.924
31790488-dd85-4f84-a34a-abb573ca64ec	3961fabe-1345-4426-bd8a-ca0a5eac3aac	5f0a330670309a30362ddd0df52d53c9c96570347a6851f5335af3b0b5a65ae6	\N	2026-04-11 03:56:11.8	2026-04-04 03:56:11.801
a301460f-d577-430a-8d88-e274f66a8453	9f70646e-c63e-4a08-a4fa-8786204bbf4e	1ae9b7327333b2d75a539f9dd433e8544c75865c73666ce2aa4e83ac94f68bdc	2026-04-04 04:03:42.695	2026-04-11 03:48:40.987	2026-04-04 03:48:40.988
41593862-a4f6-4ba9-8d0f-9e64d7de6e73	9f70646e-c63e-4a08-a4fa-8786204bbf4e	7d1b171d3de86bc6d097426b89526a353dbfe76e7f9f1680740cb4223fcbb81c	2026-04-04 04:18:42.455	2026-04-11 04:03:42.714	2026-04-04 04:03:42.715
6fe55b85-c2e9-403c-9484-5ed5390fd174	3961fabe-1345-4426-bd8a-ca0a5eac3aac	108bd5df8c418bac906ae76fac582dc647d31d0b2e5c818fbb385489c89e2c85	2026-04-04 04:21:11.174	2026-04-11 04:06:11.501	2026-04-04 04:06:11.502
87ce6fba-f1a8-4655-aa9d-1986dbda8c42	9f70646e-c63e-4a08-a4fa-8786204bbf4e	3738222ad606f5db6d182bf67f48f9a7e153015a6c7b8743ccef2f26322d5d2b	2026-04-04 04:33:44.177	2026-04-11 04:18:42.474	2026-04-04 04:18:42.476
4ae2f02b-990f-492b-ac48-f3a3ad787cf0	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2296f36bb27858b2674d6ea4b56a0438ba523b0aeaa30f7a4bcd96a37ad1cc3f	2026-04-04 06:31:18.511	2026-04-11 04:14:41.243	2026-04-04 04:14:41.244
60ae8369-e0cf-47f9-bf45-29c54f5fbc9c	199cecb0-a797-4677-a949-f23276e5c330	304acec9e762f9a4e3ae6e0d204b1e2acc94485cb76fd2d9399b305dd4917084	2026-04-04 09:22:22.797	2026-04-11 04:05:55.265	2026-04-04 04:05:55.266
6c40e876-5f9c-44a8-9a11-b88c810b754e	3961fabe-1345-4426-bd8a-ca0a5eac3aac	d620b3b7bce44792a876ebfaecc69bd1924c967d7b5e41d6921f6cb01697860b	2026-04-04 04:36:11.752	2026-04-11 04:21:11.192	2026-04-04 04:21:11.194
246d65ea-2c6d-45e5-b16b-efad31f4d50c	9f70646e-c63e-4a08-a4fa-8786204bbf4e	83d4860222f0d6407035f8c03b355c4d190d56d3fcadb119a12b06a89edd8cbe	2026-04-04 04:48:45.646	2026-04-11 04:33:44.197	2026-04-04 04:33:44.198
059fcd11-78b5-4c98-9d6c-849ccce0ebb5	3961fabe-1345-4426-bd8a-ca0a5eac3aac	15109de3d3126d60deb3b5144d1c3dc5948cc4ceebcd4a4a62e5b54312b6c60a	2026-04-04 04:51:11.249	2026-04-11 04:36:11.769	2026-04-04 04:36:11.77
dcadf1cf-7f30-4650-8ae6-d82ce950ff8e	9f70646e-c63e-4a08-a4fa-8786204bbf4e	6f650be95ebce035c07e336d0d5993691a9df885ed557281eb7e9107ef66c6ec	2026-04-04 05:03:45.895	2026-04-11 04:48:45.663	2026-04-04 04:48:45.665
b17a345c-cc32-4880-b8e7-e90a8e11d128	3961fabe-1345-4426-bd8a-ca0a5eac3aac	964c0539cb9da7dda0c688bf0b542d4aea6a1a2364090013f601cb7e2df61f1e	2026-04-04 05:06:11.352	2026-04-11 04:51:11.266	2026-04-04 04:51:11.268
0501363f-84b9-4f8a-bb96-161f162d3964	9f70646e-c63e-4a08-a4fa-8786204bbf4e	eaffd5b6defbaa75e48bb7c5f00e020c79c702e7fca8118e296076eb14df688f	2026-04-04 05:18:47.851	2026-04-11 05:03:45.915	2026-04-04 05:03:45.916
b8b64851-11b4-425a-930b-e043cb3bf2af	3961fabe-1345-4426-bd8a-ca0a5eac3aac	93a1ccec3e3c9c74bcfeccfaad8b1f7dacb37cfdd1718f0dc8d28691a96a8807	2026-04-04 05:21:12.06	2026-04-11 05:06:11.37	2026-04-04 05:06:11.371
c0ad0ded-1abd-40c9-800a-94795e766bae	3961fabe-1345-4426-bd8a-ca0a5eac3aac	f008f3b127a6b92ca0129d0cfa0842764e4d3596d1cbfe046b28902faeaeb437	2026-04-04 05:21:12.192	2026-04-11 05:21:12.079	2026-04-04 05:21:12.08
56567131-ddbf-4baa-981a-46a142f45fa4	9f70646e-c63e-4a08-a4fa-8786204bbf4e	89230bc9802e107db74db591af14bb1de66beb431f00912a47c6e2c1ac0c2716	2026-04-04 05:33:49.822	2026-04-11 05:18:47.871	2026-04-04 05:18:47.872
a66b5811-c8bc-44d5-93f4-b7e0ad4984d8	3961fabe-1345-4426-bd8a-ca0a5eac3aac	6785cd24be0b656afc456c775c1a93e7ad0e890cb44016ff1ceb00766e6f6691	2026-04-04 05:36:12.807	2026-04-11 05:21:12.205	2026-04-04 05:21:12.207
45a8753c-417e-40cc-ac6b-d525bf42c811	9f70646e-c63e-4a08-a4fa-8786204bbf4e	832aa7b012e13e6b4d3eea25162ad9cda6dcfbb9fb981a08165266991be1e7b5	2026-04-04 05:48:51.174	2026-04-11 05:33:49.843	2026-04-04 05:33:49.844
850aec16-1b06-4df0-82ff-094c7caf6be0	3961fabe-1345-4426-bd8a-ca0a5eac3aac	01e2ff1816eb115f53d71885881bebc33a0c60d9f48294c5230c279d6f1633f9	2026-04-04 05:51:12.53	2026-04-11 05:36:12.824	2026-04-04 05:36:12.825
39b32063-3e8c-4384-8df2-2492292df81d	9f70646e-c63e-4a08-a4fa-8786204bbf4e	1b34650a12879c60248a7a9018b6f1d78d165f6d50d663e64b55551bd925eafd	2026-04-04 06:03:52.142	2026-04-11 05:48:51.195	2026-04-04 05:48:51.196
fd3e1ff6-5781-4718-a8a2-6bc178e3f0e3	3961fabe-1345-4426-bd8a-ca0a5eac3aac	74fc96fe290836e1ebdb2c6b8dfb1e1111832b2fdfd79d349801abc9de8289d9	2026-04-04 06:06:12.258	2026-04-11 05:51:12.546	2026-04-04 05:51:12.548
acf66024-263d-4e1d-a546-29520a1534e2	9f70646e-c63e-4a08-a4fa-8786204bbf4e	c26cd07e0e8bff3082df74c67f4acb98e77dd771457f71dc8caff75e3aa7e9f7	2026-04-04 06:18:52.666	2026-04-11 06:03:52.16	2026-04-04 06:03:52.162
d4756a29-1d17-4377-9bf6-ce27e4f04d99	3961fabe-1345-4426-bd8a-ca0a5eac3aac	3fcda43c6fa6a627a8eada910ded15f391b0e4f26e55a0e56138e6205a1539a9	2026-04-04 06:21:12.811	2026-04-11 06:06:12.274	2026-04-04 06:06:12.275
fd52bdf7-d57d-4d99-b054-876f1a0fae98	3961fabe-1345-4426-bd8a-ca0a5eac3aac	8d6adb4341553054b60a8a6e017d325f6ab3944af10f14faaf65db6c6d6cb16b	\N	2026-04-11 06:31:27.363	2026-04-04 06:31:27.365
385726a6-fe88-4576-8b43-8d48f9b0f7bc	9f70646e-c63e-4a08-a4fa-8786204bbf4e	c55b8ebd5f3cdaef3843649be993edeb53f02c115c1be9d00c499fbc695c1320	2026-04-04 06:34:28.874	2026-04-11 06:18:52.688	2026-04-04 06:18:52.69
5241fe11-253f-468d-ab4a-02baf2353bb9	3961fabe-1345-4426-bd8a-ca0a5eac3aac	ef081f2cb01fd5c66c0c71ca6e471883298f462fb69e6acfc6e1f0c703267634	\N	2026-04-11 06:42:09.348	2026-04-04 06:42:09.349
2c7b2f34-0e7d-439a-8854-3124c1cc896e	199cecb0-a797-4677-a949-f23276e5c330	b667b3402d3169629feb90f5465f968a69749074ff3d26a1b5c32491223575c6	2026-04-04 08:07:17.577	2026-04-11 08:06:09.222	2026-04-04 08:06:09.223
83ba112b-6a6b-4796-8b29-cf37e115cac5	9f70646e-c63e-4a08-a4fa-8786204bbf4e	b835a740404816eb7807ff1602a37f606e5ba6696d74c667c18d72e53162d27c	2026-04-04 09:22:05.47	2026-04-11 06:34:28.89	2026-04-04 06:34:28.892
cab6c94a-59fc-45d1-80c0-8ad6eb636ff2	9f70646e-c63e-4a08-a4fa-8786204bbf4e	1c8a089efdd7da1e4bd104cb696845370e1cc127e52c2e2407b39cddc6db944a	\N	2026-04-11 09:22:05.493	2026-04-04 09:22:05.494
42a42c4f-e322-4153-bb7a-898fde6c0fd3	199cecb0-a797-4677-a949-f23276e5c330	1d890a5766c9dd51d5deb613c560fae7dafca36a74c895488910c9128279df37	\N	2026-04-11 09:22:22.816	2026-04-04 09:22:22.818
6081e800-1f56-41d6-b06a-ac8515087b01	e9134380-2da7-4a1e-bd2a-34398f85a6e5	b7e3a3e0f2acc48a9daff8b25e200bd227dae827704aa91879922f9fe18a995d	\N	2026-04-11 09:22:39.393	2026-04-04 09:22:39.395
6a405831-21bd-4665-a795-10b4348e4f98	3961fabe-1345-4426-bd8a-ca0a5eac3aac	0d015ff5aadca167e5902a16633c91aeb0236bff4cfe43d1158c4001428d21b4	2026-04-04 09:23:04.712	2026-04-11 06:21:12.833	2026-04-04 06:21:12.835
988174a8-f4f6-42ae-bcbe-ccfb6420fea7	3961fabe-1345-4426-bd8a-ca0a5eac3aac	ca2354524f806934087c5f86532371ca249356b0ef8a0e8a6e55fdc9a9043c35	\N	2026-04-11 09:23:04.734	2026-04-04 09:23:04.736
\.


--
-- Data for Name: stream_guest_requests; Type: TABLE DATA; Schema: public; Owner: liveapp
--

COPY public.stream_guest_requests (id, stream_id, user_id, status, created_at, updated_at) FROM stdin;
cmnbjuu2n0001lr1ngb4z3slf	f95d9d98-2a21-4211-bda1-11573a7c3af5	e9134380-2da7-4a1e-bd2a-34398f85a6e5	APPROVED	2026-03-29 09:21:23.136	2026-03-29 09:21:26.629
cmni1qe1n0005t01ny9izd4ft	09b0ff8c-d177-437f-9895-622c4bd1b117	3961fabe-1345-4426-bd8a-ca0a5eac3aac	APPROVED	2026-04-02 22:28:25.883	2026-04-02 22:28:29.507
cmnfmk5mj0001qn1n9ybzvbvz	4c787e07-3eb1-48fe-ad71-2a8f2856f1f3	47d9c408-1a3c-46c1-aecf-6f1746615499	APPROVED	2026-04-01 05:48:08.443	2026-04-01 05:48:11.559
cmnfmv2vu0003qn1nx627fbsf	e25a79f0-2a3f-4a6c-8bb6-8da4dcfcac78	47d9c408-1a3c-46c1-aecf-6f1746615499	APPROVED	2026-04-01 05:56:38.106	2026-04-01 05:56:43.443
cmni1yop50007t01n1e1ahedu	cc5dd290-ad46-40a3-bc08-19fee473d6a3	3961fabe-1345-4426-bd8a-ca0a5eac3aac	APPROVED	2026-04-02 22:34:52.938	2026-04-02 22:34:56.181
cmnfmz07i0005qn1no4frakaj	8a3b6e2b-e790-4f38-ad5c-899c02a04b96	47d9c408-1a3c-46c1-aecf-6f1746615499	APPROVED	2026-04-01 05:59:41.262	2026-04-01 05:59:51.664
cmnfn0rrl0007qn1nyptgpqy8	8a3b6e2b-e790-4f38-ad5c-899c02a04b96	47d9c408-1a3c-46c1-aecf-6f1746615499	APPROVED	2026-04-01 06:01:03.634	2026-04-01 06:01:08.222
cmni2scio0009t01n090sruwa	d47d3d9f-ac85-4586-b09b-aba3dc40df91	47d9c408-1a3c-46c1-aecf-6f1746615499	APPROVED	2026-04-02 22:57:56.832	2026-04-02 22:58:00.882
cmnfn6pl10009qn1nj4lb4lah	8a3b6e2b-e790-4f38-ad5c-899c02a04b96	9f70646e-c63e-4a08-a4fa-8786204bbf4e	APPROVED	2026-04-01 06:05:40.741	2026-04-01 06:05:49.737
cmnftsozq000bqn1nxj4v0z6g	ca347a9f-b6d8-498e-a455-5804fd34f781	281ac0c9-d22b-4ece-895a-9d2c86a8f315	APPROVED	2026-04-01 09:10:44.103	2026-04-01 09:10:47.893
cmni8dfrz000bt01nizy043k8	97dd1700-f4f1-4f39-b36e-0c2e59037d29	3961fabe-1345-4426-bd8a-ca0a5eac3aac	APPROVED	2026-04-03 01:34:18.911	2026-04-03 01:34:25.423
cmnftun0r000dqn1nt8iyu913	e7c18482-912b-4e3d-936b-ce153022829e	3961fabe-1345-4426-bd8a-ca0a5eac3aac	APPROVED	2026-04-01 09:12:14.86	2026-04-01 09:12:21.399
cmnfxjr4m000fqn1ni3dyg64l	b1001c15-3e22-4d3f-b80b-08eeb774338c	47d9c408-1a3c-46c1-aecf-6f1746615499	APPROVED	2026-04-01 10:55:45.43	2026-04-01 10:56:01.243
cmngf6uj3000hqn1nt7e9zf5o	67dca92d-3a1a-4799-87ba-a6504d628339	47d9c408-1a3c-46c1-aecf-6f1746615499	APPROVED	2026-04-01 19:09:36.4	2026-04-01 19:09:44.146
cmni9j9xi0001mx1oxc8zrmwu	40a0a34e-b7a6-4086-84e9-32d5f8ad0cc3	3961fabe-1345-4426-bd8a-ca0a5eac3aac	APPROVED	2026-04-03 02:06:50.886	2026-04-03 02:07:07.788
cmnggiuhd000jqn1nsqiyhfg2	80abe71e-5ff4-4f83-9f52-0d650aad154d	47d9c408-1a3c-46c1-aecf-6f1746615499	APPROVED	2026-04-01 19:46:55.826	2026-04-01 19:47:00.139
cmnggs4ci000lqn1nnzabtop2	96c5ce44-1733-46ba-a957-e79cf5c5f9a3	3961fabe-1345-4426-bd8a-ca0a5eac3aac	APPROVED	2026-04-01 19:54:08.514	2026-04-01 19:54:12.204
cmnggsv94000nqn1nzd6mwcyi	96c5ce44-1733-46ba-a957-e79cf5c5f9a3	3961fabe-1345-4426-bd8a-ca0a5eac3aac	APPROVED	2026-04-01 19:54:43.385	2026-04-01 19:54:52.439
cmnghbxbu000pqn1nd6pqpw7x	385f01e7-5ce6-4797-a65f-371c2d99937b	3961fabe-1345-4426-bd8a-ca0a5eac3aac	APPROVED	2026-04-01 20:09:32.538	2026-04-01 20:09:36.638
cmnghc9sn000rqn1nq8lurnof	385f01e7-5ce6-4797-a65f-371c2d99937b	3961fabe-1345-4426-bd8a-ca0a5eac3aac	APPROVED	2026-04-01 20:09:48.696	2026-04-01 20:09:53.031
cmnghe2zr000tqn1nzkv0b71k	81b21678-d5db-4d79-9ced-ee6219312102	3961fabe-1345-4426-bd8a-ca0a5eac3aac	APPROVED	2026-04-01 20:11:13.191	2026-04-01 20:11:17.524
cmngi73wy000vqn1ndovx37np	52b78333-2d5a-46b2-b968-94f906ec3136	3961fabe-1345-4426-bd8a-ca0a5eac3aac	APPROVED	2026-04-01 20:33:47.411	2026-04-01 20:33:50.154
cmngkhozp000xqn1ngp84ml15	ef05d047-00b7-4faa-b9d9-3f19c3aced8d	3961fabe-1345-4426-bd8a-ca0a5eac3aac	APPROVED	2026-04-01 21:38:00.518	2026-04-01 21:38:03.596
cmnglma7x000zqn1ngvchsgv5	8fc0ae7c-4c43-46b0-aac9-44e8469aeb49	3961fabe-1345-4426-bd8a-ca0a5eac3aac	APPROVED	2026-04-01 22:09:34.269	2026-04-01 22:09:41.867
cmnglqo1t0011qn1n71uz6h78	bdffc9c0-0103-4b5a-b3a6-0605f683ca23	c5c904e8-da40-4458-b8bf-5c2cc97348b1	APPROVED	2026-04-01 22:12:58.817	2026-04-01 22:13:02.627
cmnglti630013qn1nqv828k7b	965a2f65-fc61-413e-a675-9197dcd0d373	3961fabe-1345-4426-bd8a-ca0a5eac3aac	APPROVED	2026-04-01 22:15:11.164	2026-04-01 22:15:19.1
cmngm9atn0015qn1n0nm4ehik	66000676-e56a-4c26-a200-4a930987e019	3961fabe-1345-4426-bd8a-ca0a5eac3aac	APPROVED	2026-04-01 22:27:28.139	2026-04-01 22:27:32.92
cmngme4280017qn1n18ile8tr	8932ebc4-876d-4cb4-8fbe-d59e05767546	3961fabe-1345-4426-bd8a-ca0a5eac3aac	APPROVED	2026-04-01 22:31:12.657	2026-04-01 22:31:17.051
cmngmfb1m0019qn1neh6is7kr	8932ebc4-876d-4cb4-8fbe-d59e05767546	47d9c408-1a3c-46c1-aecf-6f1746615499	APPROVED	2026-04-01 22:32:08.363	2026-04-01 22:32:19.452
cmngmii3l001bqn1ntewg31ru	8932ebc4-876d-4cb4-8fbe-d59e05767546	3961fabe-1345-4426-bd8a-ca0a5eac3aac	APPROVED	2026-04-01 22:34:37.473	2026-04-01 22:34:44.07
cmngnnri7001dqn1nl576pqon	f9480f50-6974-4f22-a4fc-fb81800d97ad	3961fabe-1345-4426-bd8a-ca0a5eac3aac	APPROVED	2026-04-01 23:06:42.559	2026-04-01 23:06:43.755
cmngnx1op001fqn1n2703y21o	954b55ba-be54-456f-81eb-31c108c42ae6	3961fabe-1345-4426-bd8a-ca0a5eac3aac	APPROVED	2026-04-01 23:13:55.657	2026-04-01 23:14:21.82
cmngnzrv8001hqn1n5cjs3j7b	954b55ba-be54-456f-81eb-31c108c42ae6	c5c904e8-da40-4458-b8bf-5c2cc97348b1	APPROVED	2026-04-01 23:16:02.901	2026-04-01 23:16:07.154
cmngo3d45001jqn1na454b2jb	954b55ba-be54-456f-81eb-31c108c42ae6	3961fabe-1345-4426-bd8a-ca0a5eac3aac	APPROVED	2026-04-01 23:18:50.406	2026-04-01 23:18:57.365
cmngo5hge001lqn1ndor1gn1g	954b55ba-be54-456f-81eb-31c108c42ae6	3961fabe-1345-4426-bd8a-ca0a5eac3aac	APPROVED	2026-04-01 23:20:29.343	2026-04-01 23:20:35.206
cmngrenxy0001le1odrpyjet8	a1587cc4-753b-4449-ab03-823d0b214d7e	47d9c408-1a3c-46c1-aecf-6f1746615499	APPROVED	2026-04-02 00:51:36.503	2026-04-02 00:51:39.433
cmngtc8y20001ry1n8ul2f2yn	96456357-7470-40d4-bb0d-957c49561d88	9f70646e-c63e-4a08-a4fa-8786204bbf4e	APPROVED	2026-04-02 01:45:42.986	2026-04-02 01:45:46.246
cmnh2yj4b0001oc1nxm5qujr7	67f6598c-24a7-4ec3-b926-6cc10daf0586	9f70646e-c63e-4a08-a4fa-8786204bbf4e	APPROVED	2026-04-02 06:14:59.147	2026-04-02 06:15:03.297
cmnh3015i0003oc1n5gh0435c	67f6598c-24a7-4ec3-b926-6cc10daf0586	9f70646e-c63e-4a08-a4fa-8786204bbf4e	APPROVED	2026-04-02 06:16:09.174	2026-04-02 06:16:14.195
cmnh342kw0005oc1ne3y59ujy	67f6598c-24a7-4ec3-b926-6cc10daf0586	9f70646e-c63e-4a08-a4fa-8786204bbf4e	APPROVED	2026-04-02 06:19:17.648	2026-04-02 06:19:22.423
cmnh34kue0007oc1nkn413jhf	67f6598c-24a7-4ec3-b926-6cc10daf0586	9f70646e-c63e-4a08-a4fa-8786204bbf4e	APPROVED	2026-04-02 06:19:41.318	2026-04-02 06:20:00.952
cmnh380490009oc1ncucice0o	67f6598c-24a7-4ec3-b926-6cc10daf0586	9f70646e-c63e-4a08-a4fa-8786204bbf4e	APPROVED	2026-04-02 06:22:21.082	2026-04-02 06:22:25.8
cmnh3wh7r000boc1nog5j5mg1	acde2759-a974-49ef-845d-3343abfa947b	9f70646e-c63e-4a08-a4fa-8786204bbf4e	APPROVED	2026-04-02 06:41:22.984	2026-04-02 06:41:26.659
cmnh4ktyu000doc1nl8zkym3p	acde2759-a974-49ef-845d-3343abfa947b	7e2a5e6d-7021-482a-abeb-883f8ebf016b	APPROVED	2026-04-02 07:00:19.254	2026-04-02 07:00:22.419
cmnh4lgli000foc1nrd389p57	acde2759-a974-49ef-845d-3343abfa947b	9f70646e-c63e-4a08-a4fa-8786204bbf4e	APPROVED	2026-04-02 07:00:48.583	2026-04-02 07:01:00.607
cmnh4lj7g000hoc1ne4odefza	acde2759-a974-49ef-845d-3343abfa947b	e9134380-2da7-4a1e-bd2a-34398f85a6e5	APPROVED	2026-04-02 07:00:51.964	2026-04-02 07:01:02.67
cmnh4na6o000joc1nq4k6zgw5	acde2759-a974-49ef-845d-3343abfa947b	9f70646e-c63e-4a08-a4fa-8786204bbf4e	APPROVED	2026-04-02 07:02:13.584	2026-04-02 07:02:17.764
cmnh4np5c000loc1nrefxj3df	acde2759-a974-49ef-845d-3343abfa947b	9f70646e-c63e-4a08-a4fa-8786204bbf4e	APPROVED	2026-04-02 07:02:32.977	2026-04-02 07:02:41.879
cmnh6shh10001qu1nprd8r0qo	c0ee23c7-f6ae-46f8-9a98-7182e883a000	7e2a5e6d-7021-482a-abeb-883f8ebf016b	APPROVED	2026-04-02 08:02:15.541	2026-04-02 08:02:18.272
cmnh6sss80003qu1nmovaxmaf	c0ee23c7-f6ae-46f8-9a98-7182e883a000	9f70646e-c63e-4a08-a4fa-8786204bbf4e	APPROVED	2026-04-02 08:02:30.201	2026-04-02 08:02:32.522
cmnh6t9660005qu1ncqqb5zbh	c0ee23c7-f6ae-46f8-9a98-7182e883a000	e9134380-2da7-4a1e-bd2a-34398f85a6e5	APPROVED	2026-04-02 08:02:51.438	2026-04-02 08:02:53.769
cmnh6tvka0007qu1nr529sv91	c0ee23c7-f6ae-46f8-9a98-7182e883a000	e9134380-2da7-4a1e-bd2a-34398f85a6e5	APPROVED	2026-04-02 08:03:20.459	2026-04-02 08:03:23.293
cmnh9rayc0009qu1ne4pom6v9	fa770eba-c6d5-4379-a889-02d245470438	e9134380-2da7-4a1e-bd2a-34398f85a6e5	APPROVED	2026-04-02 09:25:19.284	2026-04-02 09:25:27.006
cmnhczwsq000bqu1nay8l2yia	fa770eba-c6d5-4379-a889-02d245470438	e9134380-2da7-4a1e-bd2a-34398f85a6e5	APPROVED	2026-04-02 10:55:59.691	2026-04-02 10:56:04.967
cmnhd6cea000dqu1nu070o0tr	fa770eba-c6d5-4379-a889-02d245470438	3961fabe-1345-4426-bd8a-ca0a5eac3aac	APPROVED	2026-04-02 11:00:59.843	2026-04-02 11:01:07.172
cmnhdcrhu000fqu1n72efgnw0	fa770eba-c6d5-4379-a889-02d245470438	3961fabe-1345-4426-bd8a-ca0a5eac3aac	APPROVED	2026-04-02 11:05:59.347	2026-04-02 11:06:06.215
cmnhxadxn000hqu1nel8hpert	fa770eba-c6d5-4379-a889-02d245470438	c5c904e8-da40-4458-b8bf-5c2cc97348b1	APPROVED	2026-04-02 20:24:00.779	2026-04-02 20:25:11.181
cmnhxh7ir000jqu1n8g3leq7q	0419c286-af86-4be5-91cf-4d57e8af21ed	3961fabe-1345-4426-bd8a-ca0a5eac3aac	APPROVED	2026-04-02 20:29:19.06	2026-04-02 20:29:23.151
cmnhxjaae000lqu1n6rbznltv	0419c286-af86-4be5-91cf-4d57e8af21ed	3961fabe-1345-4426-bd8a-ca0a5eac3aac	APPROVED	2026-04-02 20:30:55.959	2026-04-02 20:31:01.986
cmnhz4z6a0001rv1ntcm1hphb	92851de4-b5ed-42de-9afb-6fb22306d1e1	3961fabe-1345-4426-bd8a-ca0a5eac3aac	APPROVED	2026-04-02 21:15:47.603	2026-04-02 21:15:51.993
cmnhz65uw0003rv1nwwbwthfb	92851de4-b5ed-42de-9afb-6fb22306d1e1	3961fabe-1345-4426-bd8a-ca0a5eac3aac	APPROVED	2026-04-02 21:16:42.921	2026-04-02 21:16:55.059
cmnhzbwi10005rv1nn8oprvof	92851de4-b5ed-42de-9afb-6fb22306d1e1	3961fabe-1345-4426-bd8a-ca0a5eac3aac	APPROVED	2026-04-02 21:21:10.729	2026-04-02 21:21:15.668
cmnhzyrg50007rv1ngbhj3uif	a35d4aab-2842-4d65-a959-d6084c335a15	3961fabe-1345-4426-bd8a-ca0a5eac3aac	APPROVED	2026-04-02 21:38:57.269	2026-04-02 21:39:01.071
cmni01gq30009rv1ndr2qnyei	f50c16f0-d9a9-42a9-84c9-06344237287c	3961fabe-1345-4426-bd8a-ca0a5eac3aac	APPROVED	2026-04-02 21:41:03.34	2026-04-02 21:41:08.909
cmni0q2oa0001t01nlqgqfgyt	d009276d-12d6-4cc2-9b13-66057b20f812	3961fabe-1345-4426-bd8a-ca0a5eac3aac	APPROVED	2026-04-02 22:00:11.53	2026-04-02 22:00:14.758
cmni0r3s30003t01npl0r3ci7	77a6dee4-8367-44ed-8c3c-ce9e3a9f0d44	3961fabe-1345-4426-bd8a-ca0a5eac3aac	APPROVED	2026-04-02 22:00:59.619	2026-04-02 22:01:05.232
cmni9k0q40005mx1ozqy13ham	ced55ebf-ceca-4ba3-9455-717e57d6ee14	3961fabe-1345-4426-bd8a-ca0a5eac3aac	DENIED	2026-04-03 02:07:25.612	2026-04-03 02:07:27.899
cmni9jr5n0003mx1oveocr97z	ced55ebf-ceca-4ba3-9455-717e57d6ee14	3961fabe-1345-4426-bd8a-ca0a5eac3aac	APPROVED	2026-04-03 02:07:13.211	2026-04-03 02:07:31.39
cmni9l2ms0007mx1o17g4h5zq	d80774e1-d6b5-4da7-841b-d3ff095b7ba8	47d9c408-1a3c-46c1-aecf-6f1746615499	APPROVED	2026-04-03 02:08:14.74	2026-04-03 02:08:28.799
cmnib8sj70009mx1oq3o89xf7	6e4971ff-7e58-4c78-be5b-f7fd7b3d7373	9f70646e-c63e-4a08-a4fa-8786204bbf4e	APPROVED	2026-04-03 02:54:41.011	2026-04-03 02:54:55.929
\.


--
-- Data for Name: stream_participants; Type: TABLE DATA; Schema: public; Owner: liveapp
--

COPY public.stream_participants (id, stream_id, user_id, role, joined_at, left_at, created_at, updated_at, "lastPingAt") FROM stdin;
752c5509-ba0f-4eec-812b-8e03334af368	c14d5337-d2f5-437b-8027-1b16bc4c05e4	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-03-29 09:09:32.432	2026-03-29 09:09:32.813	2026-03-29 09:09:32.432	2026-03-29 09:09:32.814	2026-03-29 09:09:32.432
add15851-18ba-4a64-9695-6b059cece4ff	92603abb-c236-4f30-ba9a-4cea552553b3	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-03-29 15:59:13.459	2026-03-29 15:59:13.898	2026-03-29 15:59:13.459	2026-03-29 15:59:13.9	2026-03-29 15:59:13.459
8f65176d-4d6c-482a-b104-9e907a031579	b710b560-aa2d-4331-abdf-7f0a72366c72	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-03-29 16:19:37.791	2026-03-29 16:19:38.588	2026-03-29 16:19:37.791	2026-03-29 16:19:38.59	2026-03-29 16:19:37.791
9b8673d8-4027-47a6-9cad-899447dd6bbe	92603abb-c236-4f30-ba9a-4cea552553b3	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-03-29 15:59:13.943	2026-03-29 16:07:09.246	2026-03-29 15:59:13.943	2026-03-29 16:07:09.262	2026-03-29 16:06:59.435
2921226b-7237-41bd-8c4e-a1598265def6	c14d5337-d2f5-437b-8027-1b16bc4c05e4	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-03-29 09:09:32.899	2026-03-29 09:11:36.775	2026-03-29 09:09:32.899	2026-03-29 09:11:36.788	2026-03-29 09:10:47.868
2dcea6fa-9c72-4c49-b677-edb9891dd050	e62c5617-a1b9-4a41-9db3-8bd1cb2fc4b5	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-03-29 09:15:03.979	2026-03-29 09:15:04.27	2026-03-29 09:15:03.979	2026-03-29 09:15:04.272	2026-03-29 09:15:03.979
a0805fd8-b151-4970-bab3-6f9dfd66b089	26d45485-4e0e-4f87-926d-ed6a71c94b94	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-03-29 16:07:18.86	2026-03-29 16:07:19.663	2026-03-29 16:07:18.86	2026-03-29 16:07:19.665	2026-03-29 16:07:19.654
287e3ac1-b2c2-4558-a0b8-16001df78e11	e62c5617-a1b9-4a41-9db3-8bd1cb2fc4b5	3961fabe-1345-4426-bd8a-ca0a5eac3aac	VIEWER	2026-03-29 09:15:07.395	2026-03-29 09:15:09.586	2026-03-29 09:15:07.395	2026-03-29 09:15:09.588	2026-03-29 09:15:07.395
676f3c1a-e070-4d35-adc2-f5dc8dbf5c52	22cbb6f7-6961-4114-84f1-4e34ab302cf3	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-03-29 17:36:23.288	2026-03-29 17:36:23.755	2026-03-29 17:36:23.288	2026-03-29 17:36:23.756	2026-03-29 17:36:23.288
4f53cc40-a8dc-4c30-82a5-567f1411dfaf	43fa6ef4-1c44-4c19-87b7-1273cb2e58e4	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-03-29 17:39:08.745	2026-03-29 17:39:09.854	2026-03-29 17:39:08.745	2026-03-29 17:39:09.855	2026-03-29 17:39:08.745
7dd10711-2ecc-42ca-9fdc-cfd0fc1d2234	f95d9d98-2a21-4211-bda1-11573a7c3af5	9f70646e-c63e-4a08-a4fa-8786204bbf4e	VIEWER	2026-03-29 09:20:03.146	2026-03-29 09:24:42.769	2026-03-29 09:20:03.146	2026-03-29 09:24:42.78	2026-03-29 09:24:33.352
649949f0-e29d-4de3-b30e-f00143ea8d93	f95d9d98-2a21-4211-bda1-11573a7c3af5	e9134380-2da7-4a1e-bd2a-34398f85a6e5	GUEST	2026-03-29 09:20:33.289	2026-03-29 09:24:42.769	2026-03-29 09:20:33.289	2026-03-29 09:24:42.78	2026-03-29 09:24:33.443
62af67f9-bbb5-4bba-b49b-eaec70f01954	f95d9d98-2a21-4211-bda1-11573a7c3af5	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-03-29 09:18:44.998	2026-03-29 09:24:42.769	2026-03-29 09:18:44.998	2026-03-29 09:24:42.78	2026-03-29 09:24:39.252
bf7ce86b-ff58-426f-8b27-edca8b6e081d	43fa6ef4-1c44-4c19-87b7-1273cb2e58e4	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-03-29 17:39:09.881	2026-03-29 17:45:12.737	2026-03-29 17:39:09.881	2026-03-29 17:45:12.75	2026-03-29 17:44:24.828
2bc56882-0c60-4435-a339-fbe32ef54d2e	c3d7818a-339f-4272-b8ed-6d0199a9ec94	e9134380-2da7-4a1e-bd2a-34398f85a6e5	HOST	2026-03-29 09:26:37.659	2026-03-29 09:26:38.106	2026-03-29 09:26:37.659	2026-03-29 09:26:38.108	2026-03-29 09:26:37.659
c81436f1-0da7-41c3-8a51-56ebe0a8d7e5	d9628570-75b1-4b39-a25d-b7d2336130ef	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-03-29 17:44:51.957	2026-03-29 17:45:26.632	2026-03-29 17:44:51.957	2026-03-29 17:45:26.648	2026-03-29 17:45:25.288
ef39f504-90bc-42e4-87c5-2b14a3a59f51	c3d7818a-339f-4272-b8ed-6d0199a9ec94	3961fabe-1345-4426-bd8a-ca0a5eac3aac	VIEWER	2026-03-29 09:26:56.227	2026-03-29 09:27:01.233	2026-03-29 09:26:56.227	2026-03-29 09:27:01.236	2026-03-29 09:26:56.227
13809174-d904-42ee-a91a-34483ece1299	df5b5795-588b-449a-bc79-4e4930273c41	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-03-29 15:31:24.036	2026-03-29 15:47:40.523	2026-03-29 15:31:24.036	2026-03-29 15:47:40.533	2026-03-29 15:47:40.064
16b51a5a-2caf-40dc-ad39-d9b896ceeb28	569e6a4e-20b2-4738-a3bc-943b2b64b592	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-03-29 15:07:50.369	2026-03-29 15:07:51.051	2026-03-29 15:07:50.369	2026-03-29 15:07:51.053	2026-03-29 15:07:50.369
87220223-b4c3-439c-87a2-e56ae707d84f	569e6a4e-20b2-4738-a3bc-943b2b64b592	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-03-29 15:07:51.15	2026-03-29 15:07:58.978	2026-03-29 15:07:51.15	2026-03-29 15:07:58.99	2026-03-29 15:07:51.15
da0e1aa0-8da9-4cbf-8077-d7e6a4b82e87	b709f1a0-1033-4489-89e2-95f950f80df4	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-03-29 15:28:58.484	2026-03-29 15:28:58.997	2026-03-29 15:28:58.484	2026-03-29 15:28:58.999	2026-03-29 15:28:58.484
3c60e06f-6e14-4bab-840b-d41dc578113b	280ffffd-4a33-45f0-a894-53c5338a17a5	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-03-29 15:47:46.698	2026-03-29 15:47:47.255	2026-03-29 15:47:46.698	2026-03-29 15:47:47.256	2026-03-29 15:47:47.248
75f8c86e-0413-4ffe-a3cf-a43e5570f13b	a7b5d4f1-ec2b-42ec-abb9-33d67ee5ac13	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-03-29 17:45:31.701	2026-03-29 17:45:32.261	2026-03-29 17:45:31.701	2026-03-29 17:45:32.263	2026-03-29 17:45:31.701
9cd028d9-f119-4dc1-9251-8a483208db1e	e62c5617-a1b9-4a41-9db3-8bd1cb2fc4b5	3961fabe-1345-4426-bd8a-ca0a5eac3aac	VIEWER	2026-03-29 09:15:11.136	2026-03-29 09:17:55.033	2026-03-29 09:15:11.136	2026-03-29 09:17:55.035	2026-03-29 09:17:41.198
943083f5-7522-4977-89c7-30aea29f7259	f15ddde3-9e7d-465b-b066-68cfd265e936	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-03-29 15:50:26.284	2026-03-29 15:56:10.66	2026-03-29 15:50:26.284	2026-03-29 15:56:10.677	2026-03-29 15:55:56.604
99450b3f-d1a3-4c5e-9582-0e970db0a7d4	280ffffd-4a33-45f0-a894-53c5338a17a5	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-03-29 15:47:47.342	2026-03-29 15:48:18.438	2026-03-29 15:47:47.342	2026-03-29 15:48:18.45	2026-03-29 15:48:17.277
ca08ba03-ea46-4488-936a-f5b676abed6b	c7b495b1-4313-4e89-96f8-e97de8f53a20	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-03-29 15:48:41.081	2026-03-29 15:48:41.515	2026-03-29 15:48:41.081	2026-03-29 15:48:41.516	2026-03-29 15:48:41.081
0fb6d4bd-52b5-459f-9ca1-1503640ac4fa	e62c5617-a1b9-4a41-9db3-8bd1cb2fc4b5	3961fabe-1345-4426-bd8a-ca0a5eac3aac	VIEWER	2026-03-29 09:18:13.674	2026-03-29 09:18:31.096	2026-03-29 09:18:13.674	2026-03-29 09:18:31.098	2026-03-29 09:18:28.647
48dece37-96b0-4352-88a0-7792082ee4ff	f95d9d98-2a21-4211-bda1-11573a7c3af5	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-03-29 09:18:44.659	2026-03-29 09:18:44.964	2026-03-29 09:18:44.659	2026-03-29 09:18:44.966	2026-03-29 09:18:44.659
d1e2391f-6187-4a74-be43-76036d470949	1211e826-42f9-43a3-9f34-4b5955416e35	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-03-29 15:56:20.343	2026-03-29 15:56:21.182	2026-03-29 15:56:20.343	2026-03-29 15:56:21.183	2026-03-29 15:56:20.343
10fd819a-a1e5-4f17-bc9a-b3bdde13194f	08ca06b0-9449-4291-9a3c-172dae6e0656	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-03-29 21:57:53.377	2026-03-29 21:57:58.31	2026-03-29 21:57:53.377	2026-03-29 21:57:58.323	2026-03-29 21:57:53.377
a61abcf6-5b70-4596-9266-b8f20e73060e	b709f1a0-1033-4489-89e2-95f950f80df4	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-03-29 15:28:59.082	2026-03-29 15:31:16.613	2026-03-29 15:28:59.082	2026-03-29 15:31:16.623	2026-03-29 15:31:14.138
40f30979-6ee8-4f6b-a197-5ba7475d4bef	e62c5617-a1b9-4a41-9db3-8bd1cb2fc4b5	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-03-29 09:15:04.357	2026-03-29 09:19:17.568	2026-03-29 09:15:04.357	2026-03-29 09:19:17.58	2026-03-29 09:19:04.525
0e997c68-be44-44fa-979e-6d61604c4d0f	c7b495b1-4313-4e89-96f8-e97de8f53a20	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-03-29 15:48:41.55	2026-03-29 15:50:15.367	2026-03-29 15:48:41.55	2026-03-29 15:50:15.378	2026-03-29 15:50:11.612
4231b07a-7321-4456-91a1-1ebab9f1a540	f95d9d98-2a21-4211-bda1-11573a7c3af5	47d9c408-1a3c-46c1-aecf-6f1746615499	VIEWER	2026-03-29 09:19:20.133	2026-03-29 09:19:31.75	2026-03-29 09:19:20.133	2026-03-29 09:19:31.752	2026-03-29 09:19:20.133
e140cf6c-74fa-4ccb-bca3-1b6c2eb087ee	df5b5795-588b-449a-bc79-4e4930273c41	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-03-29 15:31:23.611	2026-03-29 15:31:24.021	2026-03-29 15:31:23.611	2026-03-29 15:31:24.022	2026-03-29 15:31:23.611
2c67bfd9-f549-4a31-bf1a-e7d46c153ece	f95d9d98-2a21-4211-bda1-11573a7c3af5	47d9c408-1a3c-46c1-aecf-6f1746615499	VIEWER	2026-03-29 09:19:31.785	2026-03-29 09:19:34.953	2026-03-29 09:19:31.785	2026-03-29 09:19:34.955	2026-03-29 09:19:31.801
17520b2c-a5dd-42a2-90d1-a70a06a030a8	f15ddde3-9e7d-465b-b066-68cfd265e936	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-03-29 15:50:25.856	2026-03-29 15:50:26.25	2026-03-29 15:50:25.856	2026-03-29 15:50:26.252	2026-03-29 15:50:25.856
4828bde6-b47f-4ab9-a667-cf779703e426	a15f2ff7-b78c-4ec7-a1bc-2959d4c5fb2c	9f70646e-c63e-4a08-a4fa-8786204bbf4e	VIEWER	2026-03-29 16:49:31.284	2026-03-29 16:49:32.624	2026-03-29 16:49:31.284	2026-03-29 16:49:32.626	2026-03-29 16:49:31.284
ecf8b60e-fbfd-4d25-a9b9-d12a914c2532	a15f2ff7-b78c-4ec7-a1bc-2959d4c5fb2c	9f70646e-c63e-4a08-a4fa-8786204bbf4e	VIEWER	2026-03-29 16:49:34.2	2026-03-29 16:49:38.403	2026-03-29 16:49:34.2	2026-03-29 16:49:38.405	2026-03-29 16:49:34.2
830d49a1-bba5-4d66-bd8b-93780ab32037	b710b560-aa2d-4331-abdf-7f0a72366c72	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-03-29 16:19:38.67	2026-03-29 16:23:34.629	2026-03-29 16:19:38.67	2026-03-29 16:23:34.642	2026-03-29 16:23:23.826
6f0dd208-1e85-4adf-9696-386203b0d733	a15f2ff7-b78c-4ec7-a1bc-2959d4c5fb2c	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-03-29 16:23:43.976	2026-03-29 16:23:44.429	2026-03-29 16:23:43.976	2026-03-29 16:23:44.431	2026-03-29 16:23:43.976
ba1e97a8-1499-4cb9-8adc-038c7abf8d31	1211e826-42f9-43a3-9f34-4b5955416e35	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-03-29 15:56:21.266	2026-03-29 15:58:48.217	2026-03-29 15:56:21.266	2026-03-29 15:58:48.229	2026-03-29 15:58:36.329
2ef2c959-5dd0-4592-ba29-4928a2f419c5	a15f2ff7-b78c-4ec7-a1bc-2959d4c5fb2c	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-03-29 16:23:44.47	2026-03-29 16:49:45.973	2026-03-29 16:23:44.47	2026-03-29 16:49:45.986	2026-03-29 16:49:31.001
72bd97cf-4823-4561-ab86-5c10d97fc1f8	6a446cf8-0c9e-4851-a05c-1f86213ecdaa	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-03-29 16:50:34.202	2026-03-29 16:50:34.704	2026-03-29 16:50:34.202	2026-03-29 16:50:34.705	2026-03-29 16:50:34.202
2542c548-9a11-4ec5-993f-f1248c79f510	26d45485-4e0e-4f87-926d-ed6a71c94b94	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-03-29 16:07:19.702	2026-03-29 16:19:31.913	2026-03-29 16:07:19.702	2026-03-29 16:19:31.93	2026-03-29 16:19:20.423
6f329775-8b58-40ac-80be-26b02499f5ec	22cbb6f7-6961-4114-84f1-4e34ab302cf3	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-03-29 17:36:23.837	2026-03-29 17:38:49.077	2026-03-29 17:36:23.837	2026-03-29 17:38:49.079	2026-03-29 17:38:38.904
8a793565-930e-4e76-9f1a-4c3afd118405	a7b5d4f1-ec2b-42ec-abb9-33d67ee5ac13	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-03-29 17:45:32.318	2026-03-29 17:48:02.788	2026-03-29 17:45:32.318	2026-03-29 17:48:02.801	2026-03-29 17:47:17.25
5e5075f8-cadd-47a0-9a72-478e5c4f4412	22cbb6f7-6961-4114-84f1-4e34ab302cf3	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-03-29 17:38:49.103	2026-03-29 17:38:54.995	2026-03-29 17:38:49.103	2026-03-29 17:38:55.007	2026-03-29 17:38:53.922
7e885f0a-cd85-4471-a7cf-800f3b501779	6a446cf8-0c9e-4851-a05c-1f86213ecdaa	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-03-29 16:50:34.736	2026-03-29 17:35:39.267	2026-03-29 16:50:34.736	2026-03-29 17:35:39.279	2026-03-29 17:35:37.59
e1a7a9f6-ff9e-4708-bceb-a7102b11a853	d9628570-75b1-4b39-a25d-b7d2336130ef	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-03-29 17:44:49.915	2026-03-29 17:44:51.862	2026-03-29 17:44:49.915	2026-03-29 17:44:51.864	2026-03-29 17:44:49.915
d55ae2fe-8058-4ab6-a767-e567b517a435	13dcf31d-77f4-4c3d-b7bc-f8a24b946f96	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-03-29 21:54:36.692	2026-03-29 21:54:37.693	2026-03-29 21:54:36.692	2026-03-29 21:54:37.695	2026-03-29 21:54:36.692
25f0a3d6-9025-4943-9359-bddb7e9dda83	13dcf31d-77f4-4c3d-b7bc-f8a24b946f96	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-03-29 21:54:37.81	2026-03-29 21:54:41.362	2026-03-29 21:54:37.81	2026-03-29 21:54:41.374	2026-03-29 21:54:37.81
046b2d35-c514-4d8b-b56c-1d9baa7276e7	08ca06b0-9449-4291-9a3c-172dae6e0656	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-03-29 21:57:52.455	2026-03-29 21:57:53.317	2026-03-29 21:57:52.455	2026-03-29 21:57:53.319	2026-03-29 21:57:52.455
973bc4da-b0a3-4279-901e-920b6639dde2	165a9ca3-9b5d-4a8b-93ce-f17d5a9f490b	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-03-29 22:01:19.947	2026-03-29 22:01:20.554	2026-03-29 22:01:19.947	2026-03-29 22:01:20.556	2026-03-29 22:01:19.947
7d82e068-c734-4ed9-bf07-3fff685702fc	165a9ca3-9b5d-4a8b-93ce-f17d5a9f490b	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-03-29 22:01:20.586	2026-03-29 22:11:55.534	2026-03-29 22:01:20.586	2026-03-29 22:11:55.546	2026-03-29 22:11:06.095
a5f08eb5-5d27-4422-b8d7-3ff2cb571171	10e2c843-05de-45cd-86dd-0ea21cda84c4	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-03-29 22:13:10.48	2026-03-29 22:13:11.354	2026-03-29 22:13:10.48	2026-03-29 22:13:11.356	2026-03-29 22:13:10.48
1e9af69d-f68f-4718-805f-7f160dc26799	10e2c843-05de-45cd-86dd-0ea21cda84c4	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-03-29 22:13:11.43	2026-03-29 22:14:41.551	2026-03-29 22:13:11.43	2026-03-29 22:14:41.567	2026-03-29 22:14:41.401
ebb1acce-c088-4a9e-9594-7686a8cf78ec	b176fd7d-b6d0-4a60-8157-f50c5e9a23ea	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-03-29 22:14:51.992	2026-03-29 22:14:52.58	2026-03-29 22:14:51.992	2026-03-29 22:14:52.582	2026-03-29 22:14:51.992
7eb0892c-ebce-4852-aab0-204ce96fba92	b176fd7d-b6d0-4a60-8157-f50c5e9a23ea	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-03-29 22:14:52.616	2026-03-29 22:21:42.078	2026-03-29 22:14:52.616	2026-03-29 22:21:42.09	2026-03-29 22:20:52.904
1e77ebf9-f6f9-431e-8d0b-3fbaa756988b	354a4e63-9feb-49bb-ab6d-12d281854c85	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-03-29 22:28:20.949	2026-03-29 22:28:21.489	2026-03-29 22:28:20.949	2026-03-29 22:28:21.491	2026-03-29 22:28:20.949
a5797e16-4726-472e-bd4c-a7b44872f66c	354a4e63-9feb-49bb-ab6d-12d281854c85	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-03-29 22:28:21.609	2026-03-29 22:38:52.342	2026-03-29 22:28:21.609	2026-03-29 22:38:52.355	2026-03-29 22:38:06.731
04e645ce-e8ba-4cb9-9266-42f7cdd4b1b5	436bff59-7f3d-4179-9e25-6c4efbcbacb9	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-03-29 22:41:13.071	2026-03-29 22:41:13.985	2026-03-29 22:41:13.071	2026-03-29 22:41:13.987	2026-03-29 22:41:13.071
628d37b8-b5b6-4ef3-ab12-510d6da902b2	70f5a64f-078a-478a-9a44-68acce85461b	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-03-29 22:55:04.554	2026-03-29 22:55:05.198	2026-03-29 22:55:04.554	2026-03-29 22:55:05.199	2026-03-29 22:55:04.554
29196c9d-3561-4318-9e2f-a9b249a3d1d4	9db1ac16-7231-4c90-8454-69660c40f761	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-03-29 23:10:24.518	2026-03-29 23:10:25.234	2026-03-29 23:10:24.518	2026-03-29 23:10:25.235	2026-03-29 23:10:24.518
ec233c2c-169f-4369-8cec-1b2e63b92228	32d6e607-c997-45ec-9cb2-7dfba5f1e5b6	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-03-30 00:04:32.598	2026-03-30 00:04:33.24	2026-03-30 00:04:32.598	2026-03-30 00:04:33.241	2026-03-30 00:04:32.598
840dfd73-abbe-4ad7-ae59-691264b5ac08	445be4fe-583c-4e3f-b545-3be0ca1f5e2d	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-03-30 00:06:15.09	2026-03-30 00:06:15.646	2026-03-30 00:06:15.09	2026-03-30 00:06:15.648	2026-03-30 00:06:15.09
09323295-3605-449f-985b-8d37118c6452	86728898-a4e7-4ad7-a7c1-f04627cac589	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-03-29 23:11:19.39	2026-03-29 23:11:45.68	2026-03-29 23:11:19.39	2026-03-29 23:11:45.695	2026-03-29 23:11:43.954
1befa62b-6acf-4e8c-94ee-ea3bdab23aff	382c9037-0ef1-4184-9f67-1719c1e5ed27	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-03-30 00:11:49.154	2026-03-30 00:11:49.722	2026-03-30 00:11:49.154	2026-03-30 00:11:49.723	2026-03-30 00:11:49.154
8248cd2d-7c6b-4427-9f46-06c27e0e389e	d55502ca-ce10-4099-b79a-54180cf83a8e	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-01 03:55:19.077	2026-04-01 03:55:19.811	2026-04-01 03:55:19.077	2026-04-01 03:55:19.812	2026-04-01 03:55:19.077
3780af1b-95b8-47f4-8c37-4b96c69ae986	52b78333-2d5a-46b2-b968-94f906ec3136	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-04-01 20:33:29.1	2026-04-01 20:33:29.665	2026-04-01 20:33:29.1	2026-04-01 20:33:29.666	2026-04-01 20:33:29.1
445f5ca6-3b3a-4866-ba71-342d42f0c097	f991d30e-d26c-4e52-80be-587c209787a2	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-03-30 00:13:51.305	2026-03-30 00:14:14.229	2026-03-30 00:13:51.305	2026-03-30 00:14:14.241	2026-03-30 00:14:06.192
2a1a46b6-c1f3-40d6-ac3b-10dcaabced00	287240b3-4aca-4b24-85c0-0ba73fce38e8	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-01 03:59:12.938	2026-04-01 03:59:13.584	2026-04-01 03:59:12.938	2026-04-01 03:59:13.585	2026-04-01 03:59:12.938
9b5e6250-0ac7-48f1-8fd0-f67222ef94cc	287240b3-4aca-4b24-85c0-0ba73fce38e8	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-01 03:59:13.638	2026-04-01 03:59:17.196	2026-04-01 03:59:13.638	2026-04-01 03:59:17.203	2026-04-01 03:59:13.638
3c8e2191-65ad-4feb-b453-4982f987adcb	86125c98-2c14-4803-a7a5-0eb988a90635	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-03-30 00:57:21.25	2026-03-30 00:57:41.741	2026-03-30 00:57:21.25	2026-03-30 00:57:41.753	2026-03-30 00:57:36.142
fc795730-5861-4531-8f37-197653f5694e	39cd9fde-9e23-4e3c-949d-550b33ee4f90	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-03-30 00:58:13.384	2026-03-30 00:58:21.42	2026-03-30 00:58:13.384	2026-03-30 00:58:21.422	2026-03-30 00:58:13.384
2b4c699e-ff63-4f08-b4bc-3ba48ae71025	98cbd644-54d2-4f7d-999f-76cbd8682a66	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-01 04:02:03.492	2026-04-01 04:02:07.066	2026-04-01 04:02:03.492	2026-04-01 04:02:07.074	2026-04-01 04:02:03.492
853496e1-ee5f-45ea-a904-1f744120e88c	73103c83-901a-4e0a-b58c-329d8523ff3a	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-03-31 01:50:30.731	2026-03-31 01:50:33.605	2026-03-31 01:50:30.731	2026-03-31 01:50:33.612	2026-03-31 01:50:30.775
e6061f97-c569-41db-a701-a2663736d10a	436bff59-7f3d-4179-9e25-6c4efbcbacb9	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-03-29 22:41:14.081	2026-03-29 22:45:19.834	2026-03-29 22:41:14.081	2026-03-29 22:45:19.847	2026-03-29 22:45:14.015
a75c039a-83ad-4c93-9bc5-120977148ad5	10544059-6626-459a-b988-110e48f5fd85	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-03-29 23:12:02.601	2026-03-29 23:14:35.375	2026-03-29 23:12:02.601	2026-03-29 23:14:35.386	2026-03-29 23:14:32.589
4372ff75-cf00-4569-86c6-57a6894e4bf0	2bd17abc-ad0a-47e5-8d60-f309468f6466	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-03-29 22:45:30.398	2026-03-29 22:45:30.926	2026-03-29 22:45:30.398	2026-03-29 22:45:30.928	2026-03-29 22:45:30.398
0d86f4b6-697e-4f88-a88e-f2b9b14e424c	9c7d7da2-6440-4236-b6ad-3730fcd8b403	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-03-30 01:11:56.073	2026-03-30 01:11:56.642	2026-03-30 01:11:56.073	2026-03-30 01:11:56.644	2026-03-30 01:11:56.646
61853e5e-29cd-4cea-ad87-be5f48c2149d	31227a63-d77c-4ff0-bb2c-33c95cca836a	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-03-30 01:27:19.025	2026-03-30 01:27:19.686	2026-03-30 01:27:19.025	2026-03-30 01:27:19.688	2026-03-30 01:27:19.025
38598d16-9597-41f1-81f0-967884039d05	0302388d-14c6-43be-9880-5229aa377602	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-01 04:53:40.348	2026-04-01 04:53:40.871	2026-04-01 04:53:40.348	2026-04-01 04:53:40.872	2026-04-01 04:53:40.348
4c45baa7-dc3f-43ec-ba09-80c65e503947	bf6ab63d-445a-4e54-b4e1-2297258f8d98	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-03-30 01:45:50.195	2026-03-30 01:45:50.847	2026-03-30 01:45:50.195	2026-03-30 01:45:50.849	2026-03-30 01:45:50.843
a63e1d6f-3c4d-4525-a0ed-bf0b0dd9ecac	f2a4ec93-0634-498f-ab8e-60cd037ea291	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-01 01:58:43.552	2026-04-01 01:58:52.516	2026-04-01 01:58:43.552	2026-04-01 01:58:52.522	2026-04-01 01:58:43.552
24621f91-871f-47de-aff8-ddddbc46e542	254ffb18-cb98-4685-a589-83850feb779e	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-01 05:25:53.454	2026-04-01 05:25:53.989	2026-04-01 05:25:53.454	2026-04-01 05:25:53.99	2026-04-01 05:25:53.454
0c9e3cf4-fdd0-4732-ba38-12e469edab97	02a9d097-1bce-479f-b4e3-a2e941c55369	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-03-30 01:49:45.089	2026-03-30 01:50:32.938	2026-03-30 01:49:45.089	2026-03-30 01:50:32.949	2026-03-30 01:50:30.032
c570cf30-7119-42a1-bcb7-65f9a437aac2	41b9646d-4f67-4978-843c-7e8df013240e	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-01 04:35:14.609	2026-04-01 04:36:19.052	2026-04-01 04:35:14.609	2026-04-01 04:36:21.824	2026-04-01 04:36:13.572
eec2fb11-52f3-4a78-bee2-799c2c8c3e56	afc38820-d731-4072-90d9-285710074f89	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-01 04:15:51.728	2026-04-01 04:32:38.203	2026-04-01 04:15:51.728	2026-04-01 04:32:38.211	2026-04-01 04:32:36.68
da8c813e-c989-4cf9-8c62-7e486c631211	bd30a810-0868-4216-b030-da607a5a7cd6	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-03-30 01:55:32.944	2026-03-30 01:55:55.96	2026-03-30 01:55:32.944	2026-03-30 01:55:55.97	2026-03-30 01:55:47.808
e9fd154a-8cc9-4afa-8a08-d78d32758be3	6d6a1a95-6384-4252-9737-62aefe3d21b2	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-03-29 23:15:08.21	2026-03-29 23:18:49.459	2026-03-29 23:15:08.21	2026-03-29 23:18:49.474	2026-03-29 23:18:38.201
ab1e7dfd-1f8b-422c-a19a-93dc342c261e	495bd926-8b1d-44c8-9a20-10721639313c	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-03-30 01:58:54.28	2026-03-30 01:59:05.494	2026-03-30 01:58:54.28	2026-03-30 01:59:05.503	2026-03-30 01:58:54.28
19b371aa-e180-4f34-a20e-aa43ab9f072c	2da4eae4-5604-413b-a0a8-c9155c07b7cd	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-03-29 23:22:22.828	2026-03-29 23:22:23.358	2026-03-29 23:22:22.828	2026-03-29 23:22:23.359	2026-03-29 23:22:22.828
b98fad74-59ce-46f7-8699-b3ee486e4e13	8005af89-6a3a-4992-b2bb-b3fc7930c92c	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-03-29 23:22:59.19	2026-03-29 23:22:59.648	2026-03-29 23:22:59.19	2026-03-29 23:22:59.65	2026-03-29 23:22:59.19
0ba6f40b-cecd-4140-8ce5-f39e5cdffdcb	405bf147-56fa-4844-bbc2-86e73d57398a	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-01 04:33:04.296	2026-04-01 04:33:29.264	2026-04-01 04:33:04.296	2026-04-01 04:33:29.265	2026-04-01 04:33:19.248
f2107853-b5eb-4a53-a45c-fe58e6881cda	a2890620-e7a4-4122-913a-e532e9e5591b	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-03-29 23:56:25.592	2026-03-29 23:56:26.166	2026-03-29 23:56:25.592	2026-03-29 23:56:26.167	2026-03-29 23:56:25.592
d2b85fd6-a458-4d19-9eae-b165553f8608	77d1076b-ad76-41e3-b9b7-0042f1938066	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-03-29 23:57:32.968	2026-03-29 23:57:33.547	2026-03-29 23:57:32.968	2026-03-29 23:57:33.549	2026-03-29 23:57:32.968
9e224057-64d5-4121-b160-76de96749148	d9736820-7961-41e6-9268-7a29224f49f7	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-01 04:33:42.591	2026-04-01 04:34:05.994	2026-04-01 04:33:42.591	2026-04-01 04:34:05.995	2026-04-01 04:33:42.591
677ce3c8-4ae6-4392-9ea7-d58e7a6a6d1e	d9736820-7961-41e6-9268-7a29224f49f7	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-01 04:34:06.81	2026-04-01 04:34:12.48	2026-04-01 04:34:06.81	2026-04-01 04:34:12.488	2026-04-01 04:34:06.81
21b72c8b-694f-4949-b0fe-a3ec9476a5ea	389c03fe-873d-454a-91c0-dc059ceb7532	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-01 02:00:24.504	2026-04-01 02:02:44.228	2026-04-01 02:00:24.504	2026-04-01 02:02:44.236	2026-04-01 02:01:54.884
0d8e150b-cea9-4226-8ff2-9b952d52de9d	084c6697-2f19-45b2-bf6c-f9fbfa2f1949	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-01 02:35:47.511	2026-04-01 02:35:48.185	2026-04-01 02:35:47.511	2026-04-01 02:35:48.186	2026-04-01 02:35:47.511
329e53cd-0654-463c-a9c8-e0808c0d57f6	f3b0301e-650e-438a-9581-cb2582b887a4	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-03-30 02:14:55.035	2026-03-30 02:23:36.073	2026-03-30 02:14:55.035	2026-03-30 02:23:36.085	2026-03-30 02:23:25.073
923ad05c-e0ca-45f2-9b2d-5357f279a9d0	29d035b3-3f77-434b-afda-634755777eb9	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-01 05:39:03.467	2026-04-01 05:39:04.094	2026-04-01 05:39:03.467	2026-04-01 05:39:04.095	2026-04-01 05:39:03.467
9907492d-c0c1-4bd4-9a49-84c1c15c8789	ff03452b-730e-4aa3-9287-90f37a7be132	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-03-30 02:23:41.645	2026-03-30 02:24:05.275	2026-03-30 02:23:41.645	2026-03-30 02:24:05.287	2026-03-30 02:23:56.516
86961b27-2884-4d0e-a1d0-13596252aa0b	6ec74e99-6e58-4a60-9e94-1048f182d264	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-01 04:34:19.093	2026-04-01 04:35:01.85	2026-04-01 04:34:19.093	2026-04-01 04:35:01.857	2026-04-01 04:34:48.374
8b49d648-8cd5-4882-986d-3b55117e554d	8f759ba1-d9e0-4c1f-b486-ed85be7ed073	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-01 03:10:17.347	2026-04-01 03:10:18.091	2026-04-01 03:10:17.347	2026-04-01 03:10:18.093	2026-04-01 03:10:17.347
bd62b3c5-ae10-4bf8-8c9a-7d70e2c2f4db	f51a8588-7221-4f98-b449-ef68c9deba5d	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-01 03:18:16.083	2026-04-01 03:18:16.774	2026-04-01 03:18:16.083	2026-04-01 03:18:16.775	2026-04-01 03:18:16.083
3255653c-1c74-4152-aa35-db72988fb35d	41b9646d-4f67-4978-843c-7e8df013240e	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-01 04:35:11.788	2026-04-01 04:35:13.45	2026-04-01 04:35:11.788	2026-04-01 04:35:13.451	2026-04-01 04:35:11.788
78b1ef33-7ec2-4d2e-a9dd-65d374799c39	2146ffc2-a9dd-444e-9b0b-46973aca29d6	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-01 03:36:04.079	2026-04-01 03:36:04.769	2026-04-01 03:36:04.079	2026-04-01 03:36:04.77	2026-04-01 03:36:04.079
3338c01a-27d8-4dd2-bf4d-cb85b6a2ee9e	f8048731-7af5-4b84-8f7a-575ec801791d	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-01 05:44:47.041	2026-04-01 05:44:47.686	2026-04-01 05:44:47.041	2026-04-01 05:44:47.687	2026-04-01 05:44:47.041
6fb1c56e-4125-472c-8fa2-b3f46e0a7625	485a0f7c-83b8-4c59-a55c-3604febb32b3	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-01 04:48:01.412	2026-04-01 04:52:15.893	2026-04-01 04:48:01.412	2026-04-01 04:52:15.894	2026-04-01 04:52:01.368
3ab838bb-201a-472a-ae5c-947ce6eeaaa4	f908d303-37b5-4709-b160-fef59798a8ce	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-01 05:45:44.941	2026-04-01 05:45:45.322	2026-04-01 05:45:44.941	2026-04-01 05:45:45.323	2026-04-01 05:45:44.941
fa4b651d-7991-46fc-8603-60b4c9694d2d	f908d303-37b5-4709-b160-fef59798a8ce	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-01 05:45:45.382	2026-04-01 05:45:55.621	2026-04-01 05:45:45.382	2026-04-01 05:45:55.628	2026-04-01 05:45:45.382
c4b0276c-33b2-4065-b893-5ae2e5149247	f7121682-ae4c-48e5-b566-fbf2ee36d1d6	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-03-30 02:24:15.01	2026-03-30 02:27:33.669	2026-03-30 02:24:15.01	2026-03-30 02:27:33.682	2026-03-30 02:27:30.042
45a542b3-e7d6-48d1-b747-39588f80df0f	47c9010d-8a14-49b3-b32f-bd9edf385a18	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-01 04:52:29.708	2026-04-01 04:53:09.002	2026-04-01 04:52:29.708	2026-04-01 04:53:09.003	2026-04-01 04:52:59.727
1ac1ac8d-fe29-4dec-ac43-4bde542ba30c	4c787e07-3eb1-48fe-ad71-2a8f2856f1f3	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-01 05:46:05.376	2026-04-01 05:46:05.854	2026-04-01 05:46:05.376	2026-04-01 05:46:05.855	2026-04-01 05:46:05.376
e53e6765-b90b-4652-a5af-ea267b530dad	4c787e07-3eb1-48fe-ad71-2a8f2856f1f3	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-01 05:46:05.866	2026-04-01 05:53:37.098	2026-04-01 05:46:05.866	2026-04-01 05:53:37.105	2026-04-01 05:52:51.229
0f5d3715-795b-4286-b617-1c30af716a96	4c787e07-3eb1-48fe-ad71-2a8f2856f1f3	47d9c408-1a3c-46c1-aecf-6f1746615499	VIEWER	2026-04-01 05:46:31.313	2026-04-01 05:53:37.098	2026-04-01 05:46:31.313	2026-04-01 05:53:37.105	2026-04-01 05:51:41.788
cdec5faa-ff3a-4f2c-8086-357598279761	e25a79f0-2a3f-4a6c-8bb6-8da4dcfcac78	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-01 05:56:10.368	2026-04-01 05:57:16.517	2026-04-01 05:56:10.368	2026-04-01 05:57:16.525	2026-04-01 05:57:10.396
be23145a-fe9a-408a-8633-08dcfa9d923a	8a3b6e2b-e790-4f38-ad5c-899c02a04b96	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-01 05:59:29.905	2026-04-01 06:07:38.956	2026-04-01 05:59:29.905	2026-04-01 06:07:38.966	2026-04-01 06:07:30.344
4d221a92-ac70-4b82-ab6d-faffb3b9b679	8a3b6e2b-e790-4f38-ad5c-899c02a04b96	9f70646e-c63e-4a08-a4fa-8786204bbf4e	VIEWER	2026-04-01 06:05:26.291	2026-04-01 06:05:29.548	2026-04-01 06:05:26.291	2026-04-01 06:05:29.549	2026-04-01 06:05:26.291
3c113dfb-fad8-4857-b114-67d80dd90878	d2777555-bf06-451a-899c-a5b3f5557779	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-01 08:41:35.63	2026-04-01 08:41:36.168	2026-04-01 08:41:35.63	2026-04-01 08:41:36.169	2026-04-01 08:41:35.63
7f6a2381-f14b-4176-b730-16dc6e874eb4	8a3b6e2b-e790-4f38-ad5c-899c02a04b96	47d9c408-1a3c-46c1-aecf-6f1746615499	GUEST	2026-04-01 06:00:56.063	2026-04-01 06:07:38.956	2026-04-01 06:00:56.063	2026-04-01 06:07:38.966	2026-04-01 06:07:26.119
51887d63-4d5d-43ea-8d25-d4114150716d	ca347a9f-b6d8-498e-a455-5804fd34f781	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-01 09:09:41.057	2026-04-01 09:09:41.745	2026-04-01 09:09:41.057	2026-04-01 09:09:41.746	2026-04-01 09:09:41.057
f5eb0d94-ff0d-4bc0-9212-7b950389c31d	ca347a9f-b6d8-498e-a455-5804fd34f781	281ac0c9-d22b-4ece-895a-9d2c86a8f315	VIEWER	2026-04-01 09:10:16.64	2026-04-01 09:11:45.655	2026-04-01 09:10:16.64	2026-04-01 09:11:45.656	2026-04-01 09:11:31.655
347a9195-1a51-4b7e-b098-6b25b3bc5717	e7c18482-912b-4e3d-936b-ce153022829e	3961fabe-1345-4426-bd8a-ca0a5eac3aac	VIEWER	2026-04-01 09:13:03.758	2026-04-01 09:18:25.686	2026-04-01 09:13:03.758	2026-04-01 09:18:25.688	2026-04-01 09:18:19.156
3938c641-6190-43a0-80e5-0809517b82cc	98cbd644-54d2-4f7d-999f-76cbd8682a66	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-01 04:02:02.841	2026-04-01 04:02:03.435	2026-04-01 04:02:02.841	2026-04-01 04:02:03.436	2026-04-01 04:02:02.841
5bdf6da0-1350-4a8f-a398-867e744c7054	02615b24-131a-4df4-953f-9802b3cd3047	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-04-02 02:01:20.593	2026-04-02 02:01:21.1	2026-04-02 02:01:20.593	2026-04-02 02:01:21.102	2026-04-02 02:01:20.593
9bcf8d07-00c9-45d6-af76-3b4887a2c031	32d6e607-c997-45ec-9cb2-7dfba5f1e5b6	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-03-30 00:04:33.304	2026-03-30 00:04:48.989	2026-03-30 00:04:33.304	2026-03-30 00:04:49.002	2026-03-30 00:04:48.196
a129f85e-448e-4b32-b640-c4961613960b	afc38820-d731-4072-90d9-285710074f89	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-01 04:15:51.122	2026-04-01 04:15:51.665	2026-04-01 04:15:51.122	2026-04-01 04:15:51.666	2026-04-01 04:15:51.122
9857758d-e3df-46b1-a47c-f05fd4515545	445be4fe-583c-4e3f-b545-3be0ca1f5e2d	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-03-30 00:06:15.682	2026-03-30 00:06:36.886	2026-03-30 00:06:15.682	2026-03-30 00:06:36.897	2026-03-30 00:06:30.622
a07ac2ce-d620-4fd2-8ab2-aa87923ccd38	405bf147-56fa-4844-bbc2-86e73d57398a	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-01 04:33:00.447	2026-04-01 04:33:04.228	2026-04-01 04:33:00.447	2026-04-01 04:33:04.229	2026-04-01 04:33:00.447
84a9c41e-414c-488f-9a42-fd95859675dc	382c9037-0ef1-4184-9f67-1719c1e5ed27	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-03-30 00:11:49.784	2026-03-30 00:12:13.101	2026-03-30 00:11:49.784	2026-03-30 00:12:13.113	2026-03-30 00:12:04.7
b9e3b63c-fc3d-4a0e-b90f-afc3a9a5a3f6	405bf147-56fa-4844-bbc2-86e73d57398a	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-01 04:33:30.515	2026-04-01 04:33:32.474	2026-04-01 04:33:30.515	2026-04-01 04:33:32.481	2026-04-01 04:33:30.515
3d2e7877-b6a5-40f0-9cd1-442446795e23	f991d30e-d26c-4e52-80be-587c209787a2	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-03-30 00:13:50.758	2026-03-30 00:13:51.229	2026-03-30 00:13:50.758	2026-03-30 00:13:51.231	2026-03-30 00:13:50.758
51734b53-b017-47dd-8e7c-ad226d17043e	6ec74e99-6e58-4a60-9e94-1048f182d264	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-01 04:34:17.845	2026-04-01 04:34:18.299	2026-04-01 04:34:17.845	2026-04-01 04:34:18.3	2026-04-01 04:34:17.845
17b8a943-6c7d-496f-976a-f3e591a6e6c3	86125c98-2c14-4803-a7a5-0eb988a90635	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-03-30 00:57:20.534	2026-03-30 00:57:21.196	2026-03-30 00:57:20.534	2026-03-30 00:57:21.198	2026-03-30 00:57:21.186
0c05323e-9f33-4b83-9ec0-8928f0b9f9f3	70f5a64f-078a-478a-9a44-68acce85461b	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-03-29 22:55:05.285	2026-03-29 23:05:39.837	2026-03-29 22:55:05.285	2026-03-29 23:05:39.851	2026-03-29 23:04:50.345
9e6801be-cd2a-4ba7-b359-3c0a5b723d8f	39cd9fde-9e23-4e3c-949d-550b33ee4f90	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-03-30 00:58:12.879	2026-03-30 00:58:13.357	2026-03-30 00:58:12.879	2026-03-30 00:58:13.359	2026-03-30 00:58:12.879
3e19e5bd-35cb-48fb-b391-d477a9133f88	485a0f7c-83b8-4c59-a55c-3604febb32b3	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-01 04:48:00.842	2026-04-01 04:48:01.355	2026-04-01 04:48:00.842	2026-04-01 04:48:01.356	2026-04-01 04:48:00.842
ea4a5d28-7f79-41df-92e5-c8602f4b56ee	9db1ac16-7231-4c90-8454-69660c40f761	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-03-29 23:10:25.352	2026-03-29 23:10:54.951	2026-03-29 23:10:25.352	2026-03-29 23:10:54.963	2026-03-29 23:10:40.181
01254469-e02e-4420-811d-04aa14cee138	39cd9fde-9e23-4e3c-949d-550b33ee4f90	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-03-30 00:58:22.552	2026-03-30 00:58:24.723	2026-03-30 00:58:22.552	2026-03-30 00:58:24.734	2026-03-30 00:58:22.552
20f618ba-616c-42e2-93cb-d5f306c419ea	86728898-a4e7-4ad7-a7c1-f04627cac589	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-03-29 23:11:18.891	2026-03-29 23:11:19.327	2026-03-29 23:11:18.891	2026-03-29 23:11:19.33	2026-03-29 23:11:18.891
e6d3e19f-fbc7-4181-a808-597846907e22	10544059-6626-459a-b988-110e48f5fd85	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-03-29 23:12:01.958	2026-03-29 23:12:02.57	2026-03-29 23:12:01.958	2026-03-29 23:12:02.572	2026-03-29 23:12:01.958
7e8d78cd-d0f4-4b7e-bbb0-28ea27a59078	485a0f7c-83b8-4c59-a55c-3604febb32b3	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-01 04:52:15.972	2026-04-01 04:52:25.048	2026-04-01 04:52:15.972	2026-04-01 04:52:25.055	2026-04-01 04:52:15.972
22fb4898-f481-4d23-b491-cde906ff4c3f	6d6a1a95-6384-4252-9737-62aefe3d21b2	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-03-29 23:15:07.716	2026-03-29 23:15:08.182	2026-03-29 23:15:07.716	2026-03-29 23:15:08.184	2026-03-29 23:15:07.716
05e65bd2-1fdf-4036-981d-ea1769dd2c43	9c7d7da2-6440-4236-b6ad-3730fcd8b403	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-03-30 01:11:56.707	2026-03-30 01:12:20.868	2026-03-30 01:11:56.707	2026-03-30 01:12:20.879	2026-03-30 01:12:11.613
1ffe3bd3-8185-4bb6-ba20-2341a54f3216	2da4eae4-5604-413b-a0a8-c9155c07b7cd	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-03-29 23:22:23.44	2026-03-29 23:22:25.64	2026-03-29 23:22:23.44	2026-03-29 23:22:25.652	2026-03-29 23:22:23.44
eb9a7b6a-7030-455e-befd-6167ea788fcc	31227a63-d77c-4ff0-bb2c-33c95cca836a	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-03-30 01:27:19.794	2026-03-30 01:27:27.894	2026-03-30 01:27:19.794	2026-03-30 01:27:27.906	2026-03-30 01:27:19.794
558e51bc-6b8c-4617-84a8-22d8d681485c	47c9010d-8a14-49b3-b32f-bd9edf385a18	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-01 04:52:29.129	2026-04-01 04:52:29.684	2026-04-01 04:52:29.129	2026-04-01 04:52:29.685	2026-04-01 04:52:29.129
48a42f51-e5e2-439d-ab94-f7a352264b7c	8005af89-6a3a-4992-b2bb-b3fc7930c92c	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-03-29 23:22:59.689	2026-03-29 23:23:47.486	2026-03-29 23:22:59.689	2026-03-29 23:23:47.498	2026-03-29 23:23:44.629
88a4aa6d-6699-4160-a0c8-4ab1f2f70b60	bf6ab63d-445a-4e54-b4e1-2297258f8d98	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-03-30 01:45:50.992	2026-03-30 01:46:14.983	2026-03-30 01:45:50.992	2026-03-30 01:46:14.995	2026-03-30 01:46:05.797
f450942d-d603-4b2c-b3c3-64c675fd3261	a2890620-e7a4-4122-913a-e532e9e5591b	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-03-29 23:56:26.242	2026-03-29 23:56:31.104	2026-03-29 23:56:26.242	2026-03-29 23:56:31.116	2026-03-29 23:56:26.242
573da5cb-6be8-4525-b8fe-780e2cccc4e6	2bd17abc-ad0a-47e5-8d60-f309468f6466	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-03-29 22:45:31.008	2026-03-29 22:54:25.115	2026-03-29 22:45:31.008	2026-03-29 22:54:25.128	2026-03-29 22:54:16.114
e1083dee-6d85-40a3-b655-1fc2aa4c2ae9	47c9010d-8a14-49b3-b32f-bd9edf385a18	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-01 04:53:09.056	2026-04-01 04:53:12.745	2026-04-01 04:53:09.056	2026-04-01 04:53:12.752	2026-04-01 04:53:09.056
fe650228-d883-4607-b108-65dc561a64aa	02a9d097-1bce-479f-b4e3-a2e941c55369	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-03-30 01:49:44.562	2026-03-30 01:49:45.036	2026-03-30 01:49:44.562	2026-03-30 01:49:45.038	2026-03-30 01:49:44.562
035114f5-1004-47e3-9501-8bff1676b256	77d1076b-ad76-41e3-b9b7-0042f1938066	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-03-29 23:57:33.579	2026-03-29 23:57:49.079	2026-03-29 23:57:33.579	2026-03-29 23:57:49.09	2026-03-29 23:57:48.501
b77d3ab4-87b3-4c0e-b2cc-abc1a2d681ad	bd30a810-0868-4216-b030-da607a5a7cd6	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-03-30 01:55:32.29	2026-03-30 01:55:32.86	2026-03-30 01:55:32.29	2026-03-30 01:55:32.862	2026-03-30 01:55:32.29
411b9ab5-22ed-403e-84e0-2b828a48bbb9	0302388d-14c6-43be-9880-5229aa377602	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-01 04:53:40.896	2026-04-01 04:54:10.576	2026-04-01 04:53:40.896	2026-04-01 04:54:10.584	2026-04-01 04:53:55.894
7d34878c-5232-439e-863c-b2661f103e4a	495bd926-8b1d-44c8-9a20-10721639313c	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-03-30 01:58:53.768	2026-03-30 01:58:54.251	2026-03-30 01:58:53.768	2026-03-30 01:58:54.252	2026-03-30 01:58:54.243
e9501f86-a9db-462a-90e1-3723e30a5433	f3b0301e-650e-438a-9581-cb2582b887a4	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-03-30 02:14:54.232	2026-03-30 02:14:54.916	2026-03-30 02:14:54.232	2026-03-30 02:14:54.918	2026-03-30 02:14:54.232
78bee193-2206-419b-8305-5fb3bf0960b7	ace6f4ac-38cd-4699-a52d-84ef27384ecf	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-01 04:54:22.975	2026-04-01 04:54:23.503	2026-04-01 04:54:22.975	2026-04-01 04:54:23.505	2026-04-01 04:54:22.975
1d8c4803-13c3-49f9-8928-11fd5b662ca8	ff03452b-730e-4aa3-9287-90f37a7be132	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-03-30 02:23:41.043	2026-03-30 02:23:41.572	2026-03-30 02:23:41.043	2026-03-30 02:23:41.573	2026-03-30 02:23:41.043
0d9f644d-fce3-4d13-a18d-3b042de9e972	2146ffc2-a9dd-444e-9b0b-46973aca29d6	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-01 03:36:04.876	2026-04-01 03:55:11.381	2026-04-01 03:36:04.876	2026-04-01 03:55:11.389	2026-04-01 03:55:05.698
eb224747-754a-4b22-b261-57bc94b8590a	f7121682-ae4c-48e5-b566-fbf2ee36d1d6	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-03-30 02:24:14.548	2026-03-30 02:24:14.955	2026-03-30 02:24:14.548	2026-03-30 02:24:14.956	2026-03-30 02:24:14.548
e279d951-781b-4217-a49e-717473381596	73103c83-901a-4e0a-b58c-329d8523ff3a	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-03-31 01:50:29.92	2026-03-31 01:50:30.673	2026-03-31 01:50:29.92	2026-03-31 01:50:30.675	2026-03-31 01:50:29.92
b26d0b5e-43e4-48ca-94ed-388e3d8d60c3	d55502ca-ce10-4099-b79a-54180cf83a8e	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-01 03:55:19.87	2026-04-01 03:55:30.646	2026-04-01 03:55:19.87	2026-04-01 03:55:30.653	2026-04-01 03:55:19.87
adc7a225-5c49-448b-8a97-8a7f5ee5e51f	f2a4ec93-0634-498f-ab8e-60cd037ea291	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-01 01:58:42.699	2026-04-01 01:58:43.51	2026-04-01 01:58:42.699	2026-04-01 01:58:43.511	2026-04-01 01:58:42.699
0f3270a0-1586-461c-a518-9239717b96c7	389c03fe-873d-454a-91c0-dc059ceb7532	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-01 02:00:23.831	2026-04-01 02:00:24.483	2026-04-01 02:00:23.831	2026-04-01 02:00:24.484	2026-04-01 02:00:23.831
207c8797-3159-4dc7-b63d-d4d605af168b	ace6f4ac-38cd-4699-a52d-84ef27384ecf	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-01 04:54:23.512	2026-04-01 04:54:28.627	2026-04-01 04:54:23.512	2026-04-01 04:54:28.634	2026-04-01 04:54:23.512
8235944a-7b39-4d7b-ab18-3c4f544d337b	254ffb18-cb98-4685-a589-83850feb779e	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-01 05:25:54.057	2026-04-01 05:25:59.492	2026-04-01 05:25:54.057	2026-04-01 05:25:59.501	2026-04-01 05:25:54.057
b508ecca-d4e3-4ea6-82e9-b78d9855d6ad	29d035b3-3f77-434b-afda-634755777eb9	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-01 05:39:04.162	2026-04-01 05:39:15.416	2026-04-01 05:39:04.162	2026-04-01 05:39:15.423	2026-04-01 05:39:04.162
afba86f9-164f-43cd-bd40-d8641cfa1b1a	8a3b6e2b-e790-4f38-ad5c-899c02a04b96	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-01 05:59:29.343	2026-04-01 05:59:29.882	2026-04-01 05:59:29.343	2026-04-01 05:59:29.883	2026-04-01 05:59:29.343
5702875e-f270-4988-98de-585e957b234b	8a3b6e2b-e790-4f38-ad5c-899c02a04b96	9f70646e-c63e-4a08-a4fa-8786204bbf4e	VIEWER	2026-04-01 06:04:05.352	2026-04-01 06:04:28.573	2026-04-01 06:04:05.352	2026-04-01 06:04:28.575	2026-04-01 06:04:05.352
60320f75-07e3-489e-891a-b59c0494d911	f8048731-7af5-4b84-8f7a-575ec801791d	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-01 05:44:47.756	2026-04-01 05:45:59.577	2026-04-01 05:44:47.756	2026-04-01 05:45:59.585	2026-04-01 05:45:47.7
dbe838ec-238e-43a4-b3ee-51a13501dc64	084c6697-2f19-45b2-bf6c-f9fbfa2f1949	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-01 02:35:48.233	2026-04-01 03:10:09.51	2026-04-01 02:35:48.233	2026-04-01 03:10:09.517	2026-04-01 03:10:03.774
d0e125ef-3dd8-4877-8aed-e9d804542585	8f759ba1-d9e0-4c1f-b486-ed85be7ed073	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-01 03:10:18.144	2026-04-01 03:10:26.749	2026-04-01 03:10:18.144	2026-04-01 03:10:26.756	2026-04-01 03:10:18.144
b89c4686-9e71-4528-acc0-568b65c41d68	e25a79f0-2a3f-4a6c-8bb6-8da4dcfcac78	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-01 05:56:09.892	2026-04-01 05:56:10.305	2026-04-01 05:56:09.892	2026-04-01 05:56:10.307	2026-04-01 05:56:09.892
e4936129-3b2b-4998-be4e-687b0e1022d1	f51a8588-7221-4f98-b449-ef68c9deba5d	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-01 03:18:16.832	2026-04-01 03:18:56.296	2026-04-01 03:18:16.832	2026-04-01 03:18:56.303	2026-04-01 03:18:47.75
ba2f17a9-434e-490f-923c-509165262036	d2777555-bf06-451a-899c-a5b3f5557779	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-01 08:41:36.214	2026-04-01 08:41:42.522	2026-04-01 08:41:36.214	2026-04-01 08:41:42.531	2026-04-01 08:41:36.214
37c60b7f-a0d2-43e0-aec7-588057da276a	e25a79f0-2a3f-4a6c-8bb6-8da4dcfcac78	47d9c408-1a3c-46c1-aecf-6f1746615499	GUEST	2026-04-01 05:56:18.241	2026-04-01 05:57:16.517	2026-04-01 05:56:18.241	2026-04-01 05:57:16.525	2026-04-01 05:57:03.271
44f84442-8c49-4b16-b9b1-6d78c8805558	8a3b6e2b-e790-4f38-ad5c-899c02a04b96	47d9c408-1a3c-46c1-aecf-6f1746615499	VIEWER	2026-04-01 05:59:35.181	2026-04-01 06:00:06.281	2026-04-01 05:59:35.181	2026-04-01 06:00:06.282	2026-04-01 06:00:05.276
2b192153-fe51-45c7-97d9-c40a26de19f7	8a3b6e2b-e790-4f38-ad5c-899c02a04b96	9f70646e-c63e-4a08-a4fa-8786204bbf4e	GUEST	2026-04-01 06:05:36.926	2026-04-01 06:07:38.956	2026-04-01 06:05:36.926	2026-04-01 06:07:38.966	2026-04-01 06:07:34.937
e51ae5e7-e00e-45f6-89a0-030ae76ffdf0	ca347a9f-b6d8-498e-a455-5804fd34f781	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-01 09:09:41.816	2026-04-01 09:11:48.641	2026-04-01 09:09:41.816	2026-04-01 09:11:48.649	2026-04-01 09:11:41.863
dae2d02c-90cd-4a59-9bda-d1f0a7a99284	e7c18482-912b-4e3d-936b-ce153022829e	281ac0c9-d22b-4ece-895a-9d2c86a8f315	HOST	2026-04-01 09:12:07.094	2026-04-01 09:12:07.741	2026-04-01 09:12:07.094	2026-04-01 09:12:07.742	2026-04-01 09:12:07.094
01f4f684-d512-4079-a3b0-0add1adadb83	e7c18482-912b-4e3d-936b-ce153022829e	3961fabe-1345-4426-bd8a-ca0a5eac3aac	VIEWER	2026-04-01 09:12:09.016	2026-04-01 09:13:02.817	2026-04-01 09:12:09.016	2026-04-01 09:13:02.818	2026-04-01 09:12:54.061
de031d97-eb86-4137-bc37-929001ce5950	e7c18482-912b-4e3d-936b-ce153022829e	3961fabe-1345-4426-bd8a-ca0a5eac3aac	VIEWER	2026-04-01 09:18:41.855	2026-04-01 09:19:33.616	2026-04-01 09:18:41.855	2026-04-01 09:19:33.617	2026-04-01 09:19:26.85
92ccf966-72e6-4951-8685-ba0f10b70361	e7c18482-912b-4e3d-936b-ce153022829e	9f70646e-c63e-4a08-a4fa-8786204bbf4e	VIEWER	2026-04-01 09:20:59.358	2026-04-01 09:21:36.995	2026-04-01 09:20:59.358	2026-04-01 09:21:36.996	2026-04-01 09:20:59.358
40ec4516-cc05-4047-a5ea-cf7d861a9486	e7c18482-912b-4e3d-936b-ce153022829e	3961fabe-1345-4426-bd8a-ca0a5eac3aac	VIEWER	2026-04-01 09:19:35.79	2026-04-01 09:20:50.67	2026-04-01 09:19:35.79	2026-04-01 09:20:50.671	2026-04-01 09:20:35.811
e26dfd88-95f8-4be9-b199-d9947c07456c	e7c18482-912b-4e3d-936b-ce153022829e	3961fabe-1345-4426-bd8a-ca0a5eac3aac	VIEWER	2026-04-01 09:20:53.229	2026-04-01 09:22:24.689	2026-04-01 09:20:53.229	2026-04-01 09:22:24.697	2026-04-01 09:22:23.193
02ccf758-ae97-4265-903f-adb39df4b668	b1001c15-3e22-4d3f-b80b-08eeb774338c	9f70646e-c63e-4a08-a4fa-8786204bbf4e	VIEWER	2026-04-01 10:53:41.284	2026-04-01 10:55:05.915	2026-04-01 10:53:41.284	2026-04-01 10:55:05.916	2026-04-01 10:54:56.315
74babf64-7a80-4606-b05c-7d0c215d67dc	e477bb1a-2d08-4e06-8455-6183aa8b6ba3	281ac0c9-d22b-4ece-895a-9d2c86a8f315	VIEWER	2026-04-01 09:50:24.379	2026-04-01 09:51:47.583	2026-04-01 09:50:24.379	2026-04-01 09:51:47.584	2026-04-01 09:51:39.337
41068409-5475-41bf-abe1-f407ce85ced6	e477bb1a-2d08-4e06-8455-6183aa8b6ba3	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-01 09:49:34.062	2026-04-01 09:51:50.996	2026-04-01 09:49:34.062	2026-04-01 09:51:51.004	2026-04-01 09:51:49.573
fefcca6a-55c4-41a5-911a-3f5c607c48ff	128e8cc7-cc76-4367-b035-9423121bef49	281ac0c9-d22b-4ece-895a-9d2c86a8f315	HOST	2026-04-01 09:52:26.737	2026-04-01 09:52:27.597	2026-04-01 09:52:26.737	2026-04-01 09:52:27.598	2026-04-01 09:52:26.737
c77071cf-d5fa-49ac-a630-fe220749f8cf	e7c18482-912b-4e3d-936b-ce153022829e	281ac0c9-d22b-4ece-895a-9d2c86a8f315	HOST	2026-04-01 09:12:07.752	2026-04-01 09:22:24.689	2026-04-01 09:12:07.752	2026-04-01 09:22:24.697	2026-04-01 09:22:22.924
9bf46b23-8845-46e6-b6b8-440221992b51	96233155-9731-4913-9dae-dfe7ba7269d7	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-01 09:22:29.821	2026-04-01 09:22:30.282	2026-04-01 09:22:29.821	2026-04-01 09:22:30.283	2026-04-01 09:22:29.821
9cc1c9a5-c5be-400c-bb38-3518fc158301	96233155-9731-4913-9dae-dfe7ba7269d7	281ac0c9-d22b-4ece-895a-9d2c86a8f315	VIEWER	2026-04-01 09:22:45.184	2026-04-01 09:22:57.54	2026-04-01 09:22:45.184	2026-04-01 09:22:57.541	2026-04-01 09:22:45.184
f751e5fe-8f73-4ae5-a5d3-d68d1b8b8847	481dad7d-d73f-4dce-b9a7-f24066eb069c	3961fabe-1345-4426-bd8a-ca0a5eac3aac	VIEWER	2026-04-01 09:54:30.603	2026-04-01 09:56:07.744	2026-04-01 09:54:30.603	2026-04-01 09:56:07.745	2026-04-01 09:56:00.672
a30df7b3-bcdf-4d1e-96e0-93526342b6f4	96233155-9731-4913-9dae-dfe7ba7269d7	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-01 09:22:30.342	2026-04-01 09:23:02.449	2026-04-01 09:22:30.342	2026-04-01 09:23:02.456	2026-04-01 09:23:00.364
7cf50a26-5d8b-4cc9-a416-802b9d0aa2ab	c54155e7-1039-4597-b336-3a7097a63284	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-01 09:23:17.445	2026-04-01 09:23:17.946	2026-04-01 09:23:17.445	2026-04-01 09:23:17.947	2026-04-01 09:23:17.445
2af357c1-94ec-4c78-b36b-92542da08fd0	481dad7d-d73f-4dce-b9a7-f24066eb069c	281ac0c9-d22b-4ece-895a-9d2c86a8f315	HOST	2026-04-01 09:54:29.495	2026-04-01 09:56:13.324	2026-04-01 09:54:29.495	2026-04-01 09:56:13.332	2026-04-01 09:55:59.516
39f0fcb2-8348-46e7-9260-ad3374371939	128e8cc7-cc76-4367-b035-9423121bef49	3961fabe-1345-4426-bd8a-ca0a5eac3aac	VIEWER	2026-04-01 09:52:28.401	2026-04-01 09:52:53.565	2026-04-01 09:52:28.401	2026-04-01 09:52:53.566	2026-04-01 09:52:43.433
8f30748f-ba0a-4bfc-9f29-8490dd08c974	128e8cc7-cc76-4367-b035-9423121bef49	281ac0c9-d22b-4ece-895a-9d2c86a8f315	HOST	2026-04-01 09:52:27.613	2026-04-01 09:52:55.287	2026-04-01 09:52:27.613	2026-04-01 09:52:55.294	2026-04-01 09:52:42.702
cf79d41f-60e0-40fa-9aa6-bfb9fac770f3	fc805175-e93f-49ef-834e-eaac90cec00f	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-01 09:53:09.894	2026-04-01 09:53:10.508	2026-04-01 09:53:09.894	2026-04-01 09:53:10.509	2026-04-01 09:53:09.894
b4412e1a-b64f-4c3d-936a-8a7a75524967	c54155e7-1039-4597-b336-3a7097a63284	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-01 09:23:17.953	2026-04-01 09:28:17.555	2026-04-01 09:23:17.953	2026-04-01 09:28:17.564	2026-04-01 09:28:03.233
5ae02aa3-2291-45ca-8524-1e56147077a5	c54155e7-1039-4597-b336-3a7097a63284	281ac0c9-d22b-4ece-895a-9d2c86a8f315	VIEWER	2026-04-01 09:26:10.3	2026-04-01 09:28:17.555	2026-04-01 09:26:10.3	2026-04-01 09:28:17.564	2026-04-01 09:28:10.319
982547ad-ea84-4a4a-9f68-3387a4237cd3	c54155e7-1039-4597-b336-3a7097a63284	ee45a65d-1fea-4dae-96e6-cc0413c24c5a	VIEWER	2026-04-01 09:25:27.709	2026-04-01 09:28:17.555	2026-04-01 09:25:27.709	2026-04-01 09:28:17.564	2026-04-01 09:28:12.848
ec014b3c-12fa-4d3c-8dbe-bcfde241bbeb	c54155e7-1039-4597-b336-3a7097a63284	e9134380-2da7-4a1e-bd2a-34398f85a6e5	VIEWER	2026-04-01 09:23:28.304	2026-04-01 09:28:17.555	2026-04-01 09:23:28.304	2026-04-01 09:28:17.564	2026-04-01 09:28:13.648
df5f392b-ed50-4856-b922-bb13da7d5cda	c54155e7-1039-4597-b336-3a7097a63284	7e2a5e6d-7021-482a-abeb-883f8ebf016b	VIEWER	2026-04-01 09:25:02.369	2026-04-01 09:28:17.555	2026-04-01 09:25:02.369	2026-04-01 09:28:17.564	2026-04-01 09:28:17.503
17da3707-5eb4-46fe-aae2-a7126d2cd56f	2d2e25f5-33bd-4adf-b69e-150d53b5b108	281ac0c9-d22b-4ece-895a-9d2c86a8f315	HOST	2026-04-01 09:28:22.498	2026-04-01 09:28:22.874	2026-04-01 09:28:22.498	2026-04-01 09:28:22.875	2026-04-01 09:28:22.498
2378f074-75ef-4cbd-b79c-580b569ee6c4	c54155e7-1039-4597-b336-3a7097a63284	281ac0c9-d22b-4ece-895a-9d2c86a8f315	VIEWER	2026-04-01 09:23:21.221	2026-04-01 09:26:08.515	2026-04-01 09:23:21.221	2026-04-01 09:26:08.517	2026-04-01 09:26:06.264
1e234c23-eebf-47d9-b154-d355f1846556	b1001c15-3e22-4d3f-b80b-08eeb774338c	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-01 10:52:40.731	2026-04-01 10:52:41.179	2026-04-01 10:52:40.731	2026-04-01 10:52:41.18	2026-04-01 10:52:40.731
220d6fb3-bfc0-4921-8cd4-db815de2827d	fc805175-e93f-49ef-834e-eaac90cec00f	281ac0c9-d22b-4ece-895a-9d2c86a8f315	VIEWER	2026-04-01 09:53:25.131	2026-04-01 09:53:40.633	2026-04-01 09:53:25.131	2026-04-01 09:53:40.634	2026-04-01 09:53:40.116
f752f2cb-ec71-4d04-a58b-f0f5f8d28cb8	3e3724e2-4413-41e0-8a19-451579092edb	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-01 18:23:00.768	2026-04-01 18:23:15.214	2026-04-01 18:23:00.768	2026-04-01 18:23:15.221	2026-04-01 18:23:00.797
484aa564-dec7-4791-98ce-5008b550efc9	2d2e25f5-33bd-4adf-b69e-150d53b5b108	ee45a65d-1fea-4dae-96e6-cc0413c24c5a	VIEWER	2026-04-01 09:45:05.587	2026-04-01 09:49:30.21	2026-04-01 09:45:05.587	2026-04-01 09:49:30.218	2026-04-01 09:49:20.788
710f490d-c7ea-4b4b-a936-3335b1c08f00	2d2e25f5-33bd-4adf-b69e-150d53b5b108	281ac0c9-d22b-4ece-895a-9d2c86a8f315	HOST	2026-04-01 09:28:22.884	2026-04-01 09:49:30.21	2026-04-01 09:28:22.884	2026-04-01 09:49:30.218	2026-04-01 09:49:23.348
c6e4e590-825d-4d59-958d-5c60af56b54d	2d2e25f5-33bd-4adf-b69e-150d53b5b108	3961fabe-1345-4426-bd8a-ca0a5eac3aac	VIEWER	2026-04-01 09:28:23.874	2026-04-01 09:49:30.21	2026-04-01 09:28:23.874	2026-04-01 09:49:30.218	2026-04-01 09:49:30.209
5d3a2715-e3e4-4e00-aca6-b5e3c6ab7902	e477bb1a-2d08-4e06-8455-6183aa8b6ba3	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-01 09:49:33.457	2026-04-01 09:49:34.037	2026-04-01 09:49:33.457	2026-04-01 09:49:34.038	2026-04-01 09:49:33.457
9b72586a-1bcb-4efa-b2c1-37ff9491a91a	fc805175-e93f-49ef-834e-eaac90cec00f	281ac0c9-d22b-4ece-895a-9d2c86a8f315	VIEWER	2026-04-01 09:53:51.727	2026-04-01 09:54:17.839	2026-04-01 09:53:51.727	2026-04-01 09:54:17.84	2026-04-01 09:54:06.677
f8fbc758-ea05-4e14-8eed-c456f2de802e	fc805175-e93f-49ef-834e-eaac90cec00f	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-01 09:53:10.531	2026-04-01 09:54:24.192	2026-04-01 09:53:10.531	2026-04-01 09:54:24.199	2026-04-01 09:54:10.619
7893504d-5caf-42cb-93ab-a74d2197fa98	481dad7d-d73f-4dce-b9a7-f24066eb069c	281ac0c9-d22b-4ece-895a-9d2c86a8f315	HOST	2026-04-01 09:54:28.816	2026-04-01 09:54:29.488	2026-04-01 09:54:28.816	2026-04-01 09:54:29.489	2026-04-01 09:54:28.816
e7f9cc05-6ac5-433c-8e7d-ead93b96080e	b1001c15-3e22-4d3f-b80b-08eeb774338c	47d9c408-1a3c-46c1-aecf-6f1746615499	VIEWER	2026-04-01 10:53:42.285	2026-04-01 10:55:37.414	2026-04-01 10:53:42.285	2026-04-01 10:55:37.415	2026-04-01 10:55:27.36
02d91e8b-6b5d-494d-bc51-051f42274876	e94455bd-d7a9-455b-8e7a-9b12f15bff19	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-01 18:40:29.694	2026-04-01 18:40:30.405	2026-04-01 18:40:29.694	2026-04-01 18:40:30.406	2026-04-01 18:40:29.694
790f7d9b-a5ee-41a5-90fe-bf2ee05f178b	e55f590d-d03f-4d86-b1b6-57ae61910a99	281ac0c9-d22b-4ece-895a-9d2c86a8f315	HOST	2026-04-01 15:50:07.624	2026-04-01 15:51:48.252	2026-04-01 15:50:07.624	2026-04-01 15:51:48.259	2026-04-01 15:51:37.567
e652e82c-76f2-4db2-997b-a7932067ae4c	b1001c15-3e22-4d3f-b80b-08eeb774338c	9f70646e-c63e-4a08-a4fa-8786204bbf4e	VIEWER	2026-04-01 10:55:12.151	2026-04-01 10:57:34.695	2026-04-01 10:55:12.151	2026-04-01 10:57:34.703	2026-04-01 10:57:27.262
10fdbcdb-d0c0-4c28-9fdd-d81849d8170a	b1001c15-3e22-4d3f-b80b-08eeb774338c	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-01 10:52:41.269	2026-04-01 10:57:34.695	2026-04-01 10:52:41.269	2026-04-01 10:57:34.703	2026-04-01 10:57:26.478
e5afdd35-b24a-4918-b463-6d7c5d84f8bd	b1001c15-3e22-4d3f-b80b-08eeb774338c	47d9c408-1a3c-46c1-aecf-6f1746615499	VIEWER	2026-04-01 10:56:22.236	2026-04-01 10:57:34.695	2026-04-01 10:56:22.236	2026-04-01 10:57:34.703	2026-04-01 10:57:22.277
eb17083d-e50a-403c-804d-60be497930d5	2a4f4ba0-dca4-4aa3-b002-10e5a2af132f	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-01 10:57:52.392	2026-04-01 10:57:52.86	2026-04-01 10:57:52.392	2026-04-01 10:57:52.861	2026-04-01 10:57:52.392
472f7378-9208-4294-a5ad-61ff40383004	b1001c15-3e22-4d3f-b80b-08eeb774338c	47d9c408-1a3c-46c1-aecf-6f1746615499	VIEWER	2026-04-01 10:55:42.875	2026-04-01 10:56:21.023	2026-04-01 10:55:42.875	2026-04-01 10:56:21.024	2026-04-01 10:56:12.876
75c5ca95-c185-43e2-bffc-c01dc19f01fd	dfaa6a9c-3d1f-45cb-9074-f48e4f7026e7	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-01 17:44:57.893	2026-04-01 17:44:58.553	2026-04-01 17:44:57.893	2026-04-01 17:44:58.554	2026-04-01 17:44:57.893
3075b2ce-ba00-4527-86e8-bd83d8bbf859	67dca92d-3a1a-4799-87ba-a6504d628339	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-01 19:08:53.461	2026-04-01 19:08:53.935	2026-04-01 19:08:53.461	2026-04-01 19:08:53.937	2026-04-01 19:08:53.461
23f11b9b-68f4-45c2-9cbb-e9a72c46e963	dfaa6a9c-3d1f-45cb-9074-f48e4f7026e7	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-01 17:44:58.606	2026-04-01 17:45:16.697	2026-04-01 17:44:58.606	2026-04-01 17:45:16.704	2026-04-01 17:45:13.562
bc8b145d-b48e-4cc8-81af-9ec7c1ad6be2	2a4f4ba0-dca4-4aa3-b002-10e5a2af132f	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-01 10:57:52.944	2026-04-01 10:58:44.11	2026-04-01 10:57:52.944	2026-04-01 10:58:44.116	2026-04-01 10:58:37.936
3d806d88-19ea-48c7-a0bc-5f45825b6ab1	b40bfeac-ca8f-443b-b72d-8f058d898446	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-01 18:22:32.616	2026-04-01 18:22:33.071	2026-04-01 18:22:32.616	2026-04-01 18:22:33.072	2026-04-01 18:22:32.616
b8a3bebf-a7aa-4c66-9f45-6dcf300f3656	2a4f4ba0-dca4-4aa3-b002-10e5a2af132f	47d9c408-1a3c-46c1-aecf-6f1746615499	VIEWER	2026-04-01 10:58:10.898	2026-04-01 10:58:44.11	2026-04-01 10:58:10.898	2026-04-01 10:58:44.116	2026-04-01 10:58:40.886
6b595aca-0325-40f3-9c36-0c1d77c9c76c	e55f590d-d03f-4d86-b1b6-57ae61910a99	281ac0c9-d22b-4ece-895a-9d2c86a8f315	HOST	2026-04-01 15:50:06.435	2026-04-01 15:50:07.507	2026-04-01 15:50:06.435	2026-04-01 15:50:07.508	2026-04-01 15:50:06.435
541b9beb-187b-46a6-b664-881a4d05b1ae	e94455bd-d7a9-455b-8e7a-9b12f15bff19	47d9c408-1a3c-46c1-aecf-6f1746615499	VIEWER	2026-04-01 18:41:14.257	2026-04-01 18:41:47.946	2026-04-01 18:41:14.257	2026-04-01 18:41:47.954	2026-04-01 18:41:44.25
32791dbd-719e-4461-9bfc-6de1b5c381a1	b40bfeac-ca8f-443b-b72d-8f058d898446	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-01 18:22:33.15	2026-04-01 18:22:56.504	2026-04-01 18:22:33.15	2026-04-01 18:22:56.511	2026-04-01 18:22:48.127
4742bf66-7d98-4355-a5d6-a361fd764109	3e3724e2-4413-41e0-8a19-451579092edb	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-01 18:23:00.308	2026-04-01 18:23:00.75	2026-04-01 18:23:00.308	2026-04-01 18:23:00.751	2026-04-01 18:23:00.308
22f84ac1-af29-460a-8a84-0ce3835f8db8	e94455bd-d7a9-455b-8e7a-9b12f15bff19	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-01 18:40:30.453	2026-04-01 18:41:47.946	2026-04-01 18:40:30.453	2026-04-01 18:41:47.954	2026-04-01 18:41:45.451
33597b13-7c8d-4864-a3fd-c2d793c8b8ce	844886a5-96fd-49c7-ba1c-f2eea3d7ce01	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-01 19:08:13.35	2026-04-01 19:08:13.939	2026-04-01 19:08:13.35	2026-04-01 19:08:13.941	2026-04-01 19:08:13.35
9915c72d-0a0d-400a-a448-94eb0c956caa	67dca92d-3a1a-4799-87ba-a6504d628339	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-01 19:08:53.961	2026-04-01 19:12:09.412	2026-04-01 19:08:53.961	2026-04-01 19:12:09.419	2026-04-01 19:11:22.579
a788038a-4145-4d8f-b98a-e90b21dd769e	844886a5-96fd-49c7-ba1c-f2eea3d7ce01	47d9c408-1a3c-46c1-aecf-6f1746615499	VIEWER	2026-04-01 19:08:25.591	2026-04-01 19:08:49.567	2026-04-01 19:08:25.591	2026-04-01 19:08:49.574	2026-04-01 19:08:40.565
c40b15d9-4120-4240-aa4f-d781e2b4fa5e	844886a5-96fd-49c7-ba1c-f2eea3d7ce01	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-01 19:08:13.992	2026-04-01 19:08:49.567	2026-04-01 19:08:13.992	2026-04-01 19:08:49.574	2026-04-01 19:08:43.994
5c8a625b-06ab-463f-ae29-89be2e54f074	67dca92d-3a1a-4799-87ba-a6504d628339	47d9c408-1a3c-46c1-aecf-6f1746615499	GUEST	2026-04-01 19:09:02.034	2026-04-01 19:12:09.412	2026-04-01 19:09:02.034	2026-04-01 19:12:09.419	2026-04-01 19:12:02.195
b4074f12-94e1-43e6-8434-d048d1b36614	80abe71e-5ff4-4f83-9f52-0d650aad154d	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-01 19:46:45.698	2026-04-01 19:46:46.334	2026-04-01 19:46:45.698	2026-04-01 19:46:46.335	2026-04-01 19:46:45.698
27f8325b-a453-4508-8a16-f67c7c4c119c	80abe71e-5ff4-4f83-9f52-0d650aad154d	47d9c408-1a3c-46c1-aecf-6f1746615499	GUEST	2026-04-01 19:46:50.629	2026-04-01 19:53:41.862	2026-04-01 19:46:50.629	2026-04-01 19:53:41.871	2026-04-01 19:53:36.037
823d8fd3-da41-42bd-bb2a-6a50aeb36360	96c5ce44-1733-46ba-a957-e79cf5c5f9a3	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-04-01 19:53:56.668	2026-04-01 19:53:57.119	2026-04-01 19:53:56.668	2026-04-01 19:53:57.12	2026-04-01 19:53:56.668
6e36ecba-3d28-4576-9cc0-6d51241bd749	80abe71e-5ff4-4f83-9f52-0d650aad154d	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-01 19:46:46.42	2026-04-01 19:53:41.862	2026-04-01 19:46:46.42	2026-04-01 19:53:41.871	2026-04-01 19:53:31.759
1b67fe85-ef5a-4566-96f9-34520e64cc8a	96c5ce44-1733-46ba-a957-e79cf5c5f9a3	3961fabe-1345-4426-bd8a-ca0a5eac3aac	VIEWER	2026-04-01 19:53:59.751	2026-04-01 19:54:26.419	2026-04-01 19:53:59.751	2026-04-01 19:54:26.421	2026-04-01 19:54:14.76
06603793-b9da-40e7-8330-79220c9d98c9	96c5ce44-1733-46ba-a957-e79cf5c5f9a3	3961fabe-1345-4426-bd8a-ca0a5eac3aac	VIEWER	2026-04-01 19:54:27.73	2026-04-01 19:59:58.77	2026-04-01 19:54:27.73	2026-04-01 19:59:58.772	2026-04-01 19:59:57.874
0cb85302-ae00-48f5-b6ab-637a67b97b7d	96c5ce44-1733-46ba-a957-e79cf5c5f9a3	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-04-01 19:53:57.142	2026-04-01 20:06:17.699	2026-04-01 19:53:57.142	2026-04-01 20:06:17.706	2026-04-01 20:06:12.849
c69fd01b-7629-44b3-9c9d-ae17b57ddde3	385f01e7-5ce6-4797-a65f-371c2d99937b	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-04-01 20:09:21.737	2026-04-01 20:09:22.204	2026-04-01 20:09:21.737	2026-04-01 20:09:22.205	2026-04-01 20:09:21.737
99d5a47c-36f9-4670-81c7-ff5617077f6c	8b79dfb5-2b29-4dea-9546-8a1c908be9c3	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-01 20:33:37.902	2026-04-01 20:33:38.36	2026-04-01 20:33:37.902	2026-04-01 20:33:38.361	2026-04-01 20:33:37.902
afc505f7-6a1e-4ac7-87db-830eb0dbf725	26952696-6533-46e8-933c-2b008248ff6f	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-04-02 03:16:15.28	2026-04-02 03:16:16.3	2026-04-02 03:16:15.28	2026-04-02 03:16:16.302	2026-04-02 03:16:15.28
ef45e674-0207-4a88-a2a6-fb26ec383df5	66000676-e56a-4c26-a200-4a930987e019	c5c904e8-da40-4458-b8bf-5c2cc97348b1	HOST	2026-04-01 22:26:44.352	2026-04-01 22:26:44.762	2026-04-01 22:26:44.352	2026-04-01 22:26:44.763	2026-04-01 22:26:44.352
2ccfdb57-dee5-4079-b311-44b5b08b1304	385f01e7-5ce6-4797-a65f-371c2d99937b	3961fabe-1345-4426-bd8a-ca0a5eac3aac	GUEST	2026-04-01 20:09:28.307	2026-04-01 20:09:36.863	2026-04-01 20:09:28.307	2026-04-01 20:09:36.865	2026-04-01 20:09:28.372
42cb9b7d-d67d-40b2-9301-a5e156ef19c7	8b79dfb5-2b29-4dea-9546-8a1c908be9c3	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-01 20:33:38.376	2026-04-01 20:33:42.2	2026-04-01 20:33:38.376	2026-04-01 20:33:42.207	2026-04-01 20:33:38.432
e2a2654c-d993-4b74-a419-ce10c5362054	ad4abb54-e038-4c35-8785-d7c2f4389b91	c5c904e8-da40-4458-b8bf-5c2cc97348b1	HOST	2026-04-01 22:53:31.891	2026-04-01 22:54:36.817	2026-04-01 22:53:31.891	2026-04-01 22:54:36.825	2026-04-01 22:53:46.852
89e92f0d-8640-44ec-8649-eeba69f16e3b	385f01e7-5ce6-4797-a65f-371c2d99937b	3961fabe-1345-4426-bd8a-ca0a5eac3aac	GUEST	2026-04-01 20:09:41.337	2026-04-01 20:09:58.234	2026-04-01 20:09:41.337	2026-04-01 20:09:58.235	2026-04-01 20:09:41.408
a5b6865a-e424-46d0-9b00-5fa79f2dc8a6	47b34798-029a-4f4e-87b7-77bb2aaabfdd	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-04-01 20:55:51.768	2026-04-01 21:02:37.698	2026-04-01 20:55:51.768	2026-04-01 21:02:37.707	2026-04-01 21:02:37.147
451e562c-47ce-46c8-b54c-edca3d0095da	385f01e7-5ce6-4797-a65f-371c2d99937b	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-04-01 20:09:22.263	2026-04-01 20:10:45.97	2026-04-01 20:09:22.263	2026-04-01 20:10:45.977	2026-04-01 20:10:37.289
fa1d1afb-3cfb-46f8-8fee-b6ed03829fd9	ef05d047-00b7-4faa-b9d9-3f19c3aced8d	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-04-01 21:37:45.592	2026-04-01 21:37:46.128	2026-04-01 21:37:45.592	2026-04-01 21:37:46.129	2026-04-01 21:37:45.592
cbdecd63-1b76-4336-9479-98034d86bcd7	81b21678-d5db-4d79-9ced-ee6219312102	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-04-01 20:10:50.916	2026-04-01 20:10:51.301	2026-04-01 20:10:50.916	2026-04-01 20:10:51.302	2026-04-01 20:10:50.916
fbc7cef6-65bb-4509-8c40-422fb5a59390	8932ebc4-876d-4cb4-8fbe-d59e05767546	47d9c408-1a3c-46c1-aecf-6f1746615499	VIEWER	2026-04-01 22:32:04.994	2026-04-01 22:35:35.042	2026-04-01 22:32:04.994	2026-04-01 22:35:35.044	2026-04-01 22:35:20.177
1eef59c6-4e22-4acb-bdc5-4a9d16b4accb	81b21678-d5db-4d79-9ced-ee6219312102	3961fabe-1345-4426-bd8a-ca0a5eac3aac	VIEWER	2026-04-01 20:10:55.851	2026-04-01 20:10:58.338	2026-04-01 20:10:55.851	2026-04-01 20:10:58.339	2026-04-01 20:10:55.851
a2e3c2bd-9877-4120-9d16-929d0bb8ed6a	f9480f50-6974-4f22-a4fc-fb81800d97ad	c5c904e8-da40-4458-b8bf-5c2cc97348b1	HOST	2026-04-01 23:06:18.128	2026-04-01 23:06:18.716	2026-04-01 23:06:18.128	2026-04-01 23:06:18.718	2026-04-01 23:06:18.128
a1e9a0e9-69b2-425a-af52-014f868a5800	66000676-e56a-4c26-a200-4a930987e019	3961fabe-1345-4426-bd8a-ca0a5eac3aac	VIEWER	2026-04-01 22:27:03.175	2026-04-01 22:30:36.712	2026-04-01 22:27:03.175	2026-04-01 22:30:36.713	2026-04-01 22:30:33.298
4e798150-02d7-4369-a38e-74941014090f	81b21678-d5db-4d79-9ced-ee6219312102	3961fabe-1345-4426-bd8a-ca0a5eac3aac	GUEST	2026-04-01 20:11:09.927	2026-04-01 20:11:17.722	2026-04-01 20:11:09.927	2026-04-01 20:11:17.724	2026-04-01 20:11:09.981
8922fbb1-c49b-49b3-aaf4-50ee14ce5385	66000676-e56a-4c26-a200-4a930987e019	3961fabe-1345-4426-bd8a-ca0a5eac3aac	VIEWER	2026-04-01 22:30:37.671	2026-04-01 22:30:50.655	2026-04-01 22:30:37.671	2026-04-01 22:30:50.656	2026-04-01 22:30:37.671
738c8371-a187-44a6-ab89-29201838f129	bdffc9c0-0103-4b5a-b3a6-0605f683ca23	c5c904e8-da40-4458-b8bf-5c2cc97348b1	VIEWER	2026-04-01 22:12:30.939	2026-04-01 22:14:08.65	2026-04-01 22:12:30.939	2026-04-01 22:14:08.651	2026-04-01 22:14:01.006
3a612075-3834-4f11-a3cd-165cbb10ffb6	66000676-e56a-4c26-a200-4a930987e019	c5c904e8-da40-4458-b8bf-5c2cc97348b1	HOST	2026-04-01 22:26:44.792	2026-04-01 22:30:57.36	2026-04-01 22:26:44.792	2026-04-01 22:30:57.367	2026-04-01 22:30:55.547
f9e342be-6b79-41ee-ab52-75fa470ff03c	52b78333-2d5a-46b2-b968-94f906ec3136	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-04-01 20:33:29.689	2026-04-01 20:53:12.737	2026-04-01 20:33:29.689	2026-04-01 20:53:12.745	2026-04-01 20:53:00.892
cad56419-a860-45f3-a00f-45c65d8bcb3b	47b34798-029a-4f4e-87b7-77bb2aaabfdd	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-04-01 20:55:51.226	2026-04-01 20:55:51.71	2026-04-01 20:55:51.226	2026-04-01 20:55:51.712	2026-04-01 20:55:51.226
080df6a8-b7c8-4203-85ed-8d013fa1dbb5	965a2f65-fc61-413e-a675-9197dcd0d373	c5c904e8-da40-4458-b8bf-5c2cc97348b1	HOST	2026-04-01 22:14:34.637	2026-04-01 22:14:34.889	2026-04-01 22:14:34.637	2026-04-01 22:14:34.89	2026-04-01 22:14:34.637
29c93c17-fc61-4958-80a0-f1aaa1ca2ad2	bdffc9c0-0103-4b5a-b3a6-0605f683ca23	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-01 22:12:22.778	2026-04-01 22:14:35.923	2026-04-01 22:12:22.778	2026-04-01 22:14:35.931	2026-04-01 22:14:22.866
0cf9b094-d321-44b5-9cd2-f754d5c24d89	8932ebc4-876d-4cb4-8fbe-d59e05767546	c5c904e8-da40-4458-b8bf-5c2cc97348b1	HOST	2026-04-01 22:31:05.344	2026-04-01 22:31:05.904	2026-04-01 22:31:05.344	2026-04-01 22:31:05.906	2026-04-01 22:31:05.344
6f302406-e2a8-43aa-861c-a0caef1f930e	81b21678-d5db-4d79-9ced-ee6219312102	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-04-01 20:10:51.326	2026-04-01 20:15:37.431	2026-04-01 20:10:51.326	2026-04-01 20:15:37.439	2026-04-01 20:15:36.606
f3c2926f-7cd3-4331-89b6-c5daa923b511	52b78333-2d5a-46b2-b968-94f906ec3136	3961fabe-1345-4426-bd8a-ca0a5eac3aac	GUEST	2026-04-01 20:33:44.749	2026-04-01 20:43:52.814	2026-04-01 20:33:44.749	2026-04-01 20:43:52.816	2026-04-01 20:43:45.296
2dc45606-31db-481f-91e1-36c90db81a97	8932ebc4-876d-4cb4-8fbe-d59e05767546	3961fabe-1345-4426-bd8a-ca0a5eac3aac	VIEWER	2026-04-01 22:31:06.955	2026-04-01 22:34:29.921	2026-04-01 22:31:06.955	2026-04-01 22:34:29.923	2026-04-01 22:34:22.136
724bc2f3-d1e0-4bca-849a-8c1e21b25d50	8fc0ae7c-4c43-46b0-aac9-44e8469aeb49	3961fabe-1345-4426-bd8a-ca0a5eac3aac	GUEST	2026-04-01 22:09:21.269	2026-04-01 22:11:43.443	2026-04-01 22:09:21.269	2026-04-01 22:11:43.444	2026-04-01 22:11:36.358
d4125e6d-b486-480a-b6b7-4b7cf9192a3c	965a2f65-fc61-413e-a675-9197dcd0d373	3961fabe-1345-4426-bd8a-ca0a5eac3aac	VIEWER	2026-04-01 22:14:39.595	2026-04-01 22:18:36.205	2026-04-01 22:14:39.595	2026-04-01 22:18:36.206	2026-04-01 22:18:26.875
9fbb5ba6-d5a7-4534-8c95-6ae1e207049f	954b55ba-be54-456f-81eb-31c108c42ae6	c5c904e8-da40-4458-b8bf-5c2cc97348b1	VIEWER	2026-04-01 23:14:14.725	2026-04-01 23:15:31.459	2026-04-01 23:14:14.725	2026-04-01 23:15:31.461	2026-04-01 23:15:29.741
b011e9de-c25d-4f76-83e9-fd42010ae1a8	965a2f65-fc61-413e-a675-9197dcd0d373	c5c904e8-da40-4458-b8bf-5c2cc97348b1	HOST	2026-04-01 22:14:34.96	2026-04-01 22:18:43.541	2026-04-01 22:14:34.96	2026-04-01 22:18:43.548	2026-04-01 22:18:37.788
e8969b29-c630-483f-9083-7a9f570ae813	8fc0ae7c-4c43-46b0-aac9-44e8469aeb49	47d9c408-1a3c-46c1-aecf-6f1746615499	VIEWER	2026-04-01 22:09:25.614	2026-04-01 22:12:14.36	2026-04-01 22:09:25.614	2026-04-01 22:12:14.361	2026-04-01 22:12:10.768
6a7918d1-1be5-404a-911a-1a1df7516641	8fc0ae7c-4c43-46b0-aac9-44e8469aeb49	c5c904e8-da40-4458-b8bf-5c2cc97348b1	HOST	2026-04-01 22:09:18.766	2026-04-01 22:12:17.318	2026-04-01 22:09:18.766	2026-04-01 22:12:17.325	2026-04-01 22:12:04.657
9205a237-1998-4725-abc5-8909a7af13ae	ef05d047-00b7-4faa-b9d9-3f19c3aced8d	3961fabe-1345-4426-bd8a-ca0a5eac3aac	VIEWER	2026-04-01 21:37:51.815	2026-04-01 21:40:53.634	2026-04-01 21:37:51.815	2026-04-01 21:40:53.635	2026-04-01 21:40:51.981
4477c5d3-b5e4-4de1-83ee-df0cbf003ba2	ef05d047-00b7-4faa-b9d9-3f19c3aced8d	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-04-01 21:37:46.185	2026-04-01 21:40:57.358	2026-04-01 21:37:46.185	2026-04-01 21:40:57.366	2026-04-01 21:40:46.317
0ee92026-a80b-4412-baf1-05530a50ca37	8fc0ae7c-4c43-46b0-aac9-44e8469aeb49	c5c904e8-da40-4458-b8bf-5c2cc97348b1	HOST	2026-04-01 22:09:18.419	2026-04-01 22:09:18.694	2026-04-01 22:09:18.419	2026-04-01 22:09:18.695	2026-04-01 22:09:18.419
a234c5a2-8593-440f-84b2-6421ff1b5180	bdffc9c0-0103-4b5a-b3a6-0605f683ca23	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-01 22:12:22.042	2026-04-01 22:12:22.737	2026-04-01 22:12:22.042	2026-04-01 22:12:22.738	2026-04-01 22:12:22.042
76f841d0-ab0a-4361-9e23-7ca9be8e8abf	47ea64c7-11c3-4b29-ace3-adeef70dde13	c5c904e8-da40-4458-b8bf-5c2cc97348b1	HOST	2026-04-01 22:26:18.475	2026-04-01 22:26:19.022	2026-04-01 22:26:18.475	2026-04-01 22:26:19.023	2026-04-01 22:26:18.475
eb75f17e-3df6-4088-8741-7b7e1457ff59	8932ebc4-876d-4cb4-8fbe-d59e05767546	281ac0c9-d22b-4ece-895a-9d2c86a8f315	VIEWER	2026-04-01 22:37:17.78	2026-04-01 22:37:34.483	2026-04-01 22:37:17.78	2026-04-01 22:37:34.484	2026-04-01 22:37:32.8
ab01ded4-e8ac-4592-aeb3-3a31b77bdc6a	27819416-1f12-4c8d-939d-318f6dc2adb7	3961fabe-1345-4426-bd8a-ca0a5eac3aac	VIEWER	2026-04-01 23:12:45.237	2026-04-01 23:12:58.964	2026-04-01 23:12:45.237	2026-04-01 23:12:58.966	2026-04-01 23:12:45.237
304a7cf2-17fb-4e9d-96e8-6b9e3a19d18c	954b55ba-be54-456f-81eb-31c108c42ae6	281ac0c9-d22b-4ece-895a-9d2c86a8f315	HOST	2026-04-01 23:13:48.286	2026-04-01 23:13:49.08	2026-04-01 23:13:48.286	2026-04-01 23:13:49.081	2026-04-01 23:13:49.072
3a39d6ae-408f-4c87-ae98-d52643d919ec	47ea64c7-11c3-4b29-ace3-adeef70dde13	3961fabe-1345-4426-bd8a-ca0a5eac3aac	VIEWER	2026-04-01 22:26:24.001	2026-04-01 22:26:26.16	2026-04-01 22:26:24.001	2026-04-01 22:26:26.168	2026-04-01 22:26:24.018
53b7f710-6ab4-48f5-b90e-4917b903bd05	47ea64c7-11c3-4b29-ace3-adeef70dde13	c5c904e8-da40-4458-b8bf-5c2cc97348b1	HOST	2026-04-01 22:26:19.092	2026-04-01 22:26:26.16	2026-04-01 22:26:19.092	2026-04-01 22:26:26.168	2026-04-01 22:26:19.092
3300148b-59a3-4432-8dad-905c3eaf0108	27819416-1f12-4c8d-939d-318f6dc2adb7	281ac0c9-d22b-4ece-895a-9d2c86a8f315	HOST	2026-04-01 23:09:53.968	2026-04-01 23:13:12.282	2026-04-01 23:09:53.968	2026-04-01 23:13:12.284	2026-04-01 23:13:04.541
311be56a-c092-48d2-b9ca-4004c9a9f082	8932ebc4-876d-4cb4-8fbe-d59e05767546	281ac0c9-d22b-4ece-895a-9d2c86a8f315	VIEWER	2026-04-01 22:38:09.387	2026-04-01 22:38:11.613	2026-04-01 22:38:09.387	2026-04-01 22:38:11.62	2026-04-01 22:38:09.387
c48f6281-de11-4cc3-bdfc-7cc64e330b6f	8932ebc4-876d-4cb4-8fbe-d59e05767546	47d9c408-1a3c-46c1-aecf-6f1746615499	VIEWER	2026-04-01 22:35:39.107	2026-04-01 22:38:11.613	2026-04-01 22:35:39.107	2026-04-01 22:38:11.62	2026-04-01 22:38:09.206
29d99cd5-6f6f-4aa9-a13a-cdfcaa3e3e16	8932ebc4-876d-4cb4-8fbe-d59e05767546	c5c904e8-da40-4458-b8bf-5c2cc97348b1	HOST	2026-04-01 22:31:05.927	2026-04-01 22:38:11.613	2026-04-01 22:31:05.927	2026-04-01 22:38:11.62	2026-04-01 22:37:25.947
902f3b99-2dff-4b54-a501-7dd6a19d6bba	ad4abb54-e038-4c35-8785-d7c2f4389b91	c5c904e8-da40-4458-b8bf-5c2cc97348b1	HOST	2026-04-01 22:53:31.298	2026-04-01 22:53:31.825	2026-04-01 22:53:31.298	2026-04-01 22:53:31.826	2026-04-01 22:53:31.298
4c236c60-caae-46d8-97bd-5bbda2c30ab2	8932ebc4-876d-4cb4-8fbe-d59e05767546	3961fabe-1345-4426-bd8a-ca0a5eac3aac	VIEWER	2026-04-01 22:34:31.217	2026-04-01 22:36:53.264	2026-04-01 22:34:31.217	2026-04-01 22:36:53.266	2026-04-01 22:36:46.336
06cc3453-f375-47ec-a6b4-d1e77aec6224	f9480f50-6974-4f22-a4fc-fb81800d97ad	c5c904e8-da40-4458-b8bf-5c2cc97348b1	HOST	2026-04-01 23:06:18.778	2026-04-01 23:06:58.066	2026-04-01 23:06:18.778	2026-04-01 23:06:58.073	2026-04-01 23:06:48.736
a001f751-17ca-4e8d-b833-e13726b008d6	f9480f50-6974-4f22-a4fc-fb81800d97ad	3961fabe-1345-4426-bd8a-ca0a5eac3aac	GUEST	2026-04-01 23:06:38.56	2026-04-01 23:06:58.066	2026-04-01 23:06:38.56	2026-04-01 23:06:58.073	2026-04-01 23:06:53.533
4ec09ee0-fa31-42bf-97eb-c552dc7e2258	27819416-1f12-4c8d-939d-318f6dc2adb7	281ac0c9-d22b-4ece-895a-9d2c86a8f315	HOST	2026-04-01 23:09:52.879	2026-04-01 23:09:53.947	2026-04-01 23:09:52.879	2026-04-01 23:09:53.948	2026-04-01 23:09:52.879
d1b8e051-a437-4bcf-ba71-379e5dd7bfef	27819416-1f12-4c8d-939d-318f6dc2adb7	281ac0c9-d22b-4ece-895a-9d2c86a8f315	HOST	2026-04-01 23:13:14.08	2026-04-01 23:13:19.463	2026-04-01 23:13:14.08	2026-04-01 23:13:19.47	2026-04-01 23:13:14.15
4ec6c6dc-54a7-4983-b8f3-0d56059c8405	954b55ba-be54-456f-81eb-31c108c42ae6	3961fabe-1345-4426-bd8a-ca0a5eac3aac	VIEWER	2026-04-01 23:13:50.412	2026-04-01 23:18:41.421	2026-04-01 23:13:50.412	2026-04-01 23:18:41.422	2026-04-01 23:18:35.632
40778666-0321-4de3-9016-04ba983a45b9	954b55ba-be54-456f-81eb-31c108c42ae6	c5c904e8-da40-4458-b8bf-5c2cc97348b1	VIEWER	2026-04-01 23:15:33.301	2026-04-01 23:17:54.619	2026-04-01 23:15:33.301	2026-04-01 23:17:54.62	2026-04-01 23:17:48.409
fc5df373-29ab-4aae-bfbe-24a27d723742	954b55ba-be54-456f-81eb-31c108c42ae6	c5c904e8-da40-4458-b8bf-5c2cc97348b1	VIEWER	2026-04-01 23:17:56.832	2026-04-01 23:19:03.62	2026-04-01 23:17:56.832	2026-04-01 23:19:03.621	2026-04-01 23:18:57.318
e6604a41-1346-43a1-9c93-76a84b00e689	954b55ba-be54-456f-81eb-31c108c42ae6	3961fabe-1345-4426-bd8a-ca0a5eac3aac	VIEWER	2026-04-01 23:18:45.963	2026-04-01 23:20:07.521	2026-04-01 23:18:45.963	2026-04-01 23:20:07.523	2026-04-01 23:20:01.016
44d68c3c-4bf9-4f80-8df0-e72c76ecd51b	954b55ba-be54-456f-81eb-31c108c42ae6	3961fabe-1345-4426-bd8a-ca0a5eac3aac	GUEST	2026-04-01 23:20:09.717	2026-04-01 23:20:48.429	2026-04-01 23:20:09.717	2026-04-01 23:20:48.437	2026-04-01 23:20:39.735
718c7198-f9b0-41a3-afd4-d4f5890f02a5	954b55ba-be54-456f-81eb-31c108c42ae6	c5c904e8-da40-4458-b8bf-5c2cc97348b1	VIEWER	2026-04-01 23:20:28.293	2026-04-01 23:20:43.51	2026-04-01 23:20:28.293	2026-04-01 23:20:43.512	2026-04-01 23:20:43.305
5dda1ccc-9a61-4e74-b29f-1bcedf852a40	b524fe7d-3e1a-42cc-9ab8-6c873b378fe0	281ac0c9-d22b-4ece-895a-9d2c86a8f315	HOST	2026-04-01 23:21:13.037	2026-04-01 23:21:13.869	2026-04-01 23:21:13.037	2026-04-01 23:21:13.87	2026-04-01 23:21:13.037
2424ae92-17ec-43d2-844a-bd750d94b719	b524fe7d-3e1a-42cc-9ab8-6c873b378fe0	3961fabe-1345-4426-bd8a-ca0a5eac3aac	VIEWER	2026-04-01 23:21:14.793	2026-04-01 23:21:21.747	2026-04-01 23:21:14.793	2026-04-01 23:21:21.748	2026-04-01 23:21:14.813
9f628661-f4c0-4122-8811-d9a00cfae1fe	b524fe7d-3e1a-42cc-9ab8-6c873b378fe0	3961fabe-1345-4426-bd8a-ca0a5eac3aac	VIEWER	2026-04-01 23:21:22.787	2026-04-01 23:25:52.326	2026-04-01 23:21:22.787	2026-04-01 23:25:52.327	2026-04-01 23:25:43.493
06f46abe-9f7f-4274-b021-fed5d8e0b443	b524fe7d-3e1a-42cc-9ab8-6c873b378fe0	281ac0c9-d22b-4ece-895a-9d2c86a8f315	HOST	2026-04-01 23:21:13.891	2026-04-01 23:29:47.123	2026-04-01 23:21:13.891	2026-04-01 23:29:47.131	2026-04-01 23:28:58.95
6983b063-a657-4afa-bd0a-2697f40d133a	a1587cc4-753b-4449-ab03-823d0b214d7e	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-02 00:51:16.111	2026-04-02 00:51:16.923	2026-04-02 00:51:16.111	2026-04-02 00:51:16.925	2026-04-02 00:51:16.111
2e32adf4-f3c0-4346-8881-c79fd410ee4d	aecbabc9-20a5-4860-9800-dec04c2a3be2	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-04 04:35:39.758	2026-04-04 04:35:40.276	2026-04-04 04:35:39.758	2026-04-04 04:35:40.277	2026-04-04 04:35:39.758
6b174694-a4b7-4080-9b07-488ba68dbfe9	5300c527-4d0c-4d4a-87de-65872b40b423	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-04 04:06:40.204	2026-04-04 04:34:42.355	2026-04-04 04:06:40.204	2026-04-04 04:34:42.365	2026-04-04 04:34:41.883
2cb5738f-b3b5-448a-8b40-84c5845ba11c	fa770eba-c6d5-4379-a889-02d245470438	e9134380-2da7-4a1e-bd2a-34398f85a6e5	VIEWER	2026-04-02 10:55:55.054	2026-04-02 20:25:41.202	2026-04-02 10:55:55.054	2026-04-02 20:25:41.21	2026-04-02 20:25:31.934
bc4e119f-395b-4841-8ae3-d7a2870b467e	fa770eba-c6d5-4379-a889-02d245470438	9f70646e-c63e-4a08-a4fa-8786204bbf4e	VIEWER	2026-04-02 09:23:16.426	2026-04-02 09:23:20.205	2026-04-02 09:23:16.426	2026-04-02 09:23:20.206	2026-04-02 09:23:16.459
27dcde09-3ccc-49a2-81c2-ac47bb84ba63	caa0abb9-6866-4ca0-b96f-884c19bb1e6b	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-04-02 04:49:16.406	2026-04-02 05:26:08.709	2026-04-02 04:49:16.406	2026-04-02 05:26:08.719	2026-04-02 05:26:03.697
0560a1dc-440d-4b9f-bfd8-62b3b6d8d191	f27bbc6e-ec14-42ca-9967-e0c59af47a35	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-04 04:55:27.258	2026-04-04 04:55:27.743	2026-04-04 04:55:27.258	2026-04-04 04:55:27.745	2026-04-04 04:55:27.258
89d8ccaf-77d9-4d48-b936-2590c074d63b	d4c944f1-c309-4ae5-975e-67659f876f87	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-04-02 05:26:33.426	2026-04-02 05:26:33.966	2026-04-02 05:26:33.426	2026-04-02 05:26:33.967	2026-04-02 05:26:33.426
fc8dd1ea-4119-4cb1-ac89-a5357fe69e32	fa770eba-c6d5-4379-a889-02d245470438	9f70646e-c63e-4a08-a4fa-8786204bbf4e	VIEWER	2026-04-02 09:23:28.924	2026-04-02 09:23:31.088	2026-04-02 09:23:28.924	2026-04-02 09:23:31.09	2026-04-02 09:23:28.924
fdd9434d-0fa5-4b9b-9156-12a1a4472218	16813a30-c789-445e-94f5-13b58c02b245	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-04-02 05:55:53.146	2026-04-02 06:02:50.377	2026-04-02 05:55:53.146	2026-04-02 06:02:50.385	2026-04-02 06:02:38.324
0d8abc1b-ce46-4fb1-8225-0a30a43d7381	a1587cc4-753b-4449-ab03-823d0b214d7e	47d9c408-1a3c-46c1-aecf-6f1746615499	VIEWER	2026-04-02 00:51:22.569	2026-04-02 00:53:27.228	2026-04-02 00:51:22.569	2026-04-02 00:53:27.229	2026-04-02 00:53:22.654
68c05fe2-a724-4b57-8b2b-7605cbdc1171	63a3a45c-bfb5-4fc9-bd52-0443d45c7c6a	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-04-02 06:13:14.683	2026-04-02 06:13:15.204	2026-04-02 06:13:14.683	2026-04-02 06:13:15.205	2026-04-02 06:13:14.683
318cc266-4f73-4e95-8e60-b864ecf93208	53725353-c8cb-40f3-941c-343cca5b8976	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-04-02 03:17:06.628	2026-04-02 04:48:45.677	2026-04-02 03:17:06.628	2026-04-02 04:48:45.689	2026-04-02 04:48:42.448
2cb89083-cf9c-47d4-9b05-d7838b39343c	2d4e49c4-54c5-4f34-ac4c-97f86f7fb80f	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-02 20:28:33.546	2026-04-02 20:28:34.956	2026-04-02 20:28:33.546	2026-04-02 20:28:34.958	2026-04-02 20:28:33.546
27b32332-5ddc-4447-882d-bf56ac5ab83f	63a3a45c-bfb5-4fc9-bd52-0443d45c7c6a	9f70646e-c63e-4a08-a4fa-8786204bbf4e	VIEWER	2026-04-02 06:13:20.231	2026-04-02 06:13:31.096	2026-04-02 06:13:20.231	2026-04-02 06:13:31.103	2026-04-02 06:13:20.249
33a12c4e-cd89-46da-97d5-8f3dc967fa52	02615b24-131a-4df4-953f-9802b3cd3047	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-04-02 02:01:21.149	2026-04-02 03:15:26.799	2026-04-02 02:01:21.149	2026-04-02 03:15:26.812	2026-04-02 03:15:25.779
d7b6052e-760e-4de1-91f2-af29c90d09cb	02615b24-131a-4df4-953f-9802b3cd3047	9f70646e-c63e-4a08-a4fa-8786204bbf4e	VIEWER	2026-04-02 02:01:27.611	2026-04-02 03:15:26.799	2026-04-02 02:01:27.611	2026-04-02 03:15:26.812	2026-04-02 03:15:17.218
4df54b70-54ce-44c6-9c3d-bdfa2dbe5202	67f6598c-24a7-4ec3-b926-6cc10daf0586	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-04-02 06:13:38.261	2026-04-02 06:13:38.645	2026-04-02 06:13:38.261	2026-04-02 06:13:38.646	2026-04-02 06:13:38.261
65d0d850-40e1-480f-aae5-f46d9a8a3ca3	26952696-6533-46e8-933c-2b008248ff6f	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-04-02 03:16:16.364	2026-04-02 03:17:01.284	2026-04-02 03:16:16.364	2026-04-02 03:17:01.291	2026-04-02 03:17:01.054
9210ba94-4e65-4a87-b668-8a11ab57a06a	53725353-c8cb-40f3-941c-343cca5b8976	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-04-02 03:17:06.229	2026-04-02 03:17:06.603	2026-04-02 03:17:06.229	2026-04-02 03:17:06.604	2026-04-02 03:17:06.229
cef81afe-e774-4fea-8235-0ee180a859fe	d47d3d9f-ac85-4586-b09b-aba3dc40df91	47d9c408-1a3c-46c1-aecf-6f1746615499	VIEWER	2026-04-02 22:57:49.439	2026-04-02 22:58:09.746	2026-04-02 22:57:49.439	2026-04-02 22:58:09.747	2026-04-02 22:58:04.416
12e3e74d-78ee-4ee5-9bfe-870b4905ac93	a324b73d-282e-406c-8407-fafeb191cfb3	9f70646e-c63e-4a08-a4fa-8786204bbf4e	VIEWER	2026-04-02 05:37:19.884	2026-04-02 05:55:16.786	2026-04-02 05:37:19.884	2026-04-02 05:55:16.796	2026-04-02 05:55:05.947
c1dd80c8-204e-4115-9a47-be61981b8800	acde2759-a974-49ef-845d-3343abfa947b	e9134380-2da7-4a1e-bd2a-34398f85a6e5	VIEWER	2026-04-02 06:57:23.378	2026-04-02 07:56:06.415	2026-04-02 06:57:23.378	2026-04-02 07:56:06.428	2026-04-02 07:55:57.439
64727621-c7d7-40e2-a5db-6cc318042d8a	92851de4-b5ed-42de-9afb-6fb22306d1e1	3961fabe-1345-4426-bd8a-ca0a5eac3aac	VIEWER	2026-04-02 21:21:05.457	2026-04-02 21:23:58.211	2026-04-02 21:21:05.457	2026-04-02 21:23:58.212	2026-04-02 21:23:50.473
a9aba6d8-d466-420e-b13a-8b6355065fc3	92851de4-b5ed-42de-9afb-6fb22306d1e1	e9134380-2da7-4a1e-bd2a-34398f85a6e5	HOST	2026-04-02 21:15:40.59	2026-04-02 21:24:06.861	2026-04-02 21:15:40.59	2026-04-02 21:24:06.869	2026-04-02 21:23:56.074
269686ce-3253-487e-8027-8500a112b8c0	0419c286-af86-4be5-91cf-4d57e8af21ed	e9134380-2da7-4a1e-bd2a-34398f85a6e5	HOST	2026-04-02 20:29:08.338	2026-04-02 20:53:56.55	2026-04-02 20:29:08.338	2026-04-02 20:53:56.559	2026-04-02 20:53:54.913
88b606d8-7ff1-4786-993a-49105937d615	cc5dd290-ad46-40a3-bc08-19fee473d6a3	3961fabe-1345-4426-bd8a-ca0a5eac3aac	VIEWER	2026-04-02 22:34:47.377	2026-04-02 22:38:44.051	2026-04-02 22:34:47.377	2026-04-02 22:38:44.052	2026-04-02 22:38:32.48
24c31347-ef9c-4c98-9f0d-0c7b9f2bfcdf	0419c286-af86-4be5-91cf-4d57e8af21ed	3961fabe-1345-4426-bd8a-ca0a5eac3aac	VIEWER	2026-04-02 20:29:14.069	2026-04-02 20:30:14.378	2026-04-02 20:29:14.069	2026-04-02 20:30:14.38	2026-04-02 20:30:14.019
44eb6d8b-14c6-452d-9ee4-d6419895e419	5778b4b4-bfc5-46db-8082-7ce78ff31a78	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-02 22:56:46.025	2026-04-02 22:56:46.602	2026-04-02 22:56:46.025	2026-04-02 22:56:46.603	2026-04-02 22:56:46.025
a0de889b-74ef-4f3d-bbdd-301c37fd09ca	67f6598c-24a7-4ec3-b926-6cc10daf0586	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-04-02 06:13:38.667	2026-04-02 06:40:09.259	2026-04-02 06:13:38.667	2026-04-02 06:40:09.268	2026-04-02 06:39:55.37
daebdf33-17e7-4c69-b5c4-da9175fbaa2f	acde2759-a974-49ef-845d-3343abfa947b	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-04-02 06:41:08.137	2026-04-02 06:41:08.953	2026-04-02 06:41:08.137	2026-04-02 06:41:08.954	2026-04-02 06:41:08.137
61646914-c2d8-42ea-8d3d-c232c01a6302	d4c944f1-c309-4ae5-975e-67659f876f87	9f70646e-c63e-4a08-a4fa-8786204bbf4e	VIEWER	2026-04-02 05:26:37.177	2026-04-02 05:36:44.258	2026-04-02 05:26:37.177	2026-04-02 05:36:44.266	2026-04-02 05:36:37.785
7aca71d5-fa23-4d4c-8cee-a83060e06e0b	a324b73d-282e-406c-8407-fafeb191cfb3	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-04-02 05:37:17.986	2026-04-02 05:37:18.463	2026-04-02 05:37:17.986	2026-04-02 05:37:18.464	2026-04-02 05:37:17.986
a9707028-d6b9-47e7-94b0-f90294a187f4	ff734555-0341-4657-ad73-a528786cfc96	9f70646e-c63e-4a08-a4fa-8786204bbf4e	HOST	2026-04-02 06:41:13.039	2026-04-02 06:41:13.244	2026-04-02 06:41:13.039	2026-04-02 06:41:13.246	2026-04-02 06:41:13.039
b65ede60-2274-4c0c-a267-17f16c851ee4	acde2759-a974-49ef-845d-3343abfa947b	9f70646e-c63e-4a08-a4fa-8786204bbf4e	VIEWER	2026-04-02 06:41:18.317	2026-04-02 07:02:25.245	2026-04-02 06:41:18.317	2026-04-02 07:02:25.246	2026-04-02 07:02:19.796
e4abbaa0-2a71-40e2-b36d-1536c9c6a126	69ea0705-43cd-4173-bc2c-8e2377162b70	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-02 22:38:56.927	2026-04-02 22:39:22.428	2026-04-02 22:38:56.927	2026-04-02 22:39:22.429	2026-04-02 22:39:13.38
220773f7-d6c1-4eab-ba74-e2d15bf57537	f398c85e-4dba-42e6-add2-ea305fcd0575	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-02 22:39:29.249	2026-04-02 22:39:29.626	2026-04-02 22:39:29.249	2026-04-02 22:39:29.628	2026-04-02 22:39:29.249
ada98804-2adc-448a-8ea7-c496080930e7	a35d4aab-2842-4d65-a959-d6084c335a15	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-04-02 21:38:47.012	2026-04-02 21:40:20.806	2026-04-02 21:38:47.012	2026-04-02 21:40:20.815	2026-04-02 21:40:17.054
6d0a0282-1de9-428f-abcb-2bad89035a7f	c0ee23c7-f6ae-46f8-9a98-7182e883a000	7e2a5e6d-7021-482a-abeb-883f8ebf016b	VIEWER	2026-04-02 08:02:07.101	2026-04-02 09:06:17.691	2026-04-02 08:02:07.101	2026-04-02 09:06:17.701	2026-04-02 09:06:11.114
cdac2b30-6d94-419b-9c1e-86952f685c73	67f6598c-24a7-4ec3-b926-6cc10daf0586	9f70646e-c63e-4a08-a4fa-8786204bbf4e	VIEWER	2026-04-02 06:13:45.258	2026-04-02 06:21:40.013	2026-04-02 06:13:45.258	2026-04-02 06:21:40.015	2026-04-02 06:21:30.736
bdda10eb-df1c-4045-bf44-18144dc865e7	c0ee23c7-f6ae-46f8-9a98-7182e883a000	9f70646e-c63e-4a08-a4fa-8786204bbf4e	VIEWER	2026-04-02 08:02:12.246	2026-04-02 09:06:17.691	2026-04-02 08:02:12.246	2026-04-02 09:06:17.701	2026-04-02 09:06:16.236
4eafa7c6-db3f-48ef-ba35-af7e9a20c229	f50c16f0-d9a9-42a9-84c9-06344237287c	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-04-02 21:40:53.54	2026-04-02 21:40:53.937	2026-04-02 21:40:53.54	2026-04-02 21:40:53.939	2026-04-02 21:40:53.54
152ae4a0-2855-4d46-9be7-efcffc4357b0	fa770eba-c6d5-4379-a889-02d245470438	c5c904e8-da40-4458-b8bf-5c2cc97348b1	VIEWER	2026-04-02 20:23:50.926	2026-04-02 20:25:35.098	2026-04-02 20:23:50.926	2026-04-02 20:25:35.099	2026-04-02 20:25:32.935
018f44f8-8325-4797-ab80-757aedbdc396	e09120b6-e993-43fb-9a40-680e8654de4d	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-04-02 22:55:44.011	2026-04-02 22:55:44.496	2026-04-02 22:55:44.011	2026-04-02 22:55:44.497	2026-04-02 22:55:44.011
58880c3d-e61c-48e8-9ae2-dce64b6cb8f1	0419c286-af86-4be5-91cf-4d57e8af21ed	3961fabe-1345-4426-bd8a-ca0a5eac3aac	VIEWER	2026-04-02 20:30:47.509	2026-04-02 20:31:26.526	2026-04-02 20:30:47.509	2026-04-02 20:31:26.528	2026-04-02 20:31:17.547
654c4ee0-c0f6-4230-b7f0-e92406796b45	fa770eba-c6d5-4379-a889-02d245470438	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-04-02 09:22:48.323	2026-04-02 20:25:41.202	2026-04-02 09:22:48.323	2026-04-02 20:25:41.21	2026-04-02 20:25:31.246
9d42e209-ca9d-463b-b3cb-5d9bc7c6dd84	d009276d-12d6-4cc2-9b13-66057b20f812	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-04-02 22:00:01.387	2026-04-02 22:00:33.202	2026-04-02 22:00:01.387	2026-04-02 22:00:33.21	2026-04-02 22:00:31.365
685ba716-5a39-4dc2-ad96-d2addbf6bb0a	77a6dee4-8367-44ed-8c3c-ce9e3a9f0d44	3961fabe-1345-4426-bd8a-ca0a5eac3aac	VIEWER	2026-04-02 22:00:57.523	2026-04-02 22:09:40.426	2026-04-02 22:00:57.523	2026-04-02 22:09:40.427	2026-04-02 22:09:27.751
25f5f81c-2f26-42f2-919b-8390ecc074d4	5e5ed126-17c9-4b3c-abc6-3a1f4862fc43	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-04-02 22:56:41.184	2026-04-02 22:56:59.529	2026-04-02 22:56:41.184	2026-04-02 22:56:59.537	2026-04-02 22:56:56.168
60a29e3f-6a6c-4355-a2ca-9c6c8532421f	e09120b6-e993-43fb-9a40-680e8654de4d	3961fabe-1345-4426-bd8a-ca0a5eac3aac	VIEWER	2026-04-02 22:55:51.578	2026-04-02 22:56:02.101	2026-04-02 22:55:51.578	2026-04-02 22:56:02.103	2026-04-02 22:55:51.668
8deef272-890e-48b4-a2d3-695e69c3a4ef	09b0ff8c-d177-437f-9895-622c4bd1b117	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-04-02 22:28:09.606	2026-04-02 22:28:45.106	2026-04-02 22:28:09.606	2026-04-02 22:28:45.113	2026-04-02 22:28:39.563
01099d88-d897-44f9-a44d-7594657a407f	cc5dd290-ad46-40a3-bc08-19fee473d6a3	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-04-02 22:34:40.946	2026-04-02 22:34:41.402	2026-04-02 22:34:40.946	2026-04-02 22:34:41.403	2026-04-02 22:34:40.946
7c51e29e-f125-4777-9c01-2ccba4f32cc2	5ff4847f-a310-41e8-ac54-711d51db07dd	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-04-02 22:56:13.984	2026-04-02 22:56:25.809	2026-04-02 22:56:13.984	2026-04-02 22:56:25.81	2026-04-02 22:56:13.984
237540b9-8b8c-428a-88c1-ceb37f3e888b	d47d3d9f-ac85-4586-b09b-aba3dc40df91	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-02 22:57:43.752	2026-04-02 22:57:44.181	2026-04-02 22:57:43.752	2026-04-02 22:57:44.182	2026-04-02 22:57:43.752
bb6598b3-a9e2-49a8-bd80-472dc6e6f16a	97dd1700-f4f1-4f39-b36e-0c2e59037d29	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-04-03 01:33:36.805	2026-04-03 01:33:37.318	2026-04-03 01:33:36.805	2026-04-03 01:33:37.32	2026-04-03 01:33:36.805
d2b55aba-b4a9-4dc6-9b1f-b832d65040d5	40a0a34e-b7a6-4086-84e9-32d5f8ad0cc3	3961fabe-1345-4426-bd8a-ca0a5eac3aac	GUEST	2026-04-03 02:07:06.804	2026-04-03 02:07:07.455	2026-04-03 02:07:06.804	2026-04-03 02:07:07.456	2026-04-03 02:07:06.804
6819ccbd-4cbd-4840-a878-e477e1bf6199	ced55ebf-ceca-4ba3-9455-717e57d6ee14	3961fabe-1345-4426-bd8a-ca0a5eac3aac	GUEST	2026-04-03 02:07:08.504	2026-04-03 02:07:46.176	2026-04-03 02:07:08.504	2026-04-03 02:07:46.178	2026-04-03 02:07:38.509
5f5bc6ec-31cc-4bfc-9478-d700366dd48c	40a0a34e-b7a6-4086-84e9-32d5f8ad0cc3	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-04-03 01:35:53.303	2026-04-03 02:07:00.414	2026-04-03 01:35:53.303	2026-04-03 02:07:00.424	2026-04-03 02:06:55.189
31b48a72-dc64-420d-b3b1-1ec53af26d90	d80774e1-d6b5-4da7-841b-d3ff095b7ba8	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-03 02:08:04.035	2026-04-03 02:08:04.531	2026-04-03 02:08:04.035	2026-04-03 02:08:04.533	2026-04-03 02:08:04.035
89d1d976-cdf9-4a2f-a21c-dd0a03662d27	6e4971ff-7e58-4c78-be5b-f7fd7b3d7373	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-04-03 02:54:31.074	2026-04-03 02:54:31.576	2026-04-03 02:54:31.074	2026-04-03 02:54:31.577	2026-04-03 02:54:31.074
bbf16866-0e90-4379-ba77-2974639b7f9d	d80774e1-d6b5-4da7-841b-d3ff095b7ba8	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-03 02:08:04.551	2026-04-03 02:14:37.285	2026-04-03 02:08:04.551	2026-04-03 02:14:37.296	2026-04-03 02:14:34.905
68dc6cfa-0082-4b45-ab9e-619b0bbe61dc	d80774e1-d6b5-4da7-841b-d3ff095b7ba8	47d9c408-1a3c-46c1-aecf-6f1746615499	GUEST	2026-04-03 02:08:09.604	2026-04-03 02:14:37.285	2026-04-03 02:08:09.604	2026-04-03 02:14:37.296	2026-04-03 02:14:24.96
97110faa-6a94-45f7-93c5-72be3e6db06e	5300c527-4d0c-4d4a-87de-65872b40b423	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-04 04:06:39.326	2026-04-04 04:06:40.177	2026-04-04 04:06:39.326	2026-04-04 04:06:40.179	2026-04-04 04:06:39.326
4cb44848-d560-4cce-8b89-42f1e898777f	6e4971ff-7e58-4c78-be5b-f7fd7b3d7373	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-04-03 02:54:31.631	2026-04-03 06:55:37.335	2026-04-03 02:54:31.631	2026-04-03 06:55:37.345	2026-04-03 06:43:46.447
6ad569c9-bbce-4b4a-b8b9-66ff59a00da0	6e4971ff-7e58-4c78-be5b-f7fd7b3d7373	9f70646e-c63e-4a08-a4fa-8786204bbf4e	GUEST	2026-04-03 02:54:35.07	2026-04-03 06:55:37.335	2026-04-03 02:54:35.07	2026-04-03 06:55:37.345	2026-04-03 06:55:35.631
bb4f5aad-4e5c-41dc-9e5d-b9db30d90088	fa770eba-c6d5-4379-a889-02d245470438	e9134380-2da7-4a1e-bd2a-34398f85a6e5	VIEWER	2026-04-02 09:22:55.716	2026-04-02 10:55:53.686	2026-04-02 09:22:55.716	2026-04-02 10:55:53.687	2026-04-02 10:55:39.46
6411e8b4-12da-4025-a0c3-ba56e5079dea	96456357-7470-40d4-bb0d-957c49561d88	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-04-02 01:45:10.611	2026-04-02 01:59:26.212	2026-04-02 01:45:10.611	2026-04-02 01:59:26.223	2026-04-02 01:59:11.493
91dfa77f-a1f1-4e5c-8c58-0ef43407ec93	96456357-7470-40d4-bb0d-957c49561d88	9f70646e-c63e-4a08-a4fa-8786204bbf4e	GUEST	2026-04-02 01:45:13.33	2026-04-02 01:59:26.212	2026-04-02 01:45:13.33	2026-04-02 01:59:26.223	2026-04-02 01:59:14.193
4073c82e-76ae-4de2-8f8c-b2f5771e47ed	92851de4-b5ed-42de-9afb-6fb22306d1e1	3961fabe-1345-4426-bd8a-ca0a5eac3aac	VIEWER	2026-04-02 21:16:36.249	2026-04-02 21:17:05.573	2026-04-02 21:16:36.249	2026-04-02 21:17:05.574	2026-04-02 21:16:51.209
2faab26f-149f-43e6-9a5c-fc0318fca033	fa770eba-c6d5-4379-a889-02d245470438	3961fabe-1345-4426-bd8a-ca0a5eac3aac	VIEWER	2026-04-02 11:00:56.384	2026-04-02 11:06:16.87	2026-04-02 11:00:56.384	2026-04-02 11:06:16.872	2026-04-02 11:06:11.826
3f6ffda5-ba68-4cdf-92e2-9991efaef53b	26952696-6533-46e8-933c-2b008248ff6f	9f70646e-c63e-4a08-a4fa-8786204bbf4e	VIEWER	2026-04-02 03:16:26.541	2026-04-02 03:17:01.284	2026-04-02 03:16:26.541	2026-04-02 03:17:01.291	2026-04-02 03:16:56.452
7bb7d296-74a3-445c-a108-c6f28061b0f7	caa0abb9-6866-4ca0-b96f-884c19bb1e6b	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-04-02 04:49:15.753	2026-04-02 04:49:16.373	2026-04-02 04:49:15.753	2026-04-02 04:49:16.375	2026-04-02 04:49:15.753
8f234397-5390-494c-97d2-45d814ebb10a	a35d4aab-2842-4d65-a959-d6084c335a15	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-04-02 21:38:46.425	2026-04-02 21:38:46.957	2026-04-02 21:38:46.425	2026-04-02 21:38:46.958	2026-04-02 21:38:46.425
4f2c54ec-ef88-4424-9ea5-c54eea2532af	a324b73d-282e-406c-8407-fafeb191cfb3	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-04-02 05:37:18.509	2026-04-02 05:55:16.786	2026-04-02 05:37:18.509	2026-04-02 05:55:16.796	2026-04-02 05:55:04.553
c981f113-e059-49ee-bc74-4be86ef8afe4	16813a30-c789-445e-94f5-13b58c02b245	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-04-02 05:55:52.395	2026-04-02 05:55:53.096	2026-04-02 05:55:52.395	2026-04-02 05:55:53.097	2026-04-02 05:55:52.395
ff032bc7-1697-4e65-aabb-7b960764c017	fa770eba-c6d5-4379-a889-02d245470438	9f70646e-c63e-4a08-a4fa-8786204bbf4e	VIEWER	2026-04-02 09:28:48.306	2026-04-02 20:25:41.202	2026-04-02 09:28:48.306	2026-04-02 20:25:41.21	2026-04-02 20:25:30.883
bd148d8f-e844-4680-8d26-bc92e4bc9cd7	2d4e49c4-54c5-4f34-ac4c-97f86f7fb80f	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-02 20:28:32.992	2026-04-02 20:28:33.493	2026-04-02 20:28:32.992	2026-04-02 20:28:33.494	2026-04-02 20:28:32.992
b125a40f-20e2-4948-8b7a-eafdf90644f5	fa770eba-c6d5-4379-a889-02d245470438	3961fabe-1345-4426-bd8a-ca0a5eac3aac	VIEWER	2026-04-02 09:30:28.895	2026-04-02 11:00:56.316	2026-04-02 09:30:28.895	2026-04-02 11:00:56.317	2026-04-02 11:00:49.709
d745c76b-89ea-4c26-a075-d1d7555f397c	acde2759-a974-49ef-845d-3343abfa947b	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-04-02 06:41:08.999	2026-04-02 07:56:06.415	2026-04-02 06:41:08.999	2026-04-02 07:56:06.428	2026-04-02 07:55:58.658
a5c2b014-50d4-451f-8516-6759be4f27fc	acde2759-a974-49ef-845d-3343abfa947b	7e2a5e6d-7021-482a-abeb-883f8ebf016b	VIEWER	2026-04-02 06:58:40.133	2026-04-02 07:56:06.415	2026-04-02 06:58:40.133	2026-04-02 07:56:06.428	2026-04-02 07:55:58.702
6f96cdff-0a8b-4509-8f28-3b078216c1c7	a1587cc4-753b-4449-ab03-823d0b214d7e	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-02 00:51:17.014	2026-04-02 00:57:49.685	2026-04-02 00:51:17.014	2026-04-02 00:57:49.693	2026-04-02 00:57:47.31
f5848654-eb24-43af-8e1f-3809ace0e24d	acde2759-a974-49ef-845d-3343abfa947b	9f70646e-c63e-4a08-a4fa-8786204bbf4e	GUEST	2026-04-02 07:02:28.125	2026-04-02 07:56:06.415	2026-04-02 07:02:28.125	2026-04-02 07:56:06.428	2026-04-02 07:56:01.444
49a38041-09df-4273-b7cf-86cd5922d980	f3574df7-3c50-44f9-b908-b84420c75b48	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-04-02 01:43:52.967	2026-04-02 01:43:53.742	2026-04-02 01:43:52.967	2026-04-02 01:43:53.743	2026-04-02 01:43:52.967
7e9cc1e6-1a31-4830-895e-eff9c674b3b5	c0ee23c7-f6ae-46f8-9a98-7182e883a000	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-04-02 08:02:00.592	2026-04-02 08:02:01.382	2026-04-02 08:02:00.592	2026-04-02 08:02:01.383	2026-04-02 08:02:00.592
4bcb39ad-1ddf-4072-8af0-7bc7b7bf8669	f3574df7-3c50-44f9-b908-b84420c75b48	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-04-02 01:43:53.811	2026-04-02 01:44:26.876	2026-04-02 01:43:53.811	2026-04-02 01:44:26.877	2026-04-02 01:44:24.127
6b654302-43e4-44ba-9b12-31c9c913d948	69ea0705-43cd-4173-bc2c-8e2377162b70	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-02 22:38:56.275	2026-04-02 22:38:56.865	2026-04-02 22:38:56.275	2026-04-02 22:38:56.866	2026-04-02 22:38:56.275
15588268-1fcf-4340-aaf4-aa9f3f604faf	2d4e49c4-54c5-4f34-ac4c-97f86f7fb80f	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-02 20:28:34.963	2026-04-02 20:28:46.677	2026-04-02 20:28:34.963	2026-04-02 20:28:46.683	2026-04-02 20:28:35.032
c48ab418-1168-416c-8a6d-30014214936e	d4c944f1-c309-4ae5-975e-67659f876f87	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-04-02 05:26:33.976	2026-04-02 05:36:44.258	2026-04-02 05:26:33.976	2026-04-02 05:36:44.266	2026-04-02 05:36:34.566
197445ed-5ce9-4c63-b222-6a91cdb505c3	f3574df7-3c50-44f9-b908-b84420c75b48	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-04-02 01:44:26.911	2026-04-02 01:45:05.356	2026-04-02 01:44:26.911	2026-04-02 01:45:05.364	2026-04-02 01:44:53.798
883b482c-daef-4d5e-999d-8b7618f5273a	f3574df7-3c50-44f9-b908-b84420c75b48	9f70646e-c63e-4a08-a4fa-8786204bbf4e	VIEWER	2026-04-02 01:44:56.393	2026-04-02 01:45:05.356	2026-04-02 01:44:56.393	2026-04-02 01:45:05.364	2026-04-02 01:44:56.412
753af44b-e59b-42f8-a312-61a5ec564f00	96456357-7470-40d4-bb0d-957c49561d88	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-04-02 01:45:10.206	2026-04-02 01:45:10.588	2026-04-02 01:45:10.206	2026-04-02 01:45:10.589	2026-04-02 01:45:10.206
3d4d69b3-904f-4652-99ca-ac075d774214	0419c286-af86-4be5-91cf-4d57e8af21ed	e9134380-2da7-4a1e-bd2a-34398f85a6e5	HOST	2026-04-02 20:29:07.81	2026-04-02 20:29:08.326	2026-04-02 20:29:07.81	2026-04-02 20:29:08.327	2026-04-02 20:29:07.81
30889506-73cb-43ce-9cd0-db817adf5d90	caa0abb9-6866-4ca0-b96f-884c19bb1e6b	9f70646e-c63e-4a08-a4fa-8786204bbf4e	VIEWER	2026-04-02 04:54:52.695	2026-04-02 05:26:08.709	2026-04-02 04:54:52.695	2026-04-02 05:26:08.719	2026-04-02 05:25:54.541
19035145-9102-4acb-a029-912d989b9aec	0419c286-af86-4be5-91cf-4d57e8af21ed	3961fabe-1345-4426-bd8a-ca0a5eac3aac	VIEWER	2026-04-02 20:30:28.949	2026-04-02 20:30:38.029	2026-04-02 20:30:28.949	2026-04-02 20:30:38.03	2026-04-02 20:30:28.949
48282e3b-8567-4c15-9507-e667a721a41a	92851de4-b5ed-42de-9afb-6fb22306d1e1	e9134380-2da7-4a1e-bd2a-34398f85a6e5	HOST	2026-04-02 21:15:39.663	2026-04-02 21:15:40.579	2026-04-02 21:15:39.663	2026-04-02 21:15:40.58	2026-04-02 21:15:39.663
b924b05d-4fd1-4abf-987f-c8e5cb5b7970	67f6598c-24a7-4ec3-b926-6cc10daf0586	9f70646e-c63e-4a08-a4fa-8786204bbf4e	GUEST	2026-04-02 06:21:52.832	2026-04-02 06:40:09.259	2026-04-02 06:21:52.832	2026-04-02 06:40:09.268	2026-04-02 06:40:08.925
955f5255-8fea-4727-94a3-2e4075443635	16813a30-c789-445e-94f5-13b58c02b245	9f70646e-c63e-4a08-a4fa-8786204bbf4e	VIEWER	2026-04-02 05:55:56.591	2026-04-02 06:02:50.377	2026-04-02 05:55:56.591	2026-04-02 06:02:50.385	2026-04-02 06:02:42.008
1a6c9947-fba1-4361-b8e6-31b8133e0279	5ff4847f-a310-41e8-ac54-711d51db07dd	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-04-02 22:56:25.823	2026-04-02 22:56:28.246	2026-04-02 22:56:25.823	2026-04-02 22:56:28.253	2026-04-02 22:56:25.841
45258bcc-bd0a-4123-933d-6f5bb2f34b3f	ff734555-0341-4657-ad73-a528786cfc96	9f70646e-c63e-4a08-a4fa-8786204bbf4e	HOST	2026-04-02 06:41:13.266	2026-04-02 06:41:15.641	2026-04-02 06:41:13.266	2026-04-02 06:41:15.648	2026-04-02 06:41:13.291
346c1223-0939-43dc-a35a-e76ca0a138d9	63a3a45c-bfb5-4fc9-bd52-0443d45c7c6a	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-04-02 06:13:15.227	2026-04-02 06:13:31.096	2026-04-02 06:13:15.227	2026-04-02 06:13:31.103	2026-04-02 06:13:30.213
b5afbc39-504f-4607-b24b-a1219150c383	c0ee23c7-f6ae-46f8-9a98-7182e883a000	e9134380-2da7-4a1e-bd2a-34398f85a6e5	GUEST	2026-04-02 08:02:10.032	2026-04-02 09:06:17.691	2026-04-02 08:02:10.032	2026-04-02 09:06:17.701	2026-04-02 09:06:14.048
7a92ed2c-bdbf-4db7-b18a-de9684ac4c49	fa770eba-c6d5-4379-a889-02d245470438	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-04-02 09:22:47.715	2026-04-02 09:22:48.296	2026-04-02 09:22:47.715	2026-04-02 09:22:48.298	2026-04-02 09:22:47.715
b759bbc4-6e59-44df-9474-3aecba8da706	09b0ff8c-d177-437f-9895-622c4bd1b117	3961fabe-1345-4426-bd8a-ca0a5eac3aac	VIEWER	2026-04-02 22:28:23.22	2026-04-02 22:28:40.609	2026-04-02 22:28:23.22	2026-04-02 22:28:40.621	2026-04-02 22:28:38.146
b77fad8c-92c7-4973-a600-d43c7061c735	a35d4aab-2842-4d65-a959-d6084c335a15	3961fabe-1345-4426-bd8a-ca0a5eac3aac	VIEWER	2026-04-02 21:38:53.382	2026-04-02 21:39:13.083	2026-04-02 21:38:53.382	2026-04-02 21:39:13.084	2026-04-02 21:39:08.323
8db9d3fd-cef6-4765-b72f-2112067127b4	92851de4-b5ed-42de-9afb-6fb22306d1e1	3961fabe-1345-4426-bd8a-ca0a5eac3aac	VIEWER	2026-04-02 21:15:45.013	2026-04-02 21:16:05.954	2026-04-02 21:15:45.013	2026-04-02 21:16:05.955	2026-04-02 21:16:00.056
9b6cd354-1b01-46fe-bbde-cff2e7e2d614	92851de4-b5ed-42de-9afb-6fb22306d1e1	3961fabe-1345-4426-bd8a-ca0a5eac3aac	VIEWER	2026-04-02 21:16:23.778	2026-04-02 21:16:27.566	2026-04-02 21:16:23.778	2026-04-02 21:16:27.567	2026-04-02 21:16:23.796
9d8f06c3-1562-4396-b6d8-60c1db5af4a7	d009276d-12d6-4cc2-9b13-66057b20f812	3961fabe-1345-4426-bd8a-ca0a5eac3aac	VIEWER	2026-04-02 22:00:08.898	2026-04-02 22:00:33.202	2026-04-02 22:00:08.898	2026-04-02 22:00:33.21	2026-04-02 22:00:23.88
988be422-e99f-45da-90c8-19b2bd716878	77a6dee4-8367-44ed-8c3c-ce9e3a9f0d44	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-04-02 22:00:54.994	2026-04-02 22:00:55.355	2026-04-02 22:00:54.994	2026-04-02 22:00:55.356	2026-04-02 22:00:54.994
002850d7-1ec3-4f6b-b623-e8c4a013a964	e09120b6-e993-43fb-9a40-680e8654de4d	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-04-02 22:55:44.556	2026-04-02 22:56:08.608	2026-04-02 22:55:44.556	2026-04-02 22:56:08.615	2026-04-02 22:55:59.5
a95652c6-dc31-4997-ba07-8c6bf77d7fcf	69ea0705-43cd-4173-bc2c-8e2377162b70	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-02 22:39:22.447	2026-04-02 22:39:25.455	2026-04-02 22:39:22.447	2026-04-02 22:39:25.463	2026-04-02 22:39:22.512
de618529-650d-4569-aaa0-5149f4633928	f50c16f0-d9a9-42a9-84c9-06344237287c	3961fabe-1345-4426-bd8a-ca0a5eac3aac	VIEWER	2026-04-02 21:41:00.014	2026-04-02 21:41:33.807	2026-04-02 21:41:00.014	2026-04-02 21:41:33.808	2026-04-02 21:41:30.04
18bb75ed-13a4-46eb-b947-c523c03cffad	f50c16f0-d9a9-42a9-84c9-06344237287c	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-04-02 21:40:53.964	2026-04-02 21:41:37.152	2026-04-02 21:40:53.964	2026-04-02 21:41:37.16	2026-04-02 21:41:23.96
f520ac79-57d3-40e8-bba2-d6c38896c1e8	d009276d-12d6-4cc2-9b13-66057b20f812	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-04-02 22:00:00.598	2026-04-02 22:00:01.319	2026-04-02 22:00:00.598	2026-04-02 22:00:01.32	2026-04-02 22:00:00.598
8e04ac5e-6203-4b76-a7f8-eb7fc85c83b6	77a6dee4-8367-44ed-8c3c-ce9e3a9f0d44	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-04-02 22:00:55.376	2026-04-02 22:27:09.067	2026-04-02 22:00:55.376	2026-04-02 22:27:09.077	2026-04-02 22:26:56.953
68ed78d9-9e6a-4ea7-adaf-9f08f7f44ae4	09b0ff8c-d177-437f-9895-622c4bd1b117	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-04-02 22:28:08.988	2026-04-02 22:28:09.546	2026-04-02 22:28:08.988	2026-04-02 22:28:09.547	2026-04-02 22:28:08.988
cd5b311c-c9cc-401c-8f8a-47b7a57005e1	f398c85e-4dba-42e6-add2-ea305fcd0575	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-02 22:39:29.644	2026-04-02 22:39:36.813	2026-04-02 22:39:29.644	2026-04-02 22:39:36.82	2026-04-02 22:39:29.668
1bad3205-cfeb-4162-ab85-543656d0c189	cc5dd290-ad46-40a3-bc08-19fee473d6a3	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-04-02 22:34:41.473	2026-04-02 22:38:50.288	2026-04-02 22:34:41.473	2026-04-02 22:38:50.298	2026-04-02 22:38:41.645
a6a7f7a1-0a2a-4b24-bd54-d813c5585fd2	5ff4847f-a310-41e8-ac54-711d51db07dd	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-04-02 22:56:13.573	2026-04-02 22:56:13.963	2026-04-02 22:56:13.573	2026-04-02 22:56:13.964	2026-04-02 22:56:13.573
1f032f6d-1841-45d0-9c6b-d885346006f9	5778b4b4-bfc5-46db-8082-7ce78ff31a78	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-02 22:56:46.623	2026-04-02 22:56:54.437	2026-04-02 22:56:46.623	2026-04-02 22:56:54.444	2026-04-02 22:56:46.636
ec86a9c3-c9b1-4b1b-8b35-d84b7377013a	5e5ed126-17c9-4b3c-abc6-3a1f4862fc43	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-04-02 22:56:40.772	2026-04-02 22:56:41.168	2026-04-02 22:56:40.772	2026-04-02 22:56:41.169	2026-04-02 22:56:40.772
5ed68401-b164-4874-8fe5-bdd51f65e9c5	d47d3d9f-ac85-4586-b09b-aba3dc40df91	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-02 22:57:44.2	2026-04-02 22:58:12.663	2026-04-02 22:57:44.2	2026-04-02 22:58:12.671	2026-04-02 22:57:59.188
b0277c86-7f1b-49bd-984d-2940413e9f79	97dd1700-f4f1-4f39-b36e-0c2e59037d29	3961fabe-1345-4426-bd8a-ca0a5eac3aac	GUEST	2026-04-03 01:34:15.831	2026-04-03 01:35:45.24	2026-04-03 01:34:15.831	2026-04-03 01:35:45.251	2026-04-03 01:35:00.865
d871b956-7a01-4efb-b760-0e6c8de292b7	40a0a34e-b7a6-4086-84e9-32d5f8ad0cc3	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-04-03 01:35:52.542	2026-04-03 01:35:53.24	2026-04-03 01:35:52.542	2026-04-03 01:35:53.241	2026-04-03 01:35:52.542
49044be7-2eea-46f1-8f48-34bed4223300	97dd1700-f4f1-4f39-b36e-0c2e59037d29	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-04-03 01:33:37.379	2026-04-03 01:35:45.24	2026-04-03 01:33:37.379	2026-04-03 01:35:45.251	2026-04-03 01:35:37.451
486923ab-a9ca-414f-898d-5b8aeea58efd	40a0a34e-b7a6-4086-84e9-32d5f8ad0cc3	3961fabe-1345-4426-bd8a-ca0a5eac3aac	VIEWER	2026-04-03 02:06:44.978	2026-04-03 02:07:00.414	2026-04-03 02:06:44.978	2026-04-03 02:07:00.424	2026-04-03 02:06:59.772
36f4b958-0517-4433-95e1-1a458897dcff	ced55ebf-ceca-4ba3-9455-717e57d6ee14	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-04-03 02:07:06.38	2026-04-03 02:07:06.872	2026-04-03 02:07:06.38	2026-04-03 02:07:06.873	2026-04-03 02:07:06.38
d3c31351-4876-447d-89aa-4441aaedff5e	40a0a34e-b7a6-4086-84e9-32d5f8ad0cc3	3961fabe-1345-4426-bd8a-ca0a5eac3aac	VIEWER	2026-04-03 02:07:07.783	2026-04-03 02:07:57.619	2026-04-03 02:07:07.783	2026-04-03 02:07:57.62	2026-04-03 02:07:07.783
a386f689-107c-433e-98ce-94f2c61e7813	ced55ebf-ceca-4ba3-9455-717e57d6ee14	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	2026-04-03 02:07:06.879	2026-04-03 02:07:50.794	2026-04-03 02:07:06.879	2026-04-03 02:07:50.803	2026-04-03 02:07:36.887
1d1777cf-a101-4dfb-afda-d34bbbf18ad0	aecbabc9-20a5-4860-9800-dec04c2a3be2	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-04 04:35:40.327	2026-04-04 04:54:44.454	2026-04-04 04:35:40.327	2026-04-04 04:54:44.464	2026-04-04 04:54:41.377
7ccddec4-5211-4557-aff1-e5529dc252d3	aecbabc9-20a5-4860-9800-dec04c2a3be2	9f70646e-c63e-4a08-a4fa-8786204bbf4e	VIEWER	2026-04-04 04:36:00.334	2026-04-04 04:54:44.454	2026-04-04 04:36:00.334	2026-04-04 04:54:44.464	2026-04-04 04:54:31.378
93d4c1e9-d597-4bee-81ec-a8c975cc568a	d69a323a-014b-454b-b94e-84333754ff95	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-04 06:22:06.463	2026-04-04 06:30:33.747	2026-04-04 06:22:06.463	2026-04-04 06:30:33.757	2026-04-04 06:30:21.879
002477ee-a448-46f3-8da3-351e456fb5a3	5300c527-4d0c-4d4a-87de-65872b40b423	9f70646e-c63e-4a08-a4fa-8786204bbf4e	VIEWER	2026-04-04 04:06:48.31	2026-04-04 04:34:42.355	2026-04-04 04:06:48.31	2026-04-04 04:34:42.365	2026-04-04 04:34:34.948
7a5fe341-0286-44d4-bac2-f887177ac555	f27bbc6e-ec14-42ca-9967-e0c59af47a35	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-04 04:55:27.804	2026-04-04 06:21:10.807	2026-04-04 04:55:27.804	2026-04-04 06:21:10.818	2026-04-04 06:19:48.215
26926afd-be86-47f5-bd70-8c606d630fca	f27bbc6e-ec14-42ca-9967-e0c59af47a35	9f70646e-c63e-4a08-a4fa-8786204bbf4e	VIEWER	2026-04-04 04:55:32.576	2026-04-04 06:21:10.807	2026-04-04 04:55:32.576	2026-04-04 06:21:10.818	2026-04-04 06:21:08.16
84577ab7-5ada-4690-8656-98002f059763	d69a323a-014b-454b-b94e-84333754ff95	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	2026-04-04 06:22:05.753	2026-04-04 06:22:06.431	2026-04-04 06:22:05.753	2026-04-04 06:22:06.432	2026-04-04 06:22:05.753
85fb254e-c3cd-48b9-964f-e74c00bb2d5f	d69a323a-014b-454b-b94e-84333754ff95	9f70646e-c63e-4a08-a4fa-8786204bbf4e	VIEWER	2026-04-04 06:22:10.931	2026-04-04 06:22:28.112	2026-04-04 06:22:10.931	2026-04-04 06:22:28.113	2026-04-04 06:22:25.891
\.


--
-- Data for Name: stream_schedules; Type: TABLE DATA; Schema: public; Owner: liveapp
--

COPY public.stream_schedules (id, user_id, is_recurring, title, description, timezone, day_of_week, time_24h, start_at, end_at, created_at, updated_at) FROM stdin;
c670f83b-4e5a-4a49-985a-e40fb299b27b	3961fabe-1345-4426-bd8a-ca0a5eac3aac	t	WET WEDNESDAYS	COME GET WET BITCH	America/New_York	3	20:00	\N	\N	2026-04-01 08:46:27.363	2026-04-01 08:46:27.363
\.


--
-- Data for Name: stream_user_restrictions; Type: TABLE DATA; Schema: public; Owner: liveapp
--

COPY public.stream_user_restrictions (id, stream_id, user_id, kind, reason, expires_at, created_by_user_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: stream_user_roles; Type: TABLE DATA; Schema: public; Owner: liveapp
--

COPY public.stream_user_roles (id, stream_id, user_id, role, assigned_by_user_id, created_at, updated_at) FROM stdin;
2e80b284-c61a-4560-8bf1-215fc0116147	c14d5337-d2f5-437b-8027-1b16bc4c05e4	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-03-29 09:09:32.42	2026-03-29 09:09:32.42
8b17185f-e519-4616-85cd-edc8a71a0e50	e62c5617-a1b9-4a41-9db3-8bd1cb2fc4b5	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	47d9c408-1a3c-46c1-aecf-6f1746615499	2026-03-29 09:15:03.972	2026-03-29 09:15:03.972
e970d7e7-1239-43c2-a194-b22f7b5e52d9	f95d9d98-2a21-4211-bda1-11573a7c3af5	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-03-29 09:18:44.655	2026-03-29 09:18:44.655
8763ecde-aea6-48cc-a63d-b2986dcd904e	c3d7818a-339f-4272-b8ed-6d0199a9ec94	e9134380-2da7-4a1e-bd2a-34398f85a6e5	HOST	e9134380-2da7-4a1e-bd2a-34398f85a6e5	2026-03-29 09:26:37.652	2026-03-29 09:26:37.652
fd699738-7c2c-4ade-9fea-210dbb854e9d	569e6a4e-20b2-4738-a3bc-943b2b64b592	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	47d9c408-1a3c-46c1-aecf-6f1746615499	2026-03-29 15:07:50.361	2026-03-29 15:07:50.361
8f27e4ae-0c6c-4355-9c84-d68bfa59052c	b709f1a0-1033-4489-89e2-95f950f80df4	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	47d9c408-1a3c-46c1-aecf-6f1746615499	2026-03-29 15:28:58.477	2026-03-29 15:28:58.477
ff469dac-b844-49ed-bbb0-f4f5459feabc	df5b5795-588b-449a-bc79-4e4930273c41	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	47d9c408-1a3c-46c1-aecf-6f1746615499	2026-03-29 15:31:23.604	2026-03-29 15:31:23.604
0165aca6-540b-4aac-a09a-57c1c203e50b	280ffffd-4a33-45f0-a894-53c5338a17a5	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	47d9c408-1a3c-46c1-aecf-6f1746615499	2026-03-29 15:47:46.69	2026-03-29 15:47:46.69
9597c9ce-c851-405b-8749-5487a9491a25	c7b495b1-4313-4e89-96f8-e97de8f53a20	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	47d9c408-1a3c-46c1-aecf-6f1746615499	2026-03-29 15:48:41.074	2026-03-29 15:48:41.074
3d881bf2-a7ca-489e-b685-81bc55912cc5	f15ddde3-9e7d-465b-b066-68cfd265e936	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	47d9c408-1a3c-46c1-aecf-6f1746615499	2026-03-29 15:50:25.852	2026-03-29 15:50:25.852
172c7291-8037-4764-8af5-e04a9fc9d2b1	1211e826-42f9-43a3-9f34-4b5955416e35	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	47d9c408-1a3c-46c1-aecf-6f1746615499	2026-03-29 15:56:20.335	2026-03-29 15:56:20.335
dabd0258-23c0-4226-9c2c-0d3711125f99	92603abb-c236-4f30-ba9a-4cea552553b3	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	47d9c408-1a3c-46c1-aecf-6f1746615499	2026-03-29 15:59:13.452	2026-03-29 15:59:13.452
116a9b27-39f2-4e25-a72a-852b03b0b113	26d45485-4e0e-4f87-926d-ed6a71c94b94	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	47d9c408-1a3c-46c1-aecf-6f1746615499	2026-03-29 16:07:18.853	2026-03-29 16:07:18.853
b1ebf64f-ec55-48c8-8e49-1a216d951990	b710b560-aa2d-4331-abdf-7f0a72366c72	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	47d9c408-1a3c-46c1-aecf-6f1746615499	2026-03-29 16:19:37.783	2026-03-29 16:19:37.783
d03c974d-9e46-404a-8099-f4b12226da3d	a15f2ff7-b78c-4ec7-a1bc-2959d4c5fb2c	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	47d9c408-1a3c-46c1-aecf-6f1746615499	2026-03-29 16:23:43.968	2026-03-29 16:23:43.968
73bc4e4a-d425-425c-be4d-884b219a8a91	6a446cf8-0c9e-4851-a05c-1f86213ecdaa	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-03-29 16:50:34.192	2026-03-29 16:50:34.192
46b5aac6-0faa-4bde-b1fe-e142daa69355	22cbb6f7-6961-4114-84f1-4e34ab302cf3	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-03-29 17:36:23.28	2026-03-29 17:36:23.28
570a5118-64a4-40ba-ad6c-373db869cd34	43fa6ef4-1c44-4c19-87b7-1273cb2e58e4	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-03-29 17:39:08.738	2026-03-29 17:39:08.738
2382f3a0-e493-4cc0-8b83-416ae9c83a76	d9628570-75b1-4b39-a25d-b7d2336130ef	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-03-29 17:44:49.908	2026-03-29 17:44:49.908
863d92f8-b9bf-4b65-8125-599cb3e28b9a	a7b5d4f1-ec2b-42ec-abb9-33d67ee5ac13	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-03-29 17:45:31.694	2026-03-29 17:45:31.694
40678ef8-d3eb-4d5d-b234-df91eafb3187	13dcf31d-77f4-4c3d-b7bc-f8a24b946f96	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-03-29 21:54:36.684	2026-03-29 21:54:36.684
841954e0-8705-46cc-8415-009131946721	08ca06b0-9449-4291-9a3c-172dae6e0656	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-03-29 21:57:52.449	2026-03-29 21:57:52.449
c245fbbc-121e-4eab-8354-f08519378137	165a9ca3-9b5d-4a8b-93ce-f17d5a9f490b	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-03-29 22:01:19.938	2026-03-29 22:01:19.938
9a56a0be-cc7b-408f-9e14-0541b849ee5e	10e2c843-05de-45cd-86dd-0ea21cda84c4	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-03-29 22:13:10.472	2026-03-29 22:13:10.472
482c9822-d58e-4fd2-9c2e-f444656e8b4d	b176fd7d-b6d0-4a60-8157-f50c5e9a23ea	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-03-29 22:14:51.985	2026-03-29 22:14:51.985
a940e253-c55c-4f33-ba5b-9603e0d34dfa	354a4e63-9feb-49bb-ab6d-12d281854c85	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-03-29 22:28:20.94	2026-03-29 22:28:20.94
b2379a7b-5213-476b-8f5c-901fd6490ef5	436bff59-7f3d-4179-9e25-6c4efbcbacb9	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-03-29 22:41:13.063	2026-03-29 22:41:13.063
7c9b0378-4526-44e3-afc7-c7d1aa92b497	2bd17abc-ad0a-47e5-8d60-f309468f6466	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-03-29 22:45:30.39	2026-03-29 22:45:30.39
20811159-4a66-4b93-bc19-68a861333aad	70f5a64f-078a-478a-9a44-68acce85461b	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-03-29 22:55:04.547	2026-03-29 22:55:04.547
d2358fc5-f04b-4186-9c00-27c67c46d276	9db1ac16-7231-4c90-8454-69660c40f761	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-03-29 23:10:24.51	2026-03-29 23:10:24.51
40fe799f-6fbe-441d-b2bc-075c60ac2aa9	86728898-a4e7-4ad7-a7c1-f04627cac589	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-03-29 23:11:18.885	2026-03-29 23:11:18.885
32734bfb-7027-465c-a941-e8f4d4a93019	10544059-6626-459a-b988-110e48f5fd85	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-03-29 23:12:01.95	2026-03-29 23:12:01.95
c90eb348-2c0e-48de-bcf5-e88f9e677051	6d6a1a95-6384-4252-9737-62aefe3d21b2	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-03-29 23:15:07.711	2026-03-29 23:15:07.711
989ec895-44e3-4a5d-bb02-6aff1da6882f	2da4eae4-5604-413b-a0a8-c9155c07b7cd	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-03-29 23:22:22.821	2026-03-29 23:22:22.821
a4e435aa-0123-42bb-895c-0609de80e4fc	8005af89-6a3a-4992-b2bb-b3fc7930c92c	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-03-29 23:22:59.183	2026-03-29 23:22:59.183
cd0d118a-837e-45bb-86e6-3ca69900c661	a2890620-e7a4-4122-913a-e532e9e5591b	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-03-29 23:56:25.583	2026-03-29 23:56:25.583
d85bcf8f-cf70-4cfd-a462-9e08f66e664a	77d1076b-ad76-41e3-b9b7-0042f1938066	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-03-29 23:57:32.961	2026-03-29 23:57:32.961
22f12440-79e1-42b7-b638-da7652f68a6a	32d6e607-c997-45ec-9cb2-7dfba5f1e5b6	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-03-30 00:04:32.591	2026-03-30 00:04:32.591
56630b57-5edb-4a26-a2d2-a70f17784089	445be4fe-583c-4e3f-b545-3be0ca1f5e2d	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-03-30 00:06:15.083	2026-03-30 00:06:15.083
c548bd35-a497-475f-9084-3ef2d169fca4	382c9037-0ef1-4184-9f67-1719c1e5ed27	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-03-30 00:11:49.146	2026-03-30 00:11:49.146
47df8c38-50b8-43a1-a7f4-27e972e213c8	f991d30e-d26c-4e52-80be-587c209787a2	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-03-30 00:13:50.751	2026-03-30 00:13:50.751
4413a774-3e8c-4aa1-96ed-f26f5358aae9	86125c98-2c14-4803-a7a5-0eb988a90635	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-03-30 00:57:20.527	2026-03-30 00:57:20.527
5fdf170d-9d42-4052-a1cb-3e7fb7e47cec	39cd9fde-9e23-4e3c-949d-550b33ee4f90	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-03-30 00:58:12.872	2026-03-30 00:58:12.872
55599aba-ee3e-44a9-baff-f12a83b2308b	9c7d7da2-6440-4236-b6ad-3730fcd8b403	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-03-30 01:11:56.066	2026-03-30 01:11:56.066
d5e37557-12e9-4bdb-89e1-2355d084096e	31227a63-d77c-4ff0-bb2c-33c95cca836a	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-03-30 01:27:19.017	2026-03-30 01:27:19.017
fac0c149-220f-446f-9d4d-88fd5ceb8b6d	bf6ab63d-445a-4e54-b4e1-2297258f8d98	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-03-30 01:45:50.188	2026-03-30 01:45:50.188
4a8c59f8-1b2b-46ba-9bcd-4fdd6a90761b	02a9d097-1bce-479f-b4e3-a2e941c55369	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-03-30 01:49:44.556	2026-03-30 01:49:44.556
e7fc6232-822b-4860-9fbb-f3122dcd8b5b	bd30a810-0868-4216-b030-da607a5a7cd6	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-03-30 01:55:32.283	2026-03-30 01:55:32.283
dbf55f3e-f9fc-48f3-9257-d0780179a78d	495bd926-8b1d-44c8-9a20-10721639313c	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-03-30 01:58:53.761	2026-03-30 01:58:53.761
182cffb5-2fbc-4bcc-8024-3c7b9bc0a0b0	f3b0301e-650e-438a-9581-cb2582b887a4	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-03-30 02:14:54.224	2026-03-30 02:14:54.224
cd31944e-58ab-4b55-985a-b74917ebe90d	ff03452b-730e-4aa3-9287-90f37a7be132	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-03-30 02:23:41.036	2026-03-30 02:23:41.036
cf888c92-48f9-470c-870a-c1c796358895	f7121682-ae4c-48e5-b566-fbf2ee36d1d6	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-03-30 02:24:14.541	2026-03-30 02:24:14.541
385d1221-bf3b-4f7a-a053-bd477fd14577	73103c83-901a-4e0a-b58c-329d8523ff3a	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-03-31 01:50:29.911	2026-03-31 01:50:29.911
bbf3d0b8-381b-4bdc-98e2-84ee6c5d850e	f2a4ec93-0634-498f-ab8e-60cd037ea291	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-04-01 01:58:42.694	2026-04-01 01:58:42.694
fd3f24a1-2de5-4047-a863-eb490c086475	389c03fe-873d-454a-91c0-dc059ceb7532	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-04-01 02:00:23.826	2026-04-01 02:00:23.826
10ab3633-6367-4e5a-b526-429f0b2c2a6f	084c6697-2f19-45b2-bf6c-f9fbfa2f1949	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-04-01 02:35:47.507	2026-04-01 02:35:47.507
ba938f7d-113b-4829-b299-445953b8e1ba	8f759ba1-d9e0-4c1f-b486-ed85be7ed073	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-04-01 03:10:17.342	2026-04-01 03:10:17.342
b6adce6b-81d3-4ebc-bd91-a91de6e1f7a3	f51a8588-7221-4f98-b449-ef68c9deba5d	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-04-01 03:18:16.079	2026-04-01 03:18:16.079
7a27c4eb-d205-493f-b855-6276b9bf674c	2146ffc2-a9dd-444e-9b0b-46973aca29d6	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-04-01 03:36:04.074	2026-04-01 03:36:04.074
3187f3c6-f533-46d5-8b30-ce0989422593	d55502ca-ce10-4099-b79a-54180cf83a8e	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-04-01 03:55:19.072	2026-04-01 03:55:19.072
cccd1e4c-315c-4a54-8a2e-fd129f680674	287240b3-4aca-4b24-85c0-0ba73fce38e8	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-04-01 03:59:12.934	2026-04-01 03:59:12.934
b7bf487c-bcb0-44ca-b9ae-5027779b761a	98cbd644-54d2-4f7d-999f-76cbd8682a66	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-04-01 04:02:02.837	2026-04-01 04:02:02.837
a5e6b2cb-8722-44e8-a1c6-2b582bd5df15	afc38820-d731-4072-90d9-285710074f89	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-04-01 04:15:51.118	2026-04-01 04:15:51.118
60d1aa65-058f-49f8-85f0-15d5067f1837	405bf147-56fa-4844-bbc2-86e73d57398a	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-04-01 04:33:00.443	2026-04-01 04:33:00.443
9cc847eb-d636-468d-b508-46f70cf337b2	d9736820-7961-41e6-9268-7a29224f49f7	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-04-01 04:33:42.586	2026-04-01 04:33:42.586
d8355b72-d422-4569-8960-7003fb211d3d	6ec74e99-6e58-4a60-9e94-1048f182d264	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-04-01 04:34:17.841	2026-04-01 04:34:17.841
aed6c669-44df-4658-9f82-08bd314cd57a	41b9646d-4f67-4978-843c-7e8df013240e	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-04-01 04:35:11.783	2026-04-01 04:35:11.783
248289a3-94e8-4400-b652-a8217b4701f4	485a0f7c-83b8-4c59-a55c-3604febb32b3	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-04-01 04:48:00.838	2026-04-01 04:48:00.838
8787df37-9f2e-4d8b-beae-5be658d7ac03	47c9010d-8a14-49b3-b32f-bd9edf385a18	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-04-01 04:52:29.124	2026-04-01 04:52:29.124
33ad37d1-6361-417a-967a-93756641431a	0302388d-14c6-43be-9880-5229aa377602	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-04-01 04:53:40.343	2026-04-01 04:53:40.343
a5ee5fdd-7b5f-45cb-b453-7a40cc2b7e0f	ace6f4ac-38cd-4699-a52d-84ef27384ecf	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-04-01 04:54:22.97	2026-04-01 04:54:22.97
9481f26b-df64-4dfc-93eb-cb09bbacd3c3	254ffb18-cb98-4685-a589-83850feb779e	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-04-01 05:25:53.45	2026-04-01 05:25:53.45
cc32e7a9-3f0d-4b78-917d-4c52b94960ec	29d035b3-3f77-434b-afda-634755777eb9	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-04-01 05:39:03.463	2026-04-01 05:39:03.463
bc94f8ff-1392-41b1-b4da-9c23791e8dcd	f8048731-7af5-4b84-8f7a-575ec801791d	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-04-01 05:44:47.036	2026-04-01 05:44:47.036
292101d7-bb29-4e3f-a2a9-7de16303846f	f908d303-37b5-4709-b160-fef59798a8ce	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-04-01 05:45:44.938	2026-04-01 05:45:44.938
3036850d-cd18-4e9c-9841-8363078d1483	4c787e07-3eb1-48fe-ad71-2a8f2856f1f3	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-04-01 05:46:05.371	2026-04-01 05:46:05.371
63c8c54e-a2f9-4733-a31a-3c1945c42229	e25a79f0-2a3f-4a6c-8bb6-8da4dcfcac78	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-04-01 05:56:09.887	2026-04-01 05:56:09.887
e0267179-88e4-4635-9b1d-d0a0e8be2715	8a3b6e2b-e790-4f38-ad5c-899c02a04b96	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-04-01 05:59:29.338	2026-04-01 05:59:29.338
7e83e8f8-ce94-4e28-b698-b06a8eb5bf93	d2777555-bf06-451a-899c-a5b3f5557779	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-04-01 08:41:35.625	2026-04-01 08:41:35.625
b3e78e75-ee61-4722-946c-97dc9be66158	ca347a9f-b6d8-498e-a455-5804fd34f781	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-04-01 09:09:41.052	2026-04-01 09:09:41.052
8a5ec579-2b2a-43ff-b3c9-289172931475	e7c18482-912b-4e3d-936b-ce153022829e	281ac0c9-d22b-4ece-895a-9d2c86a8f315	HOST	281ac0c9-d22b-4ece-895a-9d2c86a8f315	2026-04-01 09:12:07.09	2026-04-01 09:12:07.09
6eef93e2-1874-46a4-82be-20656c36b576	96233155-9731-4913-9dae-dfe7ba7269d7	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-04-01 09:22:29.816	2026-04-01 09:22:29.816
b2746af4-ebe2-41b8-abfd-fb1a4c849847	c54155e7-1039-4597-b336-3a7097a63284	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-04-01 09:23:17.441	2026-04-01 09:23:17.441
56a21529-2155-4229-a045-03388047eb13	2d2e25f5-33bd-4adf-b69e-150d53b5b108	281ac0c9-d22b-4ece-895a-9d2c86a8f315	HOST	281ac0c9-d22b-4ece-895a-9d2c86a8f315	2026-04-01 09:28:22.493	2026-04-01 09:28:22.493
af3fda6e-18f3-4068-8ec6-d3436ff3318a	e477bb1a-2d08-4e06-8455-6183aa8b6ba3	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-04-01 09:49:33.452	2026-04-01 09:49:33.452
30add571-d639-4538-9126-564440ac3e6f	128e8cc7-cc76-4367-b035-9423121bef49	281ac0c9-d22b-4ece-895a-9d2c86a8f315	HOST	281ac0c9-d22b-4ece-895a-9d2c86a8f315	2026-04-01 09:52:26.732	2026-04-01 09:52:26.732
f24e18d2-83ee-4788-8c75-4fca12484435	fc805175-e93f-49ef-834e-eaac90cec00f	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-04-01 09:53:09.89	2026-04-01 09:53:09.89
63d5ea4f-9090-4a8b-a1df-ef04db184146	481dad7d-d73f-4dce-b9a7-f24066eb069c	281ac0c9-d22b-4ece-895a-9d2c86a8f315	HOST	281ac0c9-d22b-4ece-895a-9d2c86a8f315	2026-04-01 09:54:28.813	2026-04-01 09:54:28.813
51acb85f-1e32-441c-a0c3-8278e2518d7f	b1001c15-3e22-4d3f-b80b-08eeb774338c	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-04-01 10:52:40.726	2026-04-01 10:52:40.726
71cf5ad4-3e4e-4fe0-8672-9bb60f6720c8	2a4f4ba0-dca4-4aa3-b002-10e5a2af132f	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-04-01 10:57:52.387	2026-04-01 10:57:52.387
937bfdf8-051d-4731-b569-ed33d5bc4d3c	e55f590d-d03f-4d86-b1b6-57ae61910a99	281ac0c9-d22b-4ece-895a-9d2c86a8f315	HOST	281ac0c9-d22b-4ece-895a-9d2c86a8f315	2026-04-01 15:50:06.43	2026-04-01 15:50:06.43
691a439d-ecc4-4207-9864-9fbd13da1fcf	dfaa6a9c-3d1f-45cb-9074-f48e4f7026e7	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-04-01 17:44:57.888	2026-04-01 17:44:57.888
b2d6cd9f-0bac-4d67-b973-1c741413f5db	b40bfeac-ca8f-443b-b72d-8f058d898446	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-04-01 18:22:32.611	2026-04-01 18:22:32.611
24b0d312-45d5-4272-8357-5b2b27faba3a	3e3724e2-4413-41e0-8a19-451579092edb	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-04-01 18:23:00.304	2026-04-01 18:23:00.304
9102f679-bcea-44f5-9de2-d88706e767a0	e94455bd-d7a9-455b-8e7a-9b12f15bff19	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-04-01 18:40:29.69	2026-04-01 18:40:29.69
2896cc80-8d99-45e9-825b-c74f2f7f9c12	844886a5-96fd-49c7-ba1c-f2eea3d7ce01	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-04-01 19:08:13.343	2026-04-01 19:08:13.343
2cd91c6d-be0e-4691-9f5a-6c5861160ac3	67dca92d-3a1a-4799-87ba-a6504d628339	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-04-01 19:08:53.456	2026-04-01 19:08:53.456
255c2100-1d90-46ed-86da-6652b084c2c7	80abe71e-5ff4-4f83-9f52-0d650aad154d	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-04-01 19:46:45.694	2026-04-01 19:46:45.694
f84de4ed-53d0-45d1-b759-5f4709d532c9	96c5ce44-1733-46ba-a957-e79cf5c5f9a3	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	47d9c408-1a3c-46c1-aecf-6f1746615499	2026-04-01 19:53:56.663	2026-04-01 19:53:56.663
209a5137-e7cb-4dce-9f2a-30cbd3b0f091	385f01e7-5ce6-4797-a65f-371c2d99937b	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	47d9c408-1a3c-46c1-aecf-6f1746615499	2026-04-01 20:09:21.733	2026-04-01 20:09:21.733
7d237239-e9c8-41ac-9254-1c4570ac9d8d	81b21678-d5db-4d79-9ced-ee6219312102	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	47d9c408-1a3c-46c1-aecf-6f1746615499	2026-04-01 20:10:50.911	2026-04-01 20:10:50.911
da9aa118-2c94-47ee-b0f3-1999ca2e1274	52b78333-2d5a-46b2-b968-94f906ec3136	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	47d9c408-1a3c-46c1-aecf-6f1746615499	2026-04-01 20:33:29.095	2026-04-01 20:33:29.095
4923cbb3-fc83-4f89-8710-623a07c0464e	8b79dfb5-2b29-4dea-9546-8a1c908be9c3	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-04-01 20:33:37.897	2026-04-01 20:33:37.897
6371066c-c59d-47ce-b671-ab2e0c2236a6	47b34798-029a-4f4e-87b7-77bb2aaabfdd	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	47d9c408-1a3c-46c1-aecf-6f1746615499	2026-04-01 20:55:51.221	2026-04-01 20:55:51.221
b02349ca-b90e-4627-90a0-79ef45e39a59	ef05d047-00b7-4faa-b9d9-3f19c3aced8d	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	47d9c408-1a3c-46c1-aecf-6f1746615499	2026-04-01 21:37:45.587	2026-04-01 21:37:45.587
fe90c6fe-4010-4143-a53a-fa3b276156ee	8fc0ae7c-4c43-46b0-aac9-44e8469aeb49	c5c904e8-da40-4458-b8bf-5c2cc97348b1	HOST	c5c904e8-da40-4458-b8bf-5c2cc97348b1	2026-04-01 22:09:18.414	2026-04-01 22:09:18.414
27af91fc-29d6-4516-9e80-70a5b1127d36	bdffc9c0-0103-4b5a-b3a6-0605f683ca23	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-04-01 22:12:22.038	2026-04-01 22:12:22.038
c08ab2cf-6c9b-4b3e-9d3a-c06ffaf26809	965a2f65-fc61-413e-a675-9197dcd0d373	c5c904e8-da40-4458-b8bf-5c2cc97348b1	HOST	c5c904e8-da40-4458-b8bf-5c2cc97348b1	2026-04-01 22:14:34.633	2026-04-01 22:14:34.633
5880d451-a0d5-4c9d-b1ab-3e39723ff14f	47ea64c7-11c3-4b29-ace3-adeef70dde13	c5c904e8-da40-4458-b8bf-5c2cc97348b1	HOST	c5c904e8-da40-4458-b8bf-5c2cc97348b1	2026-04-01 22:26:18.47	2026-04-01 22:26:18.47
35d10d7c-d68d-44dc-8847-0c898a4ac97b	66000676-e56a-4c26-a200-4a930987e019	c5c904e8-da40-4458-b8bf-5c2cc97348b1	HOST	c5c904e8-da40-4458-b8bf-5c2cc97348b1	2026-04-01 22:26:44.348	2026-04-01 22:26:44.348
0e8d2c8f-40f2-43d4-9342-50acdb9dd26f	8932ebc4-876d-4cb4-8fbe-d59e05767546	c5c904e8-da40-4458-b8bf-5c2cc97348b1	HOST	c5c904e8-da40-4458-b8bf-5c2cc97348b1	2026-04-01 22:31:05.339	2026-04-01 22:31:05.339
4b6eec5c-919f-4f35-b852-ea7c76970462	ad4abb54-e038-4c35-8785-d7c2f4389b91	c5c904e8-da40-4458-b8bf-5c2cc97348b1	HOST	c5c904e8-da40-4458-b8bf-5c2cc97348b1	2026-04-01 22:53:31.293	2026-04-01 22:53:31.293
ed296c5f-5ef5-46f7-acc0-3d48a61c23c0	f9480f50-6974-4f22-a4fc-fb81800d97ad	c5c904e8-da40-4458-b8bf-5c2cc97348b1	HOST	c5c904e8-da40-4458-b8bf-5c2cc97348b1	2026-04-01 23:06:18.123	2026-04-01 23:06:18.123
32022bb5-da8a-4c8e-825e-c4267988beee	27819416-1f12-4c8d-939d-318f6dc2adb7	281ac0c9-d22b-4ece-895a-9d2c86a8f315	HOST	281ac0c9-d22b-4ece-895a-9d2c86a8f315	2026-04-01 23:09:52.875	2026-04-01 23:09:52.875
dfaa3564-119a-47a8-b35a-ebe0f9051d3c	954b55ba-be54-456f-81eb-31c108c42ae6	281ac0c9-d22b-4ece-895a-9d2c86a8f315	HOST	281ac0c9-d22b-4ece-895a-9d2c86a8f315	2026-04-01 23:13:48.281	2026-04-01 23:13:48.281
49fdaef9-e936-4124-a893-4c56b314b4bd	b524fe7d-3e1a-42cc-9ab8-6c873b378fe0	281ac0c9-d22b-4ece-895a-9d2c86a8f315	HOST	281ac0c9-d22b-4ece-895a-9d2c86a8f315	2026-04-01 23:21:13.032	2026-04-01 23:21:13.032
23ad60fb-c782-46ca-9073-b850a6cf8505	a1587cc4-753b-4449-ab03-823d0b214d7e	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-04-02 00:51:16.105	2026-04-02 00:51:16.105
f15cfb07-c73a-465d-bb96-5a28946efeb7	f3574df7-3c50-44f9-b908-b84420c75b48	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	47d9c408-1a3c-46c1-aecf-6f1746615499	2026-04-02 01:43:52.961	2026-04-02 01:43:52.961
e6415cad-68a3-4691-8687-56fd51bc6696	96456357-7470-40d4-bb0d-957c49561d88	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	47d9c408-1a3c-46c1-aecf-6f1746615499	2026-04-02 01:45:10.2	2026-04-02 01:45:10.2
891ebb0e-851c-4720-8336-735c0d1d9fdd	02615b24-131a-4df4-953f-9802b3cd3047	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	47d9c408-1a3c-46c1-aecf-6f1746615499	2026-04-02 02:01:20.587	2026-04-02 02:01:20.587
e94ce643-7ee9-4c5c-9e46-1dd9b2f5134a	26952696-6533-46e8-933c-2b008248ff6f	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	47d9c408-1a3c-46c1-aecf-6f1746615499	2026-04-02 03:16:15.274	2026-04-02 03:16:15.274
8eb51f04-837c-4ecb-bf77-50d1a9045372	53725353-c8cb-40f3-941c-343cca5b8976	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	47d9c408-1a3c-46c1-aecf-6f1746615499	2026-04-02 03:17:06.226	2026-04-02 03:17:06.226
0f9625a3-c1f5-436b-b332-bad786e3c664	caa0abb9-6866-4ca0-b96f-884c19bb1e6b	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	47d9c408-1a3c-46c1-aecf-6f1746615499	2026-04-02 04:49:15.749	2026-04-02 04:49:15.749
46913f3d-8923-4995-ab1d-4b833062247d	d4c944f1-c309-4ae5-975e-67659f876f87	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	47d9c408-1a3c-46c1-aecf-6f1746615499	2026-04-02 05:26:33.421	2026-04-02 05:26:33.421
8f350e54-96e4-47c5-a987-279c77eea943	a324b73d-282e-406c-8407-fafeb191cfb3	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	47d9c408-1a3c-46c1-aecf-6f1746615499	2026-04-02 05:37:17.981	2026-04-02 05:37:17.981
9ee637a5-41f3-4c5d-b159-f7f29362a824	16813a30-c789-445e-94f5-13b58c02b245	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	47d9c408-1a3c-46c1-aecf-6f1746615499	2026-04-02 05:55:52.389	2026-04-02 05:55:52.389
69cf3a6a-d8e9-482e-b485-86c5d5a31efd	63a3a45c-bfb5-4fc9-bd52-0443d45c7c6a	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	47d9c408-1a3c-46c1-aecf-6f1746615499	2026-04-02 06:13:14.678	2026-04-02 06:13:14.678
b5b22318-85c9-4e4f-9699-8b861a58f4e4	67f6598c-24a7-4ec3-b926-6cc10daf0586	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	47d9c408-1a3c-46c1-aecf-6f1746615499	2026-04-02 06:13:38.256	2026-04-02 06:13:38.256
8406f102-011b-4a43-8b2d-50e325f03a5f	acde2759-a974-49ef-845d-3343abfa947b	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	47d9c408-1a3c-46c1-aecf-6f1746615499	2026-04-02 06:41:08.132	2026-04-02 06:41:08.132
50642951-2ae1-40e9-8958-11b6f6b75240	ff734555-0341-4657-ad73-a528786cfc96	9f70646e-c63e-4a08-a4fa-8786204bbf4e	HOST	9f70646e-c63e-4a08-a4fa-8786204bbf4e	2026-04-02 06:41:13.034	2026-04-02 06:41:13.034
04fe354f-865f-4cbd-b85e-308a4863029e	c0ee23c7-f6ae-46f8-9a98-7182e883a000	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	47d9c408-1a3c-46c1-aecf-6f1746615499	2026-04-02 08:02:00.586	2026-04-02 08:02:00.586
b495b57d-ac5b-42ee-a208-f275fc347719	fa770eba-c6d5-4379-a889-02d245470438	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	47d9c408-1a3c-46c1-aecf-6f1746615499	2026-04-02 09:22:47.71	2026-04-02 09:22:47.71
a90cf553-9252-4436-88d6-f8d22788de74	2d4e49c4-54c5-4f34-ac4c-97f86f7fb80f	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-04-02 20:28:32.987	2026-04-02 20:28:32.987
d1ad1225-3c79-4e63-a0dd-08cdf2a72c40	0419c286-af86-4be5-91cf-4d57e8af21ed	e9134380-2da7-4a1e-bd2a-34398f85a6e5	HOST	e9134380-2da7-4a1e-bd2a-34398f85a6e5	2026-04-02 20:29:07.805	2026-04-02 20:29:07.805
1694f003-2afe-4b4f-8f2d-801bb4bdc82b	92851de4-b5ed-42de-9afb-6fb22306d1e1	e9134380-2da7-4a1e-bd2a-34398f85a6e5	HOST	e9134380-2da7-4a1e-bd2a-34398f85a6e5	2026-04-02 21:15:39.656	2026-04-02 21:15:39.656
d3c53238-ceaa-4a73-ba3a-6c47b6b10502	a35d4aab-2842-4d65-a959-d6084c335a15	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	47d9c408-1a3c-46c1-aecf-6f1746615499	2026-04-02 21:38:46.42	2026-04-02 21:38:46.42
2eaad556-34d2-435b-bf9b-412bec97452c	f50c16f0-d9a9-42a9-84c9-06344237287c	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	47d9c408-1a3c-46c1-aecf-6f1746615499	2026-04-02 21:40:53.535	2026-04-02 21:40:53.535
81e99304-c792-4853-870a-0dcb62d36eaf	d009276d-12d6-4cc2-9b13-66057b20f812	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	47d9c408-1a3c-46c1-aecf-6f1746615499	2026-04-02 22:00:00.592	2026-04-02 22:00:00.592
619d93fd-753c-48de-b92f-03a50d3c107b	77a6dee4-8367-44ed-8c3c-ce9e3a9f0d44	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	47d9c408-1a3c-46c1-aecf-6f1746615499	2026-04-02 22:00:54.989	2026-04-02 22:00:54.989
7dbe7bf2-773d-443b-a3bd-5b92d209d61c	09b0ff8c-d177-437f-9895-622c4bd1b117	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	47d9c408-1a3c-46c1-aecf-6f1746615499	2026-04-02 22:28:08.983	2026-04-02 22:28:08.983
2169bc13-feea-4127-83b0-22e92cca7818	cc5dd290-ad46-40a3-bc08-19fee473d6a3	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	47d9c408-1a3c-46c1-aecf-6f1746615499	2026-04-02 22:34:40.941	2026-04-02 22:34:40.941
96a7e9a3-808e-432a-ab04-86cc936ccfa6	69ea0705-43cd-4173-bc2c-8e2377162b70	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-04-02 22:38:56.27	2026-04-02 22:38:56.27
ac7a4505-fcdf-447a-ba06-ac92206e098e	f398c85e-4dba-42e6-add2-ea305fcd0575	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-04-02 22:39:29.243	2026-04-02 22:39:29.243
e159e582-df78-48fd-8443-ca2fc8a486f2	e09120b6-e993-43fb-9a40-680e8654de4d	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	47d9c408-1a3c-46c1-aecf-6f1746615499	2026-04-02 22:55:44.006	2026-04-02 22:55:44.006
203155f0-a8d1-43cf-b500-57647335f00b	5ff4847f-a310-41e8-ac54-711d51db07dd	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	47d9c408-1a3c-46c1-aecf-6f1746615499	2026-04-02 22:56:13.568	2026-04-02 22:56:13.568
1f180c53-be6f-46a6-a5fb-80721dc5dee0	5e5ed126-17c9-4b3c-abc6-3a1f4862fc43	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	47d9c408-1a3c-46c1-aecf-6f1746615499	2026-04-02 22:56:40.768	2026-04-02 22:56:40.768
248d72ba-238d-4e31-bbdc-8bba41fa4612	5778b4b4-bfc5-46db-8082-7ce78ff31a78	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-04-02 22:56:46.02	2026-04-02 22:56:46.02
26799840-35b9-40d1-8436-875e2044abc5	d47d3d9f-ac85-4586-b09b-aba3dc40df91	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-04-02 22:57:43.748	2026-04-02 22:57:43.748
77926ba0-79b6-4006-80b3-95c806d5717a	97dd1700-f4f1-4f39-b36e-0c2e59037d29	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	47d9c408-1a3c-46c1-aecf-6f1746615499	2026-04-03 01:33:36.8	2026-04-03 01:33:36.8
1c9fc0cb-f855-4bd0-9333-eb2ee641eef5	40a0a34e-b7a6-4086-84e9-32d5f8ad0cc3	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	47d9c408-1a3c-46c1-aecf-6f1746615499	2026-04-03 01:35:52.536	2026-04-03 01:35:52.536
6dea33c8-72c7-4214-a126-ecff76feae82	ced55ebf-ceca-4ba3-9455-717e57d6ee14	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	47d9c408-1a3c-46c1-aecf-6f1746615499	2026-04-03 02:07:06.375	2026-04-03 02:07:06.375
cdd45c65-0f66-4439-b4dd-9b5a10c9d839	d80774e1-d6b5-4da7-841b-d3ff095b7ba8	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-04-03 02:08:04.031	2026-04-03 02:08:04.031
e834f5a4-a918-40cd-83c4-f4b5752fbd48	6e4971ff-7e58-4c78-be5b-f7fd7b3d7373	47d9c408-1a3c-46c1-aecf-6f1746615499	HOST	47d9c408-1a3c-46c1-aecf-6f1746615499	2026-04-03 02:54:31.069	2026-04-03 02:54:31.069
1a2b4d30-4d62-48ba-b924-b1d550356eae	5300c527-4d0c-4d4a-87de-65872b40b423	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-04-04 04:06:39.321	2026-04-04 04:06:39.321
2d64383b-32f9-4e7f-88fe-169d4fbb57f6	aecbabc9-20a5-4860-9800-dec04c2a3be2	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-04-04 04:35:39.752	2026-04-04 04:35:39.752
3438b3ec-6b47-4dbd-998e-845842d0094b	f27bbc6e-ec14-42ca-9967-e0c59af47a35	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-04-04 04:55:27.253	2026-04-04 04:55:27.253
f5fb1aca-8479-4b2f-8a6c-9a0e51e4948f	d69a323a-014b-454b-b94e-84333754ff95	3961fabe-1345-4426-bd8a-ca0a5eac3aac	HOST	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-04-04 06:22:05.747	2026-04-04 06:22:05.747
\.


--
-- Data for Name: streams; Type: TABLE DATA; Schema: public; Owner: liveapp
--

COPY public.streams (id, host_user_id, title, status, visibility, tags_json, started_at, ended_at, created_at, updated_at, video_provider, video_room_name, guests, "layoutGridSize", color, stream_goal) FROM stdin;
b710b560-aa2d-4331-abdf-7f0a72366c72	47d9c408-1a3c-46c1-aecf-6f1746615499	My Live Stream	ENDED	PUBLIC	[]	2026-03-29 16:19:37.771	2026-03-29 16:23:34.629	2026-03-29 16:19:37.773	2026-03-29 16:23:34.634	LIVEKIT	stream-b710b560-aa2d-4331-abdf-7f0a72366c72	[]	1	#3F3F46	0
c14d5337-d2f5-437b-8027-1b16bc4c05e4	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-03-29 09:09:32.407	2026-03-29 09:11:36.775	2026-03-29 09:09:32.409	2026-03-29 09:11:36.781	LIVEKIT	stream-c14d5337-d2f5-437b-8027-1b16bc4c05e4	[]	1	#3F3F46	0
2bd17abc-ad0a-47e5-8d60-f309468f6466	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-03-29 22:45:30.381	2026-03-29 22:54:25.115	2026-03-29 22:45:30.383	2026-03-29 22:54:25.121	LIVEKIT	stream-2bd17abc-ad0a-47e5-8d60-f309468f6466	[]	1	#3F3F46	0
e62c5617-a1b9-4a41-9db3-8bd1cb2fc4b5	47d9c408-1a3c-46c1-aecf-6f1746615499	My Live Stream	ENDED	PUBLIC	[]	2026-03-29 09:15:03.962	2026-03-29 09:19:17.568	2026-03-29 09:15:03.965	2026-03-29 09:19:17.573	LIVEKIT	stream-e62c5617-a1b9-4a41-9db3-8bd1cb2fc4b5	[]	1	#3F3F46	0
f95d9d98-2a21-4211-bda1-11573a7c3af5	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-03-29 09:18:44.648	2026-03-29 09:24:42.769	2026-03-29 09:18:44.65	2026-03-29 09:24:42.773	LIVEKIT	stream-f95d9d98-2a21-4211-bda1-11573a7c3af5	[]	1	#3F3F46	0
a15f2ff7-b78c-4ec7-a1bc-2959d4c5fb2c	47d9c408-1a3c-46c1-aecf-6f1746615499	My Live Stream	ENDED	PUBLIC	[]	2026-03-29 16:23:43.958	2026-03-29 16:49:45.973	2026-03-29 16:23:43.96	2026-03-29 16:49:45.979	LIVEKIT	stream-a15f2ff7-b78c-4ec7-a1bc-2959d4c5fb2c	[]	1	#3F3F46	0
c3d7818a-339f-4272-b8ed-6d0199a9ec94	e9134380-2da7-4a1e-bd2a-34398f85a6e5	My Live Stream	ENDED	PUBLIC	[]	2026-03-29 09:26:37.642	2026-03-29 09:27:06.083	2026-03-29 09:26:37.644	2026-03-29 09:27:06.088	LIVEKIT	stream-c3d7818a-339f-4272-b8ed-6d0199a9ec94	[]	1	#3F3F46	0
569e6a4e-20b2-4738-a3bc-943b2b64b592	47d9c408-1a3c-46c1-aecf-6f1746615499	My Live Stream	ENDED	PUBLIC	[]	2026-03-29 15:07:50.349	2026-03-29 15:07:58.978	2026-03-29 15:07:50.351	2026-03-29 15:07:58.983	LIVEKIT	stream-569e6a4e-20b2-4738-a3bc-943b2b64b592	[]	1	#3F3F46	0
165a9ca3-9b5d-4a8b-93ce-f17d5a9f490b	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-03-29 22:01:19.927	2026-03-29 22:11:55.534	2026-03-29 22:01:19.93	2026-03-29 22:11:55.539	LIVEKIT	stream-165a9ca3-9b5d-4a8b-93ce-f17d5a9f490b	[]	1	#3F3F46	0
b709f1a0-1033-4489-89e2-95f950f80df4	47d9c408-1a3c-46c1-aecf-6f1746615499	My Live Stream	ENDED	PUBLIC	[]	2026-03-29 15:28:58.465	2026-03-29 15:31:16.613	2026-03-29 15:28:58.468	2026-03-29 15:31:16.617	LIVEKIT	stream-b709f1a0-1033-4489-89e2-95f950f80df4	[]	1	#3F3F46	0
6a446cf8-0c9e-4851-a05c-1f86213ecdaa	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-03-29 16:50:34.183	2026-03-29 17:35:39.267	2026-03-29 16:50:34.185	2026-03-29 17:35:39.273	LIVEKIT	stream-6a446cf8-0c9e-4851-a05c-1f86213ecdaa	[]	1	#3F3F46	0
df5b5795-588b-449a-bc79-4e4930273c41	47d9c408-1a3c-46c1-aecf-6f1746615499	My Live Stream	ENDED	PUBLIC	[]	2026-03-29 15:31:23.595	2026-03-29 15:47:40.523	2026-03-29 15:31:23.598	2026-03-29 15:47:40.528	LIVEKIT	stream-df5b5795-588b-449a-bc79-4e4930273c41	[]	1	#3F3F46	0
280ffffd-4a33-45f0-a894-53c5338a17a5	47d9c408-1a3c-46c1-aecf-6f1746615499	My Live Stream	ENDED	PUBLIC	[]	2026-03-29 15:47:46.681	2026-03-29 15:48:18.438	2026-03-29 15:47:46.683	2026-03-29 15:48:18.443	LIVEKIT	stream-280ffffd-4a33-45f0-a894-53c5338a17a5	[]	1	#3F3F46	0
c7b495b1-4313-4e89-96f8-e97de8f53a20	47d9c408-1a3c-46c1-aecf-6f1746615499	My Live Stream	ENDED	PUBLIC	[]	2026-03-29 15:48:41.064	2026-03-29 15:50:15.367	2026-03-29 15:48:41.066	2026-03-29 15:50:15.372	LIVEKIT	stream-c7b495b1-4313-4e89-96f8-e97de8f53a20	[]	1	#3F3F46	0
22cbb6f7-6961-4114-84f1-4e34ab302cf3	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-03-29 17:36:23.271	2026-03-29 17:38:54.995	2026-03-29 17:36:23.274	2026-03-29 17:38:55	LIVEKIT	stream-22cbb6f7-6961-4114-84f1-4e34ab302cf3	[]	1	#3F3F46	0
f15ddde3-9e7d-465b-b066-68cfd265e936	47d9c408-1a3c-46c1-aecf-6f1746615499	My Live Stream	ENDED	PUBLIC	[]	2026-03-29 15:50:25.843	2026-03-29 15:56:10.66	2026-03-29 15:50:25.845	2026-03-29 15:56:10.669	LIVEKIT	stream-f15ddde3-9e7d-465b-b066-68cfd265e936	[]	1	#3F3F46	0
1211e826-42f9-43a3-9f34-4b5955416e35	47d9c408-1a3c-46c1-aecf-6f1746615499	My Live Stream	ENDED	PUBLIC	[]	2026-03-29 15:56:20.325	2026-03-29 15:58:48.217	2026-03-29 15:56:20.328	2026-03-29 15:58:48.222	LIVEKIT	stream-1211e826-42f9-43a3-9f34-4b5955416e35	[]	1	#3F3F46	0
92603abb-c236-4f30-ba9a-4cea552553b3	47d9c408-1a3c-46c1-aecf-6f1746615499	Just a test live	ENDED	PUBLIC	[]	2026-03-29 15:59:13.443	2026-03-29 16:07:09.246	2026-03-29 15:59:13.445	2026-03-29 16:07:09.254	LIVEKIT	stream-92603abb-c236-4f30-ba9a-4cea552553b3	[]	1	#A855F7	0
26d45485-4e0e-4f87-926d-ed6a71c94b94	47d9c408-1a3c-46c1-aecf-6f1746615499	My Live Stream	ENDED	PUBLIC	[]	2026-03-29 16:07:18.842	2026-03-29 16:19:31.913	2026-03-29 16:07:18.845	2026-03-29 16:19:31.921	LIVEKIT	stream-26d45485-4e0e-4f87-926d-ed6a71c94b94	[]	1	#3F3F46	0
10e2c843-05de-45cd-86dd-0ea21cda84c4	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-03-29 22:13:10.463	2026-03-29 22:14:41.551	2026-03-29 22:13:10.465	2026-03-29 22:14:41.557	LIVEKIT	stream-10e2c843-05de-45cd-86dd-0ea21cda84c4	[]	1	#3F3F46	0
43fa6ef4-1c44-4c19-87b7-1273cb2e58e4	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-03-29 17:39:08.729	2026-03-29 17:45:12.737	2026-03-29 17:39:08.731	2026-03-29 17:45:12.743	LIVEKIT	stream-43fa6ef4-1c44-4c19-87b7-1273cb2e58e4	[]	1	#3F3F46	0
d9628570-75b1-4b39-a25d-b7d2336130ef	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-03-29 17:44:49.894	2026-03-29 17:45:26.632	2026-03-29 17:44:49.897	2026-03-29 17:45:26.638	LIVEKIT	stream-d9628570-75b1-4b39-a25d-b7d2336130ef	[]	1	#3F3F46	0
a7b5d4f1-ec2b-42ec-abb9-33d67ee5ac13	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-03-29 17:45:31.684	2026-03-29 17:48:02.788	2026-03-29 17:45:31.686	2026-03-29 17:48:02.793	LIVEKIT	stream-a7b5d4f1-ec2b-42ec-abb9-33d67ee5ac13	[]	1	#3F3F46	0
b176fd7d-b6d0-4a60-8157-f50c5e9a23ea	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-03-29 22:14:51.972	2026-03-29 22:21:42.078	2026-03-29 22:14:51.973	2026-03-29 22:21:42.083	LIVEKIT	stream-b176fd7d-b6d0-4a60-8157-f50c5e9a23ea	[]	1	#3F3F46	0
13dcf31d-77f4-4c3d-b7bc-f8a24b946f96	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-03-29 21:54:36.674	2026-03-29 21:54:41.362	2026-03-29 21:54:36.677	2026-03-29 21:54:41.368	LIVEKIT	stream-13dcf31d-77f4-4c3d-b7bc-f8a24b946f96	[]	1	#3F3F46	0
08ca06b0-9449-4291-9a3c-172dae6e0656	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-03-29 21:57:52.438	2026-03-29 21:57:58.31	2026-03-29 21:57:52.441	2026-03-29 21:57:58.316	LIVEKIT	stream-08ca06b0-9449-4291-9a3c-172dae6e0656	[]	1	#3F3F46	0
70f5a64f-078a-478a-9a44-68acce85461b	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-03-29 22:55:04.536	2026-03-29 23:05:39.837	2026-03-29 22:55:04.538	2026-03-29 23:05:39.843	LIVEKIT	stream-70f5a64f-078a-478a-9a44-68acce85461b	[]	1	#3F3F46	0
354a4e63-9feb-49bb-ab6d-12d281854c85	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-03-29 22:28:20.93	2026-03-29 22:38:52.342	2026-03-29 22:28:20.932	2026-03-29 22:38:52.347	LIVEKIT	stream-354a4e63-9feb-49bb-ab6d-12d281854c85	[]	1	#3F3F46	0
436bff59-7f3d-4179-9e25-6c4efbcbacb9	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-03-29 22:41:13.051	2026-03-29 22:45:19.834	2026-03-29 22:41:13.053	2026-03-29 22:45:19.84	LIVEKIT	stream-436bff59-7f3d-4179-9e25-6c4efbcbacb9	[]	1	#3F3F46	0
8005af89-6a3a-4992-b2bb-b3fc7930c92c	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-03-29 23:22:59.174	2026-03-29 23:23:47.486	2026-03-29 23:22:59.176	2026-03-29 23:23:47.491	LIVEKIT	stream-8005af89-6a3a-4992-b2bb-b3fc7930c92c	[]	1	#3F3F46	0
10544059-6626-459a-b988-110e48f5fd85	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-03-29 23:12:01.94	2026-03-29 23:14:35.375	2026-03-29 23:12:01.942	2026-03-29 23:14:35.38	LIVEKIT	stream-10544059-6626-459a-b988-110e48f5fd85	[]	1	#3F3F46	0
9db1ac16-7231-4c90-8454-69660c40f761	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-03-29 23:10:24.5	2026-03-29 23:10:54.951	2026-03-29 23:10:24.502	2026-03-29 23:10:54.956	LIVEKIT	stream-9db1ac16-7231-4c90-8454-69660c40f761	[]	1	#3F3F46	0
86728898-a4e7-4ad7-a7c1-f04627cac589	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-03-29 23:11:18.874	2026-03-29 23:11:45.68	2026-03-29 23:11:18.877	2026-03-29 23:11:45.687	LIVEKIT	stream-86728898-a4e7-4ad7-a7c1-f04627cac589	[]	1	#3F3F46	0
2da4eae4-5604-413b-a0a8-c9155c07b7cd	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-03-29 23:22:22.812	2026-03-29 23:22:25.64	2026-03-29 23:22:22.814	2026-03-29 23:22:25.645	LIVEKIT	stream-2da4eae4-5604-413b-a0a8-c9155c07b7cd	[]	1	#3F3F46	0
6d6a1a95-6384-4252-9737-62aefe3d21b2	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-03-29 23:15:07.704	2026-03-29 23:18:49.459	2026-03-29 23:15:07.706	2026-03-29 23:18:49.463	LIVEKIT	stream-6d6a1a95-6384-4252-9737-62aefe3d21b2	[]	1	#3F3F46	0
a2890620-e7a4-4122-913a-e532e9e5591b	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-03-29 23:56:25.573	2026-03-29 23:56:31.104	2026-03-29 23:56:25.575	2026-03-29 23:56:31.109	LIVEKIT	stream-a2890620-e7a4-4122-913a-e532e9e5591b	[]	1	#3F3F46	0
77d1076b-ad76-41e3-b9b7-0042f1938066	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-03-29 23:57:32.952	2026-03-29 23:57:49.079	2026-03-29 23:57:32.954	2026-03-29 23:57:49.084	LIVEKIT	stream-77d1076b-ad76-41e3-b9b7-0042f1938066	[]	1	#3F3F46	0
32d6e607-c997-45ec-9cb2-7dfba5f1e5b6	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-03-30 00:04:32.581	2026-03-30 00:04:48.989	2026-03-30 00:04:32.583	2026-03-30 00:04:48.995	LIVEKIT	stream-32d6e607-c997-45ec-9cb2-7dfba5f1e5b6	[]	1	#3F3F46	0
445be4fe-583c-4e3f-b545-3be0ca1f5e2d	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-03-30 00:06:15.073	2026-03-30 00:06:36.886	2026-03-30 00:06:15.075	2026-03-30 00:06:36.89	LIVEKIT	stream-445be4fe-583c-4e3f-b545-3be0ca1f5e2d	[]	1	#3F3F46	0
382c9037-0ef1-4184-9f67-1719c1e5ed27	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-03-30 00:11:49.137	2026-03-30 00:12:13.101	2026-03-30 00:11:49.139	2026-03-30 00:12:13.105	LIVEKIT	stream-382c9037-0ef1-4184-9f67-1719c1e5ed27	[]	1	#3F3F46	0
f3b0301e-650e-438a-9581-cb2582b887a4	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-03-30 02:14:54.21	2026-03-30 02:23:36.073	2026-03-30 02:14:54.212	2026-03-30 02:23:36.079	LIVEKIT	stream-f3b0301e-650e-438a-9581-cb2582b887a4	[]	1	#3F3F46	0
ff03452b-730e-4aa3-9287-90f37a7be132	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-03-30 02:23:41.027	2026-03-30 02:24:05.275	2026-03-30 02:23:41.029	2026-03-30 02:24:05.28	LIVEKIT	stream-ff03452b-730e-4aa3-9287-90f37a7be132	[]	1	#3F3F46	0
f991d30e-d26c-4e52-80be-587c209787a2	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-03-30 00:13:50.742	2026-03-30 00:14:14.229	2026-03-30 00:13:50.745	2026-03-30 00:14:14.234	LIVEKIT	stream-f991d30e-d26c-4e52-80be-587c209787a2	[]	1	#3F3F46	0
f7121682-ae4c-48e5-b566-fbf2ee36d1d6	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-03-30 02:24:14.532	2026-03-30 02:27:33.669	2026-03-30 02:24:14.534	2026-03-30 02:27:33.674	LIVEKIT	stream-f7121682-ae4c-48e5-b566-fbf2ee36d1d6	[]	1	#3F3F46	0
73103c83-901a-4e0a-b58c-329d8523ff3a	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-03-31 01:50:29.902	2026-03-31 01:50:33.605	2026-03-31 01:50:29.904	2026-03-31 01:50:33.608	LIVEKIT	stream-73103c83-901a-4e0a-b58c-329d8523ff3a	[]	1	#3F3F46	0
86125c98-2c14-4803-a7a5-0eb988a90635	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-03-30 00:57:20.517	2026-03-30 00:57:41.741	2026-03-30 00:57:20.519	2026-03-30 00:57:41.746	LIVEKIT	stream-86125c98-2c14-4803-a7a5-0eb988a90635	[]	1	#3F3F46	0
f2a4ec93-0634-498f-ab8e-60cd037ea291	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-04-01 01:58:42.687	2026-04-01 01:58:52.516	2026-04-01 01:58:42.689	2026-04-01 01:58:52.518	LIVEKIT	stream-f2a4ec93-0634-498f-ab8e-60cd037ea291	[]	1	#3F3F46	0
389c03fe-873d-454a-91c0-dc059ceb7532	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-04-01 02:00:23.819	2026-04-01 02:02:44.228	2026-04-01 02:00:23.821	2026-04-01 02:02:44.232	LIVEKIT	stream-389c03fe-873d-454a-91c0-dc059ceb7532	[]	1	#3F3F46	0
39cd9fde-9e23-4e3c-949d-550b33ee4f90	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-03-30 00:58:12.862	2026-03-30 00:58:24.723	2026-03-30 00:58:12.864	2026-03-30 00:58:24.728	LIVEKIT	stream-39cd9fde-9e23-4e3c-949d-550b33ee4f90	[]	1	#3F3F46	0
084c6697-2f19-45b2-bf6c-f9fbfa2f1949	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-04-01 02:35:47.499	2026-04-01 03:10:09.51	2026-04-01 02:35:47.501	2026-04-01 03:10:09.513	LIVEKIT	stream-084c6697-2f19-45b2-bf6c-f9fbfa2f1949	[]	1	#3F3F46	0
8f759ba1-d9e0-4c1f-b486-ed85be7ed073	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-04-01 03:10:17.337	2026-04-01 03:10:26.749	2026-04-01 03:10:17.338	2026-04-01 03:10:26.752	LIVEKIT	stream-8f759ba1-d9e0-4c1f-b486-ed85be7ed073	[]	1	#3F3F46	0
9c7d7da2-6440-4236-b6ad-3730fcd8b403	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-03-30 01:11:56.059	2026-03-30 01:12:20.868	2026-03-30 01:11:56.061	2026-03-30 01:12:20.872	LIVEKIT	stream-9c7d7da2-6440-4236-b6ad-3730fcd8b403	[]	1	#3F3F46	0
f51a8588-7221-4f98-b449-ef68c9deba5d	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-04-01 03:18:16.072	2026-04-01 03:18:56.296	2026-04-01 03:18:16.074	2026-04-01 03:18:56.299	LIVEKIT	stream-f51a8588-7221-4f98-b449-ef68c9deba5d	[]	1	#3F3F46	0
2146ffc2-a9dd-444e-9b0b-46973aca29d6	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-04-01 03:36:04.068	2026-04-01 03:55:11.381	2026-04-01 03:36:04.069	2026-04-01 03:55:11.385	LIVEKIT	stream-2146ffc2-a9dd-444e-9b0b-46973aca29d6	[]	1	#3F3F46	0
31227a63-d77c-4ff0-bb2c-33c95cca836a	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-03-30 01:27:19.007	2026-03-30 01:27:27.894	2026-03-30 01:27:19.009	2026-03-30 01:27:27.899	LIVEKIT	stream-31227a63-d77c-4ff0-bb2c-33c95cca836a	[]	1	#3F3F46	0
d55502ca-ce10-4099-b79a-54180cf83a8e	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-04-01 03:55:19.066	2026-04-01 03:55:30.646	2026-04-01 03:55:19.067	2026-04-01 03:55:30.649	LIVEKIT	stream-d55502ca-ce10-4099-b79a-54180cf83a8e	[]	1	#3F3F46	0
287240b3-4aca-4b24-85c0-0ba73fce38e8	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-04-01 03:59:12.928	2026-04-01 03:59:17.196	2026-04-01 03:59:12.929	2026-04-01 03:59:17.198	LIVEKIT	stream-287240b3-4aca-4b24-85c0-0ba73fce38e8	[]	1	#3F3F46	0
bf6ab63d-445a-4e54-b4e1-2297258f8d98	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-03-30 01:45:50.178	2026-03-30 01:46:14.983	2026-03-30 01:45:50.18	2026-03-30 01:46:14.987	LIVEKIT	stream-bf6ab63d-445a-4e54-b4e1-2297258f8d98	[]	1	#3F3F46	0
98cbd644-54d2-4f7d-999f-76cbd8682a66	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-04-01 04:02:02.831	2026-04-01 04:02:07.066	2026-04-01 04:02:02.833	2026-04-01 04:02:07.069	LIVEKIT	stream-98cbd644-54d2-4f7d-999f-76cbd8682a66	[]	1	#3F3F46	0
afc38820-d731-4072-90d9-285710074f89	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-04-01 04:15:51.112	2026-04-01 04:32:38.203	2026-04-01 04:15:51.113	2026-04-01 04:32:38.206	LIVEKIT	stream-afc38820-d731-4072-90d9-285710074f89	[]	1	#3F3F46	0
02a9d097-1bce-479f-b4e3-a2e941c55369	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-03-30 01:49:44.547	2026-03-30 01:50:32.938	2026-03-30 01:49:44.549	2026-03-30 01:50:32.943	LIVEKIT	stream-02a9d097-1bce-479f-b4e3-a2e941c55369	[]	1	#3F3F46	0
405bf147-56fa-4844-bbc2-86e73d57398a	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-04-01 04:33:00.436	2026-04-01 04:33:32.474	2026-04-01 04:33:00.437	2026-04-01 04:33:32.477	LIVEKIT	stream-405bf147-56fa-4844-bbc2-86e73d57398a	[]	1	#3F3F46	0
d9736820-7961-41e6-9268-7a29224f49f7	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-04-01 04:33:42.579	2026-04-01 04:34:12.48	2026-04-01 04:33:42.581	2026-04-01 04:34:12.483	LIVEKIT	stream-d9736820-7961-41e6-9268-7a29224f49f7	[]	1	#3F3F46	0
bd30a810-0868-4216-b030-da607a5a7cd6	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-03-30 01:55:32.273	2026-03-30 01:55:55.96	2026-03-30 01:55:32.275	2026-03-30 01:55:55.964	LIVEKIT	stream-bd30a810-0868-4216-b030-da607a5a7cd6	[]	1	#3F3F46	0
29d035b3-3f77-434b-afda-634755777eb9	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-04-01 05:39:03.456	2026-04-01 05:39:15.416	2026-04-01 05:39:03.457	2026-04-01 05:39:15.419	LIVEKIT	stream-29d035b3-3f77-434b-afda-634755777eb9	[]	1	#3F3F46	0
495bd926-8b1d-44c8-9a20-10721639313c	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-03-30 01:58:53.753	2026-03-30 01:59:05.494	2026-03-30 01:58:53.755	2026-03-30 01:59:05.498	LIVEKIT	stream-495bd926-8b1d-44c8-9a20-10721639313c	[]	1	#3F3F46	0
6ec74e99-6e58-4a60-9e94-1048f182d264	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-04-01 04:34:17.835	2026-04-01 04:35:01.85	2026-04-01 04:34:17.836	2026-04-01 04:35:01.853	LIVEKIT	stream-6ec74e99-6e58-4a60-9e94-1048f182d264	[]	1	#3F3F46	0
41b9646d-4f67-4978-843c-7e8df013240e	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-04-01 04:35:11.777	2026-04-01 04:36:19.052	2026-04-01 04:35:11.779	2026-04-01 04:36:19.055	LIVEKIT	stream-41b9646d-4f67-4978-843c-7e8df013240e	[]	1	#3F3F46	0
485a0f7c-83b8-4c59-a55c-3604febb32b3	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-04-01 04:48:00.831	2026-04-01 04:52:25.048	2026-04-01 04:48:00.833	2026-04-01 04:52:25.051	LIVEKIT	stream-485a0f7c-83b8-4c59-a55c-3604febb32b3	[]	1	#3F3F46	0
47c9010d-8a14-49b3-b32f-bd9edf385a18	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-04-01 04:52:29.118	2026-04-01 04:53:12.745	2026-04-01 04:52:29.119	2026-04-01 04:53:12.748	LIVEKIT	stream-47c9010d-8a14-49b3-b32f-bd9edf385a18	[]	1	#3F3F46	0
0302388d-14c6-43be-9880-5229aa377602	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-04-01 04:53:40.337	2026-04-01 04:54:10.576	2026-04-01 04:53:40.339	2026-04-01 04:54:10.579	LIVEKIT	stream-0302388d-14c6-43be-9880-5229aa377602	[]	1	#3F3F46	0
ace6f4ac-38cd-4699-a52d-84ef27384ecf	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-04-01 04:54:22.963	2026-04-01 04:54:28.627	2026-04-01 04:54:22.965	2026-04-01 04:54:28.63	LIVEKIT	stream-ace6f4ac-38cd-4699-a52d-84ef27384ecf	[]	1	#3F3F46	0
254ffb18-cb98-4685-a589-83850feb779e	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-04-01 05:25:53.442	2026-04-01 05:25:59.492	2026-04-01 05:25:53.444	2026-04-01 05:25:59.496	LIVEKIT	stream-254ffb18-cb98-4685-a589-83850feb779e	[]	1	#3F3F46	0
f908d303-37b5-4709-b160-fef59798a8ce	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-04-01 05:45:44.933	2026-04-01 05:45:55.621	2026-04-01 05:45:44.934	2026-04-01 05:45:55.624	LIVEKIT	stream-f908d303-37b5-4709-b160-fef59798a8ce	[]	1	#3F3F46	0
f8048731-7af5-4b84-8f7a-575ec801791d	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-04-01 05:44:47.028	2026-04-01 05:45:59.577	2026-04-01 05:44:47.029	2026-04-01 05:45:59.58	LIVEKIT	stream-f8048731-7af5-4b84-8f7a-575ec801791d	[]	1	#3F3F46	0
4c787e07-3eb1-48fe-ad71-2a8f2856f1f3	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-04-01 05:46:05.365	2026-04-01 05:53:37.098	2026-04-01 05:46:05.366	2026-04-01 05:53:37.101	LIVEKIT	stream-4c787e07-3eb1-48fe-ad71-2a8f2856f1f3	[]	2	#3F3F46	0
e25a79f0-2a3f-4a6c-8bb6-8da4dcfcac78	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-04-01 05:56:09.881	2026-04-01 05:57:16.517	2026-04-01 05:56:09.882	2026-04-01 05:57:16.521	LIVEKIT	stream-e25a79f0-2a3f-4a6c-8bb6-8da4dcfcac78	[]	1	#3F3F46	0
d2777555-bf06-451a-899c-a5b3f5557779	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-04-01 08:41:35.618	2026-04-01 08:41:42.522	2026-04-01 08:41:35.62	2026-04-01 08:41:42.526	LIVEKIT	stream-d2777555-bf06-451a-899c-a5b3f5557779	[]	1	#3F3F46	0
8a3b6e2b-e790-4f38-ad5c-899c02a04b96	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-04-01 05:59:29.332	2026-04-01 06:07:38.956	2026-04-01 05:59:29.334	2026-04-01 06:07:38.96	LIVEKIT	stream-8a3b6e2b-e790-4f38-ad5c-899c02a04b96	[]	4	#3F3F46	0
ca347a9f-b6d8-498e-a455-5804fd34f781	3961fabe-1345-4426-bd8a-ca0a5eac3aac	This MY mfn house bitch!!!	ENDED	PUBLIC	[]	2026-04-01 09:09:41.046	2026-04-01 09:11:48.641	2026-04-01 09:09:41.047	2026-04-01 09:11:48.644	LIVEKIT	stream-ca347a9f-b6d8-498e-a455-5804fd34f781	[]	1	#22C55E	0
e7c18482-912b-4e3d-936b-ce153022829e	281ac0c9-d22b-4ece-895a-9d2c86a8f315	My Live Stream	ENDED	PUBLIC	[]	2026-04-01 09:12:07.084	2026-04-01 09:22:24.689	2026-04-01 09:12:07.086	2026-04-01 09:22:24.692	LIVEKIT	stream-e7c18482-912b-4e3d-936b-ce153022829e	[]	1	#3F3F46	0
96233155-9731-4913-9dae-dfe7ba7269d7	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-04-01 09:22:29.81	2026-04-01 09:23:02.449	2026-04-01 09:22:29.812	2026-04-01 09:23:02.452	LIVEKIT	stream-96233155-9731-4913-9dae-dfe7ba7269d7	[]	1	#3F3F46	0
81b21678-d5db-4d79-9ced-ee6219312102	47d9c408-1a3c-46c1-aecf-6f1746615499	My Live Stream	ENDED	PUBLIC	[]	2026-04-01 20:10:50.905	2026-04-01 20:15:37.431	2026-04-01 20:10:50.906	2026-04-01 20:15:37.434	LIVEKIT	stream-81b21678-d5db-4d79-9ced-ee6219312102	[]	1	#3F3F46	0
8b79dfb5-2b29-4dea-9546-8a1c908be9c3	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-04-01 20:33:37.891	2026-04-01 20:33:42.2	2026-04-01 20:33:37.892	2026-04-01 20:33:42.203	LIVEKIT	stream-8b79dfb5-2b29-4dea-9546-8a1c908be9c3	[]	1	#3F3F46	0
52b78333-2d5a-46b2-b968-94f906ec3136	47d9c408-1a3c-46c1-aecf-6f1746615499	My Live Stream	ENDED	PUBLIC	[]	2026-04-01 20:33:29.088	2026-04-01 20:53:12.737	2026-04-01 20:33:29.09	2026-04-01 20:53:12.74	LIVEKIT	stream-52b78333-2d5a-46b2-b968-94f906ec3136	[]	4	#3F3F46	0
bdffc9c0-0103-4b5a-b3a6-0605f683ca23	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-04-01 22:12:22.032	2026-04-01 22:14:35.923	2026-04-01 22:12:22.033	2026-04-01 22:14:35.926	LIVEKIT	stream-bdffc9c0-0103-4b5a-b3a6-0605f683ca23	[]	1	#3F3F46	0
47b34798-029a-4f4e-87b7-77bb2aaabfdd	47d9c408-1a3c-46c1-aecf-6f1746615499	My Live Stream	ENDED	PUBLIC	[]	2026-04-01 20:55:51.215	2026-04-01 21:02:37.698	2026-04-01 20:55:51.217	2026-04-01 21:02:37.701	LIVEKIT	stream-47b34798-029a-4f4e-87b7-77bb2aaabfdd	[]	12	#3F3F46	0
c54155e7-1039-4597-b336-3a7097a63284	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-04-01 09:23:17.434	2026-04-01 09:28:17.555	2026-04-01 09:23:17.436	2026-04-01 09:28:17.558	LIVEKIT	stream-c54155e7-1039-4597-b336-3a7097a63284	[]	1	#3F3F46	0
2d2e25f5-33bd-4adf-b69e-150d53b5b108	281ac0c9-d22b-4ece-895a-9d2c86a8f315	My Live Stream	ENDED	PUBLIC	[]	2026-04-01 09:28:22.487	2026-04-01 09:49:30.21	2026-04-01 09:28:22.489	2026-04-01 09:49:30.213	LIVEKIT	stream-2d2e25f5-33bd-4adf-b69e-150d53b5b108	[]	1	#3F3F46	0
e477bb1a-2d08-4e06-8455-6183aa8b6ba3	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-04-01 09:49:33.446	2026-04-01 09:51:50.996	2026-04-01 09:49:33.448	2026-04-01 09:51:51	LIVEKIT	stream-e477bb1a-2d08-4e06-8455-6183aa8b6ba3	[]	1	#3F3F46	0
128e8cc7-cc76-4367-b035-9423121bef49	281ac0c9-d22b-4ece-895a-9d2c86a8f315	Gds in the door	ENDED	PUBLIC	[]	2026-04-01 09:52:26.726	2026-04-01 09:52:55.287	2026-04-01 09:52:26.727	2026-04-01 09:52:55.29	LIVEKIT	stream-128e8cc7-cc76-4367-b035-9423121bef49	[]	1	#3F3F46	0
965a2f65-fc61-413e-a675-9197dcd0d373	c5c904e8-da40-4458-b8bf-5c2cc97348b1	My Live Stream	ENDED	PUBLIC	[]	2026-04-01 22:14:34.627	2026-04-01 22:18:43.541	2026-04-01 22:14:34.628	2026-04-01 22:18:43.544	LIVEKIT	stream-965a2f65-fc61-413e-a675-9197dcd0d373	[]	2	#22C55E	0
ef05d047-00b7-4faa-b9d9-3f19c3aced8d	47d9c408-1a3c-46c1-aecf-6f1746615499	My Live Stream	ENDED	PUBLIC	[]	2026-04-01 21:37:45.581	2026-04-01 21:40:57.358	2026-04-01 21:37:45.582	2026-04-01 21:40:57.361	LIVEKIT	stream-ef05d047-00b7-4faa-b9d9-3f19c3aced8d	[]	6	#3F3F46	0
fc805175-e93f-49ef-834e-eaac90cec00f	3961fabe-1345-4426-bd8a-ca0a5eac3aac	This a test bitch	ENDED	PUBLIC	[]	2026-04-01 09:53:09.884	2026-04-01 09:54:24.192	2026-04-01 09:53:09.885	2026-04-01 09:54:24.195	LIVEKIT	stream-fc805175-e93f-49ef-834e-eaac90cec00f	[]	1	#3B82F6	0
481dad7d-d73f-4dce-b9a7-f24066eb069c	281ac0c9-d22b-4ece-895a-9d2c86a8f315	Gdn	ENDED	PUBLIC	[]	2026-04-01 09:54:28.809	2026-04-01 09:56:13.324	2026-04-01 09:54:28.81	2026-04-01 09:56:13.327	LIVEKIT	stream-481dad7d-d73f-4dce-b9a7-f24066eb069c	[]	1	#3B82F6	0
b1001c15-3e22-4d3f-b80b-08eeb774338c	3961fabe-1345-4426-bd8a-ca0a5eac3aac	Test	ENDED	PUBLIC	[]	2026-04-01 10:52:40.719	2026-04-01 10:57:34.695	2026-04-01 10:52:40.721	2026-04-01 10:57:34.698	LIVEKIT	stream-b1001c15-3e22-4d3f-b80b-08eeb774338c	[]	1	#3B82F6	0
2a4f4ba0-dca4-4aa3-b002-10e5a2af132f	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-04-01 10:57:52.382	2026-04-01 10:58:44.11	2026-04-01 10:57:52.383	2026-04-01 10:58:44.112	LIVEKIT	stream-2a4f4ba0-dca4-4aa3-b002-10e5a2af132f	[]	1	#3F3F46	0
e55f590d-d03f-4d86-b1b6-57ae61910a99	281ac0c9-d22b-4ece-895a-9d2c86a8f315	Gdn	ENDED	PUBLIC	[]	2026-04-01 15:50:06.421	2026-04-01 15:51:48.252	2026-04-01 15:50:06.425	2026-04-01 15:51:48.255	LIVEKIT	stream-e55f590d-d03f-4d86-b1b6-57ae61910a99	[]	1	#3B82F6	0
dfaa6a9c-3d1f-45cb-9074-f48e4f7026e7	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-04-01 17:44:57.881	2026-04-01 17:45:16.697	2026-04-01 17:44:57.883	2026-04-01 17:45:16.7	LIVEKIT	stream-dfaa6a9c-3d1f-45cb-9074-f48e4f7026e7	[]	1	#3F3F46	0
b40bfeac-ca8f-443b-b72d-8f058d898446	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-04-01 18:22:32.604	2026-04-01 18:22:56.504	2026-04-01 18:22:32.606	2026-04-01 18:22:56.507	LIVEKIT	stream-b40bfeac-ca8f-443b-b72d-8f058d898446	[]	1	#3F3F46	0
8fc0ae7c-4c43-46b0-aac9-44e8469aeb49	c5c904e8-da40-4458-b8bf-5c2cc97348b1	My Live Stream	ENDED	PUBLIC	[]	2026-04-01 22:09:18.407	2026-04-01 22:12:17.318	2026-04-01 22:09:18.409	2026-04-01 22:12:17.321	LIVEKIT	stream-8fc0ae7c-4c43-46b0-aac9-44e8469aeb49	[]	2	#22C55E	0
3e3724e2-4413-41e0-8a19-451579092edb	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-04-01 18:23:00.298	2026-04-01 18:23:15.214	2026-04-01 18:23:00.299	2026-04-01 18:23:15.216	LIVEKIT	stream-3e3724e2-4413-41e0-8a19-451579092edb	[]	1	#3F3F46	0
e94455bd-d7a9-455b-8e7a-9b12f15bff19	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-04-01 18:40:29.683	2026-04-01 18:41:47.946	2026-04-01 18:40:29.685	2026-04-01 18:41:47.949	LIVEKIT	stream-e94455bd-d7a9-455b-8e7a-9b12f15bff19	[]	1	#3F3F46	0
844886a5-96fd-49c7-ba1c-f2eea3d7ce01	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-04-01 19:08:13.336	2026-04-01 19:08:49.567	2026-04-01 19:08:13.338	2026-04-01 19:08:49.57	LIVEKIT	stream-844886a5-96fd-49c7-ba1c-f2eea3d7ce01	[]	1	#3F3F46	0
67dca92d-3a1a-4799-87ba-a6504d628339	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-04-01 19:08:53.449	2026-04-01 19:12:09.412	2026-04-01 19:08:53.451	2026-04-01 19:12:09.415	LIVEKIT	stream-67dca92d-3a1a-4799-87ba-a6504d628339	[]	1	#3F3F46	0
80abe71e-5ff4-4f83-9f52-0d650aad154d	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-04-01 19:46:45.687	2026-04-01 19:53:41.862	2026-04-01 19:46:45.689	2026-04-01 19:53:41.866	LIVEKIT	stream-80abe71e-5ff4-4f83-9f52-0d650aad154d	[]	1	#3F3F46	0
96c5ce44-1733-46ba-a957-e79cf5c5f9a3	47d9c408-1a3c-46c1-aecf-6f1746615499	My Live Stream	ENDED	PUBLIC	[]	2026-04-01 19:53:56.656	2026-04-01 20:06:17.699	2026-04-01 19:53:56.658	2026-04-01 20:06:17.701	LIVEKIT	stream-96c5ce44-1733-46ba-a957-e79cf5c5f9a3	[]	1	#3F3F46	0
385f01e7-5ce6-4797-a65f-371c2d99937b	47d9c408-1a3c-46c1-aecf-6f1746615499	My Live Stream	ENDED	PUBLIC	[]	2026-04-01 20:09:21.726	2026-04-01 20:10:45.97	2026-04-01 20:09:21.728	2026-04-01 20:10:45.973	LIVEKIT	stream-385f01e7-5ce6-4797-a65f-371c2d99937b	[]	1	#3F3F46	0
47ea64c7-11c3-4b29-ace3-adeef70dde13	c5c904e8-da40-4458-b8bf-5c2cc97348b1	My Live Stream	ENDED	PUBLIC	[]	2026-04-01 22:26:18.464	2026-04-01 22:26:26.16	2026-04-01 22:26:18.466	2026-04-01 22:26:26.163	LIVEKIT	stream-47ea64c7-11c3-4b29-ace3-adeef70dde13	[]	1	#3F3F46	0
66000676-e56a-4c26-a200-4a930987e019	c5c904e8-da40-4458-b8bf-5c2cc97348b1	Fish and Chips	ENDED	PUBLIC	[]	2026-04-01 22:26:44.343	2026-04-01 22:30:57.36	2026-04-01 22:26:44.345	2026-04-01 22:30:57.363	LIVEKIT	stream-66000676-e56a-4c26-a200-4a930987e019	[]	2	#22C55E	0
8932ebc4-876d-4cb4-8fbe-d59e05767546	c5c904e8-da40-4458-b8bf-5c2cc97348b1	Shitz	ENDED	PUBLIC	[]	2026-04-01 22:31:05.333	2026-04-01 22:38:11.613	2026-04-01 22:31:05.334	2026-04-01 22:38:11.616	LIVEKIT	stream-8932ebc4-876d-4cb4-8fbe-d59e05767546	[]	4	#3F3F46	0
ad4abb54-e038-4c35-8785-d7c2f4389b91	c5c904e8-da40-4458-b8bf-5c2cc97348b1	My Live Stream	ENDED	PUBLIC	[]	2026-04-01 22:53:31.285	2026-04-01 22:54:36.817	2026-04-01 22:53:31.287	2026-04-01 22:54:36.82	LIVEKIT	stream-ad4abb54-e038-4c35-8785-d7c2f4389b91	[]	1	#3F3F46	0
954b55ba-be54-456f-81eb-31c108c42ae6	281ac0c9-d22b-4ece-895a-9d2c86a8f315	Chicago	ENDED	PUBLIC	[]	2026-04-01 23:13:48.274	2026-04-01 23:20:48.429	2026-04-01 23:13:48.276	2026-04-01 23:20:48.432	LIVEKIT	stream-954b55ba-be54-456f-81eb-31c108c42ae6	[]	4	#22C55E	0
f9480f50-6974-4f22-a4fc-fb81800d97ad	c5c904e8-da40-4458-b8bf-5c2cc97348b1	My Live Stream	ENDED	PUBLIC	[]	2026-04-01 23:06:18.116	2026-04-01 23:06:58.066	2026-04-01 23:06:18.118	2026-04-01 23:06:58.069	LIVEKIT	stream-f9480f50-6974-4f22-a4fc-fb81800d97ad	[]	2	#3F3F46	0
27819416-1f12-4c8d-939d-318f6dc2adb7	281ac0c9-d22b-4ece-895a-9d2c86a8f315	Wyoming	ENDED	PUBLIC	[]	2026-04-01 23:09:52.87	2026-04-01 23:13:19.463	2026-04-01 23:09:52.872	2026-04-01 23:13:19.465	LIVEKIT	stream-27819416-1f12-4c8d-939d-318f6dc2adb7	[]	1	#EC4899	0
b524fe7d-3e1a-42cc-9ab8-6c873b378fe0	281ac0c9-d22b-4ece-895a-9d2c86a8f315	I eat ass	ENDED	PUBLIC	[]	2026-04-01 23:21:13.026	2026-04-01 23:29:47.123	2026-04-01 23:21:13.027	2026-04-01 23:29:47.126	LIVEKIT	stream-b524fe7d-3e1a-42cc-9ab8-6c873b378fe0	[]	1	#EC4899	0
a1587cc4-753b-4449-ab03-823d0b214d7e	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-04-02 00:51:16.097	2026-04-02 00:57:49.685	2026-04-02 00:51:16.099	2026-04-02 00:57:49.688	LIVEKIT	stream-a1587cc4-753b-4449-ab03-823d0b214d7e	[]	4	#3F3F46	0
f3574df7-3c50-44f9-b908-b84420c75b48	47d9c408-1a3c-46c1-aecf-6f1746615499	My Live Stream	ENDED	PUBLIC	[]	2026-04-02 01:43:52.952	2026-04-02 01:45:05.356	2026-04-02 01:43:52.955	2026-04-02 01:45:05.359	LIVEKIT	stream-f3574df7-3c50-44f9-b908-b84420c75b48	[]	1	#3F3F46	0
96456357-7470-40d4-bb0d-957c49561d88	47d9c408-1a3c-46c1-aecf-6f1746615499	My Live Stream	ENDED	PUBLIC	[]	2026-04-02 01:45:10.193	2026-04-02 01:59:26.212	2026-04-02 01:45:10.195	2026-04-02 01:59:26.217	LIVEKIT	stream-96456357-7470-40d4-bb0d-957c49561d88	[]	1	#3F3F46	0
02615b24-131a-4df4-953f-9802b3cd3047	47d9c408-1a3c-46c1-aecf-6f1746615499	My Live Stream	ENDED	PUBLIC	[]	2026-04-02 02:01:20.579	2026-04-02 03:15:26.799	2026-04-02 02:01:20.58	2026-04-02 03:15:26.806	LIVEKIT	stream-02615b24-131a-4df4-953f-9802b3cd3047	[]	1	#3F3F46	0
26952696-6533-46e8-933c-2b008248ff6f	47d9c408-1a3c-46c1-aecf-6f1746615499	My Live Stream	ENDED	PUBLIC	[]	2026-04-02 03:16:15.266	2026-04-02 03:17:01.284	2026-04-02 03:16:15.268	2026-04-02 03:17:01.287	LIVEKIT	stream-26952696-6533-46e8-933c-2b008248ff6f	[]	1	#3F3F46	0
53725353-c8cb-40f3-941c-343cca5b8976	47d9c408-1a3c-46c1-aecf-6f1746615499	My Live Stream	ENDED	PUBLIC	[]	2026-04-02 03:17:06.221	2026-04-02 04:48:45.677	2026-04-02 03:17:06.222	2026-04-02 04:48:45.684	LIVEKIT	stream-53725353-c8cb-40f3-941c-343cca5b8976	[]	1	#3F3F46	0
09b0ff8c-d177-437f-9895-622c4bd1b117	47d9c408-1a3c-46c1-aecf-6f1746615499	My Live Stream	ENDED	PUBLIC	[]	2026-04-02 22:28:08.976	2026-04-02 22:28:45.106	2026-04-02 22:28:08.978	2026-04-02 22:28:45.109	LIVEKIT	stream-09b0ff8c-d177-437f-9895-622c4bd1b117	[]	1	#3F3F46	0
caa0abb9-6866-4ca0-b96f-884c19bb1e6b	47d9c408-1a3c-46c1-aecf-6f1746615499	My Live Stream	ENDED	PUBLIC	[]	2026-04-02 04:49:15.742	2026-04-02 05:26:08.709	2026-04-02 04:49:15.743	2026-04-02 05:26:08.714	LIVEKIT	stream-caa0abb9-6866-4ca0-b96f-884c19bb1e6b	[]	4	#3F3F46	0
fa770eba-c6d5-4379-a889-02d245470438	47d9c408-1a3c-46c1-aecf-6f1746615499	My Live Stream	ENDED	PUBLIC	[]	2026-04-02 09:22:47.702	2026-04-02 20:25:41.202	2026-04-02 09:22:47.704	2026-04-02 20:25:41.205	LIVEKIT	stream-fa770eba-c6d5-4379-a889-02d245470438	[]	4	#3F3F46	0
d4c944f1-c309-4ae5-975e-67659f876f87	47d9c408-1a3c-46c1-aecf-6f1746615499	My Live Stream	ENDED	PUBLIC	[]	2026-04-02 05:26:33.413	2026-04-02 05:36:44.258	2026-04-02 05:26:33.415	2026-04-02 05:36:44.261	LIVEKIT	stream-d4c944f1-c309-4ae5-975e-67659f876f87	[]	1	#3F3F46	0
a324b73d-282e-406c-8407-fafeb191cfb3	47d9c408-1a3c-46c1-aecf-6f1746615499	My Live Stream	ENDED	PUBLIC	[]	2026-04-02 05:37:17.975	2026-04-02 05:55:16.786	2026-04-02 05:37:17.976	2026-04-02 05:55:16.791	LIVEKIT	stream-a324b73d-282e-406c-8407-fafeb191cfb3	[]	1	#3F3F46	0
16813a30-c789-445e-94f5-13b58c02b245	47d9c408-1a3c-46c1-aecf-6f1746615499	My Live Stream	ENDED	PUBLIC	[]	2026-04-02 05:55:52.383	2026-04-02 06:02:50.377	2026-04-02 05:55:52.384	2026-04-02 06:02:50.38	LIVEKIT	stream-16813a30-c789-445e-94f5-13b58c02b245	[]	1	#3F3F46	0
2d4e49c4-54c5-4f34-ac4c-97f86f7fb80f	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-04-02 20:28:32.98	2026-04-02 20:28:46.677	2026-04-02 20:28:32.981	2026-04-02 20:28:46.679	LIVEKIT	stream-2d4e49c4-54c5-4f34-ac4c-97f86f7fb80f	[]	1	#3F3F46	0
63a3a45c-bfb5-4fc9-bd52-0443d45c7c6a	47d9c408-1a3c-46c1-aecf-6f1746615499	My Live Stream	ENDED	PUBLIC	[]	2026-04-02 06:13:14.671	2026-04-02 06:13:31.096	2026-04-02 06:13:14.672	2026-04-02 06:13:31.099	LIVEKIT	stream-63a3a45c-bfb5-4fc9-bd52-0443d45c7c6a	[]	1	#3F3F46	0
67f6598c-24a7-4ec3-b926-6cc10daf0586	47d9c408-1a3c-46c1-aecf-6f1746615499	My Live Stream	ENDED	PUBLIC	[]	2026-04-02 06:13:38.25	2026-04-02 06:40:09.259	2026-04-02 06:13:38.251	2026-04-02 06:40:09.263	LIVEKIT	stream-67f6598c-24a7-4ec3-b926-6cc10daf0586	[]	1	#3F3F46	0
cc5dd290-ad46-40a3-bc08-19fee473d6a3	47d9c408-1a3c-46c1-aecf-6f1746615499	My Live Stream	ENDED	PUBLIC	[]	2026-04-02 22:34:40.935	2026-04-02 22:38:50.288	2026-04-02 22:34:40.936	2026-04-02 22:38:50.292	LIVEKIT	stream-cc5dd290-ad46-40a3-bc08-19fee473d6a3	[]	1	#3F3F46	0
0419c286-af86-4be5-91cf-4d57e8af21ed	e9134380-2da7-4a1e-bd2a-34398f85a6e5	My Live Stream	ENDED	PUBLIC	[]	2026-04-02 20:29:07.799	2026-04-02 20:53:56.55	2026-04-02 20:29:07.8	2026-04-02 20:53:56.554	LIVEKIT	stream-0419c286-af86-4be5-91cf-4d57e8af21ed	[]	1	#3F3F46	0
ff734555-0341-4657-ad73-a528786cfc96	9f70646e-c63e-4a08-a4fa-8786204bbf4e	My Live Stream	ENDED	PUBLIC	[]	2026-04-02 06:41:13.027	2026-04-02 06:41:15.641	2026-04-02 06:41:13.029	2026-04-02 06:41:15.644	LIVEKIT	stream-ff734555-0341-4657-ad73-a528786cfc96	[]	1	#3F3F46	0
acde2759-a974-49ef-845d-3343abfa947b	47d9c408-1a3c-46c1-aecf-6f1746615499	My Live Stream	ENDED	PUBLIC	[]	2026-04-02 06:41:08.126	2026-04-02 07:56:06.415	2026-04-02 06:41:08.127	2026-04-02 07:56:06.422	LIVEKIT	stream-acde2759-a974-49ef-845d-3343abfa947b	[]	1	#3F3F46	0
92851de4-b5ed-42de-9afb-6fb22306d1e1	e9134380-2da7-4a1e-bd2a-34398f85a6e5	My Live Stream	ENDED	PUBLIC	[]	2026-04-02 21:15:39.648	2026-04-02 21:24:06.861	2026-04-02 21:15:39.65	2026-04-02 21:24:06.865	LIVEKIT	stream-92851de4-b5ed-42de-9afb-6fb22306d1e1	[]	1	#3F3F46	0
c0ee23c7-f6ae-46f8-9a98-7182e883a000	47d9c408-1a3c-46c1-aecf-6f1746615499	My Live Stream	ENDED	PUBLIC	[]	2026-04-02 08:02:00.579	2026-04-02 09:06:17.691	2026-04-02 08:02:00.581	2026-04-02 09:06:17.697	LIVEKIT	stream-c0ee23c7-f6ae-46f8-9a98-7182e883a000	[]	1	#3F3F46	0
d80774e1-d6b5-4da7-841b-d3ff095b7ba8	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-04-03 02:08:04.024	2026-04-03 02:14:37.285	2026-04-03 02:08:04.026	2026-04-03 02:14:37.291	LIVEKIT	stream-d80774e1-d6b5-4da7-841b-d3ff095b7ba8	[]	1	#3F3F46	0
a35d4aab-2842-4d65-a959-d6084c335a15	47d9c408-1a3c-46c1-aecf-6f1746615499	My Live Stream	ENDED	PUBLIC	[]	2026-04-02 21:38:46.413	2026-04-02 21:40:20.806	2026-04-02 21:38:46.414	2026-04-02 21:40:20.81	LIVEKIT	stream-a35d4aab-2842-4d65-a959-d6084c335a15	[]	1	#3F3F46	0
69ea0705-43cd-4173-bc2c-8e2377162b70	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-04-02 22:38:56.264	2026-04-02 22:39:25.455	2026-04-02 22:38:56.265	2026-04-02 22:39:25.458	LIVEKIT	stream-69ea0705-43cd-4173-bc2c-8e2377162b70	[]	1	#3F3F46	0
f50c16f0-d9a9-42a9-84c9-06344237287c	47d9c408-1a3c-46c1-aecf-6f1746615499	My Live Stream	ENDED	PUBLIC	[]	2026-04-02 21:40:53.528	2026-04-02 21:41:37.152	2026-04-02 21:40:53.53	2026-04-02 21:41:37.156	LIVEKIT	stream-f50c16f0-d9a9-42a9-84c9-06344237287c	[]	1	#3F3F46	0
5778b4b4-bfc5-46db-8082-7ce78ff31a78	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-04-02 22:56:46.014	2026-04-02 22:56:54.437	2026-04-02 22:56:46.015	2026-04-02 22:56:54.44	LIVEKIT	stream-5778b4b4-bfc5-46db-8082-7ce78ff31a78	[]	1	#3F3F46	0
d009276d-12d6-4cc2-9b13-66057b20f812	47d9c408-1a3c-46c1-aecf-6f1746615499	My Live Stream	ENDED	PUBLIC	[]	2026-04-02 22:00:00.584	2026-04-02 22:00:33.202	2026-04-02 22:00:00.587	2026-04-02 22:00:33.205	LIVEKIT	stream-d009276d-12d6-4cc2-9b13-66057b20f812	[]	1	#3F3F46	0
f398c85e-4dba-42e6-add2-ea305fcd0575	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-04-02 22:39:29.236	2026-04-02 22:39:36.813	2026-04-02 22:39:29.238	2026-04-02 22:39:36.816	LIVEKIT	stream-f398c85e-4dba-42e6-add2-ea305fcd0575	[]	1	#3F3F46	0
77a6dee4-8367-44ed-8c3c-ce9e3a9f0d44	47d9c408-1a3c-46c1-aecf-6f1746615499	My Live Stream	ENDED	PUBLIC	[]	2026-04-02 22:00:54.983	2026-04-02 22:27:09.067	2026-04-02 22:00:54.985	2026-04-02 22:27:09.072	LIVEKIT	stream-77a6dee4-8367-44ed-8c3c-ce9e3a9f0d44	[]	1	#3F3F46	0
5e5ed126-17c9-4b3c-abc6-3a1f4862fc43	47d9c408-1a3c-46c1-aecf-6f1746615499	My Live Stream	ENDED	PUBLIC	[]	2026-04-02 22:56:40.763	2026-04-02 22:56:59.529	2026-04-02 22:56:40.764	2026-04-02 22:56:59.532	LIVEKIT	stream-5e5ed126-17c9-4b3c-abc6-3a1f4862fc43	[]	1	#3F3F46	0
e09120b6-e993-43fb-9a40-680e8654de4d	47d9c408-1a3c-46c1-aecf-6f1746615499	My Live Stream	ENDED	PUBLIC	[]	2026-04-02 22:55:43.998	2026-04-02 22:56:08.608	2026-04-02 22:55:44	2026-04-02 22:56:08.611	LIVEKIT	stream-e09120b6-e993-43fb-9a40-680e8654de4d	[]	1	#3F3F46	0
5ff4847f-a310-41e8-ac54-711d51db07dd	47d9c408-1a3c-46c1-aecf-6f1746615499	My Live Stream	ENDED	PUBLIC	[]	2026-04-02 22:56:13.561	2026-04-02 22:56:28.246	2026-04-02 22:56:13.563	2026-04-02 22:56:28.249	LIVEKIT	stream-5ff4847f-a310-41e8-ac54-711d51db07dd	[]	1	#3F3F46	0
40a0a34e-b7a6-4086-84e9-32d5f8ad0cc3	47d9c408-1a3c-46c1-aecf-6f1746615499	My Live Stream	ENDED	PUBLIC	[]	2026-04-03 01:35:52.528	2026-04-03 02:07:00.414	2026-04-03 01:35:52.53	2026-04-03 02:07:00.419	LIVEKIT	stream-40a0a34e-b7a6-4086-84e9-32d5f8ad0cc3	[]	1	#3F3F46	0
d47d3d9f-ac85-4586-b09b-aba3dc40df91	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-04-02 22:57:43.743	2026-04-02 22:58:12.663	2026-04-02 22:57:43.745	2026-04-02 22:58:12.666	LIVEKIT	stream-d47d3d9f-ac85-4586-b09b-aba3dc40df91	[]	1	#3F3F46	0
97dd1700-f4f1-4f39-b36e-0c2e59037d29	47d9c408-1a3c-46c1-aecf-6f1746615499	My Live Stream	ENDED	PUBLIC	[]	2026-04-03 01:33:36.792	2026-04-03 01:35:45.24	2026-04-03 01:33:36.794	2026-04-03 01:35:45.246	LIVEKIT	stream-97dd1700-f4f1-4f39-b36e-0c2e59037d29	[]	1	#3F3F46	0
ced55ebf-ceca-4ba3-9455-717e57d6ee14	47d9c408-1a3c-46c1-aecf-6f1746615499	My Live Stream	ENDED	PUBLIC	[]	2026-04-03 02:07:06.367	2026-04-03 02:07:50.794	2026-04-03 02:07:06.369	2026-04-03 02:07:50.798	LIVEKIT	stream-ced55ebf-ceca-4ba3-9455-717e57d6ee14	[]	1	#3F3F46	0
6e4971ff-7e58-4c78-be5b-f7fd7b3d7373	47d9c408-1a3c-46c1-aecf-6f1746615499	My Live Stream	ENDED	PUBLIC	[]	2026-04-03 02:54:31.061	2026-04-03 06:55:37.335	2026-04-03 02:54:31.063	2026-04-03 06:55:37.34	LIVEKIT	stream-6e4971ff-7e58-4c78-be5b-f7fd7b3d7373	[]	1	#3F3F46	0
5300c527-4d0c-4d4a-87de-65872b40b423	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-04-04 04:06:39.313	2026-04-04 04:34:42.355	2026-04-04 04:06:39.315	2026-04-04 04:34:42.36	LIVEKIT	stream-5300c527-4d0c-4d4a-87de-65872b40b423	[]	1	#3F3F46	0
aecbabc9-20a5-4860-9800-dec04c2a3be2	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-04-04 04:35:39.741	2026-04-04 04:54:44.454	2026-04-04 04:35:39.744	2026-04-04 04:54:44.46	LIVEKIT	stream-aecbabc9-20a5-4860-9800-dec04c2a3be2	[]	1	#3F3F46	0
f27bbc6e-ec14-42ca-9967-e0c59af47a35	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-04-04 04:55:27.246	2026-04-04 06:21:10.807	2026-04-04 04:55:27.248	2026-04-04 06:21:10.813	LIVEKIT	stream-f27bbc6e-ec14-42ca-9967-e0c59af47a35	[]	1	#3F3F46	0
d69a323a-014b-454b-b94e-84333754ff95	3961fabe-1345-4426-bd8a-ca0a5eac3aac	My Live Stream	ENDED	PUBLIC	[]	2026-04-04 06:22:05.74	2026-04-04 06:30:33.747	2026-04-04 06:22:05.742	2026-04-04 06:30:33.752	LIVEKIT	stream-d69a323a-014b-454b-b94e-84333754ff95	[]	1	#3F3F46	0
\.


--
-- Data for Name: user_blocks; Type: TABLE DATA; Schema: public; Owner: liveapp
--

COPY public.user_blocks (blocker_id, blocked_id, created_at) FROM stdin;
281ac0c9-d22b-4ece-895a-9d2c86a8f315	9f70646e-c63e-4a08-a4fa-8786204bbf4e	2026-04-01 09:21:36.927
\.


--
-- Data for Name: user_favorites; Type: TABLE DATA; Schema: public; Owner: liveapp
--

COPY public.user_favorites (user_id, favorite_user_id, created_at) FROM stdin;
3961fabe-1345-4426-bd8a-ca0a5eac3aac	47d9c408-1a3c-46c1-aecf-6f1746615499	2026-03-29 09:15:17.696
47d9c408-1a3c-46c1-aecf-6f1746615499	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-03-29 09:19:22.721
9f70646e-c63e-4a08-a4fa-8786204bbf4e	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-03-29 09:20:08.124
3961fabe-1345-4426-bd8a-ca0a5eac3aac	e9134380-2da7-4a1e-bd2a-34398f85a6e5	2026-03-29 09:26:21.577
281ac0c9-d22b-4ece-895a-9d2c86a8f315	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-04-01 09:24:49.938
3961fabe-1345-4426-bd8a-ca0a5eac3aac	281ac0c9-d22b-4ece-895a-9d2c86a8f315	2026-04-01 09:28:40.64
c5c904e8-da40-4458-b8bf-5c2cc97348b1	3961fabe-1345-4426-bd8a-ca0a5eac3aac	2026-04-01 22:15:32.773
3961fabe-1345-4426-bd8a-ca0a5eac3aac	c5c904e8-da40-4458-b8bf-5c2cc97348b1	2026-04-01 22:19:33.62
9f70646e-c63e-4a08-a4fa-8786204bbf4e	47d9c408-1a3c-46c1-aecf-6f1746615499	2026-04-02 01:51:18.536
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: liveapp
--

COPY public.users (id, email, username, password_hash, created_at, updated_at, public_id, last_username_change, email_updated_at, two_factor_enabled, two_factor_secret, "twoFactorBackupCodes", dm_unlock_gift_id, notification_push_enabled, notification_live_alerts_enabled, notification_marketing_enabled) FROM stdin;
47d9c408-1a3c-46c1-aecf-6f1746615499	test@test.com	JamesConnor	$2a$12$StPKRDmdPKkwjs.OqZMNYu/BsMSOIre2el3Cj5mEhnQPkjPODtxUG	2026-03-29 09:13:50.244	2026-03-29 09:13:50.244	7908653821389	\N	\N	f	\N	\N	\N	t	t	f
9f70646e-c63e-4a08-a4fa-8786204bbf4e	test1@test.com	SarahOconnor	$2a$12$hh4JOJGJP5VjnN8u.H9uWeXKeZyYlSvvV6kz5/nttwERYQlfX.jXu	2026-03-29 09:20:01.306	2026-03-29 09:20:01.306	1763674904325	\N	\N	f	\N	\N	\N	t	t	f
e9134380-2da7-4a1e-bd2a-34398f85a6e5	test2@test.com	FrankSinatra	$2a$12$5aLYCa3fP782sBYvFfncYuhHHE4fylJa1kW3IwxkibDYs1EJ5vOYi	2026-03-29 09:20:32.035	2026-03-29 09:20:32.035	7910809537773	\N	\N	f	\N	\N	\N	t	t	f
3961fabe-1345-4426-bd8a-ca0a5eac3aac	jgibbs.online@gmail.com	BigDaddy	$2a$12$DwhIJic280iI/F533j/2.OanIhJxPz0yQDpcesWtqUNoFggzH75KC	2026-03-29 09:09:09.167	2026-03-30 01:16:54.614	2206909180860	\N	\N	f	\N	\N	galaxy	t	t	t
281ac0c9-d22b-4ece-895a-9d2c86a8f315	corzayy@gmail.com	ChiDotGo	$2a$12$wgWd2Xw7Mey8wFmZB3V81O0QNuStMzhoFd9rdCUsdn/MRGArZVPVu	2026-04-01 09:09:37.327	2026-04-01 09:09:37.327	9004775412886	\N	\N	f	\N	\N	\N	t	t	f
7e2a5e6d-7021-482a-abeb-883f8ebf016b	test3@test.com	JohnFranklin	$2a$12$B.M.WbD2SpD3tWMnG5cpuOhjvHpF27wL3bhgsVlh1vgepKUIbC6/K	2026-04-01 09:25:00.648	2026-04-01 09:25:00.648	3272566665789	\N	\N	f	\N	\N	\N	t	t	f
ee45a65d-1fea-4dae-96e6-cc0413c24c5a	test4@test.com	ChrisKringle	$2a$12$npoU/X2Qf.J6aUTrpMxuU.GrZtBU0Nqfj.4uwrnvVblU0WDs7ilS.	2026-04-01 09:25:26.053	2026-04-01 09:25:26.053	2256918691395	\N	\N	f	\N	\N	\N	t	t	f
c5c904e8-da40-4458-b8bf-5c2cc97348b1	io@suprcloud.io	supr	$2a$12$JMb/sPH9qeqktEJOyRC6Tu6/5gK/pxst.6zAFQQCYAEyCnJBZ5n02	2026-04-01 22:08:38.468	2026-04-01 22:49:50.692	2248352842619	\N	\N	f	\N	\N	\N	t	f	f
199cecb0-a797-4677-a949-f23276e5c330	dummy@sparkzlive.com	DummyAccount	$2a$12$zaWARl7F3yx6wiITBok.EOyFkpuu0Mv0XJxXxehoYnNvqgU.slcE6	2026-04-03 10:40:35.192	2026-04-03 10:40:35.192	9229197675981	\N	\N	f	\N	\N	\N	t	t	f
\.


--
-- Data for Name: wallet_ledger; Type: TABLE DATA; Schema: public; Owner: liveapp
--

COPY public.wallet_ledger (id, user_id, entry_type, delta_coins, delta_diamonds, stream_id, gift_tx_id, created_at) FROM stdin;
e15b1c41-88c5-43b7-8e78-8eb9dedcb6eb	e9134380-2da7-4a1e-bd2a-34398f85a6e5	GIFT_SEND	-250	0	f95d9d98-2a21-4211-bda1-11573a7c3af5	718ed453-19c5-4457-a1bf-621958a58757	2026-03-29 09:20:53.065
88134cd2-c6b1-4e24-ad3b-8cd19242b67f	3961fabe-1345-4426-bd8a-ca0a5eac3aac	GIFT_RECEIVE	0	250	f95d9d98-2a21-4211-bda1-11573a7c3af5	718ed453-19c5-4457-a1bf-621958a58757	2026-03-29 09:20:53.072
343d476c-72c8-4133-b18d-50b63a8768ad	e9134380-2da7-4a1e-bd2a-34398f85a6e5	GIFT_SEND	-5000	0	f95d9d98-2a21-4211-bda1-11573a7c3af5	6f0f2a5c-330d-43f7-915f-c1da6f93d4d1	2026-03-29 09:21:12.354
f8035347-bf0c-48e3-bb5d-b909c3a319d5	3961fabe-1345-4426-bd8a-ca0a5eac3aac	GIFT_RECEIVE	0	5000	f95d9d98-2a21-4211-bda1-11573a7c3af5	6f0f2a5c-330d-43f7-915f-c1da6f93d4d1	2026-03-29 09:21:12.361
1a03eb76-107d-4460-a105-9955b30d6ff8	3961fabe-1345-4426-bd8a-ca0a5eac3aac	GIFT_SEND	-5000	0	f95d9d98-2a21-4211-bda1-11573a7c3af5	79e29532-aba9-467c-a9a2-3204e6315258	2026-03-29 09:21:32.561
c45aff79-ca75-4072-a36f-d9610108217b	e9134380-2da7-4a1e-bd2a-34398f85a6e5	GIFT_RECEIVE	0	5000	f95d9d98-2a21-4211-bda1-11573a7c3af5	79e29532-aba9-467c-a9a2-3204e6315258	2026-03-29 09:21:32.565
17886dd2-44da-4cdd-8ed2-5ae8868e00d7	e9134380-2da7-4a1e-bd2a-34398f85a6e5	GIFT_SEND	-250	0	f95d9d98-2a21-4211-bda1-11573a7c3af5	255de527-d350-44ae-a635-a951084022d4	2026-03-29 09:21:55.863
24c42ffe-4911-4a58-b80d-c859724d26e1	3961fabe-1345-4426-bd8a-ca0a5eac3aac	GIFT_RECEIVE	0	250	f95d9d98-2a21-4211-bda1-11573a7c3af5	255de527-d350-44ae-a635-a951084022d4	2026-03-29 09:21:55.868
5daaeeb0-ccfa-46ea-b61a-2947bd2910a9	e9134380-2da7-4a1e-bd2a-34398f85a6e5	GIFT_SEND	-5000	0	f95d9d98-2a21-4211-bda1-11573a7c3af5	cca49029-ec80-417a-aba7-7e2922cf48a9	2026-03-29 09:22:01.881
e7cd0bd5-a90e-4437-882b-67c88c92cab6	3961fabe-1345-4426-bd8a-ca0a5eac3aac	GIFT_RECEIVE	0	5000	f95d9d98-2a21-4211-bda1-11573a7c3af5	cca49029-ec80-417a-aba7-7e2922cf48a9	2026-03-29 09:22:01.885
3e1d61a0-48a6-4740-ae17-cbf9a079cbc7	e9134380-2da7-4a1e-bd2a-34398f85a6e5	GIFT_SEND	-5000	0	f95d9d98-2a21-4211-bda1-11573a7c3af5	c530dd89-6942-4620-9c0b-6853e1448775	2026-03-29 09:22:08.54
75e19562-a904-4ebc-bd91-70e2830bf352	3961fabe-1345-4426-bd8a-ca0a5eac3aac	GIFT_RECEIVE	0	5000	f95d9d98-2a21-4211-bda1-11573a7c3af5	c530dd89-6942-4620-9c0b-6853e1448775	2026-03-29 09:22:08.544
90201f56-7b1f-43df-b961-c98f5977c9ee	e9134380-2da7-4a1e-bd2a-34398f85a6e5	GIFT_SEND	-250	0	f95d9d98-2a21-4211-bda1-11573a7c3af5	13d439e6-2551-4e7e-b6e6-b297270b9cde	2026-03-29 09:22:12.345
22a87207-5de9-415b-92ba-f7c6bf2e4a8e	3961fabe-1345-4426-bd8a-ca0a5eac3aac	GIFT_RECEIVE	0	250	f95d9d98-2a21-4211-bda1-11573a7c3af5	13d439e6-2551-4e7e-b6e6-b297270b9cde	2026-03-29 09:22:12.349
b4059f94-21ce-4b22-9bba-7dfff40175b3	e9134380-2da7-4a1e-bd2a-34398f85a6e5	GIFT_SEND	-250	0	\N	969bb461-0a05-4af2-ace1-b03377d2ae9e	2026-03-29 09:24:13.453
2dfc982f-2ac7-4eee-9234-daf921411213	3961fabe-1345-4426-bd8a-ca0a5eac3aac	GIFT_RECEIVE	0	250	\N	969bb461-0a05-4af2-ace1-b03377d2ae9e	2026-03-29 09:24:13.453
0dd6554d-24f7-4b31-95eb-61c9fdaba68f	3961fabe-1345-4426-bd8a-ca0a5eac3aac	PURCHASE_CREDIT	5000000	0	\N	\N	2026-03-30 01:14:42.347
384ec8bc-cb7e-430d-b0af-174989303f53	3961fabe-1345-4426-bd8a-ca0a5eac3aac	PURCHASE_CREDIT	5000000	0	\N	\N	2026-03-30 01:14:45.533
3152103f-727b-44fa-a391-250e70a5f240	3961fabe-1345-4426-bd8a-ca0a5eac3aac	PURCHASE_CREDIT	5000000	0	\N	\N	2026-03-30 01:14:48.683
bc528601-4c87-4e9a-a713-a110377b217d	3961fabe-1345-4426-bd8a-ca0a5eac3aac	PURCHASE_CREDIT	5000000	0	\N	\N	2026-03-30 01:14:49.229
e87999fa-d13f-4bcc-b1ba-4789b623e3e7	3961fabe-1345-4426-bd8a-ca0a5eac3aac	PURCHASE_CREDIT	5000000	0	\N	\N	2026-03-30 01:14:49.747
bbb0f84f-e667-48e8-8d39-7dbe8750f118	3961fabe-1345-4426-bd8a-ca0a5eac3aac	PURCHASE_CREDIT	5000000	0	\N	\N	2026-03-30 01:14:50.275
3dd362c2-c157-4e3f-a5db-ad746651fb4b	3961fabe-1345-4426-bd8a-ca0a5eac3aac	PURCHASE_CREDIT	5000000	0	\N	\N	2026-03-30 01:14:50.816
ef4e1328-6a55-4ef0-ab46-4fcd1e7f4ec8	3961fabe-1345-4426-bd8a-ca0a5eac3aac	GIFT_SEND	-1000000	0	e7c18482-912b-4e3d-936b-ce153022829e	d184d94c-c082-4c64-8d00-f2d768a6e469	2026-04-01 09:15:47.048
564c2dea-dd6a-47ee-b1cc-532a0b9c037e	281ac0c9-d22b-4ece-895a-9d2c86a8f315	GIFT_RECEIVE	0	1000000	e7c18482-912b-4e3d-936b-ce153022829e	d184d94c-c082-4c64-8d00-f2d768a6e469	2026-04-01 09:15:47.058
94c5af3d-e38b-430f-bca6-26b18a4f0dea	3961fabe-1345-4426-bd8a-ca0a5eac3aac	GIFT_SEND	-10	0	e7c18482-912b-4e3d-936b-ce153022829e	0604a41d-f20d-4c83-8ed2-2269cdba7d63	2026-04-01 09:16:20.408
d7d563ca-10ce-4c63-b3b2-5d3975dfc799	281ac0c9-d22b-4ece-895a-9d2c86a8f315	GIFT_RECEIVE	0	10	e7c18482-912b-4e3d-936b-ce153022829e	0604a41d-f20d-4c83-8ed2-2269cdba7d63	2026-04-01 09:16:20.411
19f0de7b-dff0-425a-adb5-b452738ec052	3961fabe-1345-4426-bd8a-ca0a5eac3aac	GIFT_SEND	-5000	0	\N	3797657a-154b-4f99-b225-dd7cf9fa74be	2026-04-01 09:17:38.722
02400dff-fe58-43fd-bc26-2cf630dbae34	281ac0c9-d22b-4ece-895a-9d2c86a8f315	GIFT_RECEIVE	0	5000	\N	3797657a-154b-4f99-b225-dd7cf9fa74be	2026-04-01 09:17:38.722
b924669d-622d-4c94-9b0e-088125850c8f	281ac0c9-d22b-4ece-895a-9d2c86a8f315	GIFT_SEND	-10	0	c54155e7-1039-4597-b336-3a7097a63284	19fd3eea-9a82-4014-a4e5-c70c5c4ff8ae	2026-04-01 09:25:24.525
a5a3d75c-2371-466d-b208-838a942a93ed	3961fabe-1345-4426-bd8a-ca0a5eac3aac	GIFT_RECEIVE	0	10	c54155e7-1039-4597-b336-3a7097a63284	19fd3eea-9a82-4014-a4e5-c70c5c4ff8ae	2026-04-01 09:25:24.53
43c3ebcc-37d2-4be9-a2e1-ad0cd0ed33a7	281ac0c9-d22b-4ece-895a-9d2c86a8f315	GIFT_SEND	-1000000	0	c54155e7-1039-4597-b336-3a7097a63284	bc2f4918-37d3-4ade-8dce-1193fcf6f6a1	2026-04-01 09:25:30.943
6424d92c-683c-4ebf-9c69-ee73dba40798	3961fabe-1345-4426-bd8a-ca0a5eac3aac	GIFT_RECEIVE	0	1000000	c54155e7-1039-4597-b336-3a7097a63284	bc2f4918-37d3-4ade-8dce-1193fcf6f6a1	2026-04-01 09:25:30.948
7dbee3c7-87c7-4b53-a07c-be3561271cb8	3961fabe-1345-4426-bd8a-ca0a5eac3aac	GIFT_SEND	-1000000	0	2d2e25f5-33bd-4adf-b69e-150d53b5b108	6edb75ae-20c2-4652-b644-158e5caa1e60	2026-04-01 09:30:04.948
e4faa973-ae86-4752-93ca-f4d2e1b6d24e	281ac0c9-d22b-4ece-895a-9d2c86a8f315	GIFT_RECEIVE	0	1000000	2d2e25f5-33bd-4adf-b69e-150d53b5b108	6edb75ae-20c2-4652-b644-158e5caa1e60	2026-04-01 09:30:04.953
13f337e3-66af-471d-b166-6a3ac4ec28d0	3961fabe-1345-4426-bd8a-ca0a5eac3aac	GIFT_SEND	-1000000	0	2d2e25f5-33bd-4adf-b69e-150d53b5b108	785dfbec-cc36-4019-9e6b-00470749d2ed	2026-04-01 09:30:06.541
862253cb-0083-48fa-8d65-53af634191d2	281ac0c9-d22b-4ece-895a-9d2c86a8f315	GIFT_RECEIVE	0	1000000	2d2e25f5-33bd-4adf-b69e-150d53b5b108	785dfbec-cc36-4019-9e6b-00470749d2ed	2026-04-01 09:30:06.544
9604534e-e00b-41ed-8283-18463146afbd	3961fabe-1345-4426-bd8a-ca0a5eac3aac	GIFT_SEND	-1000000	0	2d2e25f5-33bd-4adf-b69e-150d53b5b108	6a1d1793-29b4-46a4-b3a4-da83348c7926	2026-04-01 09:30:07.768
520b85c2-874f-47cf-9e5b-7c42b9eadee6	281ac0c9-d22b-4ece-895a-9d2c86a8f315	GIFT_RECEIVE	0	1000000	2d2e25f5-33bd-4adf-b69e-150d53b5b108	6a1d1793-29b4-46a4-b3a4-da83348c7926	2026-04-01 09:30:07.771
cf25d29b-9703-459f-bec1-15b345a03a9f	3961fabe-1345-4426-bd8a-ca0a5eac3aac	GIFT_SEND	-1000000	0	2d2e25f5-33bd-4adf-b69e-150d53b5b108	6805c424-c5f5-4e83-a324-363d95cb8bd7	2026-04-01 09:30:08.884
69e10c2d-2e4b-4316-9e23-7f395744ad3b	281ac0c9-d22b-4ece-895a-9d2c86a8f315	GIFT_RECEIVE	0	1000000	2d2e25f5-33bd-4adf-b69e-150d53b5b108	6805c424-c5f5-4e83-a324-363d95cb8bd7	2026-04-01 09:30:08.887
4abd70bf-6a89-4edb-934f-114335d2abdc	3961fabe-1345-4426-bd8a-ca0a5eac3aac	GIFT_SEND	-1000000	0	2d2e25f5-33bd-4adf-b69e-150d53b5b108	a4e64831-2f1a-461b-a2b1-36784ddf2550	2026-04-01 09:30:10.251
6e0dabbd-4e55-405f-8b84-e83adba6f297	281ac0c9-d22b-4ece-895a-9d2c86a8f315	GIFT_RECEIVE	0	1000000	2d2e25f5-33bd-4adf-b69e-150d53b5b108	a4e64831-2f1a-461b-a2b1-36784ddf2550	2026-04-01 09:30:10.254
57955365-3f1c-4883-9694-779440b72818	3961fabe-1345-4426-bd8a-ca0a5eac3aac	GIFT_SEND	-1000000	0	2d2e25f5-33bd-4adf-b69e-150d53b5b108	659c52b9-e263-4154-a2b1-274e7296d25e	2026-04-01 09:30:11.432
83e7aabf-547a-4828-8fe8-c55391a8ff13	281ac0c9-d22b-4ece-895a-9d2c86a8f315	GIFT_RECEIVE	0	1000000	2d2e25f5-33bd-4adf-b69e-150d53b5b108	659c52b9-e263-4154-a2b1-274e7296d25e	2026-04-01 09:30:11.436
bc7c96e1-ffce-4c07-88c6-2c1843cb11be	3961fabe-1345-4426-bd8a-ca0a5eac3aac	GIFT_SEND	-1000000	0	2d2e25f5-33bd-4adf-b69e-150d53b5b108	d3dfb248-e464-4b9c-840f-ebc3bc0bb43b	2026-04-01 09:30:12.654
96ef67f8-cf13-404b-b38f-881ed1beadc8	281ac0c9-d22b-4ece-895a-9d2c86a8f315	GIFT_RECEIVE	0	1000000	2d2e25f5-33bd-4adf-b69e-150d53b5b108	d3dfb248-e464-4b9c-840f-ebc3bc0bb43b	2026-04-01 09:30:12.657
9ce247b9-a581-4e07-8890-33eb78892bfe	9f70646e-c63e-4a08-a4fa-8786204bbf4e	PURCHASE_CREDIT	5000000	0	\N	\N	2026-04-01 10:55:09.591
cea43efb-f161-426d-aa31-21ff6971838a	9f70646e-c63e-4a08-a4fa-8786204bbf4e	PURCHASE_CREDIT	5000000	0	\N	\N	2026-04-01 10:55:09.923
8eb089ed-53f3-43c6-9ae9-35db5b42134d	9f70646e-c63e-4a08-a4fa-8786204bbf4e	PURCHASE_CREDIT	5000000	0	\N	\N	2026-04-01 10:55:10.259
320223ab-c25d-45da-afa7-2331af9bb1ac	9f70646e-c63e-4a08-a4fa-8786204bbf4e	GIFT_SEND	-1000000	0	\N	c49f67bb-40a9-4738-990a-d3384ddb2b16	2026-04-01 10:55:16.477
b908ac9a-a771-49e6-9e37-120686fc2684	3961fabe-1345-4426-bd8a-ca0a5eac3aac	GIFT_RECEIVE	0	1000000	\N	c49f67bb-40a9-4738-990a-d3384ddb2b16	2026-04-01 10:55:16.477
894d1e52-1af5-4936-83cf-0f9e7a179b32	47d9c408-1a3c-46c1-aecf-6f1746615499	PURCHASE_CREDIT	5000000	0	\N	\N	2026-04-01 10:55:40.167
ca29a88e-3b22-4cce-bf62-43f6036f21a1	47d9c408-1a3c-46c1-aecf-6f1746615499	PURCHASE_CREDIT	5000000	0	\N	\N	2026-04-01 10:55:40.481
e44a2e6b-5171-49a0-a000-454d1ac6aa97	47d9c408-1a3c-46c1-aecf-6f1746615499	PURCHASE_CREDIT	5000000	0	\N	\N	2026-04-01 10:55:40.832
f4f646c3-4151-421d-913c-9d49f421dd39	47d9c408-1a3c-46c1-aecf-6f1746615499	PURCHASE_CREDIT	5000000	0	\N	\N	2026-04-01 10:55:41.147
2a7b087b-85e8-4219-81b3-d02a569fee9b	3961fabe-1345-4426-bd8a-ca0a5eac3aac	GIFT_SEND	-1000000	0	8fc0ae7c-4c43-46b0-aac9-44e8469aeb49	0a1126f0-63eb-4fa9-9b82-621e237b5d18	2026-04-01 22:09:51.64
070b7811-cdf3-4673-9734-3453926a5a70	c5c904e8-da40-4458-b8bf-5c2cc97348b1	GIFT_RECEIVE	0	1000000	8fc0ae7c-4c43-46b0-aac9-44e8469aeb49	0a1126f0-63eb-4fa9-9b82-621e237b5d18	2026-04-01 22:09:51.645
48cbb215-ece7-46a2-8bfb-7a7dd143d160	c5c904e8-da40-4458-b8bf-5c2cc97348b1	GIFT_SEND	-10	0	\N	8c9c8878-b340-4cf5-96c9-7cf16cd39291	2026-04-01 22:19:35.511
4b0b83c2-e850-4217-bf97-5f3ad2ade0ba	3961fabe-1345-4426-bd8a-ca0a5eac3aac	GIFT_RECEIVE	0	10	\N	8c9c8878-b340-4cf5-96c9-7cf16cd39291	2026-04-01 22:19:35.511
98d623ec-f452-41f9-b817-79b0efef3d36	3961fabe-1345-4426-bd8a-ca0a5eac3aac	GIFT_SEND	-1000000	0	\N	a646c4e0-2bfb-468f-990e-4f7f0b57dd76	2026-04-01 22:19:44.617
0e20306f-34d9-483d-90c1-33bb3461b811	c5c904e8-da40-4458-b8bf-5c2cc97348b1	GIFT_RECEIVE	0	1000000	\N	a646c4e0-2bfb-468f-990e-4f7f0b57dd76	2026-04-01 22:19:44.617
7290cad8-d433-48b5-ac21-8196eaac3731	3961fabe-1345-4426-bd8a-ca0a5eac3aac	GIFT_SEND	-1000000	0	\N	a489940f-7d4c-433c-87d4-e8e3cd9fc417	2026-04-01 22:19:46.656
d5a3cf85-0533-40e9-9a08-964b4d612ccc	c5c904e8-da40-4458-b8bf-5c2cc97348b1	GIFT_RECEIVE	0	1000000	\N	a489940f-7d4c-433c-87d4-e8e3cd9fc417	2026-04-01 22:19:46.656
6e81dc26-a7e6-460c-b3df-3b87c2a87eab	3961fabe-1345-4426-bd8a-ca0a5eac3aac	GIFT_SEND	-1000000	0	\N	77658a63-a58e-4ee2-a28c-7bd875161d55	2026-04-01 22:19:48.255
e665038c-b3d8-4ec3-bace-279bdc380d6b	c5c904e8-da40-4458-b8bf-5c2cc97348b1	GIFT_RECEIVE	0	1000000	\N	77658a63-a58e-4ee2-a28c-7bd875161d55	2026-04-01 22:19:48.255
742ef5b2-651d-4078-9b41-be532cc4247d	47d9c408-1a3c-46c1-aecf-6f1746615499	GIFT_SEND	-1000000	0	8932ebc4-876d-4cb4-8fbe-d59e05767546	9f61bf5e-d73f-473d-9b1a-3d5315791b68	2026-04-01 22:35:50.547
e4225be7-684c-4ddf-859d-c15668981df1	c5c904e8-da40-4458-b8bf-5c2cc97348b1	GIFT_RECEIVE	0	1000000	8932ebc4-876d-4cb4-8fbe-d59e05767546	9f61bf5e-d73f-473d-9b1a-3d5315791b68	2026-04-01 22:35:50.552
2c4ca0e9-12b1-449c-99f0-b59b14d30b9d	47d9c408-1a3c-46c1-aecf-6f1746615499	GIFT_SEND	-5000	0	8932ebc4-876d-4cb4-8fbe-d59e05767546	2a3cb0ff-e485-4231-a931-e28c5e0ca269	2026-04-01 22:35:52.269
26a13a83-0e05-4717-9870-f3955bba46ae	c5c904e8-da40-4458-b8bf-5c2cc97348b1	GIFT_RECEIVE	0	5000	8932ebc4-876d-4cb4-8fbe-d59e05767546	2a3cb0ff-e485-4231-a931-e28c5e0ca269	2026-04-01 22:35:52.274
32bb8899-7703-484e-9caf-cead04965b94	47d9c408-1a3c-46c1-aecf-6f1746615499	GIFT_SEND	-250	0	8932ebc4-876d-4cb4-8fbe-d59e05767546	9f19614b-fdb8-49be-84a9-fec3e17f99b7	2026-04-01 22:35:53.947
b082b8cd-a6b9-4a95-ae4d-ac6d9455546e	c5c904e8-da40-4458-b8bf-5c2cc97348b1	GIFT_RECEIVE	0	250	8932ebc4-876d-4cb4-8fbe-d59e05767546	9f19614b-fdb8-49be-84a9-fec3e17f99b7	2026-04-01 22:35:53.951
0431f493-2af4-445c-bace-d4e2f60592ba	3961fabe-1345-4426-bd8a-ca0a5eac3aac	GIFT_SEND	-1000000	0	b524fe7d-3e1a-42cc-9ab8-6c873b378fe0	25a8efa8-edab-4eee-838b-8f3941f33ec6	2026-04-01 23:21:16.764
aaf0d50a-e265-4a14-aad0-ae113f9df14c	281ac0c9-d22b-4ece-895a-9d2c86a8f315	GIFT_RECEIVE	0	1000000	b524fe7d-3e1a-42cc-9ab8-6c873b378fe0	25a8efa8-edab-4eee-838b-8f3941f33ec6	2026-04-01 23:21:16.769
bf479004-ceb8-4b78-978b-ae2788304e10	3961fabe-1345-4426-bd8a-ca0a5eac3aac	GIFT_SEND	-1000000	0	b524fe7d-3e1a-42cc-9ab8-6c873b378fe0	7ab320f2-d974-41a3-a3c4-49eb127ff21e	2026-04-01 23:21:24.443
b6a9612f-7e37-4db0-9c9b-f7b00e77c5ed	281ac0c9-d22b-4ece-895a-9d2c86a8f315	GIFT_RECEIVE	0	1000000	b524fe7d-3e1a-42cc-9ab8-6c873b378fe0	7ab320f2-d974-41a3-a3c4-49eb127ff21e	2026-04-01 23:21:24.448
51480383-2897-434b-b78f-847ba7962f87	47d9c408-1a3c-46c1-aecf-6f1746615499	GIFT_SEND	-1000000	0	a1587cc4-753b-4449-ab03-823d0b214d7e	d1666c09-3181-49aa-bbf3-b350521c6fd6	2026-04-02 00:52:51.612
b6b17152-4758-4046-9980-cfde6662a5d2	3961fabe-1345-4426-bd8a-ca0a5eac3aac	GIFT_RECEIVE	0	1000000	a1587cc4-753b-4449-ab03-823d0b214d7e	d1666c09-3181-49aa-bbf3-b350521c6fd6	2026-04-02 00:52:51.619
adaddc9b-96bd-4ec4-8752-cbac8570c5ca	3961fabe-1345-4426-bd8a-ca0a5eac3aac	PURCHASE_CREDIT	18998	0	\N	\N	2026-04-03 09:24:33.908
d530f551-8239-4e0d-948d-3e53029d438c	3961fabe-1345-4426-bd8a-ca0a5eac3aac	PURCHASE_CREDIT	10000000	0	\N	\N	2026-04-04 03:56:19.796
70bd3fd4-dd7f-49a0-bc9b-4869ec029792	3961fabe-1345-4426-bd8a-ca0a5eac3aac	PURCHASE_CREDIT	10000000	0	\N	\N	2026-04-04 06:31:30.612
f1f6bdee-d79e-4c68-8d70-345cc137b33c	3961fabe-1345-4426-bd8a-ca0a5eac3aac	PURCHASE_CREDIT	10000000	0	\N	\N	2026-04-04 06:34:38.749
\.


--
-- Data for Name: wallets; Type: TABLE DATA; Schema: public; Owner: liveapp
--

COPY public.wallets (user_id, coins, diamonds_earned, created_at, updated_at) FROM stdin;
e9134380-2da7-4a1e-bd2a-34398f85a6e5	4984000	5000	2026-03-29 09:20:53.011	2026-03-29 09:24:13.435
c5c904e8-da40-4458-b8bf-5c2cc97348b1	4999990	5005250	2026-04-01 22:09:51.619	2026-04-01 22:35:53.941
281ac0c9-d22b-4ece-895a-9d2c86a8f315	3999990	10005010	2026-04-01 09:15:47.022	2026-04-01 23:21:24.435
47d9c408-1a3c-46c1-aecf-6f1746615499	17994750	0	2026-04-01 10:55:40.163	2026-04-02 00:52:51.599
3961fabe-1345-4426-bd8a-ca0a5eac3aac	56008988	3016020	2026-03-29 09:20:53.025	2026-04-04 06:34:38.745
9f70646e-c63e-4a08-a4fa-8786204bbf4e	14000000	0	2026-04-01 10:55:09.587	2026-04-01 10:55:16.466
\.


--
-- Name: Notification Notification_pkey; Type: CONSTRAINT; Schema: public; Owner: liveapp
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: liveapp
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: battle_contributions battle_contributions_pkey; Type: CONSTRAINT; Schema: public; Owner: liveapp
--

ALTER TABLE ONLY public.battle_contributions
    ADD CONSTRAINT battle_contributions_pkey PRIMARY KEY (id);


--
-- Name: battles battles_pkey; Type: CONSTRAINT; Schema: public; Owner: liveapp
--

ALTER TABLE ONLY public.battles
    ADD CONSTRAINT battles_pkey PRIMARY KEY (id);


--
-- Name: chat_messages chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: liveapp
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);


--
-- Name: coin_packages coin_packages_pkey; Type: CONSTRAINT; Schema: public; Owner: liveapp
--

ALTER TABLE ONLY public.coin_packages
    ADD CONSTRAINT coin_packages_pkey PRIMARY KEY (id);


--
-- Name: conversations conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: liveapp
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_pkey PRIMARY KEY (id);


--
-- Name: diamond_milestones diamond_milestones_pkey; Type: CONSTRAINT; Schema: public; Owner: liveapp
--

ALTER TABLE ONLY public.diamond_milestones
    ADD CONSTRAINT diamond_milestones_pkey PRIMARY KEY (id);


--
-- Name: direct_messages direct_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: liveapp
--

ALTER TABLE ONLY public.direct_messages
    ADD CONSTRAINT direct_messages_pkey PRIMARY KEY (id);


--
-- Name: gift_transactions gift_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: liveapp
--

ALTER TABLE ONLY public.gift_transactions
    ADD CONSTRAINT gift_transactions_pkey PRIMARY KEY (id);


--
-- Name: gifts gifts_pkey; Type: CONSTRAINT; Schema: public; Owner: liveapp
--

ALTER TABLE ONLY public.gifts
    ADD CONSTRAINT gifts_pkey PRIMARY KEY (id);


--
-- Name: moderation_actions moderation_actions_pkey; Type: CONSTRAINT; Schema: public; Owner: liveapp
--

ALTER TABLE ONLY public.moderation_actions
    ADD CONSTRAINT moderation_actions_pkey PRIMARY KEY (id);


--
-- Name: payout_requests payout_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: liveapp
--

ALTER TABLE ONLY public.payout_requests
    ADD CONSTRAINT payout_requests_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: liveapp
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (user_id);


--
-- Name: purchase_orders purchase_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: liveapp
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_pkey PRIMARY KEY (id);


--
-- Name: push_device_tokens push_device_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: liveapp
--

ALTER TABLE ONLY public.push_device_tokens
    ADD CONSTRAINT push_device_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: liveapp
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: stream_guest_requests stream_guest_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: liveapp
--

ALTER TABLE ONLY public.stream_guest_requests
    ADD CONSTRAINT stream_guest_requests_pkey PRIMARY KEY (id);


--
-- Name: stream_participants stream_participants_pkey; Type: CONSTRAINT; Schema: public; Owner: liveapp
--

ALTER TABLE ONLY public.stream_participants
    ADD CONSTRAINT stream_participants_pkey PRIMARY KEY (id);


--
-- Name: stream_schedules stream_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: liveapp
--

ALTER TABLE ONLY public.stream_schedules
    ADD CONSTRAINT stream_schedules_pkey PRIMARY KEY (id);


--
-- Name: stream_user_restrictions stream_user_restrictions_pkey; Type: CONSTRAINT; Schema: public; Owner: liveapp
--

ALTER TABLE ONLY public.stream_user_restrictions
    ADD CONSTRAINT stream_user_restrictions_pkey PRIMARY KEY (id);


--
-- Name: stream_user_restrictions stream_user_restrictions_stream_id_user_id_kind_key; Type: CONSTRAINT; Schema: public; Owner: liveapp
--

ALTER TABLE ONLY public.stream_user_restrictions
    ADD CONSTRAINT stream_user_restrictions_stream_id_user_id_kind_key UNIQUE (stream_id, user_id, kind);


--
-- Name: stream_user_roles stream_user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: liveapp
--

ALTER TABLE ONLY public.stream_user_roles
    ADD CONSTRAINT stream_user_roles_pkey PRIMARY KEY (id);


--
-- Name: stream_user_roles stream_user_roles_stream_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: liveapp
--

ALTER TABLE ONLY public.stream_user_roles
    ADD CONSTRAINT stream_user_roles_stream_id_user_id_key UNIQUE (stream_id, user_id);


--
-- Name: streams streams_pkey; Type: CONSTRAINT; Schema: public; Owner: liveapp
--

ALTER TABLE ONLY public.streams
    ADD CONSTRAINT streams_pkey PRIMARY KEY (id);


--
-- Name: user_blocks user_blocks_pkey; Type: CONSTRAINT; Schema: public; Owner: liveapp
--

ALTER TABLE ONLY public.user_blocks
    ADD CONSTRAINT user_blocks_pkey PRIMARY KEY (blocker_id, blocked_id);


--
-- Name: user_favorites user_favorites_pkey; Type: CONSTRAINT; Schema: public; Owner: liveapp
--

ALTER TABLE ONLY public.user_favorites
    ADD CONSTRAINT user_favorites_pkey PRIMARY KEY (user_id, favorite_user_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: liveapp
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: wallet_ledger wallet_ledger_pkey; Type: CONSTRAINT; Schema: public; Owner: liveapp
--

ALTER TABLE ONLY public.wallet_ledger
    ADD CONSTRAINT wallet_ledger_pkey PRIMARY KEY (id);


--
-- Name: wallets wallets_pkey; Type: CONSTRAINT; Schema: public; Owner: liveapp
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_pkey PRIMARY KEY (user_id);


--
-- Name: Notification_streamId_idx; Type: INDEX; Schema: public; Owner: liveapp
--

CREATE INDEX "Notification_streamId_idx" ON public."Notification" USING btree ("streamId");


--
-- Name: Notification_userId_createdAt_idx; Type: INDEX; Schema: public; Owner: liveapp
--

CREATE INDEX "Notification_userId_createdAt_idx" ON public."Notification" USING btree ("userId", "createdAt");


--
-- Name: Notification_userId_readAt_idx; Type: INDEX; Schema: public; Owner: liveapp
--

CREATE INDEX "Notification_userId_readAt_idx" ON public."Notification" USING btree ("userId", "readAt");


--
-- Name: battle_contributions_battle_id_idx; Type: INDEX; Schema: public; Owner: liveapp
--

CREATE INDEX battle_contributions_battle_id_idx ON public.battle_contributions USING btree (battle_id);


--
-- Name: battle_contributions_created_at_idx; Type: INDEX; Schema: public; Owner: liveapp
--

CREATE INDEX battle_contributions_created_at_idx ON public.battle_contributions USING btree (created_at);


--
-- Name: battle_contributions_gift_tx_id_key; Type: INDEX; Schema: public; Owner: liveapp
--

CREATE UNIQUE INDEX battle_contributions_gift_tx_id_key ON public.battle_contributions USING btree (gift_tx_id);


--
-- Name: battles_created_at_idx; Type: INDEX; Schema: public; Owner: liveapp
--

CREATE INDEX battles_created_at_idx ON public.battles USING btree (created_at);


--
-- Name: battles_status_idx; Type: INDEX; Schema: public; Owner: liveapp
--

CREATE INDEX battles_status_idx ON public.battles USING btree (status);


--
-- Name: battles_stream_id_idx; Type: INDEX; Schema: public; Owner: liveapp
--

CREATE INDEX battles_stream_id_idx ON public.battles USING btree (stream_id);


--
-- Name: chat_messages_stream_created_idx; Type: INDEX; Schema: public; Owner: liveapp
--

CREATE INDEX chat_messages_stream_created_idx ON public.chat_messages USING btree (stream_id, created_at);


--
-- Name: chat_messages_stream_id_created_at_idx; Type: INDEX; Schema: public; Owner: liveapp
--

CREATE INDEX chat_messages_stream_id_created_at_idx ON public.chat_messages USING btree (stream_id, created_at);


--
-- Name: chat_messages_user_id_idx; Type: INDEX; Schema: public; Owner: liveapp
--

CREATE INDEX chat_messages_user_id_idx ON public.chat_messages USING btree (user_id);


--
-- Name: chat_messages_user_idx; Type: INDEX; Schema: public; Owner: liveapp
--

CREATE INDEX chat_messages_user_idx ON public.chat_messages USING btree (user_id);


--
-- Name: coin_packages_apple_product_id_idx; Type: INDEX; Schema: public; Owner: liveapp
--

CREATE INDEX coin_packages_apple_product_id_idx ON public.coin_packages USING btree (apple_product_id);


--
-- Name: coin_packages_deleted_at_idx; Type: INDEX; Schema: public; Owner: liveapp
--

CREATE INDEX coin_packages_deleted_at_idx ON public.coin_packages USING btree (deleted_at);


--
-- Name: coin_packages_for_dev_use_is_active_sort_order_idx; Type: INDEX; Schema: public; Owner: liveapp
--

CREATE INDEX coin_packages_for_dev_use_is_active_sort_order_idx ON public.coin_packages USING btree (for_dev_use, is_active, sort_order);


--
-- Name: coin_packages_google_product_id_idx; Type: INDEX; Schema: public; Owner: liveapp
--

CREATE INDEX coin_packages_google_product_id_idx ON public.coin_packages USING btree (google_product_id);


--
-- Name: coin_packages_is_active_sort_order_idx; Type: INDEX; Schema: public; Owner: liveapp
--

CREATE INDEX coin_packages_is_active_sort_order_idx ON public.coin_packages USING btree (is_active, sort_order);


--
-- Name: conversations_participant_1_id_participant_2_id_key; Type: INDEX; Schema: public; Owner: liveapp
--

CREATE UNIQUE INDEX conversations_participant_1_id_participant_2_id_key ON public.conversations USING btree (participant_1_id, participant_2_id);


--
-- Name: conversations_participant_1_id_updated_at_idx; Type: INDEX; Schema: public; Owner: liveapp
--

CREATE INDEX conversations_participant_1_id_updated_at_idx ON public.conversations USING btree (participant_1_id, updated_at);


--
-- Name: conversations_participant_2_id_updated_at_idx; Type: INDEX; Schema: public; Owner: liveapp
--

CREATE INDEX conversations_participant_2_id_updated_at_idx ON public.conversations USING btree (participant_2_id, updated_at);


--
-- Name: diamond_milestones_achieved_at_idx; Type: INDEX; Schema: public; Owner: liveapp
--

CREATE INDEX diamond_milestones_achieved_at_idx ON public.diamond_milestones USING btree (achieved_at);


--
-- Name: diamond_milestones_milestone_amount_idx; Type: INDEX; Schema: public; Owner: liveapp
--

CREATE INDEX diamond_milestones_milestone_amount_idx ON public.diamond_milestones USING btree (milestone_amount);


--
-- Name: diamond_milestones_user_id_idx; Type: INDEX; Schema: public; Owner: liveapp
--

CREATE INDEX diamond_milestones_user_id_idx ON public.diamond_milestones USING btree (user_id);


--
-- Name: direct_messages_conversation_id_created_at_idx; Type: INDEX; Schema: public; Owner: liveapp
--

CREATE INDEX direct_messages_conversation_id_created_at_idx ON public.direct_messages USING btree (conversation_id, created_at);


--
-- Name: direct_messages_gift_tx_id_key; Type: INDEX; Schema: public; Owner: liveapp
--

CREATE UNIQUE INDEX direct_messages_gift_tx_id_key ON public.direct_messages USING btree (gift_tx_id);


--
-- Name: direct_messages_sender_id_idx; Type: INDEX; Schema: public; Owner: liveapp
--

CREATE INDEX direct_messages_sender_id_idx ON public.direct_messages USING btree (sender_id);


--
-- Name: gift_transactions_recipient_user_id_created_at_idx; Type: INDEX; Schema: public; Owner: liveapp
--

CREATE INDEX gift_transactions_recipient_user_id_created_at_idx ON public.gift_transactions USING btree (recipient_user_id, created_at);


--
-- Name: gift_transactions_sender_user_id_created_at_idx; Type: INDEX; Schema: public; Owner: liveapp
--

CREATE INDEX gift_transactions_sender_user_id_created_at_idx ON public.gift_transactions USING btree (sender_user_id, created_at);


--
-- Name: gift_transactions_stream_id_created_at_idx; Type: INDEX; Schema: public; Owner: liveapp
--

CREATE INDEX gift_transactions_stream_id_created_at_idx ON public.gift_transactions USING btree (stream_id, created_at);


--
-- Name: gifts_coin_cost_idx; Type: INDEX; Schema: public; Owner: liveapp
--

CREATE INDEX gifts_coin_cost_idx ON public.gifts USING btree (coin_cost);


--
-- Name: gifts_diamond_value_idx; Type: INDEX; Schema: public; Owner: liveapp
--

CREATE INDEX gifts_diamond_value_idx ON public.gifts USING btree (diamond_value);


--
-- Name: moderation_actions_actor_user_id_idx; Type: INDEX; Schema: public; Owner: liveapp
--

CREATE INDEX moderation_actions_actor_user_id_idx ON public.moderation_actions USING btree (actor_user_id);


--
-- Name: moderation_actions_created_at_idx; Type: INDEX; Schema: public; Owner: liveapp
--

CREATE INDEX moderation_actions_created_at_idx ON public.moderation_actions USING btree (created_at);


--
-- Name: moderation_actions_stream_id_idx; Type: INDEX; Schema: public; Owner: liveapp
--

CREATE INDEX moderation_actions_stream_id_idx ON public.moderation_actions USING btree (stream_id);


--
-- Name: moderation_actions_target_user_id_idx; Type: INDEX; Schema: public; Owner: liveapp
--

CREATE INDEX moderation_actions_target_user_id_idx ON public.moderation_actions USING btree (target_user_id);


--
-- Name: payout_requests_created_at_idx; Type: INDEX; Schema: public; Owner: liveapp
--

CREATE INDEX payout_requests_created_at_idx ON public.payout_requests USING btree (created_at);


--
-- Name: payout_requests_user_id_status_idx; Type: INDEX; Schema: public; Owner: liveapp
--

CREATE INDEX payout_requests_user_id_status_idx ON public.payout_requests USING btree (user_id, status);


--
-- Name: purchase_orders_provider_provider_ref_idx; Type: INDEX; Schema: public; Owner: liveapp
--

CREATE INDEX purchase_orders_provider_provider_ref_idx ON public.purchase_orders USING btree (provider, provider_ref);


--
-- Name: purchase_orders_provider_provider_ref_key; Type: INDEX; Schema: public; Owner: liveapp
--

CREATE UNIQUE INDEX purchase_orders_provider_provider_ref_key ON public.purchase_orders USING btree (provider, provider_ref);


--
-- Name: purchase_orders_status_created_at_idx; Type: INDEX; Schema: public; Owner: liveapp
--

CREATE INDEX purchase_orders_status_created_at_idx ON public.purchase_orders USING btree (status, created_at);


--
-- Name: purchase_orders_user_id_created_at_idx; Type: INDEX; Schema: public; Owner: liveapp
--

CREATE INDEX purchase_orders_user_id_created_at_idx ON public.purchase_orders USING btree (user_id, created_at);


--
-- Name: push_device_tokens_expo_push_token_key; Type: INDEX; Schema: public; Owner: liveapp
--

CREATE UNIQUE INDEX push_device_tokens_expo_push_token_key ON public.push_device_tokens USING btree (expo_push_token);


--
-- Name: push_device_tokens_user_id_is_active_idx; Type: INDEX; Schema: public; Owner: liveapp
--

CREATE INDEX push_device_tokens_user_id_is_active_idx ON public.push_device_tokens USING btree (user_id, is_active);


--
-- Name: push_device_tokens_user_id_platform_idx; Type: INDEX; Schema: public; Owner: liveapp
--

CREATE INDEX push_device_tokens_user_id_platform_idx ON public.push_device_tokens USING btree (user_id, platform);


--
-- Name: refresh_tokens_expires_at_idx; Type: INDEX; Schema: public; Owner: liveapp
--

CREATE INDEX refresh_tokens_expires_at_idx ON public.refresh_tokens USING btree (expires_at);


--
-- Name: refresh_tokens_user_id_idx; Type: INDEX; Schema: public; Owner: liveapp
--

CREATE INDEX refresh_tokens_user_id_idx ON public.refresh_tokens USING btree (user_id);


--
-- Name: stream_guest_requests_stream_id_status_created_at_idx; Type: INDEX; Schema: public; Owner: liveapp
--

CREATE INDEX stream_guest_requests_stream_id_status_created_at_idx ON public.stream_guest_requests USING btree (stream_id, status, created_at);


--
-- Name: stream_participants_active_unique; Type: INDEX; Schema: public; Owner: liveapp
--

CREATE UNIQUE INDEX stream_participants_active_unique ON public.stream_participants USING btree (stream_id, user_id) WHERE (left_at IS NULL);


--
-- Name: stream_participants_left_at_idx; Type: INDEX; Schema: public; Owner: liveapp
--

CREATE INDEX stream_participants_left_at_idx ON public.stream_participants USING btree (left_at);


--
-- Name: stream_participants_stream_id_idx; Type: INDEX; Schema: public; Owner: liveapp
--

CREATE INDEX stream_participants_stream_id_idx ON public.stream_participants USING btree (stream_id);


--
-- Name: stream_participants_stream_id_user_id_left_at_idx; Type: INDEX; Schema: public; Owner: liveapp
--

CREATE INDEX stream_participants_stream_id_user_id_left_at_idx ON public.stream_participants USING btree (stream_id, user_id, left_at);


--
-- Name: stream_participants_user_id_idx; Type: INDEX; Schema: public; Owner: liveapp
--

CREATE INDEX stream_participants_user_id_idx ON public.stream_participants USING btree (user_id);


--
-- Name: stream_schedules_is_recurring_idx; Type: INDEX; Schema: public; Owner: liveapp
--

CREATE INDEX stream_schedules_is_recurring_idx ON public.stream_schedules USING btree (is_recurring);


--
-- Name: stream_schedules_start_at_idx; Type: INDEX; Schema: public; Owner: liveapp
--

CREATE INDEX stream_schedules_start_at_idx ON public.stream_schedules USING btree (start_at);


--
-- Name: stream_schedules_user_id_idx; Type: INDEX; Schema: public; Owner: liveapp
--

CREATE INDEX stream_schedules_user_id_idx ON public.stream_schedules USING btree (user_id);


--
-- Name: stream_user_restrictions_expires_at_idx; Type: INDEX; Schema: public; Owner: liveapp
--

CREATE INDEX stream_user_restrictions_expires_at_idx ON public.stream_user_restrictions USING btree (expires_at);


--
-- Name: stream_user_restrictions_kind_idx; Type: INDEX; Schema: public; Owner: liveapp
--

CREATE INDEX stream_user_restrictions_kind_idx ON public.stream_user_restrictions USING btree (kind);


--
-- Name: stream_user_restrictions_stream_id_idx; Type: INDEX; Schema: public; Owner: liveapp
--

CREATE INDEX stream_user_restrictions_stream_id_idx ON public.stream_user_restrictions USING btree (stream_id);


--
-- Name: stream_user_restrictions_user_id_idx; Type: INDEX; Schema: public; Owner: liveapp
--

CREATE INDEX stream_user_restrictions_user_id_idx ON public.stream_user_restrictions USING btree (user_id);


--
-- Name: stream_user_roles_stream_id_idx; Type: INDEX; Schema: public; Owner: liveapp
--

CREATE INDEX stream_user_roles_stream_id_idx ON public.stream_user_roles USING btree (stream_id);


--
-- Name: stream_user_roles_user_id_idx; Type: INDEX; Schema: public; Owner: liveapp
--

CREATE INDEX stream_user_roles_user_id_idx ON public.stream_user_roles USING btree (user_id);


--
-- Name: streams_host_user_id_idx; Type: INDEX; Schema: public; Owner: liveapp
--

CREATE INDEX streams_host_user_id_idx ON public.streams USING btree (host_user_id);


--
-- Name: streams_started_at_idx; Type: INDEX; Schema: public; Owner: liveapp
--

CREATE INDEX streams_started_at_idx ON public.streams USING btree (started_at);


--
-- Name: streams_status_idx; Type: INDEX; Schema: public; Owner: liveapp
--

CREATE INDEX streams_status_idx ON public.streams USING btree (status);


--
-- Name: user_favorites_favorite_user_id_created_at_idx; Type: INDEX; Schema: public; Owner: liveapp
--

CREATE INDEX user_favorites_favorite_user_id_created_at_idx ON public.user_favorites USING btree (favorite_user_id, created_at);


--
-- Name: user_favorites_user_id_created_at_idx; Type: INDEX; Schema: public; Owner: liveapp
--

CREATE INDEX user_favorites_user_id_created_at_idx ON public.user_favorites USING btree (user_id, created_at);


--
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: liveapp
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);


--
-- Name: users_public_id_key; Type: INDEX; Schema: public; Owner: liveapp
--

CREATE UNIQUE INDEX users_public_id_key ON public.users USING btree (public_id);


--
-- Name: users_username_key; Type: INDEX; Schema: public; Owner: liveapp
--

CREATE UNIQUE INDEX users_username_key ON public.users USING btree (username);


--
-- Name: wallet_ledger_gift_tx_id_idx; Type: INDEX; Schema: public; Owner: liveapp
--

CREATE INDEX wallet_ledger_gift_tx_id_idx ON public.wallet_ledger USING btree (gift_tx_id);


--
-- Name: wallet_ledger_stream_id_idx; Type: INDEX; Schema: public; Owner: liveapp
--

CREATE INDEX wallet_ledger_stream_id_idx ON public.wallet_ledger USING btree (stream_id);


--
-- Name: wallet_ledger_user_id_created_at_idx; Type: INDEX; Schema: public; Owner: liveapp
--

CREATE INDEX wallet_ledger_user_id_created_at_idx ON public.wallet_ledger USING btree (user_id, created_at);


--
-- Name: Notification Notification_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: liveapp
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: battle_contributions battle_contributions_battle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: liveapp
--

ALTER TABLE ONLY public.battle_contributions
    ADD CONSTRAINT battle_contributions_battle_id_fkey FOREIGN KEY (battle_id) REFERENCES public.battles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: battle_contributions battle_contributions_gift_tx_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: liveapp
--

ALTER TABLE ONLY public.battle_contributions
    ADD CONSTRAINT battle_contributions_gift_tx_id_fkey FOREIGN KEY (gift_tx_id) REFERENCES public.gift_transactions(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: battle_contributions battle_contributions_recipient_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: liveapp
--

ALTER TABLE ONLY public.battle_contributions
    ADD CONSTRAINT battle_contributions_recipient_user_id_fkey FOREIGN KEY (recipient_user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: battle_contributions battle_contributions_sender_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: liveapp
--

ALTER TABLE ONLY public.battle_contributions
    ADD CONSTRAINT battle_contributions_sender_user_id_fkey FOREIGN KEY (sender_user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: battles battles_host_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: liveapp
--

ALTER TABLE ONLY public.battles
    ADD CONSTRAINT battles_host_user_id_fkey FOREIGN KEY (host_user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: battles battles_opponent_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: liveapp
--

ALTER TABLE ONLY public.battles
    ADD CONSTRAINT battles_opponent_user_id_fkey FOREIGN KEY (opponent_user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: battles battles_stream_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: liveapp
--

ALTER TABLE ONLY public.battles
    ADD CONSTRAINT battles_stream_id_fkey FOREIGN KEY (stream_id) REFERENCES public.streams(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: battles battles_winner_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: liveapp
--

ALTER TABLE ONLY public.battles
    ADD CONSTRAINT battles_winner_user_id_fkey FOREIGN KEY (winner_user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: chat_messages chat_messages_stream_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: liveapp
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_stream_id_fkey FOREIGN KEY (stream_id) REFERENCES public.streams(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: chat_messages chat_messages_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: liveapp
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: conversations conversations_participant_1_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: liveapp
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_participant_1_id_fkey FOREIGN KEY (participant_1_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: conversations conversations_participant_2_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: liveapp
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_participant_2_id_fkey FOREIGN KEY (participant_2_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: diamond_milestones diamond_milestones_gift_tx_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: liveapp
--

ALTER TABLE ONLY public.diamond_milestones
    ADD CONSTRAINT diamond_milestones_gift_tx_id_fkey FOREIGN KEY (gift_tx_id) REFERENCES public.gift_transactions(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: diamond_milestones diamond_milestones_giver_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: liveapp
--

ALTER TABLE ONLY public.diamond_milestones
    ADD CONSTRAINT diamond_milestones_giver_user_id_fkey FOREIGN KEY (giver_user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: diamond_milestones diamond_milestones_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: liveapp
--

ALTER TABLE ONLY public.diamond_milestones
    ADD CONSTRAINT diamond_milestones_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: direct_messages direct_messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: liveapp
--

ALTER TABLE ONLY public.direct_messages
    ADD CONSTRAINT direct_messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: direct_messages direct_messages_gift_tx_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: liveapp
--

ALTER TABLE ONLY public.direct_messages
    ADD CONSTRAINT direct_messages_gift_tx_id_fkey FOREIGN KEY (gift_tx_id) REFERENCES public.gift_transactions(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: direct_messages direct_messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: liveapp
--

ALTER TABLE ONLY public.direct_messages
    ADD CONSTRAINT direct_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: gift_transactions gift_transactions_gift_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: liveapp
--

ALTER TABLE ONLY public.gift_transactions
    ADD CONSTRAINT gift_transactions_gift_id_fkey FOREIGN KEY (gift_id) REFERENCES public.gifts(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: gift_transactions gift_transactions_recipient_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: liveapp
--

ALTER TABLE ONLY public.gift_transactions
    ADD CONSTRAINT gift_transactions_recipient_user_id_fkey FOREIGN KEY (recipient_user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: gift_transactions gift_transactions_sender_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: liveapp
--

ALTER TABLE ONLY public.gift_transactions
    ADD CONSTRAINT gift_transactions_sender_user_id_fkey FOREIGN KEY (sender_user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: gift_transactions gift_transactions_stream_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: liveapp
--

ALTER TABLE ONLY public.gift_transactions
    ADD CONSTRAINT gift_transactions_stream_id_fkey FOREIGN KEY (stream_id) REFERENCES public.streams(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: moderation_actions moderation_actions_actor_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: liveapp
--

ALTER TABLE ONLY public.moderation_actions
    ADD CONSTRAINT moderation_actions_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: moderation_actions moderation_actions_stream_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: liveapp
--

ALTER TABLE ONLY public.moderation_actions
    ADD CONSTRAINT moderation_actions_stream_id_fkey FOREIGN KEY (stream_id) REFERENCES public.streams(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: moderation_actions moderation_actions_target_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: liveapp
--

ALTER TABLE ONLY public.moderation_actions
    ADD CONSTRAINT moderation_actions_target_user_id_fkey FOREIGN KEY (target_user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: payout_requests payout_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: liveapp
--

ALTER TABLE ONLY public.payout_requests
    ADD CONSTRAINT payout_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: profiles profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: liveapp
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: purchase_orders purchase_orders_package_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: liveapp
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_package_id_fkey FOREIGN KEY (package_id) REFERENCES public.coin_packages(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: purchase_orders purchase_orders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: liveapp
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: push_device_tokens push_device_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: liveapp
--

ALTER TABLE ONLY public.push_device_tokens
    ADD CONSTRAINT push_device_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: refresh_tokens refresh_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: liveapp
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: stream_guest_requests stream_guest_requests_stream_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: liveapp
--

ALTER TABLE ONLY public.stream_guest_requests
    ADD CONSTRAINT stream_guest_requests_stream_id_fkey FOREIGN KEY (stream_id) REFERENCES public.streams(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: stream_guest_requests stream_guest_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: liveapp
--

ALTER TABLE ONLY public.stream_guest_requests
    ADD CONSTRAINT stream_guest_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: stream_participants stream_participants_stream_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: liveapp
--

ALTER TABLE ONLY public.stream_participants
    ADD CONSTRAINT stream_participants_stream_id_fkey FOREIGN KEY (stream_id) REFERENCES public.streams(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: stream_participants stream_participants_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: liveapp
--

ALTER TABLE ONLY public.stream_participants
    ADD CONSTRAINT stream_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: stream_schedules stream_schedules_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: liveapp
--

ALTER TABLE ONLY public.stream_schedules
    ADD CONSTRAINT stream_schedules_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: stream_user_restrictions stream_user_restrictions_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: liveapp
--

ALTER TABLE ONLY public.stream_user_restrictions
    ADD CONSTRAINT stream_user_restrictions_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: stream_user_restrictions stream_user_restrictions_stream_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: liveapp
--

ALTER TABLE ONLY public.stream_user_restrictions
    ADD CONSTRAINT stream_user_restrictions_stream_id_fkey FOREIGN KEY (stream_id) REFERENCES public.streams(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: stream_user_restrictions stream_user_restrictions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: liveapp
--

ALTER TABLE ONLY public.stream_user_restrictions
    ADD CONSTRAINT stream_user_restrictions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: stream_user_roles stream_user_roles_assigned_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: liveapp
--

ALTER TABLE ONLY public.stream_user_roles
    ADD CONSTRAINT stream_user_roles_assigned_by_user_id_fkey FOREIGN KEY (assigned_by_user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: stream_user_roles stream_user_roles_stream_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: liveapp
--

ALTER TABLE ONLY public.stream_user_roles
    ADD CONSTRAINT stream_user_roles_stream_id_fkey FOREIGN KEY (stream_id) REFERENCES public.streams(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: stream_user_roles stream_user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: liveapp
--

ALTER TABLE ONLY public.stream_user_roles
    ADD CONSTRAINT stream_user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: streams streams_host_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: liveapp
--

ALTER TABLE ONLY public.streams
    ADD CONSTRAINT streams_host_user_id_fkey FOREIGN KEY (host_user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: user_blocks user_blocks_blocked_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: liveapp
--

ALTER TABLE ONLY public.user_blocks
    ADD CONSTRAINT user_blocks_blocked_id_fkey FOREIGN KEY (blocked_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: user_blocks user_blocks_blocker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: liveapp
--

ALTER TABLE ONLY public.user_blocks
    ADD CONSTRAINT user_blocks_blocker_id_fkey FOREIGN KEY (blocker_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: user_favorites user_favorites_favorite_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: liveapp
--

ALTER TABLE ONLY public.user_favorites
    ADD CONSTRAINT user_favorites_favorite_user_id_fkey FOREIGN KEY (favorite_user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: user_favorites user_favorites_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: liveapp
--

ALTER TABLE ONLY public.user_favorites
    ADD CONSTRAINT user_favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: users users_dm_unlock_gift_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: liveapp
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_dm_unlock_gift_id_fkey FOREIGN KEY (dm_unlock_gift_id) REFERENCES public.gifts(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: wallet_ledger wallet_ledger_gift_tx_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: liveapp
--

ALTER TABLE ONLY public.wallet_ledger
    ADD CONSTRAINT wallet_ledger_gift_tx_id_fkey FOREIGN KEY (gift_tx_id) REFERENCES public.gift_transactions(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: wallet_ledger wallet_ledger_stream_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: liveapp
--

ALTER TABLE ONLY public.wallet_ledger
    ADD CONSTRAINT wallet_ledger_stream_id_fkey FOREIGN KEY (stream_id) REFERENCES public.streams(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: wallet_ledger wallet_ledger_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: liveapp
--

ALTER TABLE ONLY public.wallet_ledger
    ADD CONSTRAINT wallet_ledger_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: wallets wallets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: liveapp
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict RPHh7Iho1YmfIAIEdcaOgN637JwWU0R5oXMyS0AZF1JU8pgzBhnjz6eHb0ODYd9

