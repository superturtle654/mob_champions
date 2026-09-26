import { applyModifiers, EntityComponent, ComponentIds, } from "./Component.js";
export class NumericComponent extends EntityComponent {
    constructor(id, baseValue) {
        super(id, id, { v: 1, modifiers: [] });
        this.baseValue = baseValue;
    }
    getValue() {
        return applyModifiers(this.baseValue, this.get("modifiers"), "value");
    }
    setValue(value) {
        return this.setModifier("runtime:value", "value", "set", value);
    }
    setModifier(id, property, op, value) {
        const modifiers = this.get("modifiers").filter((modifier) => modifier.id !== id);
        modifiers.push({ id, target: { component: this.key, property }, op, value });
        return this.set("modifiers", modifiers);
    }
    getModifiers() {
        return this.get("modifiers").map((modifier) => ({ ...modifier, target: { ...modifier.target } }));
    }
    removeModifier(id) {
        return this.set("modifiers", this.get("modifiers").filter((modifier) => modifier.id !== id));
    }
}
export class ScalarComponent extends NumericComponent {
}
export class LevelComponent extends NumericComponent {
    constructor(baseLevel) {
        super(ComponentIds.level, baseLevel);
    }
    setLevel(value) { return this.setValue(value); }
    getLevel() { return super.getValue(); }
    getValue() { return this.getLevel(); }
}
