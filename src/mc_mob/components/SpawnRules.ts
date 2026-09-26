import { Entity, world } from "@minecraft/server";
import { ManagedEntity } from "mc_mob/ManagedEntity";
import { EntityConstructor, EntityRegistry } from "mc_mob/Registry";
import { EntityStore } from "mc_mob/storage/index";
import { ComponentIds, EntityComponent } from "mc_mob/components/Component";

export type SpawnRulesConfig = {
    chance: number;
    overrideGamerules?: boolean;
    dimensions?: string[];
    biomes?: string[];
    height?: { min?: number; max?: number };
    light?: { min?: number; max?: number };
    playerDistance?: { min?: number; max?: number };
    density?: { radius: number; maximum: number };
};

export class SpawnRulesComponent extends EntityComponent<{}, typeof ComponentIds.spawnRules> {
    public constructor(config: SpawnRulesConfig) {
        super(ComponentIds.spawnRules, ComponentIds.spawnRules, {}, config);
    }

    public shouldSerialize(): boolean {
        return false;
    }
}

export function assignSpawnProfile(
    entity: Entity,
    roll = Math.random() * 100,
): EntityConstructor | undefined {
    if (!entity.isValid || entity.typeId === "minecraft:player") return undefined;
    if (EntityStore.get(entity.id) || EntityStore.hasSavedState(entity)) return undefined;

    const candidates = [...EntityRegistry.values()].filter((Profile) =>
        Profile.typeId === entity.typeId
        && matchesSpawnRules(entity, Profile)
    );

    let threshold = 0;
    for (const Profile of candidates) {
        threshold += Profile.definition.components.spawnRules?.chance ?? 0;
        if (roll >= Math.min(threshold, 100)) continue;
        return ManagedEntity.attach(entity, Profile) ? Profile : undefined;
    }
    return undefined;
}

function matchesSpawnRules(entity: Entity, Profile: EntityConstructor): boolean {
    const rules = Profile.definition.components.spawnRules;
    if (!rules || rules.chance <= 0) return false;
    if (!rules.overrideGamerules && !world.gameRules.doMobSpawning) return false;

    try {
        const { location, dimension } = entity;
        if (rules.dimensions?.length && !rules.dimensions.includes(dimension.id)) return false;
        if (rules.height?.min !== undefined && location.y < rules.height.min) return false;
        if (rules.height?.max !== undefined && location.y > rules.height.max) return false;

        if (rules.light) {
            const light = dimension.getLightLevel(location);
            if (rules.light.min !== undefined && light < rules.light.min) return false;
            if (rules.light.max !== undefined && light > rules.light.max) return false;
        }

        if (rules.biomes?.length) {
            const biome = dimension.getBiome(location).id;
            if (!rules.biomes.includes(biome)) return false;
        }

        if (rules.playerDistance) {
            const players = dimension.getPlayers();
            const distances = players.map((player) => distance(player.location, location));
            if (rules.playerDistance.min !== undefined
                && distances.some((value) => value < rules.playerDistance!.min!)) return false;
            if (rules.playerDistance.max !== undefined
                && !distances.some((value) => value <= rules.playerDistance!.max!)) return false;
        }

        if (rules.density) {
            const nearby = dimension.getEntities({
                type: Profile.typeId,
                location,
                maxDistance: rules.density.radius,
            });
            if (nearby.length > rules.density.maximum) return false;
        }
        return true;
    } catch (error) {
        console.warn(`[SpawnRules:${Profile.profileId}]`, error);
        return false;
    }
}

function distance(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }): number {
    return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}
