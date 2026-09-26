import { ItemStack, world } from "@minecraft/server";
import { ComponentIds, EntityComponent } from "./Component.js";
export class LootableComponent extends EntityComponent {
    constructor(config) {
        if (!config.table.trim())
            throw new Error("Lootable components require a table ID.");
        super(ComponentIds.lootable, ComponentIds.lootable, {}, config);
        this.config = config;
    }
    onDeath(killer) {
        if (!this.config.overrideGamerules && !world.gameRules.doMobLoot)
            return;
        LootTables.drop(this.config.table, {
            entity: this.entity,
            killer,
            dimension: this.entity.dimension,
            location: this.entity.location,
        });
    }
    shouldSerialize() {
        return false;
    }
}
const tables = new Map();
function randomInt(min, max) {
    const lo = Math.ceil(Math.min(min, max));
    const hi = Math.floor(Math.max(min, max));
    return Math.floor(Math.random() * (hi - lo + 1)) + lo;
}
function resolveAmount(value) {
    if (value === undefined)
        return 1;
    const amount = typeof value === "number" ? Math.floor(value) : randomInt(value.min, value.max);
    return amount < 0 ? 0 : amount > 255 ? 255 : amount;
}
function resolveMaybeFn(value, context) {
    if (typeof value === "function")
        return value(context);
    return value;
}
function clampChance(value) {
    if (!Number.isFinite(value))
        return 0;
    return value < 0 ? 0 : value > 1 ? 1 : value;
}
function chooseWeighted(entries) {
    let total = 0;
    for (const entry of entries)
        total += Math.max(0, entry.weight ?? 1);
    if (total <= 0)
        return undefined;
    let roll = Math.random() * total;
    for (const entry of entries) {
        roll -= Math.max(0, entry.weight ?? 1);
        if (roll <= 0)
            return entry;
    }
    return entries[entries.length - 1];
}
function cloneItemStack(template, amount) {
    const item = new ItemStack(template.typeId, amount);
    item.nameTag = template.nameTag;
    const lore = template.getLore();
    if (lore.length)
        item.setLore(lore);
    return item;
}
function createItem(entry, context) {
    const amount = resolveAmount(resolveMaybeFn(entry.amount, context));
    if (amount <= 0)
        return undefined;
    const source = typeof entry.item === "function" ? entry.item(context) : entry.item;
    if (!source)
        return undefined;
    const item = typeof source === "string"
        ? new ItemStack(source, amount)
        : cloneItemStack(source, amount);
    if (entry.nameTag !== undefined)
        item.nameTag = entry.nameTag;
    if (entry.lore)
        item.setLore(entry.lore);
    entry.modify?.(item, context);
    return item;
}
function spawnItem(context, item) {
    context.dimension.spawnItem(item, context.location);
}
export const LootTables = {
    register(key, table) {
        if (!key)
            throw new Error("Loot table key is required.");
        if (tables.has(key))
            throw new Error(`Loot table "${key}" is already registered.`);
        tables.set(key, table);
    },
    get(key) {
        return tables.get(key);
    },
    drop(key, context) {
        if (!key)
            return;
        const table = tables.get(key);
        if (!table) {
            console.warn(`[LootTables.drop] Unknown loot table "${key}".`);
            return;
        }
        const tableRolls = resolveAmount(resolveMaybeFn(table.rolls, context));
        if (tableRolls <= 0)
            return;
        const entries = table.entries.filter((entry) => entry.when?.(context) ?? true);
        if (!entries.length)
            return;
        for (let i = 0; i < tableRolls; i++) {
            const entry = chooseWeighted(entries);
            if (!entry)
                continue;
            const chance = clampChance(resolveMaybeFn(entry.chance, context) ?? 1);
            if (Math.random() > chance)
                continue;
            const entryRolls = resolveAmount(resolveMaybeFn(entry.rolls, context));
            for (let j = 0; j < entryRolls; j++) {
                try {
                    const item = createItem(entry, context);
                    if (item)
                        spawnItem(context, item);
                }
                catch (error) {
                    console.error(`[LootTables.drop:${key}]`, error);
                }
            }
        }
    },
};
