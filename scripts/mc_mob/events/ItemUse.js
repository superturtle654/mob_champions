import { world } from "@minecraft/server";
import { cancelSpawnEggThrow } from "../SpawnEggs.js";
world.beforeEvents.itemUse.subscribe(cancelSpawnEggThrow);
