export class EventBus {
    constructor() {
        this.globalHandlers = new Map();
        this.localHandlers = new WeakMap();
        this.blockedGlobals = new Set();
        this.blockedLocals = new WeakMap();
    }
    subscribe(target, event, handler) {
        this.handlersFor(target, event).add(handler);
        return () => this.unsubscribe(target, event, handler);
    }
    once(target, event, handler) {
        const unsubscribe = this.subscribe(target, event, (...args) => {
            unsubscribe();
            handler(...args);
        });
        return unsubscribe;
    }
    unsubscribe(target, event, handler) {
        this.getHandlers(target)?.get(event)?.delete(handler);
    }
    unsubscribeAll(target, event) {
        const handlers = this.getHandlers(target);
        if (!handlers)
            return;
        if (event !== undefined)
            handlers.delete(event);
        else
            handlers.clear();
    }
    block(target, event) {
        this.blockedFor(target).add(event);
    }
    unblock(target, event) {
        this.getBlocked(target)?.delete(event);
    }
    pauseAll(target) {
        const handlers = this.getHandlers(target);
        if (!handlers)
            return;
        const blocked = this.blockedFor(target);
        for (const event of handlers.keys())
            blocked.add(event);
    }
    resumeAll(target) {
        this.getBlocked(target)?.clear();
    }
    migrate(from, to) {
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
    publish(target, event, ...args) {
        if (target !== null && !this.blockedLocals.get(target)?.has(event)) {
            this.call(this.localHandlers.get(target)?.get(event), event, args);
        }
        if (!this.blockedGlobals.has(event)) {
            this.call(this.globalHandlers.get(event), event, args);
        }
    }
    debug(target) {
        if (target === undefined || target === null) {
            console.warn("Global events:", Object.fromEntries(this.globalHandlers));
            console.warn("Blocked global events:", [...this.blockedGlobals]);
            return;
        }
        console.warn("Local events:", Object.fromEntries(this.localHandlers.get(target) ?? []));
        console.warn("Blocked local events:", [...(this.blockedLocals.get(target) ?? [])]);
    }
    handlersFor(eventTarget, event) {
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
    getHandlers(target) {
        return target === null ? this.globalHandlers : this.localHandlers.get(target);
    }
    createLocalHandlers(target) {
        const handlers = new Map();
        this.localHandlers.set(target, handlers);
        return handlers;
    }
    blockedFor(target) {
        if (target === null)
            return this.blockedGlobals;
        let blocked = this.blockedLocals.get(target);
        if (!blocked) {
            blocked = new Set();
            this.blockedLocals.set(target, blocked);
        }
        return blocked;
    }
    getBlocked(target) {
        return target === null ? this.blockedGlobals : this.blockedLocals.get(target);
    }
    call(handlers, event, args) {
        if (!handlers)
            return;
        for (const handler of handlers) {
            try {
                handler(...args);
            }
            catch (error) {
                console.error(`Event handler error for ${String(event)}:`, error);
            }
        }
    }
}
