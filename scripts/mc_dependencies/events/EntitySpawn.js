import { world } from "@minecraft/server";
import { handleEntitySpawn } from "../Combat.js";
world.afterEvents.entitySpawn.subscribe(handleEntitySpawn);
