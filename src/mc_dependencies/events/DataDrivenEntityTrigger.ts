import { world } from "@minecraft/server";
import { handleDataDrivenEntityTrigger } from "mc_dependencies/Combat";

world.afterEvents.dataDrivenEntityTrigger.subscribe(handleDataDrivenEntityTrigger);
