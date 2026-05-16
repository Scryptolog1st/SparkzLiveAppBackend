WITH ranked_media AS (
    SELECT
        id,
        revision_id,
        media_type,
        ROW_NUMBER() OVER (
            PARTITION BY revision_id
            ORDER BY
                CASE WHEN media_type = 'IMAGE' THEN 0 ELSE 1 END,
                sort_order ASC,
                created_at ASC
        ) - 1 AS next_sort_order,
        ROW_NUMBER() OVER (
            PARTITION BY revision_id
            ORDER BY
                CASE WHEN media_type = 'IMAGE' THEN 0 ELSE 1 END,
                sort_order ASC,
                created_at ASC
        ) AS next_rank
    FROM advertisement_media
)
UPDATE advertisement_media AS media
SET
    sort_order = ranked_media.next_sort_order,
    is_cover = ranked_media.next_rank = 1 AND ranked_media.media_type = 'IMAGE'
FROM ranked_media
WHERE media.id = ranked_media.id;
