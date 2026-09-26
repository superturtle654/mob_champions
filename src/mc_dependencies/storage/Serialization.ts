import { world } from "@minecraft/server";
import {
    deserializeItemStack,
    isItemStack,
    isSerializedItemStack,
    serializeDatabaseItem,
} from "mc_dependencies/storage/ItemStack";

export function jsonReplacer(_key: string, value: any): any {
    if (isItemStack(value)) return serializeDatabaseItem(value);
    if (value instanceof Map) {
        return { __mclType: "Map", entries: [...value.entries()] };
    }
    if (isEntityReference(value)) {
        return { __mclType: "Entity", id: value.id };
    }
    return value;
}

export function jsonReviver(_key: string, value: any): any {
    if (isSerializedItemStack(value)) return deserializeItemStack(value.item);
    if (value?.__mclType === "Map" && Array.isArray(value.entries)) return new Map(value.entries);
    if (value?.__mclType === "Entity") {
        if (typeof value.id !== "string") return null;
        try {
            return world.getEntity(value.id) ?? null;
        } catch {
            return null;
        }
    }
    return value;
}

function isEntityReference(value: any): value is { id: string; typeId: string } {
    return value != null
        && typeof value === "object"
        && typeof value.id === "string"
        && typeof value.typeId === "string"
        && typeof value.isValid === "boolean"
        && value.dimension != null
        && typeof value.dimension === "object"
        && value.location != null
        && typeof value.location === "object";
}
