import { world } from "@minecraft/server";
import { jsonReplacer, jsonReviver } from "mc_dependencies/storage/Serialization";

export type DatabaseTarget = {
    getDynamicProperty(id: string): unknown;
    setDynamicProperty(id: string, value?: any): void;
};

export type DatabaseSchema<T> = {
    readonly key: string;
    readonly version: number;
    readonly create: () => T;
    readonly validate: (value: unknown) => value is T;
};

export type DatabaseRecordSchema<T> = DatabaseSchema<Record<string, T>> & {
    readonly validateEntry: (value: unknown) => value is T;
};

export type SchemaOptions<T> = {
    key: string;
    version?: number;
    create: () => T;
    validate: (value: unknown) => value is T;
};

export function defineSchema<T>(options: SchemaOptions<T>): DatabaseSchema<T> {
    return Object.freeze({
        key: options.key,
        version: options.version ?? 1,
        create: options.create,
        validate: options.validate,
    });
}

export function defineRecordSchema<T>(
    key: string,
    validateEntry: (value: unknown) => value is T,
): DatabaseRecordSchema<T> {
    return Object.freeze({
        key,
        version: 1,
        create: () => ({}),
        validate: isRecord as (value: unknown) => value is Record<string, T>,
        validateEntry,
    });
}

export function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

type CacheEntry = {
    raw: string;
    value: unknown;
};

export class Database {
    public static readonly world = new Database(world, "mcl:");

    private readonly cache = new Map<string, CacheEntry>();

    public constructor(
        private readonly target: DatabaseTarget,
        private readonly namespace = "",
    ) {}

    public read<T>(schema: DatabaseSchema<T>): T | undefined {
        const key = this.key(schema);
        const cached = this.cache.get(key);
        if (cached) return cached.value as T;

        const raw = this.target.getDynamicProperty(key);
        if (typeof raw !== "string" || raw.length === 0) return undefined;

        try {
            const value: unknown = JSON.parse(raw, jsonReviver);
            if (!schema.validate(value)) {
                console.warn(`[Database.read:${key}] Stored data does not match schema v${schema.version}.`);
                return undefined;
            }
            this.cache.set(key, { raw, value });
            return value;
        } catch (error) {
            console.error(`[Database.read:${key}]`, error);
            return undefined;
        }
    }

    public readOrCreate<T>(schema: DatabaseSchema<T>): T {
        return this.read(schema) ?? schema.create();
    }

    public write<T>(schema: DatabaseSchema<T>, value: T): void {
        if (!schema.validate(value)) {
            throw new Error(`Cannot write invalid data to schema "${schema.key}" v${schema.version}.`);
        }

        const key = this.key(schema);
        const raw = JSON.stringify(value, jsonReplacer);
        if (this.cache.get(key)?.raw === raw) return;
        this.target.setDynamicProperty(key, raw);
        this.cache.set(key, { raw, value });
    }

    public update<T>(schema: DatabaseSchema<T>, update: (value: T) => T): T {
        const value = update(this.readOrCreate(schema));
        this.write(schema, value);
        return value;
    }

    public clear<T>(schema: DatabaseSchema<T>): void {
        const key = this.key(schema);
        this.target.setDynamicProperty(key, undefined);
        this.cache.delete(key);
    }

    public get<T>(schema: DatabaseRecordSchema<T>, id: string): T | undefined {
        const value = this.read(schema)?.[id];
        if (value === undefined || schema.validateEntry(value)) return value;
        console.warn(`[Database.get:${this.key(schema)}] Record "${id}" does not match schema v${schema.version}.`);
        return undefined;
    }

    public set<T>(schema: DatabaseRecordSchema<T>, id: string, value: T): void {
        if (!schema.validateEntry(value)) {
            throw new Error(`Cannot write invalid record "${id}" to schema "${schema.key}" v${schema.version}.`);
        }
        this.update(schema, (table) => ({ ...table, [id]: value }));
    }

    public delete<T>(schema: DatabaseRecordSchema<T>, id: string): boolean {
        const table = this.read(schema);
        if (!table || !(id in table)) return false;
        const next = { ...table };
        delete next[id];
        this.write(schema, next);
        return true;
    }

    private key(schema: DatabaseSchema<unknown>): string {
        return `${this.namespace}${schema.key}`;
    }
}
