import { world } from "@minecraft/server";
import { EntityStore } from "../storage/index.js";
world.afterEvents.entityLoad.subscribe(({ entity }) => {
    EntityStore.restore(entity);
});
