import { world } from "@minecraft/server";
import { jsonReplacer, jsonReviver } from "./Serialization.js";
export function defineSchema(options) {
    return Object.freeze({
        key: options.key,
        version: options.version ?? 1,
        create: options.create,
        validate: options.validate,
    });
}
export function defineRecordSchema(key, validateEntry) {
    return Object.freeze({
        key,
        version: 1,
        create: () => ({}),
        validate: isRecord,
        validateEntry,
    });
}
export function isRecord(value) {
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
export class Database {
    constructor(target, namespace = "") {
        this.target = target;
        this.namespace = namespace;
        this.cache = new Map();
    }
    read(schema) {
        const key = this.key(schema);
        const cached = this.cache.get(key);
        if (cached)
            return cached.value;
        const raw = this.target.getDynamicProperty(key);
        if (typeof raw !== "string" || raw.length === 0)
            return undefined;
        try {
            const value = JSON.parse(raw, jsonReviver);
            if (!schema.validate(value)) {
                console.warn(`[Database.read:${key}] Stored data does not match schema v${schema.version}.`);
                return undefined;
            }
            this.cache.set(key, { raw, value });
            return value;
        }
        catch (error) {
            console.error(`[Database.read:${key}]`, error);
            return undefined;
        }
    }
    readOrCreate(schema) {
        return this.read(schema) ?? schema.create();
    }
    write(schema, value) {
        if (!schema.validate(value)) {
            throw new Error(`Cannot write invalid data to schema "${schema.key}" v${schema.version}.`);
        }
        const key = this.key(schema);
        const raw = JSON.stringify(value, jsonReplacer);
        if (this.cache.get(key)?.raw === raw)
            return;
        this.target.setDynamicProperty(key, raw);
        this.cache.set(key, { raw, value });
    }
    update(schema, update) {
        const value = update(this.readOrCreate(schema));
        this.write(schema, value);
        return value;
    }
    clear(schema) {
        const key = this.key(schema);
        this.target.setDynamicProperty(key, undefined);
        this.cache.delete(key);
    }
    get(schema, id) {
        const value = this.read(schema)?.[id];
        if (value === undefined || schema.validateEntry(value))
            return value;
        console.warn(`[Database.get:${this.key(schema)}] Record "${id}" does not match schema v${schema.version}.`);
        return undefined;
    }
    set(schema, id, value) {
        if (!schema.validateEntry(value)) {
            throw new Error(`Cannot write invalid record "${id}" to schema "${schema.key}" v${schema.version}.`);
        }
        this.update(schema, (table) => ({ ...table, [id]: value }));
    }
    delete(schema, id) {
        const table = this.read(schema);
        if (!table || !(id in table))
            return false;
        const next = { ...table };
        delete next[id];
        this.write(schema, next);
        return true;
    }
    key(schema) {
        return `${this.namespace}${schema.key}`;
    }
}
Database.world = new Database(world, "mcl:");
