import { ComponentActor } from "../mc_dependencies/components/Actor.js";
import { EntityStore } from "./storage/index.js";
import { publish } from "../mc_dependencies/events/index.js";
export class ManagedEntity extends ComponentActor {
    constructor(entity, initialComponents = []) {
        super(entity, initialComponents);
    }
    get entity() {
        return this.nativeEntity;
    }
    set entity(entity) {
        this.replaceNativeEntity(entity);
    }
    static spawn(dimension, location, ProfileType) {
        let spawnedEntity;
        try {
            spawnedEntity = dimension.spawnEntity(ProfileType.typeId, location);
        }
        catch (error) {
            console.error(`[ManagedEntity.spawn:${ProfileType.typeId}]`, error);
            return null;
        }
        return ManagedEntity.attach(spawnedEntity, ProfileType);
    }
    static attach(entity, ProfileType) {
        const existing = EntityStore.get(entity.id);
        if (existing)
            return existing;
        if (entity.typeId !== ProfileType.typeId) {
            console.error(`[ManagedEntity.attach:${ProfileType.profileId}] Expected ${ProfileType.typeId}, received ${entity.typeId}.`);
            return null;
        }
        try {
            const instance = new ProfileType(entity);
            instance.entity.setDynamicProperty("mcl:cant_stack", true);
            instance.applyHealth();
            instance.onComponentsSpawn();
            instance.onSpawn();
            instance.flushComponents();
            EntityStore.set(instance);
            return instance;
        }
        catch (error) {
            console.error(`[ManagedEntity.attach:${ProfileType.profileId}]`, error);
            return null;
        }
    }
    handleDeath(killer) {
        for (const component of this.componentList)
            component.onDeath(killer);
    }
    toJSON() {
        return {
            v: 2,
            entityId: this.entity.id,
            components: this.getSerializableComponents(),
        };
    }
    onHealthChanged(oldHealth, newHealth) {
        publish(this.entity, "entityHealthChange", this.entity, oldHealth, newHealth);
    }
    onSpawn() { }
}
