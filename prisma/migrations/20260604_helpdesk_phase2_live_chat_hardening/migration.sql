-- Enforce live-chat sender identity consistency at the database layer.
ALTER TABLE "helpdesk_live_chat_messages"
ADD CONSTRAINT "helpdesk_live_chat_messages_sender_identity_chk"
CHECK (
    (
        "sender_type" = 'USER'
        AND "sender_user_id" IS NOT NULL
        AND "sender_admin_user_id" IS NULL
    )
    OR (
        "sender_type" = 'STAFF'
        AND "sender_admin_user_id" IS NOT NULL
        AND "sender_user_id" IS NULL
    )
    OR (
        "sender_type" = 'SYSTEM'
        AND "sender_user_id" IS NULL
        AND "sender_admin_user_id" IS NULL
    )
);
