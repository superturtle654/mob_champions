import { EntityComponentTypes, EquipmentSlot, ItemStack, system, } from "@minecraft/server";
import { EntityComponent, ComponentIds } from "./Component.js";
import { createRegisteredItem } from "../../mc_dependencies/Equipment.js";
const equipmentSlots = [
    EquipmentSlot.Head,
    EquipmentSlot.Chest,
    EquipmentSlot.Legs,
    EquipmentSlot.Feet,
    EquipmentSlot.Mainhand,
    EquipmentSlot.Offhand,
];
const commandSlots = {
    [EquipmentSlot.Head]: "slot.armor.head",
    [EquipmentSlot.Chest]: "slot.armor.chest",
    [EquipmentSlot.Legs]: "slot.armor.legs",
    [EquipmentSlot.Feet]: "slot.armor.feet",
    [EquipmentSlot.Mainhand]: "slot.weapon.mainhand",
    [EquipmentSlot.Offhand]: "slot.weapon.offhand",
};
function cloneItemStack(template, amount) {
    const item = new ItemStack(template.typeId, amount ?? template.amount);
    item.nameTag = template.nameTag;
    const lore = template.getLore();
    if (lore.length)
        item.setLore(lore);
    return item;
}
function isItemStack(value) {
    return typeof value === "object" && value !== null && typeof value.typeId === "string";
}
function createEquipmentItem(config) {
    if (!config)
        return undefined;
    if (typeof config === "string")
        return new ItemStack(config, 1);
    if (isItemStack(config))
        return cloneItemStack(config);
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
    if (!source)
        return undefined;
    const item = typeof source === "string"
        ? new ItemStack(source, config.amount ?? 1)
        : cloneItemStack(source, config.amount);
    if (config.nameTag !== undefined)
        item.nameTag = config.nameTag;
    if (config.lore)
        item.setLore(config.lore);
    config.modify?.(item);
    return item;
}
export class EquipmentComponent extends EntityComponent {
    constructor(equipmentBySlot) {
        super(ComponentIds.equipment, ComponentIds.equipment);
        this.equipmentBySlot = equipmentBySlot;
    }
    onAttach() {
        this.apply();
    }
    onSpawn() {
        system.run(() => this.apply());
    }
    apply() {
        const equippable = this.entity.getComponent(EntityComponentTypes.Equippable);
        for (const slot of equipmentSlots) {
            if (!(slot in this.equipmentBySlot))
                continue;
            try {
                const item = createEquipmentItem(this.equipmentBySlot[slot]);
                if (equippable) {
                    if (!equippable.setEquipment(slot, item)) {
                        console.error(`[EquipmentComponent:${slot}] Minecraft rejected the equipment.`);
                    }
                    continue;
                }
                this.applyWithCommand(slot, item);
            }
            catch (error) {
                console.error(`[EquipmentComponent:${slot}]`, error);
            }
        }
    }
    applyWithCommand(slot, item) {
        const commandSlot = commandSlots[slot];
        if (!commandSlot || !item)
            return;
        this.entity.runCommand(`replaceitem entity @s ${commandSlot} 0 ${item.typeId} ${item.amount}`);
    }
    shouldSerialize() {
        return false;
    }
}
