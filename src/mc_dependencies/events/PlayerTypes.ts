import { Block, Entity, ItemStack, Player, PlayerInventoryType } from "@minecraft/server";

export interface PlayerEvents {
    playerHitBlock: [player?: Player, block?: Block];
    entityHitEntity: [damagingEntity?: Entity, hitEntity?: Entity];
    entityInteract: [entity?: Entity, player?: Player, item?: ItemStack];
    playerJoin: [playerName?: string, id?: string];
    playerLeave: [playerName?: string, id?: string];
    playerSpawn: [player?: Player, initialSpawn?: boolean];
    playerInventoryItemChange: [
        player: Player,
        slot: number,
        inventoryType: PlayerInventoryType,
        item?: ItemStack,
        previousItem?: ItemStack,
    ];
    playerHotbarSelectedSlotChange: [
        player: Player,
        selectedSlot: number,
        previousSlot: number,
        item?: ItemStack,
    ];
}
