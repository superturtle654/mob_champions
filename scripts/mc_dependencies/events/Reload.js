import { system } from "@minecraft/server";
import { handleReload } from "../Combat.js";
system.runTimeout(handleReload);
