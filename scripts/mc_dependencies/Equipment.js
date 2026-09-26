import { EntityComponentTypes, EquipmentSlot, } from "@minecraft/server";
const providers = new Set();
let itemFactory;
export function registerEquipmentSourceProvider(provider) {
    providers.add(provider);
    return () => providers.delete(provider);
}
export function* getEquipmentSources() {
    for (const provider of providers)
        yield* provider.values();
}
export function removeEquipmentSource(entityId) {
    for (const provider of providers)
        provider.remove?.(entityId);
}
export function registerItemFactory(factory) {
    itemFactory = factory;
}
export function createRegisteredItem(id, amount) {
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
export function getNativeEquipment(entity) {
    const equippable = entity.getComponent(EntityComponentTypes.Equippable);
    if (!equippable)
        return [];
    return slots.flatMap((slot) => {
        const item = equippable.getEquipment(slot);
        return item ? [{ slot, item }] : [];
    });
}
export function setNativeEquipment(entity, slot, item) {
    const equippable = entity.getComponent(EntityComponentTypes.Equippable);
    equippable?.setEquipment(slot, item);
}
export function getNativeStoredItems(entity) {
    const container = entity.getComponent(EntityComponentTypes.Inventory)?.container;
    if (!container)
        return [];
    const items = [];
    for (let slot = 0; slot < container.size; slot++) {
        const item = container.getItem(slot);
        if (item)
            items.push({ item, update: (next) => container.setItem(slot, next) });
    }
    return items;
}
