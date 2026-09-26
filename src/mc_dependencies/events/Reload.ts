import { system } from "@minecraft/server";
import { handleReload } from "mc_dependencies/Combat";

system.runTimeout(handleReload);
