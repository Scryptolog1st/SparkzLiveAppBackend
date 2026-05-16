# Live Streaming App — Backend Development Roadmap (Extremely Detailed)
Generated: 2026-03-01  
Updated: 2026-03-01  
Timezone reference: America/New_York

This roadmap is designed to be followed **checkpoint-by-checkpoint** with clear acceptance criteria. It is aligned with your current frontend features (profiles, schedules, milestones, roles, gifting, hearts, overlays, chat, battles, moderation).

---

## Process rule (roadmap sync after every phase)
**After every phase completion**, you paste the current roadmap text in chat so we can:
- record what changed / what was completed,
- adjust anything we had to alter,
- and re-issue the updated roadmap as a downloadable `.md`.

---

## 0) High-level goals (what “done” looks like)

### Product goals
- **Server-authoritative rooms**: the backend is the source of truth for stream state, participants, roles, and actions.
- **Real-time first**: chat, hearts, gifts, role changes, and stream state changes are synchronized via WebSocket events.
- **Economy integrity**: gifts/coins/diamonds cannot be faked client-side; all changes are ledger-backed.
- **Easy local development**: everything runs via Docker (PostgreSQL + pgAdmin, plus API, plus Redis if needed).

### Engineering goals
- One-command local stack: `docker compose up`
- Repeatable DB migrations + seed data
- Typed contracts (DTOs) shared across REST/WS
- Meaningful automated tests: unit + integration + API smoke tests

---

## 1) Recommended backend stack (default plan)

- **Language:** TypeScript  
- **Framework:** NestJS (Web API + WebSocket gateway)  
- **ORM:** Prisma (migrations + type-safe DB access)  
- **DB:** PostgreSQL in Docker  
- **DB Admin UI:** pgAdmin in Docker  
- **Cache / Realtime scaling:** Redis (Docker; can start optional and add later)  
- **Realtime:** Socket.IO (simple, mobile friendly; WS fallback)  
- **Video (SFU):** LiveKit (recommended) or a hosted provider (Agora/Daily/Twilio)  
  - Backend generates **room tokens** and manages **room metadata**
- **Uploads:** S3-compatible storage (Cloudflare R2 / AWS S3 / MinIO local)

> Build the backend so it can issue “video tokens” from any provider via an adapter pattern.

---

## 2) Repo + folder structure (target)

```
/backend
  /src
    /modules
      /auth
      /users
      /profiles
      /streams
      /realtime
      /chat
      /economy
      /gifts
      /moderation
      /battles
      /leaderboards
    /common
      /dto
      /guards
      /pipes
      /utils
  prisma/
    schema.prisma
    migrations/
  test/
docker-compose.yml
.env.example
README.md
```

**Checkpoint:** You can point your frontend to `http://localhost:<API_PORT>` and hit `/health` successfully.

---

## 3) Local dev foundation (Docker PostgreSQL + pgAdmin)

### 3.1 Docker Compose baseline (Postgres + pgAdmin)

```yaml
services:
  postgres:
    image: postgres:16
    container_name: liveapp-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: liveapp
      POSTGRES_USER: liveapp
      POSTGRES_PASSWORD: liveapp_password
    ports:
      - "5432:5432"
    volumes:
      - liveapp_pgdata:/var/lib/postgresql/data

  pgadmin:
    image: dpage/pgadmin4:latest
    container_name: liveapp-pgadmin
    restart: unless-stopped
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@local.dev
      PGADMIN_DEFAULT_PASSWORD: admin_password
    ports:
      - "5050:80"
    depends_on:
      - postgres
    volumes:
      - liveapp_pgadmin:/var/lib/pgadmin

volumes:
  liveapp_pgdata:
  liveapp_pgadmin:
```

### 3.2 pgAdmin connection settings
In pgAdmin:
- Host: `postgres` (container name) **if pgAdmin is in the same compose**
- Port: `5432`
- Username: `liveapp`
- Password: `liveapp_password`
- Database: `liveapp`

**Checkpoint:**  
- ✅ `docker compose up` brings up both containers  
- ✅ You can log into pgAdmin at `http://localhost:5050`  
- ✅ You can connect to the `liveapp` DB and browse tables once migrations run  

