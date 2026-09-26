import { Entity } from "@minecraft/server";

export const ComponentIds = {
    attributes: "attributes",
    damage: "damage",
    equipment: "equipment",
    health: "health",
    inventory: "inventory",
    level: "level",
    lootable: "lootable",
    nameTag: "nameTag",
    speed: "speed",
    spawnEntity: "spawnEntity",
    spawnRules: "spawnRules",
    xp: "xp",
} as const;

export type ComponentId = typeof ComponentIds[keyof typeof ComponentIds] | (string & {});
export type ComponentData = Record<string, any>;
export type ComponentDefinition = Readonly<Record<string, unknown>>;

export type DamagePacket = {
    amount: number;
    type?: string;
    tags?: string[];
    parts?: DamagePacket[];
};

export type ModifierOperation = "add" | "multiply" | "set";
export type ModifierTarget = {
    component: ComponentId;
    instance?: string;
    property: string;
};

export type ComponentModifier = {
    id: string;
    target: ModifierTarget;
    op: ModifierOperation;
    value: number;
};

export type ModOp = ModifierOperation;

export interface ModifiableComponent {
    setModifier(id: string, property: string, op: ModifierOperation, value: number): unknown;
    removeModifier(id: string): unknown;
    getModifiers(): ComponentModifier[];
}

export interface RuntimeModifiableComponent {
    setRuntimeModifier(id: string, property: string, op: ModifierOperation, value: number): unknown;
    clearRuntimeModifiers(prefix: string): unknown;
}

export interface ObservableComponent {
    bindChangeHandler(handler: () => void): void;
}

export interface HealthPoolComponent extends ObservableComponent {
    readonly instanceId: string;
    getCurrentValue(): number;
    getMaxValue(): number;
    setCurrentValue(value: number): unknown;
    getRegeneration(): number;
    getRegenerationTime(): number;
}

export interface DamageProviderComponent {
    getDamage(): number;
    getPacket(): DamagePacket;
}

export interface ReadableValueComponent {
    getValue(): number;
}

export function isModifiableComponent(component: unknown): component is ModifiableComponent {
    if (!component || typeof component !== "object") return false;
    const candidate = component as Partial<ModifiableComponent>;
    return typeof candidate.setModifier === "function"
        && typeof candidate.removeModifier === "function"
        && typeof candidate.getModifiers === "function";
}

export function isRuntimeModifiableComponent(component: unknown): component is RuntimeModifiableComponent {
    if (!component || typeof component !== "object") return false;
    const candidate = component as Partial<RuntimeModifiableComponent>;
    return typeof candidate.setRuntimeModifier === "function"
        && typeof candidate.clearRuntimeModifiers === "function";
}

export function isObservableComponent(component: unknown): component is ObservableComponent {
    return Boolean(
        component
        && typeof component === "object"
        && typeof (component as Partial<ObservableComponent>).bindChangeHandler === "function"
    );
}

export function isHealthPoolComponent(component: unknown): component is HealthPoolComponent {
    if (!isObservableComponent(component)) return false;
    const candidate = component as Partial<HealthPoolComponent>;
    return typeof candidate.getCurrentValue === "function"
        && typeof candidate.getMaxValue === "function"
        && typeof candidate.setCurrentValue === "function"
        && typeof candidate.getRegeneration === "function"
        && typeof candidate.getRegenerationTime === "function";
}

export function isDamageProviderComponent(component: unknown): component is DamageProviderComponent {
    if (!component || typeof component !== "object") return false;
    const candidate = component as Partial<DamageProviderComponent>;
    return typeof candidate.getDamage === "function" && typeof candidate.getPacket === "function";
}

export function isReadableValueComponent(component: unknown): component is ReadableValueComponent {
    return Boolean(
        component
        && typeof component === "object"
        && typeof (component as Partial<ReadableValueComponent>).getValue === "function"
    );
}

export function applyModifiers(baseValue: number, modifiers: Iterable<ComponentModifier>, property: string): number {
    let value = baseValue;
    for (const modifier of modifiers) {
        if (modifier.target.property !== property) continue;
        if (modifier.op === "add") value += modifier.value;
        else if (modifier.op === "multiply") value *= modifier.value;
        else value = modifier.value;
    }
    return value;
}

export abstract class Component<
    Data extends ComponentData = {},
    Target extends Entity = Entity,
    Id extends ComponentId = ComponentId,
> {
    protected owner!: Target;
    protected data: Data;
    public readonly definition: ComponentDefinition;
    private attached = false;
    private dirty = false;

    public constructor(
        public readonly key: Id,
        public readonly instanceId: string = key,
        defaultData?: Data,
        definition: ComponentDefinition = {},
    ) {
        this.data = (defaultData ?? {}) as Data;
        this.definition = Object.freeze({ ...definition });
    }

    public get identity(): string {
        return `${this.key}:${this.instanceId}`;
    }

    public attach(target: Target): void {
        if (this.attached && this.owner === target) return;
        this.owner = target;
        this.attached = true;
        this.onAttach();
    }

    protected onAttach(): void {}
    public onSpawn(..._args: any[]): void {}
    public onDeath(_killer?: Entity | null): void {}

    protected get<Field extends keyof Data>(field: Field): Data[Field] {
        return this.data[field];
    }

    protected set<Field extends keyof Data>(field: Field, value: Data[Field]): this {
        if (this.data[field] === value) return this;
        this.data[field] = value;
        this.dirty = true;
        return this;
    }

    public hydrate(data: Partial<Data> | undefined): void {
        if (!data) return;
        this.data = Object.assign({}, this.data, data);
        this.dirty = false;
    }

    public markDirty(): void {
        this.dirty = true;
    }

    public isDirty(): boolean {
        return this.dirty;
    }

    public clearDirty(): void {
        this.dirty = false;
    }

    public shouldSerialize(): boolean {
        return true;
    }

    public toJSON(): { key: Id; id: string; data: Data } {
        return { key: this.key, id: this.instanceId, data: this.data };
    }
}
