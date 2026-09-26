import {
    applyModifiers,
    Component,
    ComponentIds,
    ComponentModifier,
    ModifierOperation,
} from "mc_dependencies/components/Component";

export type HealthConfig = {

    value?: number;

    max?: number;

    tags?: string[];

    regeneration?: number | `${number}%`;

    regenerationTime?: number;

    [key: string]: unknown;
};

type HealthData = {
    v: 1;
    current: number;
    modifiers: ComponentModifier[];
};

export class HealthComponent extends Component<HealthData, any, typeof ComponentIds.health> {
    private readonly baseMax: number;
    private readonly baseRegeneration: number;
    private readonly percentageRegeneration: boolean;
    private readonly baseRegenerationTime: number;
    private readonly tags: string[];
    private readonly runtimeModifiers = new Map<string, ComponentModifier>();
    private onChange?: () => void;

    public constructor(instanceId: string, config: HealthConfig | number) {
        const normalized = typeof config === "number" ? { value: config } : config;
        const max = Math.max(0, Number(normalized.max ?? normalized.value ?? 0));
        super(
            ComponentIds.health,
            instanceId,
            { v: 1, current: max, modifiers: [] },
            normalized,
        );
        this.baseMax = max;
        const regeneration = parseRegeneration(normalized.regeneration);
        this.baseRegeneration = regeneration.value;
        this.percentageRegeneration = regeneration.percentage;
        this.baseRegenerationTime = normalizeRegenerationTime(normalized.regenerationTime);
        this.tags = normalized.tags?.filter((tag): tag is string => typeof tag === "string") ?? [instanceId];
    }

    public getCurrentValue(): number {
        return this.get("current");
    }

    public setCurrentValue(value: number): this {
        const current = Math.min(Math.max(0, value), this.getMaxValue());
        if (current === this.getCurrentValue()) return this;
        this.set("current", current);
        this.onChange?.();
        return this;
    }

    public getMaxValue(): number {
        return Math.max(0, this.applyAllModifiers(this.baseMax, "max"));
    }

    public setMaxValue(value: number): this {
        return this.setModifier("runtime:max", "max", "set", value);
    }

    public getTags(): string[] {
        return [...this.tags];
    }

    public getRegeneration(): number {
        const base = this.percentageRegeneration
            ? this.getCurrentValue() * this.baseRegeneration
            : this.baseRegeneration;
        return Math.max(0, this.applyAllModifiers(base, "regeneration"));
    }

    public getRegenerationTime(): number {
        return Math.max(1, Math.floor(this.applyAllModifiers(
            this.baseRegenerationTime,
            "regenerationTime",
        )));
    }

    public setModifier(id: string, property: string, op: ModifierOperation, value: number): this {
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

    public removeModifier(id: string): this {
        const modifiers = this.get("modifiers").filter((modifier) => modifier.id !== id);
        if (modifiers.length === this.get("modifiers").length) return this;
        this.set("modifiers", modifiers);
        this.clampCurrent();
        this.onChange?.();
        return this;
    }

    public getModifiers(): ComponentModifier[] {
        return this.get("modifiers").map((modifier) => ({ ...modifier, target: { ...modifier.target } }));
    }

    public setRuntimeModifier(id: string, property: string, op: ModifierOperation, value: number): this {
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

    public clearRuntimeModifiers(prefix: string): this {
        const oldMax = this.getMaxValue();
        const oldCurrent = this.getCurrentValue();
        let changed = false;
        for (const id of this.runtimeModifiers.keys()) {
            if (!id.startsWith(prefix)) continue;
            this.runtimeModifiers.delete(id);
            changed = true;
        }
        if (changed) this.updateCurrentForMaxChange(oldCurrent, oldMax);
        return this;
    }

    public bindChangeHandler(handler: () => void): void {
        this.onChange = handler;
    }

    public clampCurrent(): this {
        if (this.getCurrentValue() > this.getMaxValue()) this.setCurrentValue(this.getMaxValue());
        return this;
    }

    public hydrate(data: Partial<HealthData> | undefined): void {
        if (!data) return;
        super.hydrate({
            v: 1,
            current: typeof data.current === "number" ? Math.max(0, data.current) : this.getCurrentValue(),
            modifiers: Array.isArray(data.modifiers) ? data.modifiers : [],
        });
    }

    public toJSON(): { key: typeof ComponentIds.health; id: string; data: HealthData } {
        return {
            key: this.key,
            id: this.instanceId,
            data: { v: 1, current: this.getCurrentValue(), modifiers: this.getModifiers() },
        };
    }

    private applyAllModifiers(base: number, property: string): number {
        const value = applyModifiers(base, this.get("modifiers"), property);
        return applyModifiers(value, this.runtimeModifiers.values(), property);
    }

    private updateCurrentForMaxChange(oldCurrent: number, oldMax: number): void {
        const max = this.getMaxValue();
        const wasFull = Math.abs(oldCurrent - oldMax) < 0.001;
        this.setCurrentValue(wasFull ? max : Math.min(oldCurrent, max));
        if (this.getCurrentValue() === oldCurrent) this.onChange?.();
    }
}

function parseRegeneration(value: HealthConfig["regeneration"]): { value: number; percentage: boolean } {
    if (typeof value === "string") {
        const match = value.trim().match(/^(\d+(?:\.\d+)?)%$/);
        if (!match) throw new Error(`Invalid regeneration percentage "${value}". Expected a value such as "10%".`);
        return { value: Math.max(0, Number(match[1])) / 100, percentage: true };
    }
    return { value: Math.max(0, Number(value ?? 0)), percentage: false };
}

function normalizeRegenerationTime(value: unknown): number {
    const ticks = Number(value ?? 20);
    if (!Number.isFinite(ticks)) throw new Error("regenerationTime must be a finite number of ticks.");
    return Math.max(1, Math.floor(ticks));
}
