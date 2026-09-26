import { system } from "@minecraft/server";
import { handleScriptEventReceive } from "../Combat.js";
system.afterEvents.scriptEventReceive.subscribe(handleScriptEventReceive);
