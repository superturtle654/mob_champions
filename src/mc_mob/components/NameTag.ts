import { Player } from "@minecraft/server";
import { EntityComponent, ComponentIds } from "mc_mob/components/Component";

export type NameTagConfig = {
    name?: string;
    renderDistance?: number;
    depthTested?: boolean;
};

interface NameTagData {
    v: 1;
    tag: string;
}

export class NameTagComponent extends EntityComponent<NameTagData, typeof ComponentIds.nameTag> {
    private renderDistance?: number;
    private depthTested?: boolean;

    constructor(config: NameTagConfig = {}) {
        super(ComponentIds.nameTag, ComponentIds.nameTag, {
            v: 1,
            tag: config.name ?? "",
        });
        this.renderDistance = normalizeRenderDistance(config.renderDistance);
        this.depthTested = config.depthTested;
    }

    protected onAttach(): void {
        this.apply();
    }

    public onSpawn(): void {
        this.apply();
    }

    public apply(): void {
        this.entity.nameTag = this.get("tag");
        this.applyPlayerSettings();
    }

    public setName(value: string): this {
        this.entity.nameTag = value;
        return this.set("tag", value);
    }

    public getName(): string {
        return this.entity?.nameTag ?? this.get("tag");
    }

    public setRenderDistance(value?: number): this {
        this.renderDistance = normalizeRenderDistance(value);
        this.applyPlayerSettings();
        return this;
    }

    public getRenderDistance(): number | undefined {
        return this.renderDistance;
    }

    public setDepthTested(value?: boolean): this {
        this.depthTested = value;
        this.applyPlayerSettings();
        return this;
    }

    public getDepthTested(): boolean | undefined {
        return this.depthTested;
    }

    public hydrate(data: Partial<NameTagData> | undefined): void {
        super.hydrate(data);
        this.apply();
        this.clearDirty();
    }

    private applyPlayerSettings(): void {
        if (!(this.entity instanceof Player)) return;
        try {
            if (this.renderDistance !== undefined) {
                this.entity.nameplateRenderDistance = this.renderDistance;
            }
            if (this.depthTested !== undefined) {
                this.entity.nameplateDepthTested = this.depthTested;
            }
        } catch (error) {
            console.warn(`[NameTagComponent] Could not apply player nameplate settings.`, error);
        }
    }
}

function normalizeRenderDistance(value?: number): number | undefined {
    if (value === undefined) return undefined;
    if (!Number.isFinite(value)) throw new RangeError("Nameplate render distance must be a finite number.");
    return Math.max(0, value);
}
