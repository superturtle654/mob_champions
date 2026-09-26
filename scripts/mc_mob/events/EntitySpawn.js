import { EntityInitializationCause, system, world } from "@minecraft/server";
import { assignSpawnProfile } from "../components/SpawnRules.js";
world.afterEvents.entitySpawn.subscribe((event) => {
    if (event.cause === EntityInitializationCause.Spawned) {
        system.run(() => assignSpawnProfile(event.entity));
    }
});
