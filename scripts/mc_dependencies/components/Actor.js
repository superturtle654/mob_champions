import { ComponentIds, isDamageProviderComponent, isHealthPoolComponent, isModifiableComponent, isObservableComponent, isReadableValueComponent, isRuntimeModifiableComponent, } from "./Component.js";
import { HealthComponent } from "./Health.js";
import { applyNativeHealth, calculateDamage as calculateComponentDamage, getDamagePacket as getComponentDamagePacket, getNativeCurrentHealth as getComponentNativeCurrentHealth, getNativeDamage as getComponentNativeDamage, getPrimaryHealth, } from "./Host.js";
export class ComponentActor {
    constructor(target, initialComponents = []) {
        this.componentList = [];
        this.components = Object.create(null);
        this.healthSyncPaused = 0;
        this.healthSyncPending = false;
        this.target = target;
        for (const component of initialComponents)
            this.addComponent(component);
    }
    get nativeEntity() {
        return this.target;
    }
    replaceNativeEntity(target) {
        if (this.target === target)
            return;
        this.target = target;
        for (const component of this.componentList)
            component.attach(target);
        this.applyHealth();
    }
    addComponent(component) {
        if (this.getComponentById(component.key, component.instanceId)) {
            throw new Error(`Duplicate component: ${component.identity}`);
        }
        this.componentList.push(component);
        (this.components[component.key] ??= Object.create(null))[component.instanceId] = component;
        if (component.key === ComponentIds.health && isObservableComponent(component)) {
            component.bindChangeHandler(() => this.requestHealthSync());
        }
        component.attach(this.target);
        return this;
    }
    hydrateComponents(saved) {
        this.pauseHealthSync();
        this.healthSyncPending = true;
        try {
            for (const payload of saved ?? []) {
                this.getComponentById(payload.key, payload.id ?? payload.key)?.hydrate(payload.data);
            }
            this.clampHealth();
        }
        finally {
            this.resumeHealthSync();
        }
    }
    getComponent(ctor) {
        return this.componentList.find((component) => component instanceof ctor);
    }
    getComponents(ctor) {
        return this.componentList.filter((component) => component instanceof ctor);
    }
    getNamedComponent(ctor, instanceId) {
        return this.componentList.find((component) => component instanceof ctor && component.instanceId === instanceId);
    }
    getComponentById(key, instanceId = key) {
        return this.components[key]?.[instanceId];
    }
    getComponentsById(key) {
        return this.componentList.filter((component) => component.key === key);
    }
    getCurrentHealth() {
        return this.getMainHealth()?.getCurrentValue();
    }
    getMaxHealth() {
        return this.getMainHealth()?.getMaxValue();
    }
    getTotalCurrentHealth() {
        const health = this.getHealthComponents();
        return health.length ? health.reduce((total, component) => total + component.getCurrentValue(), 0) : undefined;
    }
    getTotalMaxHealth() {
        const health = this.getHealthComponents();
        return health.length ? health.reduce((total, component) => total + component.getMaxValue(), 0) : undefined;
    }
    getHealthState() {
        return this.getHealthComponents().map((health) => ({
            id: health.instanceId,
            current: health.getCurrentValue(),
            max: health.getMaxValue(),
        }));
    }
    getDamage() {
        const damage = this.getDamageComponents();
        return damage.length ? damage.reduce((total, component) => total + component.getDamage(), 0) : undefined;
    }
    getDamagePacket() {
        return getComponentDamagePacket(this);
    }
    getLevel() {
        const level = this.getComponentById(ComponentIds.level);
        return isReadableValueComponent(level) ? level.getValue() : undefined;
    }
    addModifier(modifier) {
        const oldHealth = this.getCurrentHealth();
        const oldMaxHealth = this.getMaxHealth();
        const targets = modifier.target.instance
            ? [this.getComponentById(modifier.target.component, modifier.target.instance)]
            : this.componentList.filter((component) => component.key === modifier.target.component);
        for (const target of targets) {
            if (isModifiableComponent(target)) {
                target.setModifier(modifier.id, modifier.target.property, modifier.op, modifier.value);
            }
        }
        this.notifyHealthChange(oldHealth, oldMaxHealth);
    }
    removeModifier(id) {
        const oldHealth = this.getCurrentHealth();
        const oldMaxHealth = this.getMaxHealth();
        for (const component of this.componentList) {
            if (isModifiableComponent(component))
                component.removeModifier(id);
        }
        this.notifyHealthChange(oldHealth, oldMaxHealth);
    }
    clearModifiers() {
        for (const modifier of this.getModifiers())
            this.removeModifier(modifier.id);
    }
    getModifiers() {
        return this.componentList.flatMap((component) => isModifiableComponent(component) ? component.getModifiers() : []);
    }
    calculateIncomingDamage(amount) {
        return this.calculateDamage({ amount, type: "vanilla", tags: ["vanilla"] });
    }
    calculateDamage(packet) {
        return calculateComponentDamage(this, packet);
    }
    isFatalDamage(amount) {
        const health = this.getCurrentHealth();
        return health !== undefined && amount >= health;
    }
    modifyHealth(amount) {
        const health = this.getMainHealth();
        if (!health)
            return;
        const oldHealth = health.getCurrentValue();
        health.setCurrentValue(oldHealth + amount);
        const newHealth = health.getCurrentValue();
        if (oldHealth !== newHealth)
            this.onHealthChanged(oldHealth, newHealth);
    }
    heal(amount) {
        this.modifyHealth(Math.max(0, amount));
    }
    applyDamage(amount) {
        this.modifyHealth(-Math.max(0, amount));
    }
    applyDamagePacket(packet) {
        this.applyDamage(this.calculateDamage(packet));
    }
    getRegeneration() {
        return this.getMainHealth()?.getRegeneration() ?? 0;
    }
    getRegenerationTime() {
        return this.getMainHealth()?.getRegenerationTime() ?? 20;
    }
    applyHealth() {
        applyNativeHealth(this);
    }
    getNativeDamage(customDamage) {
        return getComponentNativeDamage(this, customDamage);
    }
    getNativeCurrentHealth() {
        return getComponentNativeCurrentHealth(this);
    }
    clearRuntimeStats(sourcePrefix) {
        for (const component of this.componentList) {
            if (isRuntimeModifiableComponent(component))
                component.clearRuntimeModifiers(sourcePrefix);
        }
        return this;
    }
    addRuntimeStat(source, target, value) {
        if (!Number.isFinite(value) || value === 0)
            return this;
        this.addTargetedRuntimeStat(source, target, value);
        return this;
    }
    clampHealth() {
        const health = this.getMainHealth();
        if (health instanceof HealthComponent)
            health.clampCurrent();
        return this;
    }
    initializeComponents() {
        for (const component of this.componentList)
            component.attach(this.target);
    }
    flushComponents() {
        for (const component of this.componentList)
            component.clearDirty();
    }
    hasDirtyComponents() {
        return this.componentList.some((component) => component.shouldSerialize() && component.isDirty());
    }
    onComponentsSpawn(...args) {
        for (const component of this.componentList)
            component.onSpawn(...args);
    }
    getSerializableComponents() {
        return this.componentList.filter((component) => component.shouldSerialize());
    }
    getMainHealth() {
        return getPrimaryHealth(this);
    }
    onHealthChanged(_oldHealth, _newHealth) { }
    addTargetedRuntimeStat(source, target, value) {
        const [componentId, instanceId, rawProperty, ...extra] = target.split(".");
        if (!componentId || !instanceId || !rawProperty || extra.length) {
            console.warn(`[ComponentActor] Ignored invalid item stat target "${target}". Expected component.instance.property.`);
            return;
        }
        const component = this.getComponentById(componentId, instanceId);
        if (!isRuntimeModifiableComponent(component))
            return;
        const property = componentId === ComponentIds.health && rawProperty === "value"
            ? "max"
            : rawProperty;
        component.setRuntimeModifier(source, property, "add", value);
    }
    getHealthComponents() {
        return this.getComponentsById(ComponentIds.health)
            .filter(isHealthPoolComponent);
    }
    getDamageComponents() {
        return this.getComponentsById(ComponentIds.damage)
            .filter(isDamageProviderComponent);
    }
    notifyHealthChange(oldHealth, oldMaxHealth) {
        const health = this.getCurrentHealth();
        const maxHealth = this.getMaxHealth();
        if (health === oldHealth && maxHealth === oldMaxHealth)
            return;
        this.onHealthChanged(oldHealth ?? health ?? 0, health ?? 0);
    }
    requestHealthSync() {
        if (this.healthSyncPaused > 0) {
            this.healthSyncPending = true;
            return;
        }
        this.applyHealth();
    }
    pauseHealthSync() {
        this.healthSyncPaused++;
    }
    resumeHealthSync() {
        this.healthSyncPaused = Math.max(0, this.healthSyncPaused - 1);
        if (this.healthSyncPaused > 0 || !this.healthSyncPending)
            return;
        this.healthSyncPending = false;
        this.applyHealth();
    }
}
