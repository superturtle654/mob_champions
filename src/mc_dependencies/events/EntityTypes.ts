import { Dimension, Entity, Vector3 } from "@minecraft/server";

export interface EntityEvents {
    entityHealthChange: [entity?: Entity, oldHealth?: number, newHealth?: number];
    entityDie: [entity?: Entity, killer?: Entity | null];
    entityHurt: [entity?: Entity, damageSource?: Entity, damage?: number];
    entityRemove: [entityId?: string];
    entitySpawn: [dimension?: Dimension, location?: Vector3, typeId?: string];
    entityAttackStart: [entity?: Entity, target?: Entity];
    entityHit: [entity?: Entity, target?: Entity, damage?: number];
    entityTargetAcquire: [entity?: Entity, target?: Entity];
    entityTargetChange: [entity?: Entity, previous?: Entity, target?: Entity];
    entityTargetLost: [entity?: Entity, previous?: Entity];
    dataDrivenEntityTrigger: [entity?: Entity, eventId?: string];
}
