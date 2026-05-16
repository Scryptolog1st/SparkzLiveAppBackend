# Battle Stage 5P Backend Media Token Type Fix

This patch fixes TypeScript build errors in `src/modules/video/video.service.ts`.

Problem:

- `sideStreamIds` was inferred as `unknown[]`.
- `sideStreamIds[0] || battleSessionId` was rejected where a `string` was required.
- Diagnostic `detailsJson.sideStreamIds` was also rejected because it was `unknown[]`.

Fix:

- Type `sideStreamIds` as `string[]`.
- Use `new Set<string>(...)`.
- Add `primaryStreamId` as a safe string for LiveKit token and diagnostics.

Patch verification marker: BATTLE_STAGE5P_BACKEND_MEDIA_TOKEN_TYPE_FIX
