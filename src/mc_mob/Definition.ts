import { Entity } from "@minecraft/server";
import { ManagedEntity } from "mc_mob/ManagedEntity";
import { ComponentProfileConfig } from "mc_mob/components/Registry";

export type EntityEventHandlers<T extends ManagedEntity = ManagedEntity> = {
    spawn?: (entity: T) => void;
    healthChange?: (entity: T, oldHealth?: number, newHealth?: number) => void;
    hurt?: (entity: T, attacker?: Entity, damage?: number) => void;
    die?: (entity: T, killer?: Entity | null) => void;
};

type EntityDefinitionBase<T extends ManagedEntity> = {
    id: string;
    type: string;
    displayName?: string;
    spawnEgg?: {
        enabled?: boolean;
    };
    events?: EntityEventHandlers<T>;
    components: ComponentProfileConfig;
};

export type EntityDefinition<T extends ManagedEntity = ManagedEntity> = EntityDefinitionBase<T>;
