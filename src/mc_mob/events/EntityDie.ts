import { subscribe } from "mc_dependencies/events/index";
import { logMobEvent } from "mc_mob/EventLog";
import { EntityStore } from "mc_mob/storage/index";

subscribe(null, "entityDie", (entity) => {
    if (entity && EntityStore.delete(entity.id)) {
        logMobEvent(`deleted dead managed entity ${entity.typeId}#${entity.id}`);
    }
});
