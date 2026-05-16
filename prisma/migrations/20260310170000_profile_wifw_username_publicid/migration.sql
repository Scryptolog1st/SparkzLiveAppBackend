ALTER TABLE "users" ADD COLUMN "public_id" VARCHAR(13);
ALTER TABLE "users" ADD COLUMN "last_username_change" TIMESTAMP(3);

WITH numbered AS (
  SELECT
    id,
    LPAD((1000000000000 + ROW_NUMBER() OVER (ORDER BY "created_at"))::text, 13, '0') AS new_public_id
  FROM "users"
)
UPDATE "users" u
SET "public_id" = n.new_public_id
FROM numbered n
WHERE u.id = n.id
  AND u."public_id" IS NULL;

ALTER TABLE "users" ALTER COLUMN "public_id" SET NOT NULL;
CREATE UNIQUE INDEX "users_public_id_key" ON "users"("public_id");

ALTER TABLE "profiles" ADD COLUMN "wifw_tmp" JSONB;

UPDATE "profiles"
SET "wifw_tmp" = CASE
  WHEN "wifw" IS NULL OR BTRIM("wifw") = '' THEN NULL
  ELSE (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', NULL,
        'username', trimmed_name
      )
    )
    FROM (
      SELECT BTRIM(value) AS trimmed_name
      FROM regexp_split_to_table("wifw", ',') AS value
    ) split_names
    WHERE trimmed_name <> ''
  )
END;

ALTER TABLE "profiles" DROP COLUMN "wifw";
ALTER TABLE "profiles" RENAME COLUMN "wifw_tmp" TO "wifw";