import { world } from "@minecraft/server";
import { handleEntityHurtAfter } from "../Combat.js";
world.afterEvents.entityHurt.subscribe(handleEntityHurtAfter);
