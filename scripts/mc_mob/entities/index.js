import { MobProfiles as EliteChicken } from "./EliteChicken.js";
import { EntityRegistry } from "../Registry.js";
export const MobProfiles = Object.freeze({
    ...EliteChicken,
});
for (const Profile of Object.values(MobProfiles)) {
    EntityRegistry.register(Profile);
}
