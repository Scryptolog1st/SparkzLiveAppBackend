CREATE TABLE "feed_posts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "image_url" VARCHAR(1000) NOT NULL,
    "caption" VARCHAR(500),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feed_posts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "feed_posts_expires_at_deleted_at_created_at_idx"
ON "feed_posts"("expires_at", "deleted_at", "created_at");

CREATE INDEX "feed_posts_user_id_created_at_idx"
ON "feed_posts"("user_id", "created_at");

ALTER TABLE "feed_posts"
ADD CONSTRAINT "feed_posts_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;