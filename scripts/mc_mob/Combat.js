//these lists were generated with AI because i was too lazy to type it all out myself
export const PASSIVE_MOBS = [
    "minecraft:allay",
    "minecraft:armadillo",
    "minecraft:bat",
    "minecraft:camel",
    "minecraft:camel_husk",
    "minecraft:chicken",
    "minecraft:cod",
    "minecraft:cow",
    "minecraft:donkey",
    "minecraft:frog",
    "minecraft:glow_squid",
    "minecraft:happy_ghast",
    "minecraft:horse",
    "minecraft:mooshroom",
    "minecraft:mule",
    "minecraft:parrot",
    "minecraft:pig",
    "minecraft:rabbit",
    "minecraft:salmon",
    "minecraft:sheep",
    "minecraft:skeleton_horse",
    "minecraft:sniffer",
    "minecraft:squid",
    "minecraft:strider",
    "minecraft:tadpole",
    "minecraft:tropicalfish",
    "minecraft:turtle",
    "minecraft:villager",
    "minecraft:villager_v2",
    "minecraft:wandering_trader",
    "minecraft:zombie_horse",
];
export const AGGRESSIVE_MOBS = [
    "minecraft:axolotl",
    "minecraft:bee",
    "minecraft:blaze",
    "minecraft:bogged",
    "minecraft:breeze",
    "minecraft:cat",
    "minecraft:cave_spider",
    "minecraft:copper_golem",
    "minecraft:creaking",
    "minecraft:creeper",
    "minecraft:dolphin",
    "minecraft:drowned",
    "minecraft:elder_guardian",
    "minecraft:ender_dragon",
    "minecraft:enderman",
    "minecraft:endermite",
    "minecraft:evocation_illager",
    "minecraft:fox",
    "minecraft:ghast",
    "minecraft:goat",
    "minecraft:guardian",
    "minecraft:hoglin",
    "minecraft:husk",
    "minecraft:iron_golem",
    "minecraft:llama",
    "minecraft:magma_cube",
    "minecraft:nautilus",
    "minecraft:ocelot",
    "minecraft:panda",
    "minecraft:parched",
    "minecraft:phantom",
    "minecraft:piglin",
    "minecraft:piglin_brute",
    "minecraft:pillager",
    "minecraft:polar_bear",
    "minecraft:pufferfish",
    "minecraft:ravager",
    "minecraft:shulker",
    "minecraft:silverfish",
    "minecraft:skeleton",
    "minecraft:slime",
    "minecraft:snow_golem",
    "minecraft:spider",
    "minecraft:stray",
    "minecraft:sulfur_cube",
    "minecraft:trader_llama",
    "minecraft:vex",
    "minecraft:vindicator",
    "minecraft:warden",
    "minecraft:witch",
    "minecraft:wither",
    "minecraft:wither_skeleton",
    "minecraft:wolf",
    "minecraft:zoglin",
    "minecraft:zombie",
    "minecraft:zombie_nautilus",
    "minecraft:zombie_pigman",
    "minecraft:zombie_villager",
    "minecraft:zombie_villager_v2",
];
const passiveMobs = new Set(PASSIVE_MOBS);
const aggressiveMobs = new Set(AGGRESSIVE_MOBS);
export function getMobDisposition(typeId) {
    if (aggressiveMobs.has(typeId))
        return "aggressive";
    if (passiveMobs.has(typeId))
        return "passive";
    return undefined;
}
export function canAccessDamageComponent(typeId) {
    return getMobDisposition(typeId) === "aggressive";
}
export function assertDamageComponentAccess(typeId) {
    const disposition = getMobDisposition(typeId);
    if (disposition === "aggressive")
        return;
    if (disposition === "passive") {
        throw new Error(`Passive mob "${typeId}" cannot define a custom damage component.`);
    }
    throw new Error(`Mob "${typeId}" must be classified before it can define a custom damage component.`);
}
