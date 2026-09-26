import { Entity } from "@minecraft/server";
import { ManagedEntity } from "mc_mob/ManagedEntity";
import { subscribe, unsubscribeAll } from "mc_dependencies/events/index";
import { ComponentRegistry } from "mc_mob/components/Registry";
import { EntityDefinition } from "mc_mob/Definition";
import { assertDamageComponentAccess } from "mc_mob/Combat";

export type EntityProfileMap = Record<string, Omit<EntityDefinition, "id">>;

export function defineEntityProfile<const Definition extends EntityDefinition>(definition: Definition) {
    const spawnRules = definition.components.spawnRules;
    if (spawnRules && (
        !Number.isFinite(spawnRules.chance)
        || spawnRules.chance < 0
        || spawnRules.chance > 100
    )) {
        throw new RangeError(
            `Entity profile "${definition.id}" spawnRules.chance must be between 0 and 100.`,
        );
    }
    if (definition.components.damage && Object.keys(definition.components.damage).length > 0) {
        assertDamageComponentAccess(definition.type);
    }

    class DefinedEntity extends ManagedEntity {
        public static readonly typeId = definition.type;
        public static readonly profileId = definition.id;
        public static readonly definition = definition;
        constructor(entity: Entity) {
            if (entity.typeId !== definition.type) {
                throw new TypeError(
                    `Entity profile "${definition.id}" requires "${definition.type}", received "${entity.typeId}".`
                );
            }
            super(entity, ComponentRegistry.create(definition.components, {
                profileId: definition.id,
                typeId: definition.type,
            }));

            if (definition.events?.hurt) {
                subscribe(entity, "entityHurt", (_hurt, attacker, damage) => {
                    definition.events?.hurt?.(this, attacker, damage);
                });
            }
            if (definition.events?.healthChange) {
                subscribe(entity, "entityHealthChange", (_entity, oldHealth, newHealth) => {
                    definition.events?.healthChange?.(this, oldHealth, newHealth);
                });
            }
            subscribe(entity, "entityDie", (_dead, killer) => {
                definition.events?.die?.(this, killer);
                unsubscribeAll(entity);
            });
        }

        protected onSpawn(): void {
            definition.events?.spawn?.(this);
        }
    }

    Object.defineProperty(DefinedEntity, "name", { value: definition.id });
    return DefinedEntity;
}

export function defineEntityProfiles<const Definitions extends EntityProfileMap>(
    definitions: Definitions,
): { [Id in keyof Definitions]: ReturnType<typeof defineEntityProfile> } {
    const profiles = {} as { [Id in keyof Definitions]: ReturnType<typeof defineEntityProfile> };
    for (const id of Object.keys(definitions) as Array<keyof Definitions>) {
        profiles[id] = defineEntityProfile({
            ...definitions[id],
            id: String(id),
        });
    }
    return profiles;
}
