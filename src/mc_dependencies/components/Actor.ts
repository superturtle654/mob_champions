import { Entity } from "@minecraft/server";
import {
    Component,
    ComponentId,
    ComponentIds,
    ComponentModifier,
    DamagePacket,
    DamageProviderComponent,
    HealthPoolComponent,
    isDamageProviderComponent,
    isHealthPoolComponent,
    isModifiableComponent,
    isObservableComponent,
    isReadableValueComponent,
    isRuntimeModifiableComponent,
} from "mc_dependencies/components/Component";
import { HealthComponent } from "mc_dependencies/components/Health";
import {
    applyNativeHealth,
    calculateDamage as calculateComponentDamage,
    getDamagePacket as getComponentDamagePacket,
    getNativeCurrentHealth as getComponentNativeCurrentHealth,
    getNativeDamage as getComponentNativeDamage,
    getPrimaryHealth,
} from "mc_dependencies/components/Host";

export type SavedComponent = { key: string; id?: string; data: any };

export type HealthState = {
    id: string;
    current: number;
    max: number;
};

export type ActorComponentTree<Target extends Entity> =
    Partial<Record<ComponentId, Record<string, Component<any, Target>>>> & {
        health?: Record<string, Component<any, Target> & HealthPoolComponent>;
        damage?: Record<string, Component<any, Target> & DamageProviderComponent>;
    };

export abstract class ComponentActor<Target extends Entity> {
    protected target: Target;
    protected readonly componentList: Component<any, Target>[] = [];
    public readonly components: ActorComponentTree<Target> = Object.create(null);

    private healthSyncPaused = 0;
    private healthSyncPending = false;

    protected constructor(target: Target, initialComponents: Component<any, Target>[] = []) {
        this.target = target;
        for (const component of initialComponents) this.addComponent(component);
    }

    public get nativeEntity(): Target {
        return this.target;
    }

    protected replaceNativeEntity(target: Target): void {
        if (this.target === target) return;
        this.target = target;
        for (const component of this.componentList) component.attach(target);
        this.applyHealth();
    }

    protected addComponent(component: Component<any, Target>): this {
        if (this.getComponentById(component.key, component.instanceId)) {
            throw new Error(`Duplicate component: ${component.identity}`);
        }
        this.componentList.push(component);
        ((this.components[component.key] ??= Object.create(null)) as Record<string, Component<any, Target>>)[component.instanceId] = component;
        if (component.key === ComponentIds.health && isObservableComponent(component)) {
            component.bindChangeHandler(() => this.requestHealthSync());
        }
        component.attach(this.target);
        return this;
    }

    public hydrateComponents(saved: SavedComponent[]): void {
        this.pauseHealthSync();
        this.healthSyncPending = true;
        try {
            for (const payload of saved ?? []) {
                this.getComponentById(payload.key, payload.id ?? payload.key)?.hydrate(payload.data);
            }
            this.clampHealth();
        } finally {
            this.resumeHealthSync();
        }
    }

    public getComponent<T extends Component<any, Target>>(ctor: new (...args: any[]) => T): T | undefined {
        return this.componentList.find((component) => component instanceof ctor) as T | undefined;
    }

    public getComponents<T extends Component<any, Target>>(ctor: new (...args: any[]) => T): T[] {
        return this.componentList.filter((component) => component instanceof ctor) as T[];
    }

    public getNamedComponent<T extends Component<any, Target>>(
        ctor: new (...args: any[]) => T,
        instanceId: string,
    ): T | undefined {
        return this.componentList.find(
            (component) => component instanceof ctor && component.instanceId === instanceId
        ) as T | undefined;
    }

    public getComponentById(key: ComponentId, instanceId: string = key): Component<any, Target> | undefined {
        return this.components[key]?.[instanceId];
    }

    public getComponentsById(key: ComponentId): Component<any, Target>[] {
        return this.componentList.filter((component) => component.key === key);
    }

    public getCurrentHealth(): number | undefined {
        return this.getMainHealth()?.getCurrentValue();
    }

    public getMaxHealth(): number | undefined {
        return this.getMainHealth()?.getMaxValue();
    }

    public getTotalCurrentHealth(): number | undefined {
        const health = this.getHealthComponents();
        return health.length ? health.reduce((total, component) => total + component.getCurrentValue(), 0) : undefined;
    }

    public getTotalMaxHealth(): number | undefined {
        const health = this.getHealthComponents();
        return health.length ? health.reduce((total, component) => total + component.getMaxValue(), 0) : undefined;
    }

    public getHealthState(): HealthState[] {
        return this.getHealthComponents().map((health) => ({
            id: health.instanceId,
            current: health.getCurrentValue(),
            max: health.getMaxValue(),
        }));
    }

    public getDamage(): number | undefined {
        const damage = this.getDamageComponents();
        return damage.length ? damage.reduce((total, component) => total + component.getDamage(), 0) : undefined;
    }

    public getDamagePacket(): DamagePacket | undefined {
        return getComponentDamagePacket(this);
    }

    public getLevel(): number | undefined {
        const level = this.getComponentById(ComponentIds.level);
        return isReadableValueComponent(level) ? level.getValue() : undefined;
    }

