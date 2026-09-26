import { EventBus } from "mc_dependencies/events/Bus";
import { GameEvents } from "mc_dependencies/events/Types";
import "mc_dependencies/events/DataDrivenEntityTrigger";
import "mc_dependencies/events/EntityDie";
import "mc_dependencies/events/EntityHealthChanged";
import "mc_dependencies/events/EntityHurtBefore";
import "mc_dependencies/events/EntityHurtAfter";
import "mc_dependencies/events/EntityRemove";
import "mc_dependencies/events/EntitySpawn";
import "mc_dependencies/events/ScriptEventReceive";
import "mc_dependencies/events/Reload";

export type { GameEvents } from "mc_dependencies/events/Types";
export type EventName = keyof GameEvents;
export type EventHandler<Event extends EventName> = (...args: GameEvents[Event]) => void;

export const gameEvents = new EventBus<GameEvents>();

export const debug = gameEvents.debug.bind(gameEvents);
export const debugLocal = (target: object | null) => gameEvents.debug(target);
export const subscribe = gameEvents.subscribe.bind(gameEvents);
export const once = gameEvents.once.bind(gameEvents);
export const unsubscribe = gameEvents.unsubscribe.bind(gameEvents);
export const unsubscribeAll = gameEvents.unsubscribeAll.bind(gameEvents);
export const block = gameEvents.block.bind(gameEvents);
export const unblock = gameEvents.unblock.bind(gameEvents);
export const pauseAll = gameEvents.pauseAll.bind(gameEvents);
export const resumeAll = gameEvents.resumeAll.bind(gameEvents);
export const migrate = gameEvents.migrate.bind(gameEvents);
export const publish = gameEvents.publish.bind(gameEvents);
