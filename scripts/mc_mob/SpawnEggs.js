import { Direction, EntityComponentTypes, GameMode, ItemStack, system, } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { ManagedEntity } from "./ManagedEntity.js";
import { EntityRegistry } from "./Registry.js";
const OPEN_MENU_EVENT = "mcl:spawn_eggs";
const PROFILE_EGG_ITEM = "minecraft:egg";
const PROFILE_LORE_PREFIX = "\u00a7r\u00a78Profile: \u00a7f";
export async function showSpawnEggMenu(player) {
    const profiles = [...EntityRegistry.values()]
        .filter((profile) => profile.definition.spawnEgg?.enabled !== false)
        .sort((a, b) => getDisplayName(a).localeCompare(getDisplayName(b)));
    const form = new ActionFormData()
        .title("Champion Spawn Eggs")
        .body(profiles.length ? "Choose a registered mob profile." : "No spawn egg profiles are registered.");
    for (const profile of profiles) {
        form.button(getDisplayName(profile));
    }
    try {
        const response = await form.show(player);
        if (response.canceled || response.selection === undefined)
            return;
        const profile = profiles[response.selection];
        if (profile)
            giveSpawnEgg(player, profile.profileId);
    }
    catch (error) {
        console.error("[SpawnEggs.showMenu]", error);
    }
}
export function createSpawnEgg(profileId) {
    const profile = EntityRegistry.get(profileId);
    if (!profile || profile.definition.spawnEgg?.enabled === false)
        return undefined;
    try {
        const item = new ItemStack(PROFILE_EGG_ITEM, 1);
        item.nameTag = `\u00a7r\u00a76\u00a7l${getDisplayName(profile)}\u00a7r\u00a7e Spawn Egg`;
        item.setLore([
            `${PROFILE_LORE_PREFIX}${profile.profileId}`,
            "",
            "\u00a7r\u00a7eUse on a block to spawn",
        ]);
        return item;
    }
    catch (error) {
        console.error(`[SpawnEggs.create:${profileId}]`, error);
        return undefined;
    }
}
export function giveSpawnEgg(player, profileId) {
    const egg = createSpawnEgg(profileId);
    if (!egg)
        return false;
    const container = player.getComponent(EntityComponentTypes.Inventory)?.container;
    const remainder = container?.addItem(egg);
    if (!container || remainder)
        player.dimension.spawnItem(remainder ?? egg, player.location);
    return true;
}
export function useSpawnEgg(event) {
    if (!event.isFirstEvent)
        return;
    const profileId = getSpawnEggProfileId(event.itemStack);
    if (!profileId)
        return;
    const profile = EntityRegistry.get(profileId);
    if (!profile)
        return;
    event.cancel = true;
    const location = getSpawnLocation(event.block.location, event.blockFace);
    system.run(() => {
        const spawned = ManagedEntity.spawn(event.block.dimension, location, profile);
        if (spawned)
            consumeSelectedEgg(event.player, profileId);
    });
}
export function cancelSpawnEggThrow(event) {
    if (getSpawnEggProfileId(event.itemStack))
        event.cancel = true;
}
export function openSpawnEggMenu(event) {
    if (event.id !== OPEN_MENU_EVENT || event.sourceEntity?.typeId !== "minecraft:player")
        return;
    system.run(() => void showSpawnEggMenu(event.sourceEntity));
}
function consumeSelectedEgg(player, profileId) {
    if (player.getGameMode() === GameMode.Creative)
        return;
    const container = player.getComponent(EntityComponentTypes.Inventory)?.container;
    const item = container?.getItem(player.selectedSlotIndex);
    if (!item || getSpawnEggProfileId(item) !== profileId)
        return;
    if (item.amount <= 1)
        container?.setItem(player.selectedSlotIndex);
    else {
        item.amount--;
        container?.setItem(player.selectedSlotIndex, item);
    }
}
function getSpawnEggProfileId(item) {
    if (!item || item.typeId !== PROFILE_EGG_ITEM)
        return undefined;
    const marker = item.getLore().find((line) => line.startsWith(PROFILE_LORE_PREFIX));
    if (!marker)
        return undefined;
    const profileId = marker.slice(PROFILE_LORE_PREFIX.length);
    return profileId || undefined;
}
function getDisplayName(profile) {
    return profile.definition.displayName
        ?? profile.profileId.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
function getSpawnLocation(block, face) {
    const offset = directionOffset(face);
    return {
        x: block.x + 0.5 + offset.x,
        y: block.y + 0.5 + offset.y,
        z: block.z + 0.5 + offset.z,
    };
}
function directionOffset(face) {
    switch (face) {
        case Direction.Up: return { x: 0, y: 1, z: 0 };
        case Direction.Down: return { x: 0, y: -1, z: 0 };
        case Direction.North: return { x: 0, y: 0, z: -1 };
        case Direction.South: return { x: 0, y: 0, z: 1 };
        case Direction.East: return { x: 1, y: 0, z: 0 };
        case Direction.West: return { x: -1, y: 0, z: 0 };
    }
}
