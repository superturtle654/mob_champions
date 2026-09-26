import { subscribe } from "../../mc_dependencies/events/index.js";
import { logMobEvent } from "../EventLog.js";
import { EntityStore } from "../storage/index.js";
subscribe(null, "entityRemove", (entityId) => {
    if (entityId && EntityStore.unload(entityId)) {
        logMobEvent(`unloaded managed entity id=${entityId}`);
    }
});
