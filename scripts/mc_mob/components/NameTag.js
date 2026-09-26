import { Player } from "@minecraft/server";
import { EntityComponent, ComponentIds } from "./Component.js";
export class NameTagComponent extends EntityComponent {
    constructor(config = {}) {
        super(ComponentIds.nameTag, ComponentIds.nameTag, {
            v: 1,
            tag: config.name ?? "",
        });
        this.renderDistance = normalizeRenderDistance(config.renderDistance);
        this.depthTested = config.depthTested;
    }
    onAttach() {
        this.apply();
    }
    onSpawn() {
        this.apply();
    }
    apply() {
        this.entity.nameTag = this.get("tag");
        this.applyPlayerSettings();
    }
    setName(value) {
        this.entity.nameTag = value;
        return this.set("tag", value);
    }
    getName() {
        return this.entity?.nameTag ?? this.get("tag");
    }
    setRenderDistance(value) {
        this.renderDistance = normalizeRenderDistance(value);
        this.applyPlayerSettings();
        return this;
    }
    getRenderDistance() {
        return this.renderDistance;
    }
    setDepthTested(value) {
        this.depthTested = value;
        this.applyPlayerSettings();
        return this;
    }
    getDepthTested() {
        return this.depthTested;
    }
    hydrate(data) {
        super.hydrate(data);
        this.apply();
        this.clearDirty();
    }
    applyPlayerSettings() {
        if (!(this.entity instanceof Player))
            return;
        try {
            if (this.renderDistance !== undefined) {
                this.entity.nameplateRenderDistance = this.renderDistance;
            }
            if (this.depthTested !== undefined) {
                this.entity.nameplateDepthTested = this.depthTested;
            }
        }
        catch (error) {
            console.warn(`[NameTagComponent] Could not apply player nameplate settings.`, error);
        }
    }
}
function normalizeRenderDistance(value) {
    if (value === undefined)
        return undefined;
    if (!Number.isFinite(value))
        throw new RangeError("Nameplate render distance must be a finite number.");
    return Math.max(0, value);
}
