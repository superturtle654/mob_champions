import { world } from "@minecraft/server";
import { EntityStore } from "mc_mob/storage/index";

world.afterEvents.entityLoad.subscribe(({ entity }) => {
    EntityStore.restore(entity);
});
