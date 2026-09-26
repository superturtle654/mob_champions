import { Entity } from "@minecraft/server";
import {
    Component,
    ComponentData,
    ComponentId,
} from "mc_dependencies/components/Component";

export * from "mc_dependencies/components/Component";

export abstract class EntityComponent<
    Data extends ComponentData = {},
    Id extends ComponentId = ComponentId,
> extends Component<Data, Entity, Id> {
    protected get entity(): Entity {
        return this.owner;
    }
}
