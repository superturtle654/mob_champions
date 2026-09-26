import { Component, } from "../../mc_dependencies/components/Component.js";
export * from "../../mc_dependencies/components/Component.js";
export class EntityComponent extends Component {
    get entity() {
        return this.owner;
    }
}
