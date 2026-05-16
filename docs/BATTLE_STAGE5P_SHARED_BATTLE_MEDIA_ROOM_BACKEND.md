# Battle Stage 5P - Shared Battle Media Room Backend

This patch adds backend support for real battle media rooms.

Problem:

- Mobile was only connected to each host's own stream LiveKit room.
- Battle V2 sessions could start on the backend, but hosts were not physically sharing the same media room.
- Mobile previously injected synthetic Side A / Side B metadata, which could create fake profile targets.

Backend behavior added:

- `POST /battle-sessions/:id/videoToken`
- Issues LiveKit tokens for shared room `battle-{battleSessionId}`.
- Battle hosts / accepted battle participants can publish in active battle media rooms.
- Viewers who have joined either battle stream can subscribe.
- Battle serializer now includes real side host and participant user summaries via Profile.

Partial-patch recovery:

- This resume patch handles the earlier serializer anchor mismatch where `asArray` used `value: unknown`.
- It also avoids selecting nonexistent direct `User.displayName` / `User.avatarUrl` fields by using `User.profile`.

Intentionally not changed:

- No mobile files.
- No Prisma commands.
- No database commands.
- No Docker commands.
- No Git commands.
- No build commands.
- No full TypeScript command.

Patch verification marker: BATTLE_STAGE5P_SHARED_BATTLE_MEDIA_ROOM_BACKEND
Resume verification marker: BATTLE_STAGE5P_SHARED_BATTLE_MEDIA_ROOM_BACKEND_RESUME
