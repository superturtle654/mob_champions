import { world } from "@minecraft/server";
import { handleEntitySpawn } from "mc_dependencies/Combat";

world.afterEvents.entitySpawn.subscribe(handleEntitySpawn);
