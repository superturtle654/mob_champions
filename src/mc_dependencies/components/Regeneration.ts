import { system } from "@minecraft/server";
import { SystemConfig } from "mc_dependencies/Config";
import { runtimeActors } from "mc_dependencies/Actors";

export interface RegenerationHost {
    getCurrentHealth(): number | undefined;
    getMaxHealth(): number | undefined;
    getRegeneration(): number;
    getRegenerationTime(): number;
    heal(amount: number): unknown;
}

const lastRegenerationTick = new WeakMap<RegenerationHost, number>();

export const HealthRegenerationSystem = {
    update(host: RegenerationHost, currentTick: number): void {
        const lastTick = lastRegenerationTick.get(host);
        if (lastTick === undefined) {
            lastRegenerationTick.set(host, currentTick);
            return;
        }
        if (currentTick - lastTick < host.getRegenerationTime()) return;
        lastRegenerationTick.set(host, currentTick);

        const current = host.getCurrentHealth();
        const max = host.getMaxHealth();
        const regeneration = host.getRegeneration();
        if (current === undefined || max === undefined || current <= 0 || current >= max || regeneration <= 0) return;
        host.heal(regeneration);
    },
};

system.runInterval(() => {
    if (!SystemConfig.healthSystem.enabled) return;
    for (const actor of runtimeActors()) HealthRegenerationSystem.update(actor, system.currentTick);
}, 1);
