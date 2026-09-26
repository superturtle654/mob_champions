import { world } from "@minecraft/server";
import "./mc_dependencies/Install.js";
import "./mc_mob/Install.js";
import { showSpawnEggMenu } from "./mc_mob/SpawnEggs.js";
world.afterEvents.itemUse.subscribe(({ itemStack, source }) => {
    if (itemStack.typeId === "minecraft:stick")
        void showSpawnEggMenu(source);
});
