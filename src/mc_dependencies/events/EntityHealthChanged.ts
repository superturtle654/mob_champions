import { world } from "@minecraft/server";
import { handleEntityHealthChanged } from "mc_dependencies/Combat";

world.afterEvents.entityHealthChanged.subscribe(handleEntityHealthChanged);
