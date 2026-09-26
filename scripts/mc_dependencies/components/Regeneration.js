import { system } from "@minecraft/server";
import { SystemConfig } from "../Config.js";
import { runtimeActors } from "../Actors.js";
const lastRegenerationTick = new WeakMap();
export const HealthRegenerationSystem = {
    update(host, currentTick) {
        const lastTick = lastRegenerationTick.get(host);
        if (lastTick === undefined) {
            lastRegenerationTick.set(host, currentTick);
            return;
        }
        if (currentTick - lastTick < host.getRegenerationTime())
            return;
        lastRegenerationTick.set(host, currentTick);
        const current = host.getCurrentHealth();
        const max = host.getMaxHealth();
        const regeneration = host.getRegeneration();
        if (current === undefined || max === undefined || current <= 0 || current >= max || regeneration <= 0)
            return;
        host.heal(regeneration);
    },
};
system.runInterval(() => {
    if (!SystemConfig.healthSystem.enabled)
        return;
    for (const actor of runtimeActors())
        HealthRegenerationSystem.update(actor, system.currentTick);
}, 1);
