import { world } from "@minecraft/server";
import { handleEntityHurtBefore } from "../Combat.js";
world.beforeEvents.entityHurt.subscribe(handleEntityHurtBefore);
