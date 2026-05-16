# Phase 12 Patch — Notifications + scheduled jobs (scaffold)

This patch adds:
- Persistent **in-app notifications** (DB table + REST API)
- A lightweight **jobs runner** (setInterval) for scheduled tasks (retention now; battle auto-end later)

## 1) Extract
Extract this zip at your repo root (the folder containing `/backend`).

## 2) Prisma schema + migration (required)
1) Open `backend/prisma/schema.prisma`
2) Paste the contents of `backend/prisma/PHASE12_schema_snippet.prisma` at the end (or appropriate spot)
3) Run a migration from inside the backend container (or locally, depending on your workflow):

   ```bash
   npx prisma migrate dev --name phase12_notifications
   ```

If you run migrations at container startup, just ensure the schema + migration exist and rebuild/restart.

## 3) Wire modules into AppModule (required)
In `backend/src/app.module.ts`:
- import + add to `imports: []`:
  - `NotificationsModule`
  - `JobsModule`

Example:
```ts
import { NotificationsModule } from './modules/notifications/notifications.module';
import { JobsModule } from './modules/jobs/jobs.module';

@Module({
  imports: [
    // ...
    NotificationsModule,
    JobsModule,
  ],
})
export class AppModule {}
```

## 4) Endpoints added
- `GET /me/notifications?limit=20&cursor=<id>&unreadOnly=true|false`
- `POST /me/notifications/:id/read`
- `POST /me/notifications/read-all`
- `POST /me/notifications/test` (dev-only helper)

### Auth note
These routes use `@UseGuards(AuthGuard('jwt'))`. Your auth module must register a Passport JWT strategy named `'jwt'`.

## 5) Verify quickly (manual)
1) Get an access token (login or signup)
2) Create a test notification:
   ```http
   POST /me/notifications/test
   Authorization: Bearer <token>
   { "type":"SYSTEM", "title":"Hello", "body":"Test", "payload":{"ok":true} }
   ```
3) List notifications:
   ```http
   GET /me/notifications?limit=20
   Authorization: Bearer <token>
   ```
4) Mark read:
   ```http
   POST /me/notifications/<id>/read
   Authorization: Bearer <token>
   ```

## 6) Integrations (recommended, next)
This patch gives you the persistent notification “pipe.” Next, we hook it to real events:
- Gift received -> notify recipient
- Milestone reached -> notify recipient
- Battle ended -> notify participants
- Stream started -> notify followers (once following exists)

The cleanest approach is to call `NotificationsService.createForUser(...)` from the existing services that already own those events (EconomyService, BattlesService, etc.).
