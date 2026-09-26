import { registerActorProvider } from "mc_dependencies/Actors";
import { registerEquipmentSourceProvider } from "mc_dependencies/Equipment";
import { EntityStore } from "mc_mob/storage/index";
import { createEntityEquipmentSource } from "mc_mob/Equipment";

registerActorProvider({
    get: (entity) => EntityStore.get(entity.id),
    attach: (entity) => EntityStore.restore(entity),
    hasSavedState: (entity) => EntityStore.hasSavedState(entity),
    values: () => EntityStore.values(),
});

registerEquipmentSourceProvider({
    values: function* () {
        for (const entity of EntityStore.values()) yield createEntityEquipmentSource(entity);
    },
});
