import { world } from "@minecraft/server";
import { handleDataDrivenEntityTrigger } from "../Combat.js";
world.afterEvents.dataDrivenEntityTrigger.subscribe(handleDataDrivenEntityTrigger);
