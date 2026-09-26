import { system } from "@minecraft/server";
import { openSpawnEggMenu } from "mc_mob/SpawnEggs";

system.afterEvents.scriptEventReceive.subscribe(openSpawnEggMenu);
