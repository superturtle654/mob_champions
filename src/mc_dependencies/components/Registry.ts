import { Entity } from "@minecraft/server";
import { Component } from "mc_dependencies/components/Component";

export type ComponentFactory<Target extends Entity> = (
    config: unknown,
    context?: unknown,
) => Component<any, Target>[];

export class ComponentRegistry<Target extends Entity> {
    private readonly factories = new Map<string, ComponentFactory<Target>>();

    public constructor(private readonly ownerName: string) {}

    public register(key: string, factory: ComponentFactory<Target>): void {
        if (this.factories.has(key)) {
            throw new Error(`${this.ownerName} component factory "${key}" is already registered.`);
        }
        this.factories.set(key, factory);
    }

    public create(config: object, context?: unknown): Component<any, Target>[] {
        return Object.entries(config).flatMap(([key, value]) => {
            const factory = this.factories.get(key);
            if (!factory) throw new Error(`Unknown ${this.ownerName} component "${key}".`);
            return factory(value, context);
        });
    }
}
