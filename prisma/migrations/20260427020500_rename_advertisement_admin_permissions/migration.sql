BEGIN;

WITH mapped_existing AS (
    SELECT
        "role",
        CASE
            WHEN "permission" IN ('advertisements.view') THEN 'admin.advert.view'
            WHEN "permission" IN ('advertisements.manage', 'advertisements.settings.manage') THEN 'admin.advert.manage'
            ELSE NULL
        END AS "permission",
        BOOL_OR("enabled") AS "enabled"
    FROM "admin_role_permissions"
    WHERE "permission" IN (
        'advertisements.view',
        'advertisements.manage',
        'advertisements.settings.manage'
    )
    GROUP BY "role",
        CASE
            WHEN "permission" IN ('advertisements.view') THEN 'admin.advert.view'
            WHEN "permission" IN ('advertisements.manage', 'advertisements.settings.manage') THEN 'admin.advert.manage'
            ELSE NULL
        END
)
INSERT INTO "admin_role_permissions" (
    "id",
    "role",
    "permission",
    "enabled",
    "created_at",
    "updated_at"
)
SELECT
    gen_random_uuid(),
    "role",
    "permission",
    "enabled",
    NOW(),
    NOW()
FROM mapped_existing
WHERE "permission" IS NOT NULL
ON CONFLICT ("role", "permission")
DO UPDATE SET
    "enabled" = EXCLUDED."enabled",
    "updated_at" = NOW();

DELETE FROM "admin_role_permissions"
WHERE "permission" IN (
    'advertisements.view',
    'advertisements.manage',
    'advertisements.settings.manage'
);

INSERT INTO "admin_role_permissions" (
    "id",
    "role",
    "permission",
    "enabled",
    "created_at",
    "updated_at"
)
VALUES
    (gen_random_uuid(), 'SUPER_ADMIN', 'admin.advert.view', true, NOW(), NOW()),
    (gen_random_uuid(), 'SUPER_ADMIN', 'admin.advert.manage', true, NOW(), NOW()),
    (gen_random_uuid(), 'ADMIN', 'admin.advert.view', true, NOW(), NOW()),
    (gen_random_uuid(), 'ADMIN', 'admin.advert.manage', true, NOW(), NOW()),
    (gen_random_uuid(), 'ANALYST', 'admin.advert.view', true, NOW(), NOW())
ON CONFLICT ("role", "permission")
DO UPDATE SET
    "enabled" = EXCLUDED."enabled",
    "updated_at" = NOW();

COMMIT;
