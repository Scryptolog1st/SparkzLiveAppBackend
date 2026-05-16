# Battle Stage 2I - 1v1 Backend Smoke Test

This document verifies the backend-only generalized 1v1 battle flow before mobile UI integration.

## Scope

This test covers:

- Eligible direct battle host lookup
- Direct 1v1 invite create
- Invite list lookup for sender and recipient
- Invite accept
- Active battle lookup from both streams
- Gift-send battle side scoring using `battleSideId`
- Manual timer expiry processing
- Cooldown transition
- Rematch vote path
- Cooldown expiry path

## Not covered yet

- Mobile Battle modal UI
- Mobile gift sheet battle-side selector
- Team battles
- Random queue
- Free-for-all battles
- Top-gifter rewards
- Stats aggregation

## Prerequisites

You need:

- API base URL
- Sender host JWT
- Recipient host JWT
- Viewer JWT with coins
- Sender live stream id
- Recipient live stream id
- Sender host user id
- Recipient host user id
- A gift id from the gift catalog, for example `rose`
- Sender and recipient hosts must both be live
- Sender and recipient hosts must mutually favorite each other
- Neither user can have blocked the other

## Current deployed routes used by this test

    GET  /streams/:id/battles/eligible-hosts
    POST /streams/:id/battles/direct-invites
    GET  /streams/:id/battles/invites
    POST /battle-sessions/:battleSessionId/invites/:inviteId/accept
    POST /battle-sessions/:battleSessionId/invites/:inviteId/decline
    POST /battle-sessions/:battleSessionId/invites/:inviteId/cancel
    GET  /streams/:id/battles/v2/active
    GET  /battle-sessions/:battleSessionId
    POST /streams/:id/gifts/send
    POST /battle-sessions/:battleSessionId/process-expiry
    POST /battle-sessions/:battleSessionId/rematch-vote
    POST /battle-sessions/:battleSessionId/process-cooldown

## Expected happy path

### 1. Sender fetches eligible hosts

Request:

    GET /streams/:senderStreamId/battles/eligible-hosts?type=ONE_V_ONE

Expected:

- Recipient host appears
- Recipient host is live
- Recipient host is mutually favorited
- Recipient host is not battle busy
- Recipient host is not blocked in either direction

### 2. Sender creates direct invite

Request:

    POST /streams/:senderStreamId/battles/direct-invites

Body:

    {
      "battleType": "ONE_V_ONE",
      "recipientHostUserId": "recipient-host-user-id",
      "durationSeconds": 60
    }

Expected:

- Response `ok: true`
- Battle status is `INVITING`
- Side A belongs to sender
- Side B belongs to recipient
- Invite status is `PENDING`
- Sender participant is `ACCEPTED`
- Recipient participant is `INVITED`
- Event path includes `battle.v2.inviteCreated`

Save:

- `battleId`
- `inviteId`
- side A id
- side B id

### 3. Sender and recipient fetch invite lists

Sender request:

    GET /streams/:senderStreamId/battles/invites

Expected:

- Invite appears in `outgoing`

Recipient request:

    GET /streams/:recipientStreamId/battles/invites

Expected:

- Invite appears in `incoming`

### 4. Recipient accepts invite

Request:

    POST /battle-sessions/:battleId/invites/:inviteId/accept

Expected:

- Battle status is `ACTIVE`
- Invite status is `ACCEPTED`
- Recipient participant is `ACCEPTED`
- `startedAt` is set
- `endsAt` is set
- Event path includes `battle.v2.inviteAccepted`
- Event path includes `battle.v2.started`

### 5. Both streams can fetch active battle

Sender request:

    GET /streams/:senderStreamId/battles/v2/active

Recipient request:

    GET /streams/:recipientStreamId/battles/v2/active

Expected:

- Both return same battle session
- Side A is sender
- Side B is recipient
- Scores start at `0`
- Status is `ACTIVE`

### 6. Viewer gifts sender side

