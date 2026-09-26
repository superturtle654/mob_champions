import { migrate, subscribe } from "../../mc_dependencies/events/index.js";
import { logMobEvent } from "../EventLog.js";
import { EntityStore } from "../storage/index.js";
subscribe(null, "dataDrivenEntityTrigger", (entity, eventId) => {
    if (!entity || eventId !== "convert_to_drowned")
        return;
    const { x, y, z } = entity.location;
    const dimension = entity.dimension;
    const oldId = entity.id;
    const managedEntity = EntityStore.get(oldId);
    if (!managedEntity)
        return;
    logMobEvent(`migrating drowned source=${entity.typeId}#${oldId}`);
    entity.remove();
    const spawned = dimension.spawnEntity("minecraft:drowned", { x, y, z });
    managedEntity.entity = spawned;
    EntityStore.replaceId(oldId, managedEntity);
    migrate(entity, spawned);
    logMobEvent(`migrated drowned target=${spawned.typeId}#${spawned.id}`);
});
