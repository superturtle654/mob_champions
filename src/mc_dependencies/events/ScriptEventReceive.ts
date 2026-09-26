import { system } from "@minecraft/server";
import { handleScriptEventReceive } from "mc_dependencies/Combat";

system.afterEvents.scriptEventReceive.subscribe(handleScriptEventReceive);
