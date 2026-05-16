UPDATE "advertisement_settings"
SET
    "rules" = CASE
        WHEN "rules" @> ARRAY[
            'Contact must happen through SparkzLive DMs once available. External contact links/contact info are not allowed in advertisements.'
        ]::TEXT[]
        THEN array_remove(
            "rules",
            'External links and contact info are allowed, but they must be relevant to the service.'
        )
        ELSE array_append(
            array_remove(
                "rules",
                'External links and contact info are allowed, but they must be relevant to the service.'
            ),
            'Contact must happen through SparkzLive DMs once available. External contact links/contact info are not allowed in advertisements.'
        )
    END,
    "updated_at" = NOW()
WHERE "id" = 'default';