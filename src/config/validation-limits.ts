function readPositiveInt(name: string, fallback: number): number {
    const raw = process.env[name];
    const parsed = Number(raw);

    if (!Number.isInteger(parsed) || parsed <= 0) {
        return fallback;
    }

    return parsed;
}

const usernameMinRaw = readPositiveInt("PROFILE_USERNAME_MIN", 3);
const usernameMaxRaw = readPositiveInt("PROFILE_USERNAME_MAX", 24);

const usernameMin = Math.min(usernameMinRaw, usernameMaxRaw);
const usernameMax = Math.max(usernameMinRaw, usernameMaxRaw);

export const validationLimits = {
    displayNameMax: readPositiveInt("PROFILE_DISPLAY_NAME_MAX", 80),
    usernameMin,
    usernameMax,
    bioMax: readPositiveInt("PROFILE_BIO_MAX", 300),
    locationMax: readPositiveInt("PROFILE_LOCATION_MAX", 120),
    birthdateMax: readPositiveInt("PROFILE_BIRTHDATE_MAX", 10),
    websiteMax: readPositiveInt("PROFILE_WEBSITE_MAX", 300),
    instagramMax: readPositiveInt("PROFILE_INSTAGRAM_MAX", 300),
    youtubeMax: readPositiveInt("PROFILE_YOUTUBE_MAX", 300),
    wifwUsernameMax: readPositiveInt("PROFILE_WIFW_USERNAME_MAX", 80),

    scheduleTitleMax: readPositiveInt("SCHEDULE_TITLE_MAX", 120),
    scheduleDescriptionMax: readPositiveInt("SCHEDULE_DESCRIPTION_MAX", 500),
    scheduleTimezoneMax: readPositiveInt("SCHEDULE_TIMEZONE_MAX", 64),
};

export type ValidationLimits = typeof validationLimits;