---

# Roadmap Phases (with progression checkpoints)

Each phase below includes:
- **Goal**
- **What you build**
- **DB changes**
- **REST endpoints**
- **WebSocket events**
- **Tests**
- ✅ **Checkpoint criteria**

---

## Phase 0 — Contract freeze (1–2 days)
### Goal
Freeze the shapes of data and events so frontend can swap mock → real without chaos.

### Status (Phase 0)
- ✅ **Completed (2026-03-01)**

### Checkpoint (Phase 0)
- ✅ REST endpoint list is agreed (even if not implemented)
- ✅ WS event names + payload examples exist
- ✅ Frontend mapping plan exists: “replace MOCK_USER_DB with /me, etc.”

---

## Phase 1 — Backend scaffold + health (1 day)
### Status (Phase 1)
- ✅ **Completed (2026-03-01)**
- Verified locally:
  - ✅ `GET /health` → `{"ok":true}`
  - ✅ `GET /version` → `{"name":"liveapp-api","version":"0.0.5","commit":null,"builtAt":null}`

### Notes / small alterations made during Phase 1 (tracked)
- Prisma + Docker stability: Debian slim base to avoid Alpine/OpenSSL issues
- Prisma generate runs at container startup (not build time)
- Added `class-validator` + `class-transformer` for ValidationPipe

### Checkpoint (Phase 1)
- ✅ `docker compose up` starts Postgres + pgAdmin + backend
- ✅ backend connects to Postgres successfully
- ✅ `GET /health` returns `{ ok: true }`
- ✅ migrations run reliably at container startup

---

## Phase 2 — Auth + identity (2–4 days)
### Status (Phase 2)
- ✅ **Completed (2026-03-01)**
- Verified locally:
  - ✅ `POST /auth/signup` returns `{ accessToken, refreshToken, user, profile }`
  - ✅ `GET /me` returns correct user + profile (JWT access token works)
  - ✅ `POST /auth/refresh` rotates refresh tokens (new token issued)
  - ✅ `POST /auth/logout` revokes refresh token
  - ✅ Refresh after logout fails with **401** (`"Refresh token revoked"`)

### Notes / small alterations made during Phase 2 (tracked)
- `bcryptjs` CommonJS import fix: `import * as bcrypt from "bcryptjs";`
- Docker node_modules volume gotcha: installed missing deps inside container when needed
- DTO consistency: ensured `UserSummaryDto` export exists when referenced

### Checkpoint (Phase 2)
- ✅ You can create a user and login
- ✅ `/me` returns correct user + profile skeleton
- ✅ WS connection rejects missing/invalid tokens
- ✅ Frontend can replace mock “currentUser” with `/me`

---

## Phase 3 — Profiles + Edit Profile (3–6 days)
### Status (Phase 3)
- ✅ **Completed (2026-03-01)**
- Verified locally:
  - ✅ `POST /uploads/avatar` accepts multipart `file` and returns `{ url }`
  - ✅ `PATCH /me/profile` persists `avatarUrl` and updates `profiles.updated_at`
  - ✅ `GET /users/:username/profile` returns correct public profile shape
  - ✅ `GET /uploads/<filename>` serves the uploaded image (HTTP 200)

### Notes / small alterations made during Phase 3 (tracked)
- Local disk uploads: saved to `backend/uploads/` and served via `/uploads/*`
- Enabled static assets via `useStaticAssets()` in `main.ts`

### Checkpoint (Phase 3)
- ✅ Frontend profile screen loads real displayName/avatar/banner/bio/wifw/links
- ✅ EditProfile saves and reloads correctly
- ✅ Uploaded images reachable by URL and persist across reload

---

## Phase 4 — Stream schedule + milestones (2–4 days)
### Status (Phase 4)
- ✅ **Completed (2026-03-01)**
- Verified locally:
  - ✅ `PUT /me/schedule` replaces list and returns items with IDs
  - ✅ `GET /users/:username/schedule` returns the same items publicly
  - ✅ Supports recurring (dayOfWeek + time24h) and one-time (startAt/endAt)
  - ✅ `GET /users/:username/milestones` returns `[]` until Phase 9 starts populating

