CREATE TABLE "user_favorites" (
    "user_id" UUID NOT NULL,
    "favorite_user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_favorites_pkey" PRIMARY KEY ("user_id","favorite_user_id"),
    CONSTRAINT "user_favorites_no_self_favorite_check" CHECK ("user_id" <> "favorite_user_id")
);

CREATE INDEX "user_favorites_user_id_created_at_idx"
ON "user_favorites"("user_id", "created_at");

CREATE INDEX "user_favorites_favorite_user_id_created_at_idx"
ON "user_favorites"("favorite_user_id", "created_at");

ALTER TABLE "user_favorites"
ADD CONSTRAINT "user_favorites_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_favorites"
ADD CONSTRAINT "user_favorites_favorite_user_id_fkey"
FOREIGN KEY ("favorite_user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;