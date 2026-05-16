# Battle Stage 2C - Direct Invite Accept/Decline and Start

This patch adds backend-only direct 1v1 invite accept/decline handling.

## Added

- `POST /battle-sessions/:battleSessionId/invites/:inviteId/accept`
- `POST /battle-sessions/:battleSessionId/invites/:inviteId/decline`

## Accept behavior

The accept endpoint:

- requires the actor to be the invited recipient host
- requires the battle session to be `INVITING`
- requires the invite to be `PENDING`
- rejects expired invites
- verifies both hosts are still live
- verifies neither host has blocked the other
- marks the invite `ACCEPTED`
- marks the recipient participant `ACCEPTED`
- updates both side stream ids to current live streams
- changes the battle session to `ACTIVE`
- sets `startedAt`
- sets `endsAt`
- emits `battle.v2.inviteAccepted`
- emits `battle.v2.started`

## Decline behavior

The decline endpoint:

- requires the actor to be the invited recipient host
- requires the battle session to be `INVITING`
- requires the invite to be `PENDING`
- marks the invite `DECLINED`
- marks the recipient participant `DECLINED`
- marks the battle session `DECLINED`
- emits `battle.v2.inviteDeclined`

## Not included yet

- timer expiry job
- gift scoring write path
- cooldown handling
- rematch handling
- mobile integration

Patch verification marker: BATTLE_STAGE2C_DIRECT_INVITE_ACCEPT_DECLINE_START
