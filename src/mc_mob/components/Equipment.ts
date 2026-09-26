import {
    EntityComponentTypes,
    EntityEquippableComponent,
    EquipmentSlot,
    ItemStack,
    system,
} from "@minecraft/server";
import { EntityComponent, ComponentIds } from "mc_mob/components/Component";
import { createRegisteredItem } from "mc_dependencies/Equipment";

export type EquipmentItemConfig = {
    item: string | ItemStack | (() => ItemStack | undefined);
    amount?: number;
    nameTag?: string;
    lore?: string[];
    modify?: (item: ItemStack) => void;
};

export type DefinedEquipmentItemConfig = {
    definitionId: string;
    amount?: number;
    modify?: (item: ItemStack) => void;
};

export type EquipmentConfig = Partial<Record<
    EquipmentSlot,
    EquipmentItemConfig | DefinedEquipmentItemConfig | ItemStack | string | undefined
>>;

const equipmentSlots = [
    EquipmentSlot.Head,
    EquipmentSlot.Chest,
    EquipmentSlot.Legs,
    EquipmentSlot.Feet,
    EquipmentSlot.Mainhand,
    EquipmentSlot.Offhand,
] as const;

const commandSlots: Partial<Record<EquipmentSlot, string>> = {
    [EquipmentSlot.Head]: "slot.armor.head",
    [EquipmentSlot.Chest]: "slot.armor.chest",
    [EquipmentSlot.Legs]: "slot.armor.legs",
    [EquipmentSlot.Feet]: "slot.armor.feet",
    [EquipmentSlot.Mainhand]: "slot.weapon.mainhand",
    [EquipmentSlot.Offhand]: "slot.weapon.offhand",
};

function cloneItemStack(template: ItemStack, amount?: number): ItemStack {
    const item = new ItemStack(template.typeId, amount ?? template.amount);
    item.nameTag = template.nameTag;
    const lore = template.getLore();
    if (lore.length) item.setLore(lore);
    return item;
}

function isItemStack(value: unknown): value is ItemStack {
    return typeof value === "object" && value !== null && typeof (value as ItemStack).typeId === "string";
}

function createEquipmentItem(
    config: EquipmentItemConfig | DefinedEquipmentItemConfig | ItemStack | string | undefined
): ItemStack | undefined {
    if (!config) return undefined;

    if (typeof config === "string") return new ItemStack(config, 1);
    if (isItemStack(config)) return cloneItemStack(config);
    if ("definitionId" in config) {
        const item = createRegisteredItem(config.definitionId, config.amount);
        if (!item) {
            console.error(`[EquipmentComponent] Unknown item definition "${config.definitionId}".`);
            return undefined;
        }
        config.modify?.(item);
        return item;
    }

    const source = typeof config.item === "function" ? config.item() : config.item;
    if (!source) return undefined;

    const item = typeof source === "string"
        ? new ItemStack(source, config.amount ?? 1)
        : cloneItemStack(source, config.amount);

    if (config.nameTag !== undefined) item.nameTag = config.nameTag;
    if (config.lore) item.setLore(config.lore);
    config.modify?.(item);
    return item;
}

export class EquipmentComponent extends EntityComponent<{}, typeof ComponentIds.equipment> {
    constructor(private readonly equipmentBySlot: EquipmentConfig) {
        super(ComponentIds.equipment, ComponentIds.equipment);
    }

    protected onAttach(): void {
        this.apply();
    }

    public onSpawn(): void {
        system.run(() => this.apply());
    }

    public apply(): void {
        const equippable = this.entity.getComponent(EntityComponentTypes.Equippable) as EntityEquippableComponent | undefined;

        for (const slot of equipmentSlots) {
            if (!(slot in this.equipmentBySlot)) continue;
            try {
                const item = createEquipmentItem(this.equipmentBySlot[slot]);
                if (equippable) {
                    if (!equippable.setEquipment(slot, item)) {
                        console.error(`[EquipmentComponent:${slot}] Minecraft rejected the equipment.`);
                    }
                    continue;
                }
                this.applyWithCommand(slot, item);
            } catch (error) {
                console.error(`[EquipmentComponent:${slot}]`, error);
            }
        }
    }

    private applyWithCommand(slot: EquipmentSlot, item?: ItemStack): void {
        const commandSlot = commandSlots[slot];
        if (!commandSlot || !item) return;
        this.entity.runCommand(
            `replaceitem entity @s ${commandSlot} 0 ${item.typeId} ${item.amount}`
        );
    }

    public shouldSerialize(): boolean {
        return false;
    }
}
