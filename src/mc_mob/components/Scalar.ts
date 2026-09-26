import {
    applyModifiers,
    EntityComponent,
    ComponentId,
    ComponentIds,
    ComponentModifier,
    ModifierOperation,
} from "mc_mob/components/Component";

type ScalarData = { v: 1; modifiers: ComponentModifier[] };

export class NumericComponent<Id extends ComponentId> extends EntityComponent<ScalarData, Id> {
    constructor(id: Id, private readonly baseValue: number) {
        super(id, id, { v: 1, modifiers: [] });
    }

    public getValue(): number {
        return applyModifiers(this.baseValue, this.get("modifiers"), "value");
    }

    public setValue(value: number): this {
        return this.setModifier("runtime:value", "value", "set", value);
    }

    public setModifier(id: string, property: string, op: ModifierOperation, value: number): this {
        const modifiers = this.get("modifiers").filter((modifier) => modifier.id !== id);
        modifiers.push({ id, target: { component: this.key, property }, op, value });
        return this.set("modifiers", modifiers);
    }

    public getModifiers(): ComponentModifier[] {
        return this.get("modifiers").map((modifier) => ({ ...modifier, target: { ...modifier.target } }));
    }

    public removeModifier(id: string): this {
        return this.set("modifiers", this.get("modifiers").filter((modifier) => modifier.id !== id));
    }
}

export type ScalarComponentId = typeof ComponentIds.xp | typeof ComponentIds.speed;

export class ScalarComponent<Id extends ScalarComponentId> extends NumericComponent<Id> {}

export class LevelComponent extends NumericComponent<typeof ComponentIds.level> {
    constructor(baseLevel: number) {
        super(ComponentIds.level, baseLevel);
    }

    public setLevel(value: number): this { return this.setValue(value); }
    public getLevel(): number { return super.getValue(); }
    public getValue(): number { return this.getLevel(); }
}
