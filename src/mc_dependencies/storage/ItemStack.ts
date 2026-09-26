import { ItemStack, Vector3 } from "@minecraft/server";

export type ItemDynamicValue = boolean | number | string | Vector3;

export type ItemSerializationLimits = {
    maxLoreLines: number;
    maxLoreLineLength: number;
    maxDynamicProperties: number;
};

export type StoredItemStack = {
    t: string;
    a: number;
    n?: string;
    l?: string[];
    d?: Record<string, ItemDynamicValue>;
};

export type SerializedItemStack = {
    __mclType: "ItemStack";
    v: 1;
    item: StoredItemStack;
};

export const DEFAULT_ITEM_LIMITS: ItemSerializationLimits = {
    maxLoreLines: 20,
    maxLoreLineLength: 256,
    maxDynamicProperties: 16,
};

const DATABASE_ITEM_LIMITS: ItemSerializationLimits = {
    maxLoreLines: Number.MAX_SAFE_INTEGER,
    maxLoreLineLength: Number.MAX_SAFE_INTEGER,
    maxDynamicProperties: Number.MAX_SAFE_INTEGER,
};

export function isItemStack(value: unknown): value is ItemStack {
    return value instanceof ItemStack;
}

export function serializeItemStack(
    item: ItemStack,
    limits: ItemSerializationLimits = DEFAULT_ITEM_LIMITS
): StoredItemStack {
    const stored: StoredItemStack = { t: item.typeId, a: item.amount };
    if (item.nameTag !== undefined) stored.n = item.nameTag;

    const lore = item.getLore()
        .slice(0, limits.maxLoreLines)
        .map((line) => line.slice(0, limits.maxLoreLineLength));
    if (lore.length) stored.l = lore;

    const dynamicProperties: Record<string, ItemDynamicValue> = {};
    for (const id of item.getDynamicPropertyIds().slice(0, limits.maxDynamicProperties)) {
        const value = item.getDynamicProperty(id);
        if (value !== undefined) dynamicProperties[id] = value;
    }
    if (Object.keys(dynamicProperties).length) stored.d = dynamicProperties;

    return stored;
}

export function deserializeItemStack(stored: StoredItemStack): ItemStack {
    const item = new ItemStack(stored.t, stored.a);
    if (stored.n !== undefined) item.nameTag = stored.n;
    if (stored.l?.length) item.setLore(stored.l);
    for (const [id, value] of Object.entries(stored.d ?? {})) {
        item.setDynamicProperty(id, value);
    }
    return item;
}

export function cloneItemStack(source: ItemStack, amount = source.amount): ItemStack {
    return deserializeItemStack({ ...serializeItemStack(source), a: amount });
}

export function serializeDatabaseItem(item: ItemStack): SerializedItemStack {
    return {
        __mclType: "ItemStack",
        v: 1,
        item: serializeItemStack(item, DATABASE_ITEM_LIMITS),
    };
}

export function isSerializedItemStack(value: unknown): value is SerializedItemStack {
    if (!value || typeof value !== "object") return false;
    const serialized = value as Partial<SerializedItemStack>;
    return serialized.__mclType === "ItemStack"
        && serialized.v === 1
        && typeof serialized.item?.t === "string"
        && typeof serialized.item?.a === "number";
}
