import { world } from "@minecraft/server";
import { handleEntityHurtBefore } from "mc_dependencies/Combat";

world.beforeEvents.entityHurt.subscribe(handleEntityHurtBefore);
