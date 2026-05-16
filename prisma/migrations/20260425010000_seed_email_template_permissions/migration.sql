-- Seed missing granular email template permissions for roles that already have
-- broad email template management access.

INSERT INTO "admin_role_permissions" ("role", "permission", "enabled")
VALUES
  ('SUPER_ADMIN'::"AdminRole", 'email.templates.view', true),
  ('SUPER_ADMIN'::"AdminRole", 'email.templates.manage', true),
  ('SUPER_ADMIN'::"AdminRole", 'email.templates.create', true),
  ('SUPER_ADMIN'::"AdminRole", 'email.templates.edit', true),
  ('SUPER_ADMIN'::"AdminRole", 'email.templates.publish', true),
  ('SUPER_ADMIN'::"AdminRole", 'email.templates.archive', true),
  ('SUPER_ADMIN'::"AdminRole", 'email.templates.preview', true),
  ('SUPER_ADMIN'::"AdminRole", 'email.templates.send_test', true),

  ('ADMIN'::"AdminRole", 'email.templates.view', true),
  ('ADMIN'::"AdminRole", 'email.templates.manage', true),
  ('ADMIN'::"AdminRole", 'email.templates.create', true),
  ('ADMIN'::"AdminRole", 'email.templates.edit', true),
  ('ADMIN'::"AdminRole", 'email.templates.publish', true),
  ('ADMIN'::"AdminRole", 'email.templates.archive', true),
  ('ADMIN'::"AdminRole", 'email.templates.preview', true),
  ('ADMIN'::"AdminRole", 'email.templates.send_test', true),

  ('ANALYST'::"AdminRole", 'email.templates.view', true),
  ('ANALYST'::"AdminRole", 'email.templates.preview', true)
ON CONFLICT ("role", "permission")
DO UPDATE SET
  "enabled" = EXCLUDED."enabled",
  "updated_at" = CURRENT_TIMESTAMP;
