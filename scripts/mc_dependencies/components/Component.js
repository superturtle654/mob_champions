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
};
export function isModifiableComponent(component) {
    if (!component || typeof component !== "object")
        return false;
    const candidate = component;
    return typeof candidate.setModifier === "function"
        && typeof candidate.removeModifier === "function"
        && typeof candidate.getModifiers === "function";
}
export function isRuntimeModifiableComponent(component) {
    if (!component || typeof component !== "object")
        return false;
    const candidate = component;
    return typeof candidate.setRuntimeModifier === "function"
        && typeof candidate.clearRuntimeModifiers === "function";
}
export function isObservableComponent(component) {
    return Boolean(component
        && typeof component === "object"
        && typeof component.bindChangeHandler === "function");
}
export function isHealthPoolComponent(component) {
    if (!isObservableComponent(component))
        return false;
    const candidate = component;
    return typeof candidate.getCurrentValue === "function"
        && typeof candidate.getMaxValue === "function"
        && typeof candidate.setCurrentValue === "function"
        && typeof candidate.getRegeneration === "function"
        && typeof candidate.getRegenerationTime === "function";
}
export function isDamageProviderComponent(component) {
    if (!component || typeof component !== "object")
        return false;
    const candidate = component;
    return typeof candidate.getDamage === "function" && typeof candidate.getPacket === "function";
}
export function isReadableValueComponent(component) {
    return Boolean(component
        && typeof component === "object"
        && typeof component.getValue === "function");
}
export function applyModifiers(baseValue, modifiers, property) {
    let value = baseValue;
    for (const modifier of modifiers) {
        if (modifier.target.property !== property)
            continue;
        if (modifier.op === "add")
            value += modifier.value;
        else if (modifier.op === "multiply")
            value *= modifier.value;
        else
            value = modifier.value;
    }
    return value;
}
export class Component {
    constructor(key, instanceId = key, defaultData, definition = {}) {
        this.key = key;
        this.instanceId = instanceId;
        this.attached = false;
        this.dirty = false;
        this.data = (defaultData ?? {});
        this.definition = Object.freeze({ ...definition });
    }
    get identity() {
        return `${this.key}:${this.instanceId}`;
    }
    attach(target) {
        if (this.attached && this.owner === target)
            return;
        this.owner = target;
        this.attached = true;
        this.onAttach();
    }
    onAttach() { }
    onSpawn(..._args) { }
    onDeath(_killer) { }
    get(field) {
        return this.data[field];
    }
    set(field, value) {
        if (this.data[field] === value)
            return this;
        this.data[field] = value;
        this.dirty = true;
        return this;
    }
    hydrate(data) {
        if (!data)
            return;
        this.data = Object.assign({}, this.data, data);
        this.dirty = false;
    }
    markDirty() {
        this.dirty = true;
    }
    isDirty() {
        return this.dirty;
    }
    clearDirty() {
        this.dirty = false;
    }
    shouldSerialize() {
        return true;
    }
    toJSON() {
        return { key: this.key, id: this.instanceId, data: this.data };
    }
}
