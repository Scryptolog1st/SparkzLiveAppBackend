# Battle Gift Cross-Session Routing Bug — Diagnosis & Patch

## Executive Summary

Four distinct bugs combine to produce the observed symptom: gifts sent during Battle Group 2 are
credited to Battle Group 1 and broadcast to the wrong battle UI.

---

## Bug 1 — `applyGiftToActiveBattle` is always called, even for V2 battle gifts (CRITICAL)

**File:** `src/modules/economy/economy.service.ts`
**Lines:** 1153–1165

### Current code

```ts
if (!txResult.reused) {
  try {
    await this.battles.applyGiftToActiveBattle({
      streamId,
      giftTxId: txResult.giftTx.id,
      senderUserId,
      recipientUserId,
      diamondValue: txResult.giftTx.diamondValue,
      createdAt: txResult.giftTx.createdAt,
    });
  } catch (e) {
    console.warn("[EconomyService] battle hook failed:", e);
  }
```

### Problem

`applyGiftToActiveBattle` is called **unconditionally** — there is no guard that skips it when
`battleGiftTarget` was already resolved by the V2 path (`resolveBattleGiftTargetForSendV2`).

`applyGiftToActiveBattle` (`battles.service.ts:3205`) looks up the **legacy `battle` table**:

```ts
const battle = await this.prisma.battle.findFirst({
  where: { streamId, status: "ACTIVE" },
  orderBy: { startedAt: "desc" },
});
```

If a legacy `Battle` row happens to be ACTIVE for the same `streamId` at the same time as a V2
`BattleSession`, every V2 battle gift is **double-recorded**: once in `BattleSideContribution`
(correct) and once in the legacy `BattleContribution` (wrong). Even when there is no concurrent
legacy battle, the call is wasteful and unsafe — any future migration that reuses the stream will
cross-pollinate scores.

### Fix

Add an `!battleGiftTarget` guard so the legacy hook is skipped whenever the V2 path resolved:

```diff
- if (!txResult.reused) {
+ if (!txResult.reused && !battleGiftTarget) {
    try {
      await this.battles.applyGiftToActiveBattle({
```

---

## Bug 2 — `battle.scoreUpdated` is broadcast globally to all connected sockets (CRITICAL)

**File:** `src/modules/realtime/realtime.gateway.ts`
**Lines:** 1278–1285

### Current code

```ts
emitBattleScoreUpdated(payload: any) {
  this.server.emit("battle.scoreUpdated", payload);   // ← global broadcast
  if (payload?.streamId) {
    this.server
      .to(this.room(payload.streamId))
      .emit("battle.scoreUpdated", payload);
  }
}
```

### Problem

`this.server.emit(...)` (line 1279) sends to **every connected socket on the server**, not just
participants of that battle. When two battles are live simultaneously, every viewer of Battle
Group 1 also receives every `battle.scoreUpdated` event from Battle Group 2 (and vice versa).
Because the event payload contains a `streamId` that matches one of the active battles, clients
apply the score update to whichever battle their UI is currently showing — producing the observed
cross-session score attribution.

The same global-broadcast pattern exists on lines 1272, 1288, and 1295 for `battle.started`,
`battle.ended`, and `battle.mvp`.

### Fix

Remove the unconditional global emit from all four methods; keep only the room-scoped emit:

```diff
  emitBattleScoreUpdated(payload: any) {
-   this.server.emit("battle.scoreUpdated", payload);
    if (payload?.streamId) {
      this.server
        .to(this.room(payload.streamId))
        .emit("battle.scoreUpdated", payload);
    }
  }

  emitBattleStarted(payload: any) {
-   this.server.emit("battle.started", payload);
    if (payload?.streamId) {
      this.server.to(this.room(payload.streamId)).emit("battle.started", payload);
    }
  }

  emitBattleEnded(payload: any) {
-   this.server.emit("battle.ended", payload);
    if (payload?.streamId) {
      this.server.to(this.room(payload.streamId)).emit("battle.ended", payload);
    }
  }

  emitBattleMvp(payload: any) {
-   this.server.emit("battle.mvp", payload);
    if (payload?.streamId) {
      this.server.to(this.room(payload.streamId)).emit("battle.mvp", payload);
    }
  }
```

---

## Bug 3 — Private `emit()` in `BattlesService` also broadcasts V2 events globally (CRITICAL)

**File:** `src/modules/battles/battles.service.ts`
**Lines:** 39–47

### Current code

```ts
private emit(event: string, payload: any) {
  const server = (this.realtime as any).server;
  if (!server) return;

  server.emit(event, payload);           // ← global broadcast
  if (payload?.streamId) {
    server.to(this.room(payload.streamId)).emit(event, payload);
  }
}
```

### Problem

`emitBattleV2EventToSessionStreams` (line 860) calls this private `emit` once per stream in the
session. Each call starts with `server.emit(event, payload)`, which means every V2 event —
including `battle.v2.scoreUpdated` — is broadcast to all sockets globally, once per stream side.
For a 2-side battle this doubles the global broadcast count.

### Fix

Remove the global `server.emit` line; emit only to the scoped room:

```diff
  private emit(event: string, payload: any) {
    const server = (this.realtime as any).server;
    if (!server) return;

-   server.emit(event, payload);
    if (payload?.streamId) {
      server.to(this.room(payload.streamId)).emit(event, payload);
    }
  }
```

---

## Bug 4 — `resolveBattleGiftTargetForSendV2` uses a loose stream-membership check (MODERATE)

**File:** `src/modules/economy/economy.service.ts`
**Lines:** 706–730

### Current code (the Prisma `where` clause)

