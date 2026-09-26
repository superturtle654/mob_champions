const providers = new Set();
export function registerActorProvider(provider) {
    providers.add(provider);
    return () => providers.delete(provider);
}
export function getRuntimeActor(entity, attach = false) {
    if (!entity)
        return undefined;
    for (const provider of providers) {
        const actor = provider.get(entity) ?? (attach ? provider.attach?.(entity) : undefined);
        if (actor)
            return actor;
    }
    return undefined;
}
export function hasSavedActorState(entity) {
    for (const provider of providers) {
        if (provider.hasSavedState?.(entity))
            return true;
    }
    return false;
}
export function* runtimeActors() {
    for (const provider of providers)
        yield* provider.values();
}
