# Mob Champions

![Mob Champions](pack_icon.png)

Mob Champions uses Minecraft's stable Script API to create custom versions of vanilla mobs. It was inspired by the EliteMobs plugin for Minecraft Java Edition.

`mc_mob` contains the mob system. `mc_dependencies` contains shared code used by the system.

## Why use classes?

JSON can only store information. It cannot run code by itself. A JSON reader could connect a name like `"updateName"` to a function, but that function would still need to be created and registered somewhere else.

These mob profiles are written in TypeScript, so they can use functions directly. Each mob can have its own code, remember its own state, and react to events such as spawning, taking damage, or dying. Classes also make it easier to reuse and extend mob behavior.

Profiles keep the setup easy to read, while classes handle the mob while it is in the world.

## Custom class behavior

Most mobs only need a profile, like the Armored Zombie example below. When a mob needs unique code, the generated profile class can be extended:

```ts
import { system } from "@minecraft/server";

export class EliteChicken extends Profiles.EliteChicken {
    protected onSpawn(): void {
        super.onSpawn();
        system.run(() => {
            if (this.entity.isValid) this.lightning();
        });
    }

    public lightning(): void {
        this.entity.dimension.spawnEntity("minecraft:lightning_bolt", this.entity.location);
    }
}
```

Elite Chicken uses this behavior to summon lightning when it spawns. It still keeps its profile components, event support, registry support, and saved data.

## Persistence

Minecraft does not save JavaScript classes when the world closes. The database saves the mob's profile and component data. When the world loads again, the system rebuilds the mob and restores its saved data.

## Events and runtime updates

The shared event system listens for Minecraft events and sends them to the correct managed mob. A mob profile can react to spawning, health changes, damage, or death without creating and cleaning up its own Minecraft event listeners.

Minecraft does not provide a general `onTick` event. Normally, code that runs every tick needs its own `system.runInterval`, a list of entities to update, and checks to remove invalid entities. This project uses shared runtime loops instead. For example, one loop updates health regeneration for every managed mob. This avoids creating a separate interval for each mob.

There is currently no `onTick` callback inside mob profiles. Tick-based features are handled by shared runtime systems.

## Registering an entity

Create `src/mc_mob/entities/ArmoredZombie.ts`:

```ts
import { EquipmentSlot } from "@minecraft/server";
import { defineEntityProfiles } from "mc_mob/Profiles";

export const MobProfiles = defineEntityProfiles({
    ArmoredZombie: {
        displayName: "Armored Zombie",
        type: "minecraft:zombie",
        components: {
            nameTag: { name: "Armored Zombie" },
            health: {
                vanilla: { value: 100, regeneration: 2 },
                armor: { value: 50 },
            },
            equipment: {
                [EquipmentSlot.Head]: "minecraft:iron_helmet",
                [EquipmentSlot.Chest]: "minecraft:iron_chestplate",
                [EquipmentSlot.Legs]: "minecraft:iron_leggings",
                [EquipmentSlot.Feet]: "minecraft:iron_boots",
                [EquipmentSlot.Mainhand]: "minecraft:iron_sword",
            },
            spawnRules: {
                chance: 5,
                dimensions: ["minecraft:overworld"],
            },
        },
    },
});

export const ArmoredZombie = MobProfiles.ArmoredZombie;
```

Profiles can include additional health layers to fit the needs of each project. `armor` is included only as a demonstration.

```ts
import { MobProfiles as ArmoredZombie } from "mc_mob/entities/ArmoredZombie";
import { EntityRegistry } from "mc_mob/Registry";

export const MobProfiles = Object.freeze({
    ...ArmoredZombie,
});

for (const Profile of Object.values(MobProfiles)) {
    EntityRegistry.register(Profile);
}
```

More mob files can be added to the same list. Once registered, a mob can use the shared events, saving, components, and spawn egg features.

This README and file naming was rewritten with the help of AI for clarity.
