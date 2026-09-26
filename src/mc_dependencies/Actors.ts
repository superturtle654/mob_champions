import type { Entity } from "@minecraft/server";
import type { HealthState } from "mc_dependencies/components/Actor";
import type { DamagePacket } from "mc_dependencies/components/Component";

export interface RuntimeActor {
    readonly nativeEntity: Entity;
    getDamagePacket(): DamagePacket | undefined;
    calculateDamage(packet: DamagePacket): number;
    getCurrentHealth(): number | undefined;
    getMaxHealth(): number | undefined;
    getNativeCurrentHealth(): number | undefined;
    getNativeDamage(damage: number): number;
    isFatalDamage(damage: number): boolean;
    applyDamagePacket(packet: DamagePacket): void;
    applyDamage(damage: number): void;
    getHealthState(): HealthState[];
    getRegeneration(): number;
    getRegenerationTime(): number;
    heal(amount: number): void;
    handleDeath?(killer?: Entity | null): void;
}

export interface ActorProvider {
    get(entity: Entity): RuntimeActor | undefined;
    attach?(entity: Entity): RuntimeActor | undefined;
    hasSavedState?(entity: Entity): boolean;
    values(): Iterable<RuntimeActor>;
}

const providers = new Set<ActorProvider>();

export function registerActorProvider(provider: ActorProvider): () => void {
    providers.add(provider);
    return () => providers.delete(provider);
}

export function getRuntimeActor(entity?: Entity, attach = false): RuntimeActor | undefined {
    if (!entity) return undefined;
    for (const provider of providers) {
        const actor = provider.get(entity) ?? (attach ? provider.attach?.(entity) : undefined);
        if (actor) return actor;
    }
    return undefined;
}

export function hasSavedActorState(entity: Entity): boolean {
    for (const provider of providers) {
        if (provider.hasSavedState?.(entity)) return true;
    }
    return false;
}

export function* runtimeActors(): IterableIterator<RuntimeActor> {
    for (const provider of providers) yield* provider.values();
}
