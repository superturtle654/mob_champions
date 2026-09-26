import { EntityComponentTypes, } from "@minecraft/server";
import { ComponentIds, isDamageProviderComponent, isHealthPoolComponent, } from "./Component.js";
export function getHealthComponents(host) {
    return host.getComponentsById(ComponentIds.health)
        .filter(isHealthPoolComponent);
}
export function getPrimaryHealth(host) {
    let first;
    for (const component of host.getComponentsById(ComponentIds.health)) {
        if (!isHealthPoolComponent(component))
            continue;
        if (component.instanceId === "vanilla")
            return component;
        first ??= component;
    }
    return first;
}
export function getDamageComponents(host) {
    return host.getComponentsById(ComponentIds.damage)
        .filter(isDamageProviderComponent);
}
export function getDamagePacket(host) {
    const parts = getDamageComponents(host)
        .map((component) => component.getPacket())
        .filter((packet) => packet.amount > 0);
    if (!parts.length)
        return undefined;
    if (parts.length === 1)
        return parts[0];
    return {
        amount: parts.reduce((total, packet) => total + packet.amount, 0),
        type: "mixed",
        tags: [...new Set(parts.flatMap((packet) => packet.tags ?? []))],
        parts,
    };
}
export function calculateDamage(host, packet) {
    if (packet.parts?.length) {
        return packet.parts.reduce((total, part) => total + calculateDamage(host, part), 0);
    }
    return Math.max(0, packet.amount);
}
export function applyNativeHealth(host) {
    const native = getNativeHealth(host);
    const health = getPrimaryHealth(host);
    if (!native || !health)
        return;
    const max = health.getMaxValue();
    if (max <= 0)
        return;
    native.setCurrentValue(native.effectiveMax * Math.min(1, Math.max(0, health.getCurrentValue() / max)));
}
export function getNativeDamage(host, customDamage) {
    const native = getNativeHealth(host);
    const health = getPrimaryHealth(host);
    if (!native || !health)
        return Math.max(0, customDamage);
    const max = health.getMaxValue();
    if (max <= 0)
        return Math.max(0, customDamage);
    return Math.max(0, customDamage) * native.effectiveMax / max;
}
export function getNativeCurrentHealth(host) {
    return getNativeHealth(host)?.currentValue;
}
export function getNativeHealth(host) {
    return host.nativeEntity.getComponent(EntityComponentTypes.Health);
}
