import { MobProfiles as EliteChicken } from "mc_mob/entities/EliteChicken";
import { EntityRegistry } from "mc_mob/Registry";







export const MobProfiles = Object.freeze({
    ...EliteChicken,
});

for (const Profile of Object.values(MobProfiles)) {
    EntityRegistry.register(Profile);
}
