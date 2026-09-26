import { ComponentIds } from "../../mc_dependencies/components/Component.js";
import { ComponentRegistry as SharedComponentRegistry, } from "../../mc_dependencies/components/Registry.js";
import { DamageComponent } from "./Damage.js";
import { EquipmentComponent } from "./Equipment.js";
import { HealthComponent } from "./Health.js";
import { InventoryComponent } from "./Inventory.js";
import { LevelComponent } from "./Scalar.js";
import { NameTagComponent } from "./NameTag.js";
import { ScalarComponent } from "./Scalar.js";
import { SpawnEntityComponent } from "./SpawnEntity.js";
import { LootableComponent } from "./Lootable.js";
import { SpawnRulesComponent } from "./SpawnRules.js";
export const ComponentRegistry = new SharedComponentRegistry("EntityKit");
ComponentRegistry.register("nameTag", (config) => [new NameTagComponent(config)]);
ComponentRegistry.register("health", (config) => {
    const definitions = config;
    return Object.entries(definitions)
        .map(([id, value]) => new HealthComponent(id, value));
});
ComponentRegistry.register("damage", (config) => Object.entries(config)
    .map(([id, value]) => new DamageComponent(id, value)));
ComponentRegistry.register("level", (config) => [new LevelComponent(config)]);
ComponentRegistry.register("xp", (config) => [new ScalarComponent(ComponentIds.xp, config)]);
ComponentRegistry.register("speed", (config) => [new ScalarComponent(ComponentIds.speed, config)]);
ComponentRegistry.register("equipment", (config) => [new EquipmentComponent(config)]);
ComponentRegistry.register("inventory", (config) => [new InventoryComponent(config)]);
ComponentRegistry.register("lootable", (config) => [new LootableComponent(config)]);
ComponentRegistry.register("spawnEntity", (config, context) => [
    new SpawnEntityComponent(config, context),
]);
ComponentRegistry.register("spawnRules", (config) => [new SpawnRulesComponent(config)]);
