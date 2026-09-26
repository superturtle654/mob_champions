import { ManagedEntity } from "./ManagedEntity.js";
import { subscribe, unsubscribeAll } from "../mc_dependencies/events/index.js";
import { ComponentRegistry } from "./components/Registry.js";
import { assertDamageComponentAccess } from "./Combat.js";
export function defineEntityProfile(definition) {
    const spawnRules = definition.components.spawnRules;
    if (spawnRules && (!Number.isFinite(spawnRules.chance)
        || spawnRules.chance < 0
        || spawnRules.chance > 100)) {
        throw new RangeError(`Entity profile "${definition.id}" spawnRules.chance must be between 0 and 100.`);
    }
    if (definition.components.damage && Object.keys(definition.components.damage).length > 0) {
        assertDamageComponentAccess(definition.type);
    }
    class DefinedEntity extends ManagedEntity {
        constructor(entity) {
            if (entity.typeId !== definition.type) {
                throw new TypeError(`Entity profile "${definition.id}" requires "${definition.type}", received "${entity.typeId}".`);
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
        onSpawn() {
            definition.events?.spawn?.(this);
        }
    }
    DefinedEntity.typeId = definition.type;
    DefinedEntity.profileId = definition.id;
    DefinedEntity.definition = definition;
    Object.defineProperty(DefinedEntity, "name", { value: definition.id });
    return DefinedEntity;
}
export function defineEntityProfiles(definitions) {
    const profiles = {};
    for (const id of Object.keys(definitions)) {
        profiles[id] = defineEntityProfile({
            ...definitions[id],
            id: String(id),
        });
    }
    return profiles;
}
