import { applyModifiers, Component, ComponentIds, } from "./Component.js";
export class HealthComponent extends Component {
    constructor(instanceId, config) {
        const normalized = typeof config === "number" ? { value: config } : config;
        const max = Math.max(0, Number(normalized.max ?? normalized.value ?? 0));
        super(ComponentIds.health, instanceId, { v: 1, current: max, modifiers: [] }, normalized);
        this.runtimeModifiers = new Map();
        this.baseMax = max;
        const regeneration = parseRegeneration(normalized.regeneration);
        this.baseRegeneration = regeneration.value;
        this.percentageRegeneration = regeneration.percentage;
        this.baseRegenerationTime = normalizeRegenerationTime(normalized.regenerationTime);
        this.tags = normalized.tags?.filter((tag) => typeof tag === "string") ?? [instanceId];
    }
    getCurrentValue() {
        return this.get("current");
    }
    setCurrentValue(value) {
        const current = Math.min(Math.max(0, value), this.getMaxValue());
        if (current === this.getCurrentValue())
            return this;
        this.set("current", current);
        this.onChange?.();
        return this;
    }
    getMaxValue() {
        return Math.max(0, this.applyAllModifiers(this.baseMax, "max"));
    }
    setMaxValue(value) {
        return this.setModifier("runtime:max", "max", "set", value);
    }
    getTags() {
        return [...this.tags];
    }
    getRegeneration() {
        const base = this.percentageRegeneration
            ? this.getCurrentValue() * this.baseRegeneration
            : this.baseRegeneration;
        return Math.max(0, this.applyAllModifiers(base, "regeneration"));
    }
    getRegenerationTime() {
        return Math.max(1, Math.floor(this.applyAllModifiers(this.baseRegenerationTime, "regenerationTime")));
    }
    setModifier(id, property, op, value) {
        if (property === "current") {
            const current = this.getCurrentValue();
            return this.setCurrentValue(op === "add" ? current + value : op === "multiply" ? current * value : value);
        }
        const modifiers = this.get("modifiers").filter((modifier) => modifier.id !== id);
        modifiers.push({
            id,
            target: { component: ComponentIds.health, instance: this.instanceId, property },
            op,
            value,
        });
        this.set("modifiers", modifiers);
        this.clampCurrent();
        this.onChange?.();
        return this;
    }
    removeModifier(id) {
        const modifiers = this.get("modifiers").filter((modifier) => modifier.id !== id);
        if (modifiers.length === this.get("modifiers").length)
            return this;
        this.set("modifiers", modifiers);
        this.clampCurrent();
        this.onChange?.();
        return this;
    }
    getModifiers() {
        return this.get("modifiers").map((modifier) => ({ ...modifier, target: { ...modifier.target } }));
    }
    setRuntimeModifier(id, property, op, value) {
        const oldMax = this.getMaxValue();
        const oldCurrent = this.getCurrentValue();
        this.runtimeModifiers.set(id, {
            id,
            target: { component: ComponentIds.health, instance: this.instanceId, property },
            op,
            value,
        });
        this.updateCurrentForMaxChange(oldCurrent, oldMax);
        return this;
    }
    clearRuntimeModifiers(prefix) {
        const oldMax = this.getMaxValue();
        const oldCurrent = this.getCurrentValue();
        let changed = false;
        for (const id of this.runtimeModifiers.keys()) {
            if (!id.startsWith(prefix))
                continue;
            this.runtimeModifiers.delete(id);
            changed = true;
        }
        if (changed)
            this.updateCurrentForMaxChange(oldCurrent, oldMax);
        return this;
    }
    bindChangeHandler(handler) {
        this.onChange = handler;
    }
    clampCurrent() {
        if (this.getCurrentValue() > this.getMaxValue())
            this.setCurrentValue(this.getMaxValue());
        return this;
    }
    hydrate(data) {
        if (!data)
            return;
        super.hydrate({
            v: 1,
            current: typeof data.current === "number" ? Math.max(0, data.current) : this.getCurrentValue(),
            modifiers: Array.isArray(data.modifiers) ? data.modifiers : [],
        });
    }
    toJSON() {
        return {
            key: this.key,
            id: this.instanceId,
            data: { v: 1, current: this.getCurrentValue(), modifiers: this.getModifiers() },
        };
    }
    applyAllModifiers(base, property) {
        const value = applyModifiers(base, this.get("modifiers"), property);
        return applyModifiers(value, this.runtimeModifiers.values(), property);
    }
    updateCurrentForMaxChange(oldCurrent, oldMax) {
        const max = this.getMaxValue();
        const wasFull = Math.abs(oldCurrent - oldMax) < 0.001;
        this.setCurrentValue(wasFull ? max : Math.min(oldCurrent, max));
        if (this.getCurrentValue() === oldCurrent)
            this.onChange?.();
    }
}
function parseRegeneration(value) {
    if (typeof value === "string") {
        const match = value.trim().match(/^(\d+(?:\.\d+)?)%$/);
        if (!match)
            throw new Error(`Invalid regeneration percentage "${value}". Expected a value such as "10%".`);
        return { value: Math.max(0, Number(match[1])) / 100, percentage: true };
    }
    return { value: Math.max(0, Number(value ?? 0)), percentage: false };
}
function normalizeRegenerationTime(value) {
    const ticks = Number(value ?? 20);
    if (!Number.isFinite(ticks))
        throw new Error("regenerationTime must be a finite number of ticks.");
    return Math.max(1, Math.floor(ticks));
}
