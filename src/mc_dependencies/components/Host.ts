import {
    Entity,
    EntityComponentTypes,
    EntityHealthComponent,
} from "@minecraft/server";
import {
    Component,
    ComponentIds,
    DamagePacket,
    DamageProviderComponent,
    HealthPoolComponent,
    isDamageProviderComponent,
    isHealthPoolComponent,
} from "mc_dependencies/components/Component";

export interface ComponentHost {
    readonly nativeEntity: Entity;
    getComponentsById(key: string): Component<any, any>[];
}

export function getHealthComponents(host: ComponentHost): Array<Component<any, any> & HealthPoolComponent> {
    return host.getComponentsById(ComponentIds.health)
        .filter(isHealthPoolComponent) as Array<Component<any, any> & HealthPoolComponent>;
}

export function getPrimaryHealth(host: ComponentHost): (Component<any, any> & HealthPoolComponent) | undefined {
    let first: (Component<any, any> & HealthPoolComponent) | undefined;
    for (const component of host.getComponentsById(ComponentIds.health)) {
        if (!isHealthPoolComponent(component)) continue;
        if (component.instanceId === "vanilla") return component;
        first ??= component;
    }
    return first;
}

export function getDamageComponents(host: ComponentHost): Array<Component<any, any> & DamageProviderComponent> {
    return host.getComponentsById(ComponentIds.damage)
        .filter(isDamageProviderComponent) as Array<Component<any, any> & DamageProviderComponent>;
}

export function getDamagePacket(host: ComponentHost): DamagePacket | undefined {
    const parts = getDamageComponents(host)
        .map((component) => component.getPacket())
        .filter((packet) => packet.amount > 0);
    if (!parts.length) return undefined;
    if (parts.length === 1) return parts[0];
    return {
        amount: parts.reduce((total, packet) => total + packet.amount, 0),
        type: "mixed",
        tags: [...new Set(parts.flatMap((packet) => packet.tags ?? []))],
        parts,
    };
}

export function calculateDamage(host: ComponentHost, packet: DamagePacket): number {
    if (packet.parts?.length) {
        return packet.parts.reduce((total, part) => total + calculateDamage(host, part), 0);
    }
    return Math.max(0, packet.amount);
}

export function applyNativeHealth(host: ComponentHost): void {
    const native = getNativeHealth(host);
    const health = getPrimaryHealth(host);
    if (!native || !health) return;
    const max = health.getMaxValue();
    if (max <= 0) return;
    native.setCurrentValue(
        native.effectiveMax * Math.min(1, Math.max(0, health.getCurrentValue() / max))
    );
}

export function getNativeDamage(host: ComponentHost, customDamage: number): number {
    const native = getNativeHealth(host);
    const health = getPrimaryHealth(host);
    if (!native || !health) return Math.max(0, customDamage);
    const max = health.getMaxValue();
    if (max <= 0) return Math.max(0, customDamage);
    return Math.max(0, customDamage) * native.effectiveMax / max;
}

export function getNativeCurrentHealth(host: ComponentHost): number | undefined {
    return getNativeHealth(host)?.currentValue;
}

export function getNativeHealth(host: ComponentHost): EntityHealthComponent | undefined {
    return host.nativeEntity.getComponent(EntityComponentTypes.Health) as EntityHealthComponent | undefined;
}
