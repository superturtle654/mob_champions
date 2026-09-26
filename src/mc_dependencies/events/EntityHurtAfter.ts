import { world } from "@minecraft/server";
import { handleEntityHurtAfter } from "mc_dependencies/Combat";

world.afterEvents.entityHurt.subscribe(handleEntityHurtAfter);
