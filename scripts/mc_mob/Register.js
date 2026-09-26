import { registerActorProvider } from "../mc_dependencies/Actors.js";
import { registerEquipmentSourceProvider } from "../mc_dependencies/Equipment.js";
import { EntityStore } from "./storage/index.js";
import { createEntityEquipmentSource } from "./Equipment.js";
registerActorProvider({
    get: (entity) => EntityStore.get(entity.id),
    attach: (entity) => EntityStore.restore(entity),
    hasSavedState: (entity) => EntityStore.hasSavedState(entity),
    values: () => EntityStore.values(),
});
registerEquipmentSourceProvider({
    values: function* () {
        for (const entity of EntityStore.values())
            yield createEntityEquipmentSource(entity);
    },
});
