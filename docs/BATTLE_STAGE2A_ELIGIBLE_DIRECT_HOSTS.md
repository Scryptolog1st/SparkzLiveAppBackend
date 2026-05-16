# Battle Stage 2A - Eligible Direct Hosts

This patch adds the first read-only discovery endpoint for direct 1v1 battle invites.

## Added

`GET /streams/:id/battles/eligible-hosts?type=ONE_V_ONE`

## Eligibility rules

- Requester must be the host of the stream.
- Requester's stream must be LIVE.
- Candidate hosts must be live.
- Candidate hosts must be mutual favorites with the requester.
- Blocked users are excluded in both directions.
- Hosts already busy in legacy pending/active battles are excluded.
- Hosts already busy in generalized battle states are excluded.

## Not included yet

- Direct invite creation.
- Accept/decline invite handling.
- Battle start.
- Mobile integration.
- Realtime invite events.

Patch verification marker: BATTLE_STAGE2A_ELIGIBLE_DIRECT_HOSTS
