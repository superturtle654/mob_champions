import { getNativeEquipment, getNativeStoredItems, setNativeEquipment, } from "../mc_dependencies/Equipment.js";
export function createEntityEquipmentSource(host) {
    return {
        id: `entity:${host.entity.id}`,
        host,
        getEquippedItems: () => getNativeEquipment(host.entity),
        getStoredItems: () => getNativeStoredItems(host.entity),
        setEquippedItem: (slot, item) => setNativeEquipment(host.entity, slot, item),
    };
}
