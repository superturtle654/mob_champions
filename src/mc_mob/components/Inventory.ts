import { Entity, ItemStack } from "@minecraft/server";
import { EntityComponent, ComponentIds } from "mc_mob/components/Component";
import {
    cloneItemStack,
    deserializeItemStack,
    ItemSerializationLimits,
    serializeItemStack,
    StoredItemStack,
} from "mc_dependencies/storage/ItemStack";

export type InventoryItemConfig = string | ItemStack | {
    item: string | ItemStack;
    amount?: number;
    nameTag?: string;
    lore?: string[];
};

export type InventoryConfig = {
    size: number;
    dropOnDeath?: boolean;
    limits?: Partial<InventoryLimits>;
    items?: Partial<Record<number, InventoryItemConfig>>;
};

export type InventoryLimits = {
    maxLoreLines: ItemSerializationLimits["maxLoreLines"];
    maxLoreLineLength: ItemSerializationLimits["maxLoreLineLength"];
    maxDynamicProperties: ItemSerializationLimits["maxDynamicProperties"];
    maxSerializedBytes: number;
};

type InventoryData = {
    v: 1;
    slots: Record<string, StoredItemStack>;
};

const DEFAULT_LIMITS: InventoryLimits = {
    maxLoreLines: 20,
    maxLoreLineLength: 256,
    maxDynamicProperties: 16,
    maxSerializedBytes: 16_384,
};

function normalizeLimits(limits?: Partial<InventoryLimits>): InventoryLimits {
    return {
        maxLoreLines: Math.max(0, Math.floor(limits?.maxLoreLines ?? DEFAULT_LIMITS.maxLoreLines)),
        maxLoreLineLength: Math.max(0, Math.floor(limits?.maxLoreLineLength ?? DEFAULT_LIMITS.maxLoreLineLength)),
        maxDynamicProperties: Math.max(0, Math.floor(limits?.maxDynamicProperties ?? DEFAULT_LIMITS.maxDynamicProperties)),
        maxSerializedBytes: Math.max(256, Math.floor(limits?.maxSerializedBytes ?? DEFAULT_LIMITS.maxSerializedBytes)),
    };
}

function createItem(config: InventoryItemConfig): ItemStack {
    if (typeof config === "string") return new ItemStack(config, 1);
    if (config instanceof ItemStack) return cloneItemStack(config);

    const item = typeof config.item === "string"
        ? new ItemStack(config.item, config.amount ?? 1)
        : cloneItemStack(config.item, config.amount);

    if (config.nameTag !== undefined) item.nameTag = config.nameTag;
    if (config.lore) item.setLore(config.lore);
    return item;
}

function stackKey(item: StoredItemStack): string {
    return JSON.stringify({ t: item.t, n: item.n, l: item.l, d: item.d });
}

function cloneSlots(slots: Record<string, StoredItemStack>): Record<string, StoredItemStack> {
    return Object.fromEntries(
        Object.entries(slots).map(([slot, item]) => [
            slot,
            {
                ...item,
                l: item.l ? [...item.l] : undefined,
                d: item.d ? { ...item.d } : undefined,
            },
        ])
    );
}

export class InventoryComponent extends EntityComponent<InventoryData, typeof ComponentIds.inventory> {
    public readonly size: number;
    public readonly dropOnDeath: boolean;
    public readonly limits: InventoryLimits;

    constructor(config: InventoryConfig) {
        const size = Math.max(0, Math.floor(config.size));
        const limits = normalizeLimits(config.limits);
        const slots: Record<string, StoredItemStack> = {};

        for (const [rawSlot, itemConfig] of Object.entries(config.items ?? {})) {
            if (!itemConfig) continue;
            const slot = Number(rawSlot);
            if (!Number.isInteger(slot) || slot < 0 || slot >= size) continue;
            slots[String(slot)] = serializeItemStack(createItem(itemConfig), limits);
        }

        if (JSON.stringify(slots).length > limits.maxSerializedBytes) {
            throw new Error(`Default inventory exceeds ${limits.maxSerializedBytes} serialized bytes.`);
        }

        super(ComponentIds.inventory, ComponentIds.inventory, { v: 1, slots });
        this.size = size;
        this.dropOnDeath = config.dropOnDeath ?? false;
        this.limits = limits;
    }

    public getItem(slot: number): ItemStack | undefined {
        this.assertSlot(slot);
        const item = this.get("slots")[String(slot)];
        return item ? deserializeItemStack(item) : undefined;
    }

