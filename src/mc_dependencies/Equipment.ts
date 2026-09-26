import {
    Entity,
    EntityComponentTypes,
    EntityEquippableComponent,
    EquipmentSlot,
    ItemStack,
} from "@minecraft/server";
import type { ComponentHost } from "mc_dependencies/components/Host";

export type EquippedItem = { slot: import("@minecraft/server").EquipmentSlot; item: ItemStack };
export type StoredItem = { item: ItemStack; update(item: ItemStack): void };

export interface ItemStatHost extends ComponentHost {
    clearRuntimeStats(sourcePrefix: string): unknown;
    addRuntimeStat(source: string, target: string, value: number): unknown;
    clampHealth(): unknown;
    applyHealth(): unknown;
}

export interface EquipmentSource {
    readonly id: string;
    readonly host: ItemStatHost;
    getEquippedItems(): EquippedItem[];
    getStoredItems(): StoredItem[];
    setEquippedItem(slot: import("@minecraft/server").EquipmentSlot, item: ItemStack): void;
}

export interface EquipmentSourceProvider {
    values(): Iterable<EquipmentSource>;
    remove?(entityId: string): void;
}

const providers = new Set<EquipmentSourceProvider>();
let itemFactory: ((id: string, amount?: number) => ItemStack | undefined) | undefined;

export function registerEquipmentSourceProvider(provider: EquipmentSourceProvider): () => void {
    providers.add(provider);
    return () => providers.delete(provider);
}

export function* getEquipmentSources(): IterableIterator<EquipmentSource> {
    for (const provider of providers) yield* provider.values();
}

export function removeEquipmentSource(entityId: string): void {
    for (const provider of providers) provider.remove?.(entityId);
}

export function registerItemFactory(factory: typeof itemFactory): void {
    itemFactory = factory;
}

export function createRegisteredItem(id: string, amount?: number): ItemStack | undefined {
    return itemFactory?.(id, amount);
}

const slots = [
    EquipmentSlot.Mainhand,
    EquipmentSlot.Offhand,
    EquipmentSlot.Head,
    EquipmentSlot.Chest,
    EquipmentSlot.Legs,
    EquipmentSlot.Feet,
];

export function getNativeEquipment(entity: Entity): EquippedItem[] {
    const equippable = entity.getComponent(EntityComponentTypes.Equippable) as EntityEquippableComponent | undefined;
    if (!equippable) return [];
    return slots.flatMap((slot) => {
        const item = equippable.getEquipment(slot);
        return item ? [{ slot, item }] : [];
    });
}

export function setNativeEquipment(entity: Entity, slot: EquipmentSlot, item: ItemStack): void {
    const equippable = entity.getComponent(EntityComponentTypes.Equippable) as EntityEquippableComponent | undefined;
    equippable?.setEquipment(slot, item);
}

export function getNativeStoredItems(entity: Entity): StoredItem[] {
    const container = entity.getComponent(EntityComponentTypes.Inventory)?.container;
    if (!container) return [];
    const items: StoredItem[] = [];
    for (let slot = 0; slot < container.size; slot++) {
        const item = container.getItem(slot);
        if (item) items.push({ item, update: (next) => container.setItem(slot, next) });
    }
    return items;
}
