import { Entity } from "@minecraft/server";
import { ManagedEntity } from "mc_mob/ManagedEntity";
import type { EntityDefinition } from "mc_mob/Definition";

export type EntityConstructor<T extends ManagedEntity = ManagedEntity> = {
    new(entity: Entity): T;
    typeId: string;
    profileId: string;
    definition: EntityDefinition;
};

const profiles = new Map<string, EntityConstructor>();

export const EntityRegistry = {
    register<T extends ManagedEntity>(constructor: EntityConstructor<T>): EntityConstructor<T> {
        if (profiles.has(constructor.profileId)) {
            throw new Error(`Entity profile "${constructor.profileId}" is already registered.`);
        }
        profiles.set(constructor.profileId, constructor);
        return constructor;
    },

    get(profileId: string): EntityConstructor | undefined {
        return profiles.get(profileId);
    },

    has(profileId: string): boolean {
        return profiles.has(profileId);
    },

    values(): IterableIterator<EntityConstructor> {
        return profiles.values();
    },
};
