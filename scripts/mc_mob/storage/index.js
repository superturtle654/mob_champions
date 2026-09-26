import { system, world } from "@minecraft/server";
import { EntityRegistry } from "../Registry.js";
import { Database, defineSchema, isRecord } from "../../mc_dependencies/storage/Database.js";
import { jsonReplacer } from "../../mc_dependencies/storage/Serialization.js";
const EntitySchema = defineSchema({
    key: "mcl:entity",
    create: () => {
        throw new Error("Entity state requires a profile and entity ID.");
    },
    validate: isSavedEntity,
});
const EntityIdsSchema = defineSchema({
    key: "entityIds",
    create: () => [],
    validate: (value) => Array.isArray(value) && value.every((id) => typeof id === "string"),
});
const entities = new Map();
const persistentEntityIds = new Set();
const savedEntityJson = new Map();
let savedEntityIdsJson = "";
let entityIndexLoaded = false;
export function saveEntityIdsIfChanged() {
    if (!entityIndexLoaded)
        return;
    const ids = [...persistentEntityIds];
    const json = JSON.stringify(ids);
    if (json === savedEntityIdsJson)
        return;
    savedEntityIdsJson = json;
    Database.world.write(EntityIdsSchema, ids);
}
export const EntityStore = {
    get(id) {
        return entities.get(id);
    },
    values() {
        return entities.values();
    },
    set(entity) {
        entities.set(entity.entity.id, entity);
        persistentEntityIds.add(entity.entity.id);
        saveEntityIdsIfChanged();
        saveEntity(entity);
    },
    replaceId(oldId, entity) {
        entities.delete(oldId);
        savedEntityJson.delete(oldId);
        entities.set(entity.entity.id, entity);
        persistentEntityIds.delete(oldId);
        persistentEntityIds.add(entity.entity.id);
        saveEntityIdsIfChanged();
        saveEntity(entity);
    },
    delete(id) {
        savedEntityJson.delete(id);
        const deleted = entities.delete(id) || persistentEntityIds.has(id);
        persistentEntityIds.delete(id);
        if (deleted)
            saveEntityIdsIfChanged();
        return deleted;
    },
    unload(id) {
        savedEntityJson.delete(id);
        return entities.delete(id);
    },
    restore(entity) {
        return restoreEntity(entity);
    },
    hasSavedState(entity) {
        return typeof entity.getDynamicProperty(EntitySchema.key) === "string";
    },
    saveEntityIdsIfChanged,
};
system.runTimeout(() => {
    const loadedEntityIds = Database.world.read(EntityIdsSchema);
    for (const id of loadedEntityIds ?? [])
        persistentEntityIds.add(id);
    savedEntityIdsJson = JSON.stringify(loadedEntityIds ?? []);
    entityIndexLoaded = true;
    saveEntityIdsIfChanged();
    for (const id of loadedEntityIds ?? []) {
        const entity = world.getEntity(id);
        if (entity)
            restoreEntity(entity);
    }
});
system.runInterval(() => {
    for (const [id, customEntity] of entities) {
        if (!customEntity.entity?.isValid) {
            entities.delete(id);
            savedEntityJson.delete(id);
            continue;
        }
        saveEntity(customEntity);
    }
}, 20);
function reviveEntity(saved, fallbackEntity) {
    try {
        const Profile = EntityRegistry.get(saved.profileId);
        if (!Profile)
            return null;
        const entity = world.getEntity(saved.entityId) ?? fallbackEntity;
        if (entities.has(entity.id))
            return entities.get(entity.id);
        const instance = new Profile(entity);
        instance.hydrateComponents(saved.components);
        instance.initializeComponents();
        instance.applyHealth();
        instance.flushComponents();
        return instance;
    }
    catch (error) {
        console.error("[EntityStore.revive]", error);
        return null;
    }
}
function restoreEntity(entity) {
    const existing = entities.get(entity.id);
    if (existing)
        return existing;
    const saved = new Database(entity).read(EntitySchema);
    if (!saved)
        return undefined;
    const revived = reviveEntity(saved, entity);
    if (!revived)
        return undefined;
    entities.set(entity.id, revived);
    persistentEntityIds.add(entity.id);
    savedEntityJson.set(entity.id, JSON.stringify(saved, jsonReplacer));
    saveEntityIdsIfChanged();
    return revived;
}
function getProfileId(instance) {
    return instance.constructor.profileId;
}
function saveEntity(customEntity) {
    if (!customEntity.entity?.isValid)
        return;
    const id = customEntity.entity.id;
    if (savedEntityJson.has(id) && !customEntity.hasDirtyComponents())
        return;
    const state = customEntity.toJSON();
    const saved = {
        v: 1,
        profileId: getProfileId(customEntity),
        entityId: id,
        components: state.components.map((component) => component.toJSON()),
    };
    const raw = JSON.stringify(saved, jsonReplacer);
    if (savedEntityJson.get(id) === raw)
        return;
    new Database(customEntity.entity).write(EntitySchema, saved);
    savedEntityJson.set(id, raw);
    customEntity.flushComponents();
}
function isSavedEntity(value) {
    if (!isRecord(value))
        return false;
    return value.v === 1
        && typeof value.profileId === "string"
        && typeof value.entityId === "string"
        && Array.isArray(value.components);
}
