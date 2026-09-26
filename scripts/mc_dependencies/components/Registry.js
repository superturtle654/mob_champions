export class ComponentRegistry {
    constructor(ownerName) {
        this.ownerName = ownerName;
        this.factories = new Map();
    }
    register(key, factory) {
        if (this.factories.has(key)) {
            throw new Error(`${this.ownerName} component factory "${key}" is already registered.`);
        }
        this.factories.set(key, factory);
    }
    create(config, context) {
        return Object.entries(config).flatMap(([key, value]) => {
            const factory = this.factories.get(key);
            if (!factory)
                throw new Error(`Unknown ${this.ownerName} component "${key}".`);
            return factory(value, context);
        });
    }
}
