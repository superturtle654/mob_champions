import { Dimension, Entity, Vector3 } from "@minecraft/server";
import { ComponentActor } from "mc_dependencies/components/Actor";
import { Component } from "mc_dependencies/components/Component";
import { EntityStore } from "mc_mob/storage/index";
import { publish } from "mc_dependencies/events/index";

export abstract class ManagedEntity extends ComponentActor<Entity> {
    public static readonly typeId: string;
    public static readonly profileId: string;

    protected constructor(entity: Entity, initialComponents: Component<any, Entity>[] = []) {
        super(entity, initialComponents);
    }

    public get entity(): Entity {
        return this.nativeEntity;
    }

    public set entity(entity: Entity) {
        this.replaceNativeEntity(entity);
    }

    public static spawn<T extends ManagedEntity>(
        dimension: Dimension,
        location: Vector3,
        ProfileType: { new(entity: Entity): T; typeId: string; profileId: string }
    ): T | null {
        let spawnedEntity: Entity;
        try {
            spawnedEntity = dimension.spawnEntity(ProfileType.typeId, location);
        } catch (error) {
            console.error(`[ManagedEntity.spawn:${ProfileType.typeId}]`, error);
            return null;
        }

        return ManagedEntity.attach(spawnedEntity, ProfileType);
    }

    public static attach<T extends ManagedEntity>(
        entity: Entity,
        ProfileType: { new(entity: Entity): T; typeId: string; profileId: string }
    ): T | null {
        const existing = EntityStore.get(entity.id);
        if (existing) return existing as T;
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
        } catch (error) {
            console.error(`[ManagedEntity.attach:${ProfileType.profileId}]`, error);
            return null;
        }
    }

    public handleDeath(killer?: Entity | null): void {
        for (const component of this.componentList) component.onDeath(killer);
    }

    public toJSON() {
        return {
            v: 2,
            entityId: this.entity.id,
            components: this.getSerializableComponents(),
        };
    }

    protected onHealthChanged(oldHealth: number, newHealth: number): void {
        publish(this.entity as object, "entityHealthChange", this.entity, oldHealth, newHealth);
    }

    protected onSpawn(): void {}
}