### Notes / small alterations made during Phase 4 (tracked)
- Prisma relation hotfix: added inverse relation for milestone giver (`P1012` fix)
- Replace-all schedule writes done in a transaction (deleteMany + create)
- Validation enforced: recurring vs one-time fields mutually exclusive

### Checkpoint (Phase 4)
- ✅ Recurring schedule renders from backend
- ✅ One-time events render with correct times
- ✅ Milestones endpoint returns correct shape for ProfileModal

---

## Phase 5 — Streams (lifecycle) + presence (4–8 days)
### Status (Phase 5)
- ✅ **Completed (2026-03-01)**
- Verified locally:
  - ✅ `POST /streams` creates a LIVE stream and returns stream payload
  - ✅ `GET /streams/live` returns the stream in the live list with host summary
  - ✅ `POST /streams/:id/join` returns `{ ok: true, role }` and records participation
  - ✅ `POST /streams/:id/leave` returns `{ ok: true }` and closes active participant row
  - ✅ `POST /streams/:id/end` returns `{ ok: true }` and marks stream ENDED

### Notes / small alterations made during Phase 5 (tracked)
- `/streams/live` viewerCount is DB-based baseline; realtime viewerCount uses Socket.IO join/leave
- Host auto-participation inserted at stream create
- Ending a stream soft-closes open participants (`leftAt` set)

### Checkpoint (Phase 5)
- ✅ Explore screen can fetch `/streams/live`
- ✅ Joining a stream triggers WS updates for connected viewers
- ✅ Viewer count stays correct when clients disconnect unexpectedly
- ✅ Ending a stream kicks viewers with `stream.ended`

---

## Phase 6 — Video provider integration (LiveKit recommended) (2–6 days)
### Status (Phase 6)
- ✅ **Completed (2026-03-01)**
- Verified locally:
  - ✅ `POST /streams/:id/videoToken` returns `{ token, url, roomName, provider }`
  - ✅ Viewer must `POST /streams/:id/join` before token issuance
  - ✅ Token grants match role (HOST publish true, VIEWER publish false)

### Notes / small alterations made during Phase 6 (tracked)
- Room naming deterministic: `stream-<streamId>` stored as `videoRoomName`
- Join-gating: active participant (`leftAt IS NULL`) required for non-host token issuance

### Checkpoint (Phase 6)
- ✅ Host and viewer can join the same video room using backend-issued tokens
- ✅ Backend enforces who can receive a token (viewer vs guest permissions)

---

## Phase 7 — Realtime chat + hearts + system events (3–6 days)
### Status (Phase 7)
- ✅ **Completed (2026-03-01)**
- Verified locally:
  - ✅ `POST /streams/:id/chat` persists and returns `{ streamId, message }`
  - ✅ `GET /streams/:id/chat?limit=...` returns chat history including the new message
  - ✅ WS gateway supports `chat.send` + `reaction.heart` with basic rate limiting

### Notes / small alterations made during Phase 7 (tracked)
- Prisma JSON typing: JSON fields don’t accept literal TS `null`; use `Prisma.JsonNull` or omit the field
- REST helper kept on purpose for testing + clients not yet on WS

### Checkpoint (Phase 7)
- ✅ Chat appears instantly to all viewers (WS once wired in frontend)
- ✅ Spam throttled server-side (basic rate limit)
- ✅ Hearts events fire and animate correctly for all clients

---

## Phase 8 — Roles + permissions + moderation (5–10 days)
### Goal
Fix “wrong buttons visible” by making the backend the single source of truth.

### Status (Phase 8)
- ✅ **Completed (2026-03-01)**
- Verified locally (end-to-end via REST):
  - ✅ Host assigns MODERATOR: `POST /streams/:id/roles/assign`
  - ✅ Host mutes/unmutes: `POST /streams/:id/moderation/mute`, `/unmute`
  - ✅ Host kicks (short ban): `POST /streams/:id/moderation/kick`
  - ✅ Host bans/unbans: `POST /streams/:id/moderation/ban`, `/unban`
  - ✅ Chat + WS honor mute rules (muted user blocked from sending)

