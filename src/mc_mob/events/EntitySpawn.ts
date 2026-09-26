import { EntityInitializationCause, system, world } from "@minecraft/server";
import { assignSpawnProfile } from "mc_mob/components/SpawnRules";

world.afterEvents.entitySpawn.subscribe((event) => {
    if (event.cause === EntityInitializationCause.Spawned) {
        system.run(() => assignSpawnProfile(event.entity));
    }
});
