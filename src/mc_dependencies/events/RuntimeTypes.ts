import { Entity } from "@minecraft/server";

export interface RuntimeEvents {
    scriptEventReceive: [source?: Entity, eventId?: string, target?: Entity];
    reload: [];
}
