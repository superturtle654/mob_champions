import { system, world } from "@minecraft/server";
import { EntityComponent, ComponentIds } from "mc_mob/components/Component";
import { ManagedEntity } from "mc_mob/ManagedEntity";
import { EntityRegistry } from "mc_mob/Registry";
import { EntityStore } from "mc_mob/storage/index";

export type SpawnEntityConfig = {
    minWaitTime?: number;
    maxWaitTime?: number;
    amount?: number;
    singleUse?: boolean;
    radius?: number;
    overrideGamerules?: boolean;
};

type SpawnEntityContext = {
    profileId: string;
    typeId: string;
};

type SpawnEntityData = {
    used: boolean;
};

export class SpawnEntityComponent extends EntityComponent<SpawnEntityData, typeof ComponentIds.spawnEntity> {
    private nextSpawnTick = 0;
    private readonly minWaitTicks: number;
    private readonly maxWaitTicks: number;
    private readonly amount: number;
    private readonly singleUse: boolean;
    private readonly radius: number;
    private readonly overrideGamerules: boolean;

    public constructor(
        config: SpawnEntityConfig,
        private readonly context: SpawnEntityContext,
    ) {
        const minWaitTime = Math.max(0, config.minWaitTime ?? 300);
        const maxWaitTime = Math.max(minWaitTime, config.maxWaitTime ?? 600);
        super(ComponentIds.spawnEntity, ComponentIds.spawnEntity, { used: false }, config);
        this.minWaitTicks = Math.round(minWaitTime * 20);
        this.maxWaitTicks = Math.round(maxWaitTime * 20);
        this.amount = Math.max(1, Math.floor(config.amount ?? 1));
        this.singleUse = config.singleUse ?? false;
        this.radius = Math.max(0, config.radius ?? 0);
        this.overrideGamerules = config.overrideGamerules ?? false;
    }

    protected onAttach(): void {
        this.scheduleNext();
    }

    public update(currentTick: number): void {
        if (!this.entity.isValid || (this.singleUse && this.get("used"))) return;
        if (currentTick < this.nextSpawnTick) return;
        if (!this.overrideGamerules && !world.gameRules.doMobSpawning) return;

        const Profile = EntityRegistry.get(this.context.profileId);
        if (!Profile || Profile.typeId !== this.context.typeId) return;

        for (let index = 0; index < this.amount; index++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * this.radius;
            ManagedEntity.spawn(this.entity.dimension, {
                x: this.entity.location.x + Math.cos(angle) * distance,
                y: this.entity.location.y,
                z: this.entity.location.z + Math.sin(angle) * distance,
            }, Profile);
        }

        if (this.singleUse) this.set("used", true);
        else this.scheduleNext();
    }

    private scheduleNext(): void {
        const range = this.maxWaitTicks - this.minWaitTicks;
        this.nextSpawnTick = system.currentTick + this.minWaitTicks + Math.floor(Math.random() * (range + 1));
    }
}

system.runInterval(() => {
    for (const entity of EntityStore.values()) {
        entity.getComponent(SpawnEntityComponent)?.update(system.currentTick);
    }
}, 1);
