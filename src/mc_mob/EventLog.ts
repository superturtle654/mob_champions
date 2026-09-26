import { SystemConfig } from "mc_dependencies/Config";

export function logMobEvent(message: string): void {
    if (SystemConfig.logging.enabled && SystemConfig.logging.globalListeners) {
        console.warn(`[MCL:mobEvents] ${message}`);
    }
}