    public addModifier(modifier: ComponentModifier): void {
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

    public removeModifier(id: string): void {
        const oldHealth = this.getCurrentHealth();
        const oldMaxHealth = this.getMaxHealth();
        for (const component of this.componentList) {
            if (isModifiableComponent(component)) component.removeModifier(id);
        }
        this.notifyHealthChange(oldHealth, oldMaxHealth);
    }

    public clearModifiers(): void {
        for (const modifier of this.getModifiers()) this.removeModifier(modifier.id);
    }

    public getModifiers(): ComponentModifier[] {
        return this.componentList.flatMap((component) =>
            isModifiableComponent(component) ? component.getModifiers() : []
        );
    }

    public calculateIncomingDamage(amount: number): number {
        return this.calculateDamage({ amount, type: "vanilla", tags: ["vanilla"] });
    }

    public calculateDamage(packet: DamagePacket): number {
        return calculateComponentDamage(this, packet);
    }

    public isFatalDamage(amount: number): boolean {
        const health = this.getCurrentHealth();
        return health !== undefined && amount >= health;
    }

    public modifyHealth(amount: number): void {
        const health = this.getMainHealth();
        if (!health) return;
        const oldHealth = health.getCurrentValue();
        health.setCurrentValue(oldHealth + amount);
        const newHealth = health.getCurrentValue();
        if (oldHealth !== newHealth) this.onHealthChanged(oldHealth, newHealth);
    }

    public heal(amount: number): void {
        this.modifyHealth(Math.max(0, amount));
    }

    public applyDamage(amount: number): void {
        this.modifyHealth(-Math.max(0, amount));
    }

    public applyDamagePacket(packet: DamagePacket): void {
        this.applyDamage(this.calculateDamage(packet));
    }

    public getRegeneration(): number {
        return this.getMainHealth()?.getRegeneration() ?? 0;
    }

    public getRegenerationTime(): number {
        return this.getMainHealth()?.getRegenerationTime() ?? 20;
    }

    public applyHealth(): void {
        applyNativeHealth(this);
    }

    public getNativeDamage(customDamage: number): number {
        return getComponentNativeDamage(this, customDamage);
    }

    public getNativeCurrentHealth(): number | undefined {
        return getComponentNativeCurrentHealth(this);
    }

    public clearRuntimeStats(sourcePrefix: string): this {
        for (const component of this.componentList) {
            if (isRuntimeModifiableComponent(component)) component.clearRuntimeModifiers(sourcePrefix);
        }
        return this;
    }

    public addRuntimeStat(source: string, target: string, value: number): this {
        if (!Number.isFinite(value) || value === 0) return this;
        this.addTargetedRuntimeStat(source, target, value);
        return this;
    }

    public clampHealth(): this {
        const health = this.getMainHealth();
        if (health instanceof HealthComponent) health.clampCurrent();
        return this;
    }

    public initializeComponents(): void {
        for (const component of this.componentList) component.attach(this.target);
    }

    public flushComponents(): void {
        for (const component of this.componentList) component.clearDirty();
    }

    public hasDirtyComponents(): boolean {
        return this.componentList.some((component) => component.shouldSerialize() && component.isDirty());
    }

    protected onComponentsSpawn(...args: any[]): void {
        for (const component of this.componentList) component.onSpawn(...args);
    }

    protected getSerializableComponents(): Component<any, Target>[] {
        return this.componentList.filter((component) => component.shouldSerialize());
    }

    protected getMainHealth(): (Component<any, Target> & HealthPoolComponent) | undefined {
        return getPrimaryHealth(this) as (Component<any, Target> & HealthPoolComponent) | undefined;
    }

    protected onHealthChanged(_oldHealth: number, _newHealth: number): void {}

    private addTargetedRuntimeStat(source: string, target: string, value: number): void {
        const [componentId, instanceId, rawProperty, ...extra] = target.split(".");
        if (!componentId || !instanceId || !rawProperty || extra.length) {
            console.warn(`[ComponentActor] Ignored invalid item stat target "${target}". Expected component.instance.property.`);
            return;
        }

        const component = this.getComponentById(componentId, instanceId);
        if (!isRuntimeModifiableComponent(component)) return;
        const property = componentId === ComponentIds.health && rawProperty === "value"
            ? "max"
            : rawProperty;
        component.setRuntimeModifier(source, property, "add", value);
    }

    private getHealthComponents(): Array<Component<any, Target> & HealthPoolComponent> {
        return this.getComponentsById(ComponentIds.health)
            .filter(isHealthPoolComponent) as Array<Component<any, Target> & HealthPoolComponent>;
    }

    private getDamageComponents(): Array<Component<any, Target> & DamageProviderComponent> {
        return this.getComponentsById(ComponentIds.damage)
            .filter(isDamageProviderComponent) as Array<Component<any, Target> & DamageProviderComponent>;
    }

    private notifyHealthChange(oldHealth?: number, oldMaxHealth?: number): void {
        const health = this.getCurrentHealth();
        const maxHealth = this.getMaxHealth();
        if (health === oldHealth && maxHealth === oldMaxHealth) return;
        this.onHealthChanged(oldHealth ?? health ?? 0, health ?? 0);
    }

    private requestHealthSync(): void {
        if (this.healthSyncPaused > 0) {
            this.healthSyncPending = true;
            return;
        }
        this.applyHealth();
    }

    private pauseHealthSync(): void {
        this.healthSyncPaused++;
    }

    private resumeHealthSync(): void {
        this.healthSyncPaused = Math.max(0, this.healthSyncPaused - 1);
        if (this.healthSyncPaused > 0 || !this.healthSyncPending) return;
        this.healthSyncPending = false;
        this.applyHealth();
    }
}
