import { EntityEvents } from "mc_dependencies/events/EntityTypes";
import { PlayerEvents } from "mc_dependencies/events/PlayerTypes";
import { RuntimeEvents } from "mc_dependencies/events/RuntimeTypes";

export type GameEvents = EntityEvents & PlayerEvents & RuntimeEvents;
