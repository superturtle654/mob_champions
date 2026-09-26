import { world } from "@minecraft/server";
import { cancelSpawnEggThrow } from "mc_mob/SpawnEggs";

world.beforeEvents.itemUse.subscribe(cancelSpawnEggThrow);
