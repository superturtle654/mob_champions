import { world } from "@minecraft/server";
import { handleEntityDie } from "mc_dependencies/Combat";

world.afterEvents.entityDie.subscribe(handleEntityDie);
