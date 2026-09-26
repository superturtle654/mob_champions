import {
    DataDrivenEntityTriggerAfterEvent,
    Entity,
    EntityDieAfterEvent,
    EntityHealthChangedAfterEvent,
    EntityHurtAfterEvent,
    EntityHurtBeforeEvent,
    EntityRemoveAfterEvent,
    EntitySpawnAfterEvent,
    ScriptEventCommandMessageAfterEvent,
    system,
} from "@minecraft/server";
import {
    SystemConfig,
    isAttackerDamageOverrideEnabled,
    shouldCancelBlockedHits,
    isDefenderMitigationEnabled,
    isHealthSynchronizationEnabled,
} from "mc_dependencies/Config";
import type { DamagePacket } from "mc_dependencies/components/Component";
import {
    getRuntimeActor,
    hasSavedActorState,
    RuntimeActor,
} from "mc_dependencies/Actors";
import { publish } from "mc_dependencies/events/index";

const pendingDamage = new Map<string, DamagePacket>();
function getCombatActor(entity?: Entity, attach = true): RuntimeActor | undefined {
    return getRuntimeActor(entity, attach);
}

function eventLog(category: keyof typeof SystemConfig.logging, message: string): void {
    if (!SystemConfig.logging.enabled || !SystemConfig.logging[category]) return;
    console.warn(`[MCL:${category}] ${message}`);
}

function entityLabel(entity?: Entity): string {
    if (!entity) return "none";
    return `${entity.typeId}#${entity.id}`;
}

function bypassesCustomDamage(cause?: string): boolean {
    return cause !== undefined && SystemConfig.customDamage.bypassCauses.includes(cause);
}

function formatHealthLayers(entity: RuntimeActor): string {
    return entity.getHealthState()
        .map((layer) => `${layer.id}:${layer.current.toFixed(2)}/${layer.max.toFixed(2)}`)
        .join(",");
}

function beforeHurt(event: EntityHurtBeforeEvent): void {
    const cause = event.damageSource.cause;
    const attacker = event.damageSource.damagingEntity;
    const defender = getCombatActor(event.hurtEntity, false);
    const customAttacker = getCombatActor(attacker, false);

    if (!defender && !customAttacker) return;

    if (!SystemConfig.customDamage.enabled) {
        eventLog("damage", `custom damage disabled, native damage kept for ${entityLabel(event.hurtEntity)}`);
        return;
    }
    if (bypassesCustomDamage(cause)) {
        eventLog("damage", `custom damage bypassed for ${entityLabel(event.hurtEntity)} cause=${cause}`);
        return;
    }
    if (!defender && hasSavedActorState(event.hurtEntity)) {
        event.cancel = true;
        system.run(() => getRuntimeActor(event.hurtEntity, true));
        eventLog("damage", `deferred hit while restoring ${entityLabel(event.hurtEntity)}`);
        return;
    }

    const packet = isAttackerDamageOverrideEnabled() && customAttacker
        ? customAttacker.getDamagePacket() ?? { amount: event.damage, type: "vanilla", tags: ["vanilla"] }
        : { amount: event.damage, type: "vanilla", tags: ["vanilla"] };
    const damage = defender && isDefenderMitigationEnabled()
        ? defender.calculateDamage(packet)
        : Math.max(0, packet.amount);

    if (damage <= 0 && shouldCancelBlockedHits()) {
        event.cancel = true;
        eventLog("damage", `blocked hurt=${entityLabel(event.hurtEntity)} final=${damage}`);
        return;
    }
    if (!defender) {
        event.damage = damage;
        eventLog("damage", `native defender damage set hurt=${entityLabel(event.hurtEntity)} final=${damage}`);
        return;
    }

    pendingDamage.set(event.hurtEntity.id, packet);
    const nativeHealth = defender.getNativeCurrentHealth();
    if (defender.isFatalDamage(damage)) {
        event.damage = nativeHealth ?? damage;
        eventLog("damage", `fatal custom hit hurt=${entityLabel(event.hurtEntity)} nativeHealth=${nativeHealth ?? "none"} final=${damage}`);
        return;
    }

    const nativeDamage = defender.getNativeDamage(damage);
    event.damage = nativeHealth === undefined
        ? nativeDamage
        : Math.min(nativeDamage, Math.max(0, nativeHealth - 0.01));
    eventLog("damage", `custom damage set hurt=${entityLabel(event.hurtEntity)} custom=${damage} native=${event.damage}`);
}

