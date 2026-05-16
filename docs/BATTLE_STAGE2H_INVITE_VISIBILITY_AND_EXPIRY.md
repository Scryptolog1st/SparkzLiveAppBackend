# Battle Stage 2H - Invite Visibility and Expiry

This patch adds backend support for the mobile Battle modal Invites tab.

Added endpoints:

GET /streams/:id/battles/invites
POST /battle-sessions/:battleSessionId/invites/:inviteId/process-invite-expiry

Behavior:
- Stream host can fetch incoming and outgoing pending battle invites.
- Incoming invites are pending invites where the actor is the recipient.
- Outgoing invites are pending invites where the actor is the sender.
- Returned invite items include the serialized generalized battle session.
- Direct invite creation emits battle.v2.inviteCreated.
- Direct invite cancellation emits battle.v2.inviteCancelled.
- Expired pending invites are marked EXPIRED.
- Invited participant is marked TIMED_OUT.
- Battle session is marked EXPIRED.
- Invite expiry emits battle.v2.inviteExpired.
- Automatic invite expiry polling runs alongside timer and cooldown polling.

Not included yet:
- Push notifications.
- Dedicated per-user websocket channels.
- Mobile Battle modal implementation.
- Team invite expiry.

Patch verification marker: BATTLE_STAGE2H_INVITE_VISIBILITY_AND_EXPIRY
