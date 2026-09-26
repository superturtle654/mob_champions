import { ManagedEntity } from "mc_mob/ManagedEntity";
import {
    EquipmentSource,
    getNativeEquipment,
    getNativeStoredItems,
    setNativeEquipment,
} from "mc_dependencies/Equipment";

export function createEntityEquipmentSource(host: ManagedEntity): EquipmentSource {
    return {
        id: `entity:${host.entity.id}`,
        host,
        getEquippedItems: () => getNativeEquipment(host.entity),
        getStoredItems: () => getNativeStoredItems(host.entity),
        setEquippedItem: (slot, item) => setNativeEquipment(host.entity, slot, item),
    };
}
