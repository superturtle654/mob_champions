import {
    applyModifiers,
    Component,
    ComponentIds,
    ComponentModifier,
    DamagePacket,
    ModifierOperation,
} from "mc_dependencies/components/Component";

export type DamageConfig = {

    value: number;

    tags?: string[];

    [key: string]: unknown;
};

type DamageData = {
    v: 1;
    modifiers: ComponentModifier[];
};

export class DamageComponent extends Component<DamageData, any, typeof ComponentIds.damage> {
    private readonly baseValue: number;
    private readonly tags: string[];
    private readonly runtimeModifiers = new Map<string, ComponentModifier>();

    public constructor(instanceId: string, config: DamageConfig | number) {
        const normalized = typeof config === "number" ? { value: config } : config;
        super(
            ComponentIds.damage,
            instanceId,
            { v: 1, modifiers: [] },
            normalized,
        );
        this.baseValue = Math.max(0, normalized.value);
        this.tags = normalized.tags?.filter((tag): tag is string => typeof tag === "string") ?? [instanceId];
    }

    public getDamage(): number {
        const value = applyModifiers(this.baseValue, this.get("modifiers"), "value");
        return Math.max(0, applyModifiers(value, this.runtimeModifiers.values(), "value"));
    }

    public setDamage(value: number): this {
        return this.setModifier("runtime:value", "value", "set", value);
    }

    public getPacket(): DamagePacket {
        return {
            amount: this.getDamage(),
            type: this.instanceId,
            tags: [...this.tags],
        };
    }

    public setModifier(id: string, property: string, op: ModifierOperation, value: number): this {
        const modifiers = this.get("modifiers").filter((modifier) => modifier.id !== id);
        modifiers.push({
            id,
            target: { component: ComponentIds.damage, instance: this.instanceId, property },
            op,
            value,
        });
        return this.set("modifiers", modifiers);
    }

    public removeModifier(id: string): this {
        return this.set("modifiers", this.get("modifiers").filter((modifier) => modifier.id !== id));
    }

    public getModifiers(): ComponentModifier[] {
        return this.get("modifiers").map((modifier) => ({ ...modifier, target: { ...modifier.target } }));
    }

    public setRuntimeModifier(id: string, property: string, op: ModifierOperation, value: number): this {
        this.runtimeModifiers.set(id, {
            id,
            target: { component: ComponentIds.damage, instance: this.instanceId, property },
            op,
            value,
        });
        return this;
    }

    public clearRuntimeModifiers(prefix: string): this {
        for (const id of this.runtimeModifiers.keys()) {
            if (id.startsWith(prefix)) this.runtimeModifiers.delete(id);
        }
        return this;
    }

    public hydrate(data: Partial<DamageData> | undefined): void {
        super.hydrate({ v: 1, modifiers: Array.isArray(data?.modifiers) ? data.modifiers : [] });
    }
}
