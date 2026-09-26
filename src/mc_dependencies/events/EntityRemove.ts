import { world } from "@minecraft/server";
import { handleEntityRemove } from "mc_dependencies/Combat";

world.afterEvents.entityRemove.subscribe(handleEntityRemove);
