import { subscribe } from "../../mc_dependencies/events/index.js";
import { logMobEvent } from "../EventLog.js";
import { EntityStore } from "../storage/index.js";
subscribe(null, "entityDie", (entity) => {
    if (entity && EntityStore.delete(entity.id)) {
        logMobEvent(`deleted dead managed entity ${entity.typeId}#${entity.id}`);
    }
});