function afterHurt(event: EntityHurtAfterEvent): RuntimeActor | undefined {
    const customActor = getCombatActor(event.hurtEntity, true);
    if (!customActor) return undefined;

    const cause = event.damageSource.cause;
    if (SystemConfig.customDamage.enabled && isHealthSynchronizationEnabled() && !bypassesCustomDamage(cause)) {
        const healthBefore = customActor.getCurrentHealth();
        const packet = pendingDamage.get(event.hurtEntity.id);
        pendingDamage.delete(event.hurtEntity.id);
        if (packet) customActor.applyDamagePacket(packet);
        else customActor.applyDamage(event.damage);
        eventLog(
            "damage",
            `custom health hurt=${entityLabel(event.hurtEntity)} before=${healthBefore ?? "none"} after=${customActor.getCurrentHealth() ?? "none"} components=${formatHealthLayers(customActor)}`
        );
    }
    return customActor;
}

export function handleDataDrivenEntityTrigger(event: DataDrivenEntityTriggerAfterEvent): void {
    eventLog("events", `dataDrivenEntityTrigger entity=${entityLabel(event.entity)} eventId=${event.eventId}`);
    publish(event.entity, "dataDrivenEntityTrigger", event.entity, event.eventId);
}

export function handleEntityDie(event: EntityDieAfterEvent): void {
    const deadEntity = event.deadEntity;
    const killer = event.damageSource?.damagingEntity;
    const customEntity = getRuntimeActor(deadEntity);
    eventLog(
        "events",
        `entityDie dead=${entityLabel(deadEntity)} killer=${entityLabel(killer)} cause=${event.damageSource?.cause ?? "unknown"}`
    );
    pendingDamage.delete(deadEntity.id);
    customEntity?.handleDeath?.(killer);
    publish(deadEntity, "entityDie", deadEntity, killer);
}

export function handleEntityHealthChanged(event: EntityHealthChangedAfterEvent): void {
    eventLog("events", `entityHealthChanged entity=${entityLabel(event.entity)} old=${event.oldValue} new=${event.newValue}`);
    publish(null, "entityHealthChange", event.entity, event.oldValue, event.newValue);
}

export function handleEntityHurtBefore(event: EntityHurtBeforeEvent): void {
    const attacker = event.damageSource.damagingEntity;

    eventLog(
        "damage",
        `beforeEntityHurt hurt=${entityLabel(event.hurtEntity)} attacker=${entityLabel(attacker)} cause=${event.damageSource.cause} raw=${event.damage}`
    );
    beforeHurt(event);
}

export function handleEntityHurtAfter(event: EntityHurtAfterEvent): void {
    const hurtEntity = event.hurtEntity;
    const attacker = event.damageSource.damagingEntity;
    eventLog(
        "damage",
        `afterEntityHurt hurt=${entityLabel(hurtEntity)} attacker=${entityLabel(attacker)} cause=${event.damageSource.cause} damage=${event.damage}`
    );

    const damagedCustomEntity = afterHurt(event);
    if (!damagedCustomEntity) return;

    if (damagedCustomEntity.getCurrentHealth() !== 0) {
        publish(hurtEntity, "entityHurt", hurtEntity, attacker, event.damage);
    }
}

export function handleEntityRemove(event: EntityRemoveAfterEvent): void {
    eventLog("events", `entityRemove id=${event.removedEntityId}`);
    pendingDamage.delete(event.removedEntityId);
    publish(null, "entityRemove", event.removedEntityId);
}

export function handleEntitySpawn(event: EntitySpawnAfterEvent): void {
    const entity = event.entity;
    eventLog("events", `entitySpawn entity=${entityLabel(entity)} location=${JSON.stringify(entity.location)}`);
    publish(entity, "entitySpawn", entity.dimension, entity.location, entity.typeId);
}

export function handleReload(): void {
    eventLog("events", "reload");
    publish(null, "reload");
}

export function handleScriptEventReceive(event: ScriptEventCommandMessageAfterEvent): void {
    const source = event.sourceEntity ?? null;
    eventLog(
        "events",
        `scriptEventReceive source=${entityLabel(event.sourceEntity)} initiator=${entityLabel(event.initiator)} message=${event.message}`
    );
    publish(source, "scriptEventReceive", event.sourceEntity, event.message, event.initiator);
}
