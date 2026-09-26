const profiles = new Map();
export const EntityRegistry = {
    register(constructor) {
        if (profiles.has(constructor.profileId)) {
            throw new Error(`Entity profile "${constructor.profileId}" is already registered.`);
        }
        profiles.set(constructor.profileId, constructor);
        return constructor;
    },
    get(profileId) {
        return profiles.get(profileId);
    },
    has(profileId) {
        return profiles.has(profileId);
    },
    values() {
        return profiles.values();
    },
};
