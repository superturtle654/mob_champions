import { ItemStack } from "@minecraft/server";
export const DEFAULT_ITEM_LIMITS = {
    maxLoreLines: 20,
    maxLoreLineLength: 256,
    maxDynamicProperties: 16,
};
const DATABASE_ITEM_LIMITS = {
    maxLoreLines: Number.MAX_SAFE_INTEGER,
    maxLoreLineLength: Number.MAX_SAFE_INTEGER,
    maxDynamicProperties: Number.MAX_SAFE_INTEGER,
};
export function isItemStack(value) {
    return value instanceof ItemStack;
}
export function serializeItemStack(item, limits = DEFAULT_ITEM_LIMITS) {
    const stored = { t: item.typeId, a: item.amount };
    if (item.nameTag !== undefined)
        stored.n = item.nameTag;
    const lore = item.getLore()
        .slice(0, limits.maxLoreLines)
        .map((line) => line.slice(0, limits.maxLoreLineLength));
    if (lore.length)
        stored.l = lore;
    const dynamicProperties = {};
    for (const id of item.getDynamicPropertyIds().slice(0, limits.maxDynamicProperties)) {
        const value = item.getDynamicProperty(id);
        if (value !== undefined)
            dynamicProperties[id] = value;
    }
    if (Object.keys(dynamicProperties).length)
        stored.d = dynamicProperties;
    return stored;
}
export function deserializeItemStack(stored) {
    const item = new ItemStack(stored.t, stored.a);
    if (stored.n !== undefined)
        item.nameTag = stored.n;
    if (stored.l?.length)
        item.setLore(stored.l);
    for (const [id, value] of Object.entries(stored.d ?? {})) {
        item.setDynamicProperty(id, value);
    }
    return item;
}
export function cloneItemStack(source, amount = source.amount) {
    return deserializeItemStack({ ...serializeItemStack(source), a: amount });
}
export function serializeDatabaseItem(item) {
    return {
        __mclType: "ItemStack",
        v: 1,
        item: serializeItemStack(item, DATABASE_ITEM_LIMITS),
    };
}
export function isSerializedItemStack(value) {
    if (!value || typeof value !== "object")
        return false;
    const serialized = value;
    return serialized.__mclType === "ItemStack"
        && serialized.v === 1
        && typeof serialized.item?.t === "string"
        && typeof serialized.item?.a === "number";
}
