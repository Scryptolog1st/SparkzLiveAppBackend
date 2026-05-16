# Battle Stage 2B - Direct Invite Create/Cancel

This patch adds backend-only generalized direct 1v1 battle invite creation and cancellation.

## Added

- `POST /streams/:id/battles/direct-invites`
- `POST /battle-sessions/:battleSessionId/invites/:inviteId/cancel`
- `CreateBattleV2DirectInviteDto`

## Create behavior

The create endpoint:

- requires the actor to be the live stream host
- only supports `ONE_V_ONE`
- only accepts 60, 120, 180, 240, or 300 second direct invite durations
- requires recipient host to be live
- requires mutual favorites
- rejects blocked users in either direction
- rejects hosts already in legacy pending/active battles
- rejects hosts already in generalized active/inviting/cooldown/rematch battle states
- creates `BattleSession` in `INVITING` state
- creates side A for sender and side B for recipient
- creates host participants
- creates a pending host direct invite

## Cancel behavior

The cancel endpoint:

- only allows the invite sender / battle creator to cancel
- only cancels pending host direct invites
- marks the invite `CANCELLED`
- marks invited participants `REMOVED`
- marks the battle session `CANCELLED`

## Not included yet

- recipient accept
- recipient decline
- battle start
- realtime invite events
- mobile integration

Patch verification marker: BATTLE_STAGE2B_DIRECT_INVITE_CREATE_CANCEL
