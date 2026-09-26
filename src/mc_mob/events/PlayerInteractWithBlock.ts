import { world } from "@minecraft/server";
import { useSpawnEgg } from "mc_mob/SpawnEggs";

world.beforeEvents.playerInteractWithBlock.subscribe(useSpawnEgg);
