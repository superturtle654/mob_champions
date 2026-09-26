export { MobProfiles } from "mc_mob/entities/index";
export { ManagedEntity } from "mc_mob/ManagedEntity";
export type { HealthState as HealthLayerState } from "mc_dependencies/components/Actor";
export { ComponentIds } from "mc_mob/components/Component";
export type {
    ComponentId,
    ComponentModifier,
    DamagePacket,
    DamageProviderComponent,
    HealthPoolComponent,
    ModifiableComponent,
    ModifierTarget,
    ModOp,
    ObservableComponent,
    ReadableValueComponent,
} from "mc_mob/components/Component";

export { DamageComponent } from "mc_mob/components/Damage";
export type { DamageConfig } from "mc_mob/components/Damage";
export { EquipmentComponent } from "mc_mob/components/Equipment";
export type {
    DefinedEquipmentItemConfig,
    EquipmentConfig,
    EquipmentItemConfig,
} from "mc_mob/components/Equipment";
export { HealthComponent } from "mc_mob/components/Health";
export type { HealthConfig } from "mc_mob/components/Health";
export { InventoryComponent } from "mc_mob/components/Inventory";
export type { InventoryConfig, InventoryItemConfig } from "mc_mob/components/Inventory";
export { SpawnEntityComponent } from "mc_mob/components/SpawnEntity";
export type { SpawnEntityConfig } from "mc_mob/components/SpawnEntity";
export { SpawnRulesComponent, assignSpawnProfile } from "mc_mob/components/SpawnRules";
export type { SpawnRulesConfig } from "mc_mob/components/SpawnRules";
export { LootableComponent, LootTables } from "mc_mob/components/Lootable";
export type { LootableConfig, LootTable, LootEntry, LootContext } from "mc_mob/components/Lootable";
export { LevelComponent, ScalarComponent } from "mc_mob/components/Scalar";
export { NameTagComponent } from "mc_mob/components/NameTag";
export type { NameTagConfig } from "mc_mob/components/NameTag";

export { defineEntityProfiles, defineEntityProfile } from "mc_mob/Profiles";
export type { EntityProfileMap } from "mc_mob/Profiles";
export type {
    EntityDefinition,
    EntityEventHandlers,
} from "mc_mob/Definition";
export { ComponentRegistry } from "mc_mob/components/Registry";
export type { ComponentFactory, ComponentProfileConfig } from "mc_mob/components/Registry";
export { EntityRegistry } from "mc_mob/Registry";
export type { EntityConstructor } from "mc_mob/Registry";
export { EntityStore } from "mc_mob/storage/index";
export {
    AGGRESSIVE_MOBS,
    PASSIVE_MOBS,
    assertDamageComponentAccess,
    canAccessDamageComponent,
    getMobDisposition,
} from "mc_mob/Combat";
export type { MobDisposition } from "mc_mob/Combat";
export {
    createSpawnEgg,
    giveSpawnEgg,
    showSpawnEggMenu,
} from "mc_mob/SpawnEggs";
export {
    cloneItemStack,
    deserializeItemStack,
    serializeItemStack,
} from "mc_dependencies/storage/ItemStack";
