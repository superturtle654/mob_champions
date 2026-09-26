import { LootTables } from "mc_mob/components/Lootable";

LootTables.register("EliteChicken", {
    rolls: { min: 1, max: 2 },
    entries: [
        { item: "minecraft:feather", amount: { min: 1, max: 3 }, weight: 6 },
        { item: "minecraft:chicken", amount: 1, weight: 3 },
        { item: "minecraft:emerald", amount: { min: 1, max: 2 }, chance: 0.25, weight: 1 },
    ],
});