```ts
const side = await (this.prisma as any).battleSide.findFirst({
  where: {
    id: battleSideId,
    battle: {
      status: { in: this.giftBattleScoringStatusesV2 },
      sides: {
        some: {
          streamId,    // ← any side in the battle has this stream
        },
      },
    },
  },
  ...
});
```

### Problem

`sides.some({ streamId })` checks that **at least one** side of the battle (not necessarily
`battleSideId`'s own side) is linked to the request stream. If the same stream participates in
two simultaneous active `BattleSession` rows — possible during a rematch or a rapid back-to-back
match — a `battleSideId` belonging to the older session can pass this check when queried from
the newer session's stream.

Additionally, no `battleSessionId` is accepted from the client, so the backend has no
authoritative anchor to validate against.

### Fix (two parts)

**Part A** — Add `battleSessionId` to the DTO and `SendGiftParams`:

`src/modules/economy/dto/send-gift.dto.ts`
```diff
+ @IsOptional()
+ @IsUUID()
+ battleSessionId?: string;
```

`src/modules/economy/economy.service.ts` — `SendGiftParams` type (line 25):
```diff
  battleSideId?: string;
+ battleSessionId?: string;
```

`src/modules/economy/economy.controller.ts` — `sendGift` body passthrough (line 34):
```diff
  battleSideId: dto.battleSideId,
+ battleSessionId: dto.battleSessionId,
```

**Part B** — Tighten the Prisma query to pin the side to a specific session when `battleSessionId`
is provided, and always require that `battleSideId`'s own `streamId` matches OR that the source
stream is explicitly one of the battle's sides:

```diff
  const side = await (this.prisma as any).battleSide.findFirst({
    where: {
      id: battleSideId,
+     ...(params.battleSessionId ? { battleId: params.battleSessionId } : {}),
      battle: {
        status: { in: this.giftBattleScoringStatusesV2 },
        sides: {
          some: {
            streamId,
          },
        },
      },
    },
```

After loading the side, add an explicit guard to ensure the resolved side is actually
from a battle whose sides include the source stream, and (if provided) that the
`battleId` equals `battleSessionId`:

```ts
if (params.battleSessionId && side.battleId !== params.battleSessionId) {
  throw new BadRequestException("battleSideId does not belong to the specified battleSessionId");
}
```

---

## Bug 5 — `resolveBattleGiftTargetForSendV2` accepts a `battleSideId` whose own stream differs from the source stream without explicit cross-stream validation (MINOR / defence-in-depth)

**File:** `src/modules/economy/economy.service.ts`
**Lines:** 754–758

The `allowedRecipientUserIds` check correctly validates that the recipient is on the target side,
and the battle's `sides.some({ streamId })` verifies the source stream is in the battle.
However, no code asserts that the side's own `streamId` matches either the source stream
(for same-stream gifts) or the opponent stream (for cross-stream gifts). For defence-in-depth,
after loading `side`, assert:

```ts
const battleStreamIds = new Set(side.battle.sides.map((s: any) => s.streamId).filter(Boolean));
if (!battleStreamIds.has(streamId)) {
  throw new BadRequestException("Source stream is not part of this battle session");
}
```

---

## Summary of all fixes

| # | File | Line(s) | Change |
|---|------|---------|--------|
| 1 | `economy.service.ts` | 1153 | Add `&& !battleGiftTarget` guard before `applyGiftToActiveBattle` |
| 2 | `realtime.gateway.ts` | 1272, 1279, 1288, 1295 | Remove `this.server.emit(...)` global broadcasts from `emitBattleStarted`, `emitBattleScoreUpdated`, `emitBattleEnded`, `emitBattleMvp` |
| 3 | `battles.service.ts` | 43 | Remove `server.emit(event, payload)` global broadcast from private `emit()` |
| 4a | `send-gift.dto.ts` | — | Add optional `battleSessionId: string` field |
| 4b | `economy.service.ts` | 706 | Pin Prisma query to `battleSessionId` when provided; add post-load guard |
| 4c | `economy.controller.ts` | 42 | Pass `battleSessionId` from DTO to `sendGift` |
| 5 | `economy.service.ts` | 754 | Add defence-in-depth stream membership assertion |

**Fix 1 is the most critical for correct scoring.**
**Fixes 2 and 3 are the most critical for correct realtime UI behaviour.**
**Fix 4 prevents the scenario from recurring as new battle types are added.**

---

## Answers to the specific questions in the PR

| Question | Answer |
|----------|--------|
| Is `applyGiftToActiveBattle()` still called for V2 gifts? | **Yes** — `economy.service.ts:1155`. There is no guard. Fix 1 above resolves this. |
| Is any scoring path finding a side by sideKey/color? | No — V2 scoring uses unique `sideId` UUID throughout. Legacy scoring uses `recipientIsHost`/`recipientIsOpponent`, not sideKey. |
| Is any query missing `battleSessionId` scoping? | Yes — `resolveBattleGiftTargetForSendV2` accepts `battleSideId` without anchoring to a specific session. Fix 4 resolves this. |
| Does `resolveBattleGiftTargetForSendV2` allow a `battleSideId` from another battle? | Yes, if the source stream appears in two simultaneous sessions (Fix 4 closes this). |
| Are realtime events broadcast globally? | **Yes** — `battles.service.ts:43` and `realtime.gateway.ts:1279,1272,1288,1295`. Fixes 2 and 3 resolve this. |
| Should `SendGiftDto` require `battleSessionId`? | Yes (optional for non-battle gifts, but required for battle gifts). Fix 4a. |
| Should backend validate `battleSideId` belongs to the active session for the request stream? | Yes. Fix 4b adds this validation. |
| Should legacy `applyGiftToActiveBattle()` be skipped when V2 target resolved? | **Yes** — this is Fix 1 and is the most impactful single change. |
