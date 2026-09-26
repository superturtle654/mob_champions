import { subscribe } from "mc_dependencies/events/index";
import { logMobEvent } from "mc_mob/EventLog";
import { EntityStore } from "mc_mob/storage/index";

subscribe(null, "entityRemove", (entityId) => {
    if (entityId && EntityStore.unload(entityId)) {
        logMobEvent(`unloaded managed entity id=${entityId}`);
    }
});
