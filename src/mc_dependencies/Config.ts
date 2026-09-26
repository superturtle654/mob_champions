export const SystemConfig = {
    development: {
        enabled: false,
    },
    rotationBlendFactor: 1.0,
    movementDeadZone: 0.002,
    verticalOffset: 1.0,
    cameraFollowEnabled: true,
    cameraModeId: "mcl:emerald_climb",
    cameraSnapDistance: 0.45,
    customDamage: {
        enabled: true,
        isAttackerDamageOverrideEnabled: true,
        isDefenderMitigationEnabled: true,
        isHealthSynchronizationEnabled: true,
        cancelBlockedHits: true,
        bypassCauses: ["selfDestruct", "override"],
    },
    healthSystem: {
        enabled: true,
        players: {
            disableNaturalRegeneration: false,
            convertNativeHealing: true,
        },
    },
    logging: {
        enabled: false,
        events: false,
        damage: false,
        globalListeners: false,
        spawns: false
    }
};
export const MOVEMENT_DEAD_ZONE_SQUARED = SystemConfig.movementDeadZone * SystemConfig.movementDeadZone;
export const CAMERA_SNAP_DISTANCE_SQUARED = SystemConfig.cameraSnapDistance * SystemConfig.cameraSnapDistance;
export const RADIANS_TO_DEGREES = 180 / Math.PI;
export function isAttackerDamageOverrideEnabled(): boolean {
    return SystemConfig.customDamage.enabled && SystemConfig.customDamage.isAttackerDamageOverrideEnabled;
}
export function isDefenderMitigationEnabled(): boolean {
    return SystemConfig.customDamage.enabled && SystemConfig.customDamage.isDefenderMitigationEnabled;
}
export function isHealthSynchronizationEnabled(): boolean {
    return SystemConfig.customDamage.enabled && SystemConfig.customDamage.isHealthSynchronizationEnabled;
}
export function shouldCancelBlockedHits(): boolean {
    return SystemConfig.customDamage.cancelBlockedHits;
}