    public setItem(slot: number, item?: ItemStack | InventoryItemConfig): this {
        this.assertSlot(slot);
        const slots = cloneSlots(this.get("slots"));
        if (item === undefined) delete slots[String(slot)];
        else slots[String(slot)] = serializeItemStack(item instanceof ItemStack ? item : createItem(item), this.limits);
        return this.setSlots(slots);
    }

    public clear(): this {
        return this.setSlots({});
    }

    public getItems(): Array<{ slot: number; item: ItemStack }> {
        return Object.entries(this.get("slots"))
            .map(([slot, item]) => ({ slot: Number(slot), item: deserializeItemStack(item) }))
            .sort((a, b) => a.slot - b.slot);
    }

    public count(typeId: string): number {
        return Object.values(this.get("slots")).reduce(
            (total, item) => total + (item.t === typeId ? item.a : 0),
            0
        );
    }

    public addItem(item: ItemStack | InventoryItemConfig): ItemStack | undefined {
        const incoming = serializeItemStack(item instanceof ItemStack ? item : createItem(item), this.limits);
        let remaining = incoming.a;
        const slots = cloneSlots(this.get("slots"));
        const key = stackKey(incoming);

        for (const stored of Object.values(slots)) {
            if (remaining <= 0) break;
            if (stackKey(stored) !== key) continue;

            const maxAmount = deserializeItemStack(stored).maxAmount;
            const moved = Math.min(remaining, maxAmount - stored.a);
            if (moved <= 0) continue;
            stored.a += moved;
            remaining -= moved;
        }

        for (let slot = 0; slot < this.size && remaining > 0; slot++) {
            if (slots[String(slot)]) continue;
            const maxAmount = deserializeItemStack(incoming).maxAmount;
            const moved = Math.min(remaining, maxAmount);
            slots[String(slot)] = { ...incoming, a: moved };
            remaining -= moved;
        }

        this.setSlots(slots);
        return remaining > 0 ? deserializeItemStack({ ...incoming, a: remaining }) : undefined;
    }

    public removeItem(typeId: string, amount: number): number {
        let remaining = Math.max(0, Math.floor(amount));
        const requested = remaining;
        const slots = cloneSlots(this.get("slots"));

        for (const [slot, item] of Object.entries(slots)) {
            if (remaining <= 0) break;
            if (item.t !== typeId) continue;

            const removed = Math.min(remaining, item.a);
            item.a -= removed;
            remaining -= removed;
            if (item.a <= 0) delete slots[slot];
        }

        if (remaining !== requested) this.setSlots(slots);
        return requested - remaining;
    }

    public dropAll(): number {
        const slots = cloneSlots(this.get("slots"));
        let dropped = 0;

        for (const [slot, stored] of Object.entries(slots)) {
            try {
                this.entity.dimension.spawnItem(deserializeItemStack(stored), this.entity.location);
                delete slots[slot];
                dropped++;
            } catch (error) {
                console.error(`[InventoryComponent.dropAll:${slot}]`, error);
            }
        }

        if (dropped > 0) this.setSlots(slots);
        return dropped;
    }

    public onDeath(_killer?: Entity | null): void {
        if (this.dropOnDeath) this.dropAll();
    }

    public hydrate(data: Partial<InventoryData> | undefined): void {
        if (!data?.slots) return;

        const slots: Record<string, StoredItemStack> = {};
        for (const [rawSlot, item] of Object.entries(data.slots)) {
            const slot = Number(rawSlot);
            if (!Number.isInteger(slot) || slot < 0 || slot >= this.size) continue;
            if (!item || typeof item.t !== "string" || !Number.isFinite(item.a) || item.a <= 0) continue;

            try {
                slots[String(slot)] = serializeItemStack(deserializeItemStack(item), this.limits);
                if (JSON.stringify(slots).length > this.limits.maxSerializedBytes) {
                    delete slots[String(slot)];
                    console.warn(`[InventoryComponent] Ignored slot ${slot}; saved inventory byte limit reached.`);
                }
            } catch {
                console.warn(`[InventoryComponent] Ignored invalid saved item in slot ${slot}.`);
            }
        }

        super.hydrate({ v: 1, slots });
    }

    private setSlots(slots: Record<string, StoredItemStack>): this {
        const bytes = JSON.stringify(slots).length;
        if (bytes > this.limits.maxSerializedBytes) {
            throw new Error(`Inventory update exceeds ${this.limits.maxSerializedBytes} serialized bytes.`);
        }
        return this.set("slots", slots);
    }

    private assertSlot(slot: number): void {
        if (!Number.isInteger(slot) || slot < 0 || slot >= this.size) {
            throw new RangeError(`Inventory slot ${slot} is outside 0-${Math.max(0, this.size - 1)}.`);
        }
    }
}
