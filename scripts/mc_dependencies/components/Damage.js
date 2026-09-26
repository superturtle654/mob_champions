import { applyModifiers, Component, ComponentIds, } from "./Component.js";
export class DamageComponent extends Component {
    constructor(instanceId, config) {
        const normalized = typeof config === "number" ? { value: config } : config;
        super(ComponentIds.damage, instanceId, { v: 1, modifiers: [] }, normalized);
        this.runtimeModifiers = new Map();
        this.baseValue = Math.max(0, normalized.value);
        this.tags = normalized.tags?.filter((tag) => typeof tag === "string") ?? [instanceId];
    }
    getDamage() {
        const value = applyModifiers(this.baseValue, this.get("modifiers"), "value");
        return Math.max(0, applyModifiers(value, this.runtimeModifiers.values(), "value"));
    }
    setDamage(value) {
        return this.setModifier("runtime:value", "value", "set", value);
    }
    getPacket() {
        return {
            amount: this.getDamage(),
            type: this.instanceId,
            tags: [...this.tags],
        };
    }
    setModifier(id, property, op, value) {
        const modifiers = this.get("modifiers").filter((modifier) => modifier.id !== id);
        modifiers.push({
            id,
            target: { component: ComponentIds.damage, instance: this.instanceId, property },
            op,
            value,
        });
        return this.set("modifiers", modifiers);
    }
    removeModifier(id) {
        return this.set("modifiers", this.get("modifiers").filter((modifier) => modifier.id !== id));
    }
    getModifiers() {
        return this.get("modifiers").map((modifier) => ({ ...modifier, target: { ...modifier.target } }));
    }
    setRuntimeModifier(id, property, op, value) {
        this.runtimeModifiers.set(id, {
            id,
            target: { component: ComponentIds.damage, instance: this.instanceId, property },
            op,
            value,
        });
        return this;
    }
    clearRuntimeModifiers(prefix) {
        for (const id of this.runtimeModifiers.keys()) {
            if (id.startsWith(prefix))
                this.runtimeModifiers.delete(id);
        }
        return this;
    }
    hydrate(data) {
        super.hydrate({ v: 1, modifiers: Array.isArray(data?.modifiers) ? data.modifiers : [] });
    }
}