### Notes / small alterations made during Phase 8 (tracked)
- Added per-stream persisted roles (`stream_user_roles`) and restrictions (`stream_user_restrictions`)
- Added moderation audit log (`moderation_actions`)
- Streams join resolves role server-side (HOST / assigned role / VIEWER)
- Kicks/bans can disconnect sockets in stream rooms (gateway helper)

### Checkpoint (Phase 8)
- ✅ Viewers never see host-only controls (frontend should render based on backend role)
- ✅ Guests see guest controls only
- ✅ Kicks/mutes/bans apply instantly and persist correctly

---

## Phase 9 — Gifts + wallet ledger + economy integrity (7–14 days)
### Goal
Gifts become auditable, consistent, and impossible to cheat.

### Non-negotiable rule
Use an **append-only ledger** for coins/diamonds. You can cache balances, but the ledger is truth.

### Build
- Gift catalog service
- Wallet balances (cached) + ledger (append-only)
- Gift send:
  - validates sender balance
  - blocks self-gifting server-side
  - awards diamonds to recipient
  - emits `gift.sent` WS event
- Milestone awarding triggered by gift transactions (1,000,000 diamond increments)

### DB changes (actual)
Tables:
- `gifts`
- `gift_transactions`
- `wallets`
- `wallet_ledger`

### REST endpoints
- `GET /gifts/catalog`
- `GET /me/wallet`
- `POST /streams/:id/gifts/send`

### Status (Phase 9)
- ✅ **Completed (2026-03-01)**
- Verified locally (end-to-end):
  - ✅ Catalog returns seeded items (Rose, Crowned Goat, Dragon Egg Hatch, Galaxy)
  - ✅ Wallet defaults: 5,000,000 coins (dev seed) and 0 diamondsEarned
  - ✅ Sending gifts:
    - debits sender coins atomically (`updateMany` with `coins >= cost` guard)
    - credits recipient diamondsEarned
    - writes 2 ledger rows (send + receive)
    - writes 1 `gift_transactions` row
    - emits `gift.sent`
  - ✅ Self-gifting is blocked with HTTP **400** (Bad Request)

### Notes / small alterations made during Phase 9 (tracked)
- Catalog seeding lives in service (dev-friendly) and uses upsert for idempotency
- Ledger is append-only; wallet is cached balance

### Checkpoint (Phase 9)
- ✅ Sending gifts decreases sender coins correctly
- ✅ Recipient diamondsEarned increases correctly
- ✅ Milestones are created when crossing 1M diamond thresholds
- ✅ Self-gifting and insufficient funds are blocked server-side
- ✅ Ledger tables exist and record transactions

---

## Phase 10 — Battles (server-authoritative) (7–14 days)
### Goal
Battles run as a backend-controlled state machine, not client timers.

### Build (actual implemented)
- Create battle (PENDING) in a stream with an opponent that is currently present
- Accept battle (ACTIVE) — sets:
  - `startedAt` (battle start time)
  - `endsAt` (scheduled end time)
- Decline / Cancel / End battle — writes final state + `endedAt`
- Gift → Battle scoring integration:
  - `EconomyService.sendGift()` calls `BattlesService.applyGiftToActiveBattle()`
  - Only applies if:
    - there is an ACTIVE battle in the same stream
    - the gift’s `createdAt` is within `[startedAt, endsAt]`
    - the recipient is either host or opponent
  - Writes a `battle_contributions` row (unique on `gift_tx_id`) and increments score atomically

### DB changes (actual)
Tables:
- `battles`
- `battle_contributions`

### REST endpoints (actual)
- `POST /streams/:id/battles` (create PENDING)
- `GET /streams/:id/battles/active`
- `GET /battles/:battleId`
- `POST /battles/:battleId/accept`
- `POST /battles/:battleId/decline`
- `POST /battles/:battleId/cancel`
- `POST /battles/:battleId/end`

### WS events (actual)
- `battle.created`
- `battle.started`
- `battle.scoreUpdated`
- `battle.ended`
- `battle.mvp` (emitted when a winner exists)

