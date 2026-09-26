import { world } from "@minecraft/server";
import { handleEntityDie } from "../Combat.js";
world.afterEvents.entityDie.subscribe(handleEntityDie);
