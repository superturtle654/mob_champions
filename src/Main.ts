import { world } from "@minecraft/server";
import "mc_dependencies/Install";
import "mc_mob/Install";
import { showSpawnEggMenu } from "mc_mob/SpawnEggs";

world.afterEvents.itemUse.subscribe(({ itemStack, source }) => {
    if (itemStack.typeId === "minecraft:stick") void showSpawnEggMenu(source);
});