### Status (Phase 10)
- ✅ **Completed (2026-03-01)** — *core battle lifecycle + gift scoring verified end-to-end*
- Verified locally (repeatable PowerShell smoke test):
  - ✅ Host logs in
  - ✅ Creates a LIVE stream
  - ✅ Creates a fresh opponent (signup)
  - ✅ Opponent joins stream
  - ✅ Host creates battle (PENDING)
  - ✅ Opponent accepts (ACTIVE; startedAt + endsAt set)
  - ✅ Host sends `rose` to opponent → opponentScore **+10**
  - ✅ Opponent sends `crown_goat` to host → hostScore **+250**
  - ✅ `GET /battles/:battleId` returns scores + 2 contributions
  - ✅ `POST /battles/:battleId/end` sets winner correctly
  - ✅ DB checks show:
    - `battles.winner_user_id` set
    - 2 rows in `battle_contributions` for that battle

### Notes / small alterations made during Phase 10 (tracked)
- Prisma validation fix: `battle_contribution.create()` uses relation connects (`battle/connect`, `giftTx/connect`, `sender/connect`, `recipient/connect`), avoiding “Argument `battle` is missing” errors.
- “Scheduled end” vs “actual end” split:
  - `endsAt` = scheduled end of ACTIVE battle
  - `endedAt` = the timestamp we actually ended it (manual end for now)
- Duplicate guard: a giftTx can only contribute once (unique constraint on `battle_contributions.gift_tx_id`), and `P2002` is handled as idempotent.
- **Duration validation mismatch noted:** `CreateBattleDto` currently allows `15..3600` seconds, while service enforces `10..600`. (Not blocking tests; but should be unified in a cleanup pass.)

### Checkpoint (Phase 10)
- ✅ Battle state is server authoritative (PENDING → ACTIVE → ENDED)
- ✅ Gift scoring updates both DB and the battle payload
- ✅ Contributions list matches the gifts sent
- ✅ Winner is computed from scores and persisted in DB

### Phase 10 follow-ups (small, but recommended)
These are not blockers for moving on, but they make battles more production-ready:
1) **Auto-end job:** a simple interval that ends ACTIVE battles when `now >= endsAt` (so battles end even if no one calls `/end`)
2) **Battle stats (optional):** user-level aggregated stats (wins/losses/streak, total diamonds contributed) for profile + leaderboards
3) **Event contract tightening:** ensure frontend consumes `battle.created` + `battle.started` consistently (payload shapes)

---

## Phase 11 — Explore + leaderboards + search (4–8 days)
### Goal
Fast discovery: who’s live, trending, leaderboard ranks.

### Status (Phase 11)
- 🟡 **Implemented (2026-03-01) — pending your local verification checklist**

### What you build (practical order) — **actual implementation delivered**
1) **Public user search**
   - `GET /users/search?q=...&limit=...&cursor=...`
   - returns user summary + profile snippet (displayName, avatar)
   - includes `isLive` + `liveStreamId` when applicable
   - rate limiting guard on this route (basic in-memory; dev-friendly)

2) **Trending streams list**
   - **Primary:** `GET /streams/live?sort=recent|trending&windowMinutes=10`
   - **Alias (optional, if you prefer not to touch StreamsController yet):** `GET /explore/streams/live?sort=...`
   - Trending score (dev formula):
     - `viewerCount * 5 + chatCount(last N minutes) + giftsCount(last N minutes) * 2`
   - DB-only: derived from `stream_participants`, `chat_messages`, `gift_transactions` windows

3) **Leaderboards (foundation)**
   - `GET /leaderboards?period=daily|weekly|alltime&type=earnings|gifters&limit=...`
   - `earnings`: top recipients by diamonds (alltime uses `wallets.diamonds_earned`; daily/weekly uses gift transactions within the window)
   - `gifters`: top spenders by coins spent (daily/weekly window supported)

### DB changes (Phase 11)
No new tables required.
Recommended indexes added (Prisma schema change + migration):
- `profiles.display_name`
- `users.username`
- `chat_messages(stream_id, created_at)`
- `gift_transactions(stream_id, created_at)`
- `stream_participants(stream_id, left_at)`
- Optional: `wallets(diamonds_earned)` for alltime leaderboard

