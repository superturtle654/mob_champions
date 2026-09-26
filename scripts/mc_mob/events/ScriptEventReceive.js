import { system } from "@minecraft/server";
import { openSpawnEggMenu } from "../SpawnEggs.js";
system.afterEvents.scriptEventReceive.subscribe(openSpawnEggMenu);
