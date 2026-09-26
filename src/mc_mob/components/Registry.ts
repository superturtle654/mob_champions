import { Entity } from "@minecraft/server";
import { ComponentIds } from "mc_dependencies/components/Component";
import {
    ComponentFactory as SharedComponentFactory,
    ComponentRegistry as SharedComponentRegistry,
} from "mc_dependencies/components/Registry";
import { DamageComponent, DamageConfig } from "mc_mob/components/Damage";
import { EquipmentComponent, EquipmentConfig } from "mc_mob/components/Equipment";
import { HealthComponent, HealthConfig } from "mc_mob/components/Health";
import { InventoryComponent, InventoryConfig } from "mc_mob/components/Inventory";
import { LevelComponent } from "mc_mob/components/Scalar";
import { NameTagComponent, NameTagConfig } from "mc_mob/components/NameTag";
import { ScalarComponent } from "mc_mob/components/Scalar";
import { SpawnEntityComponent, SpawnEntityConfig } from "mc_mob/components/SpawnEntity";
import { LootableComponent, LootableConfig } from "mc_mob/components/Lootable";
import { SpawnRulesComponent, SpawnRulesConfig } from "mc_mob/components/SpawnRules";

export interface ComponentProfileConfig {
    nameTag?: NameTagConfig;
    health?: Record<string, HealthConfig | number>;
    damage?: Record<string, DamageConfig | number>;
    level?: number;
    xp?: number;
    speed?: number;
    equipment?: EquipmentConfig;
    inventory?: InventoryConfig;
    lootable?: LootableConfig;
    spawnEntity?: SpawnEntityConfig;
    spawnRules?: SpawnRulesConfig;
}

export type ComponentFactory = SharedComponentFactory<Entity>;
export const ComponentRegistry = new SharedComponentRegistry<Entity>("EntityKit");

ComponentRegistry.register("nameTag", (config) => [new NameTagComponent(config as NameTagConfig)]);
ComponentRegistry.register("health", (config) => {
    const definitions = config as Record<string, HealthConfig | number>;
    return Object.entries(definitions)
        .map(([id, value]) => new HealthComponent(id, value));
});
ComponentRegistry.register("damage", (config) =>
    Object.entries(config as Record<string, DamageConfig | number>)
        .map(([id, value]) => new DamageComponent(id, value))
);
ComponentRegistry.register("level", (config) => [new LevelComponent(config as number)]);
ComponentRegistry.register("xp", (config) => [new ScalarComponent(ComponentIds.xp, config as number)]);
ComponentRegistry.register("speed", (config) => [new ScalarComponent(ComponentIds.speed, config as number)]);
ComponentRegistry.register("equipment", (config) => [new EquipmentComponent(config as EquipmentConfig)]);
ComponentRegistry.register("inventory", (config) => [new InventoryComponent(config as InventoryConfig)]);
ComponentRegistry.register("lootable", (config) => [new LootableComponent(config as LootableConfig)]);
ComponentRegistry.register("spawnEntity", (config, context) => [
    new SpawnEntityComponent(
        config as SpawnEntityConfig,
        context as { profileId: string; typeId: string },
    ),
]);
ComponentRegistry.register("spawnRules", (config) => [new SpawnRulesComponent(config as SpawnRulesConfig)]);
