import { Dimension, Entity, ItemStack, Vector3, world } from "@minecraft/server";
import { ComponentIds, EntityComponent } from "mc_mob/components/Component";

export type LootableConfig = {
    table: string;
    overrideGamerules?: boolean;
};

export class LootableComponent extends EntityComponent<{}, typeof ComponentIds.lootable> {
    public constructor(private readonly config: LootableConfig) {
        if (!config.table.trim()) throw new Error("Lootable components require a table ID.");
        super(ComponentIds.lootable, ComponentIds.lootable, {}, config);
    }

    public onDeath(killer?: Entity | null): void {
        if (!this.config.overrideGamerules && !world.gameRules.doMobLoot) return;
        LootTables.drop(this.config.table, {
            entity: this.entity,
            killer,
            dimension: this.entity.dimension,
            location: this.entity.location,
        });
    }

    public shouldSerialize(): boolean {
        return false;
    }
}

export type LootContext = {
    entity: Entity;
    killer?: Entity | null;
    dimension: Dimension;
    location: Vector3;
};

export type LootAmount = number | { min: number; max: number };

export type LootEntry = {
    item: string | ItemStack | ((context: LootContext) => ItemStack | undefined);
    amount?: LootAmount | ((context: LootContext) => LootAmount);
    chance?: number | ((context: LootContext) => number);
    weight?: number;
    rolls?: LootAmount | ((context: LootContext) => LootAmount);
    nameTag?: string;
    lore?: string[];
    when?: (context: LootContext) => boolean;
    modify?: (item: ItemStack, context: LootContext) => void;
};

export type LootTable = {
    rolls?: LootAmount | ((context: LootContext) => LootAmount);
    entries: readonly LootEntry[];
};

const tables = new Map<string, LootTable>();

function randomInt(min: number, max: number): number {
    const lo = Math.ceil(Math.min(min, max));
    const hi = Math.floor(Math.max(min, max));
    return Math.floor(Math.random() * (hi - lo + 1)) + lo;
}

function resolveAmount(value: LootAmount | undefined): number {
    if (value === undefined) return 1;
    const amount = typeof value === "number" ? Math.floor(value) : randomInt(value.min, value.max);
    return amount < 0 ? 0 : amount > 255 ? 255 : amount;
}

function resolveMaybeFn<T>(value: T | ((context: LootContext) => T) | undefined, context: LootContext): T | undefined {
    if (typeof value === "function") return (value as (context: LootContext) => T)(context);
    return value;
}

function clampChance(value: number): number {
    if (!Number.isFinite(value)) return 0;
    return value < 0 ? 0 : value > 1 ? 1 : value;
}

function chooseWeighted(entries: readonly LootEntry[]): LootEntry | undefined {
    let total = 0;
    for (const entry of entries) total += Math.max(0, entry.weight ?? 1);
    if (total <= 0) return undefined;

    let roll = Math.random() * total;
    for (const entry of entries) {
        roll -= Math.max(0, entry.weight ?? 1);
        if (roll <= 0) return entry;
    }
    return entries[entries.length - 1];
}

function cloneItemStack(template: ItemStack, amount: number): ItemStack {
    const item = new ItemStack(template.typeId, amount);
    item.nameTag = template.nameTag;
    const lore = template.getLore();
    if (lore.length) item.setLore(lore);
    return item;
}

function createItem(entry: LootEntry, context: LootContext): ItemStack | undefined {
    const amount = resolveAmount(resolveMaybeFn(entry.amount, context));
    if (amount <= 0) return undefined;

    const source = typeof entry.item === "function" ? entry.item(context) : entry.item;
    if (!source) return undefined;

    const item = typeof source === "string"
        ? new ItemStack(source, amount)
        : cloneItemStack(source, amount);

    if (entry.nameTag !== undefined) item.nameTag = entry.nameTag;
    if (entry.lore) item.setLore(entry.lore);
    entry.modify?.(item, context);
    return item;
}

function spawnItem(context: LootContext, item: ItemStack): void {
    context.dimension.spawnItem(item, context.location);
}

export const LootTables = {
    register(key: string, table: LootTable): void {
        if (!key) throw new Error("Loot table key is required.");
        if (tables.has(key)) throw new Error(`Loot table "${key}" is already registered.`);
        tables.set(key, table);
    },

    get(key: string): LootTable | undefined {
        return tables.get(key);
    },

    drop(key: string | undefined, context: LootContext): void {
        if (!key) return;
        const table = tables.get(key);
        if (!table) {
            console.warn(`[LootTables.drop] Unknown loot table "${key}".`);
            return;
        }

        const tableRolls = resolveAmount(resolveMaybeFn(table.rolls, context));
        if (tableRolls <= 0) return;

        const entries = table.entries.filter((entry) => entry.when?.(context) ?? true);
        if (!entries.length) return;

        for (let i = 0; i < tableRolls; i++) {
            const entry = chooseWeighted(entries);
            if (!entry) continue;

            const chance = clampChance(resolveMaybeFn(entry.chance, context) ?? 1);
            if (Math.random() > chance) continue;

            const entryRolls = resolveAmount(resolveMaybeFn(entry.rolls, context));
            for (let j = 0; j < entryRolls; j++) {
                try {
                    const item = createItem(entry, context);
                    if (item) spawnItem(context, item);
                } catch (error) {
                    console.error(`[LootTables.drop:${key}]`, error);
                }
            }
        }
    },
};
