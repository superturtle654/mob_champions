import { SystemConfig } from "../mc_dependencies/Config.js";
export function logMobEvent(message) {
    if (SystemConfig.logging.enabled && SystemConfig.logging.globalListeners) {
        console.warn(`[MCL:mobEvents] ${message}`);
    }
}