### Tests (Phase 11)
- E2E / smoke: a PowerShell script that:
  - creates users
  - creates a live stream
  - sends chat + gifts
  - verifies `/users/search`, `/streams/live?sort=trending`, `/leaderboards`

### Checkpoint (Phase 11) — local verification checklist
- ✅ `GET /users/search?q=jo` returns matching users with displayName/avatar and `isLive` status
- ✅ `GET /streams/live?sort=trending` returns same set as recent but sorted by trendingScore (viewer/chat/gifts influence order)
- ✅ `GET /leaderboards?period=alltime&type=earnings` matches `wallets.diamonds_earned` ordering
- ✅ `GET /leaderboards?period=daily&type=gifters` reflects gifts sent in the last 24h (rolling window)
- ✅ Search endpoint returns **429** when spammed (rate limiter works)

---

## Phase 12 — Notifications + scheduled jobs (optional) (3–7 days)
### Checkpoint (Phase 12)
- ✅ Notifications are triggered at correct times
- ✅ Jobs are retryable and observable

---

## Phase 13 — Monetization (coins purchase) (later) (7–21 days)
### Checkpoint (Phase 13)
- ✅ No double-crediting possible
- ✅ Payment failures handled cleanly
- ✅ Wallet ledger is consistent

---

## Phase 14 — Production hardening (ongoing)
### Checkpoint (Phase 14)
- ✅ You can deploy, rollback, and monitor health without guessing
- ✅ Backups restore successfully in a drill

---

# Appendix A — Minimum API + WS “contract list” (starter)

## REST (minimum)
- `GET /health`
- `GET /version`
- `POST /auth/signup`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /me`
- `PATCH /me/profile`
- `GET /users/:username/profile`
- `PUT /me/schedule`
- `GET /users/:username/schedule`
- `GET /users/:username/milestones`
- `POST /streams`
- `GET /streams/live`
- `GET /streams/:id`
- `POST /streams/:id/join`
- `POST /streams/:id/leave`
- `POST /streams/:id/end`
- `POST /streams/:id/videoToken`
- `GET /streams/:id/chat`
- `POST /streams/:id/chat`
- `POST /streams/:id/roles/assign`
- `POST /streams/:id/moderation/kick`
- `POST /streams/:id/moderation/mute`
- `POST /streams/:id/moderation/unmute`
- `POST /streams/:id/moderation/ban`
- `POST /streams/:id/moderation/unban`
- `GET /gifts/catalog`
- `GET /me/wallet`
- `POST /streams/:id/gifts/send`
- `POST /streams/:id/battles`
- `GET /streams/:id/battles/active`
- `GET /battles/:battleId`
- `POST /battles/:battleId/accept`
- `POST /battles/:battleId/decline`
- `POST /battles/:battleId/cancel`
- `POST /battles/:battleId/end`
- **NEW:** `GET /users/search`
- **NEW:** `GET /leaderboards`
- **NEW:** `GET /streams/live?sort=trending`
- **Optional alias:** `GET /explore/streams/live`

## WebSocket events (minimum)
- `stream.joined`
- `stream.left`
- `stream.viewerCount`
- `stream.participants`
- `stream.ended`
- `stream.state.updated`
- `chat.message`
- `reaction.heart`
- `system.toast`
- `role.assigned`
- `moderation.action`
- `stream.participant.removed`
- `gift.sent`
- `battle.created`
- `battle.started`
- `battle.scoreUpdated`
- `battle.ended`
- `battle.mvp`

---

# Appendix B — Definition of Done (global)
A feature is “done” only when:
- Server enforces rules (not just the client)
- DB migration exists + is applied cleanly
- DTOs are validated
- WS events are broadcast correctly
- Tests pass (or at minimum: reliable e2e smoke scripts)
- Frontend uses the real endpoint (mock removed)
- Checkpoint criteria met

---

## Next step
After you run the Phase 11 smoke test + confirm the checkpoints, paste this roadmap text back into chat and I’ll flip Phase 11 to ✅ Completed and re-issue a fresh downloadable `.md`.
