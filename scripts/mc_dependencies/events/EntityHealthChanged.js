import { world } from "@minecraft/server";
import { handleEntityHealthChanged } from "../Combat.js";
world.afterEvents.entityHealthChanged.subscribe(handleEntityHealthChanged);
