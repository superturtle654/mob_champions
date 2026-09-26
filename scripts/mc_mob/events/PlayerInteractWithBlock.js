import { world } from "@minecraft/server";
import { useSpawnEgg } from "../SpawnEggs.js";
world.beforeEvents.playerInteractWithBlock.subscribe(useSpawnEgg);
