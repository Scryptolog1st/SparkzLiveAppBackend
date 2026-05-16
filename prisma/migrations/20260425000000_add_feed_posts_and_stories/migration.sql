CREATE TABLE IF NOT EXISTS "feed_posts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "image_url" VARCHAR(1000) NOT NULL,
    "caption" VARCHAR(500),
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feed_posts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "story_posts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "media_url" VARCHAR(1000) NOT NULL,
    "caption" VARCHAR(500),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "story_posts_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'feed_posts'
          AND column_name = 'expires_at'
    ) THEN
        INSERT INTO "story_posts" (
            "id",
            "user_id",
            "media_url",
            "caption",
            "expires_at",
            "deleted_at",
            "created_at",
            "updated_at"
        )
        SELECT
            "id",
            "user_id",
            "image_url",
            "caption",
            "expires_at",
            "deleted_at",
            "created_at",
            "updated_at"
        FROM "feed_posts"
        ON CONFLICT ("id") DO NOTHING;

        DELETE FROM "feed_posts";

        DROP INDEX IF EXISTS "feed_posts_expires_at_deleted_at_created_at_idx";

        ALTER TABLE "feed_posts"
        DROP COLUMN IF EXISTS "expires_at";
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS "feed_post_likes" (
    "post_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feed_post_likes_pkey" PRIMARY KEY ("post_id","user_id")
);

CREATE TABLE IF NOT EXISTS "feed_post_comments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "post_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "text" VARCHAR(500) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feed_post_comments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "feed_posts_deleted_at_created_at_idx"
ON "feed_posts"("deleted_at", "created_at");

CREATE INDEX IF NOT EXISTS "feed_posts_user_id_created_at_idx"
ON "feed_posts"("user_id", "created_at");

CREATE INDEX IF NOT EXISTS "feed_post_likes_user_id_created_at_idx"
ON "feed_post_likes"("user_id", "created_at");

CREATE INDEX IF NOT EXISTS "feed_post_likes_post_id_created_at_idx"
ON "feed_post_likes"("post_id", "created_at");

CREATE INDEX IF NOT EXISTS "feed_post_comments_post_id_deleted_at_created_at_idx"
ON "feed_post_comments"("post_id", "deleted_at", "created_at");

CREATE INDEX IF NOT EXISTS "feed_post_comments_user_id_created_at_idx"
ON "feed_post_comments"("user_id", "created_at");

CREATE INDEX IF NOT EXISTS "story_posts_expires_at_deleted_at_created_at_idx"
ON "story_posts"("expires_at", "deleted_at", "created_at");

CREATE INDEX IF NOT EXISTS "story_posts_user_id_created_at_idx"
ON "story_posts"("user_id", "created_at");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'feed_posts_user_id_fkey'
    ) THEN
        ALTER TABLE "feed_posts"
        ADD CONSTRAINT "feed_posts_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "users"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'feed_post_likes_post_id_fkey'
    ) THEN
        ALTER TABLE "feed_post_likes"
        ADD CONSTRAINT "feed_post_likes_post_id_fkey"
        FOREIGN KEY ("post_id") REFERENCES "feed_posts"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'feed_post_likes_user_id_fkey'
    ) THEN
        ALTER TABLE "feed_post_likes"
        ADD CONSTRAINT "feed_post_likes_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "users"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'feed_post_comments_post_id_fkey'
    ) THEN
        ALTER TABLE "feed_post_comments"
        ADD CONSTRAINT "feed_post_comments_post_id_fkey"
        FOREIGN KEY ("post_id") REFERENCES "feed_posts"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'feed_post_comments_user_id_fkey'
    ) THEN
        ALTER TABLE "feed_post_comments"
        ADD CONSTRAINT "feed_post_comments_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "users"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'story_posts_user_id_fkey'
    ) THEN
        ALTER TABLE "story_posts"
        ADD CONSTRAINT "story_posts_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "users"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;