Request:

    POST /streams/:senderStreamId/gifts/send

Body:

    {
      "giftId": "rose",
      "recipientUserId": "sender-host-user-id",
      "quantity": 1,
      "battleSideId": "side-a-id",
      "idempotencyKey": "unique-key-1"
    }

Expected:

- Normal gift transaction succeeds
- Response includes `battleContribution`
- Side A score increments by gift diamond value
- `battle.v2.scoreUpdated` is emitted
- Active battle lookup shows updated side A score

### 7. Viewer gifts opponent side from sender stream

Request:

    POST /streams/:senderStreamId/gifts/send

Body:

    {
      "giftId": "rose",
      "recipientUserId": "recipient-host-user-id",
      "quantity": 1,
      "battleSideId": "side-b-id",
      "idempotencyKey": "unique-key-2"
    }

Expected:

- Normal gift transaction succeeds
- Recipient can be on opponent side because `battleSideId` is valid for linked active battle
- Response includes `battleContribution`
- Side B score increments by gift diamond value
- `battle.v2.scoreUpdated` is emitted to linked streams

### 8. Process expiry after timer ends

Request:

    POST /battle-sessions/:battleId/process-expiry

Expected if scores are not tied:

- Battle status becomes `COOLDOWN`
- Winner side is set
- Side results become `WIN` / `LOSS`
- `cooldownStartedAt` is set
- `cooldownEndsAt` is set
- Event path includes `battle.v2.cooldownStarted`

Expected if scores are tied:

- Battle status becomes `SUDDEN_DEATH`
- `suddenDeathRound` increments
- `endsAt` is set to 30 seconds after sudden death start
- Event path includes `battle.v2.suddenDeathStarted`

### 9. Rematch vote happy path

Sender request:

    POST /battle-sessions/:battleId/rematch-vote

Body:

    {
      "vote": "REMATCH"
    }

Recipient request:

    POST /battle-sessions/:battleId/rematch-vote

Body:

    {
      "vote": "REMATCH"
    }

Expected after both vote before cooldown ends:

- Previous battle becomes `ENDED`
- New battle session is created
- New battle mode is `REMATCH`
- New battle status is `ACTIVE`
- Same participants are copied
- Scores reset to `0`
- Event path includes `battle.v2.rematchStarted`

### 10. Skip/no-rematch path

For a different battle, one participant votes:

    {
      "vote": "SKIP"
    }

Then after cooldown expires:

    POST /battle-sessions/:battleId/process-cooldown

Expected:

- Battle status becomes `ENDED`
- No rematch battle is created
- Event path includes `battle.v2.ended`

## Failure checks

### Non-mutual favorite recipient

Direct invite should fail.

### Blocked user

Eligible-hosts should not show blocked users.

Direct invite should fail if one user blocked the other.

### Recipient not live

Direct invite should fail.

### Recipient already battle busy

Eligible-hosts should not show them as available.

Direct invite should fail.

### Expired invite accept

Accept should fail once invite expires.

The invite expiry processor should mark:

- Invite `EXPIRED`
- Recipient participant `TIMED_OUT`
- Battle session `EXPIRED`

### Gift without battleSideId

Normal stream gift behavior should still work.

### Gift with invalid battleSideId

Gift should fail before wallet deduction.

### Gift to user not on selected side

Gift should fail before wallet deduction.

### Duplicate idempotency key

Second request should not double-score the battle contribution.

## Pass criteria

The backend smoke test passes when:

- Direct 1v1 invite lifecycle works
- Active battle state is visible from both streams
- Viewers can gift either side from either linked stream using `battleSideId`
- Battle side score updates exactly once per gift transaction
- Timer expiry creates cooldown or sudden death correctly
- Rematch starts only after both participants vote `REMATCH`
- Cooldown expiry ends the battle when rematch is not unanimous
- Normal non-battle gift behavior still works

Patch verification marker: BATTLE_STAGE2I_1V1_BACKEND_SMOKE_TEST
