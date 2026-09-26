import { world } from "@minecraft/server";
import { handleEntityRemove } from "../Combat.js";
world.afterEvents.entityRemove.subscribe(handleEntityRemove);
