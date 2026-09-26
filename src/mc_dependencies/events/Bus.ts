export type EventHandler<Args extends unknown[]> = (...args: Args) => void;

export class EventBus<Events extends { [Event in keyof Events]: unknown[] }> {
    private readonly globalHandlers = new Map<keyof Events, Set<EventHandler<any>>>();
    private readonly localHandlers = new WeakMap<object, Map<keyof Events, Set<EventHandler<any>>>>();
    private readonly blockedGlobals = new Set<keyof Events>();
    private readonly blockedLocals = new WeakMap<object, Set<keyof Events>>();

    public subscribe<Event extends keyof Events>(
        target: object | null,
        event: Event,
        handler: EventHandler<Events[Event]>
    ): () => void {
        this.handlersFor(target, event).add(handler);
        return () => this.unsubscribe(target, event, handler);
    }

    public once<Event extends keyof Events>(
        target: object | null,
        event: Event,
        handler: EventHandler<Events[Event]>
    ): () => void {
        const unsubscribe = this.subscribe(target, event, (...args) => {
            unsubscribe();
            handler(...args);
        });
        return unsubscribe;
    }

    public unsubscribe<Event extends keyof Events>(
        target: object | null,
        event: Event,
        handler: EventHandler<Events[Event]>
    ): void {
        this.getHandlers(target)?.get(event)?.delete(handler);
    }

    public unsubscribeAll(target: object | null, event?: keyof Events): void {
        const handlers = this.getHandlers(target);
        if (!handlers) return;
        if (event !== undefined) handlers.delete(event);
        else handlers.clear();
    }

    public block(target: object | null, event: keyof Events): void {
        this.blockedFor(target).add(event);
    }

    public unblock(target: object | null, event: keyof Events): void {
        this.getBlocked(target)?.delete(event);
    }

    public pauseAll(target: object | null): void {
        const handlers = this.getHandlers(target);
        if (!handlers) return;
        const blocked = this.blockedFor(target);
        for (const event of handlers.keys()) blocked.add(event);
    }

    public resumeAll(target: object | null): void {
        this.getBlocked(target)?.clear();
    }

    public migrate(from: object, to: object): void {
        const handlers = this.localHandlers.get(from);
        if (handlers) {
            this.localHandlers.set(to, new Map(handlers));
            this.localHandlers.delete(from);
        }
        const blocked = this.blockedLocals.get(from);
        if (blocked) {
            this.blockedLocals.set(to, new Set(blocked));
            this.blockedLocals.delete(from);
        }
    }

    public publish<Event extends keyof Events>(
        target: object | null,
        event: Event,
        ...args: Events[Event]
    ): void {
        if (target !== null && !this.blockedLocals.get(target)?.has(event)) {
            this.call(this.localHandlers.get(target)?.get(event), event, args);
        }
        if (!this.blockedGlobals.has(event)) {
            this.call(this.globalHandlers.get(event), event, args);
        }
    }

    public debug(target?: object | null): void {
        if (target === undefined || target === null) {
            console.warn("Global events:", Object.fromEntries(this.globalHandlers));
            console.warn("Blocked global events:", [...this.blockedGlobals]);
            return;
        }
        console.warn("Local events:", Object.fromEntries(this.localHandlers.get(target) ?? []));
        console.warn("Blocked local events:", [...(this.blockedLocals.get(target) ?? [])]);
    }

    private handlersFor(eventTarget: object | null, event: keyof Events): Set<EventHandler<any>> {
        const handlers = eventTarget === null
            ? this.globalHandlers
            : this.localHandlers.get(eventTarget) ?? this.createLocalHandlers(eventTarget);
        let eventHandlers = handlers.get(event);
        if (!eventHandlers) {
            eventHandlers = new Set();
            handlers.set(event, eventHandlers);
        }
        return eventHandlers;
    }

    private getHandlers(target: object | null): Map<keyof Events, Set<EventHandler<any>>> | undefined {
        return target === null ? this.globalHandlers : this.localHandlers.get(target);
    }

    private createLocalHandlers(target: object): Map<keyof Events, Set<EventHandler<any>>> {
        const handlers = new Map<keyof Events, Set<EventHandler<any>>>();
        this.localHandlers.set(target, handlers);
        return handlers;
    }

    private blockedFor(target: object | null): Set<keyof Events> {
        if (target === null) return this.blockedGlobals;
        let blocked = this.blockedLocals.get(target);
        if (!blocked) {
            blocked = new Set();
            this.blockedLocals.set(target, blocked);
        }
        return blocked;
    }

    private getBlocked(target: object | null): Set<keyof Events> | undefined {
        return target === null ? this.blockedGlobals : this.blockedLocals.get(target);
    }

    private call<Event extends keyof Events>(
        handlers: Set<EventHandler<any>> | undefined,
        event: Event,
        args: Events[Event]
    ): void {
        if (!handlers) return;
        for (const handler of handlers) {
            try {
                handler(...args);
            } catch (error) {
                console.error(`Event handler error for ${String(event)}:`, error);
            }
        }
    }
}
