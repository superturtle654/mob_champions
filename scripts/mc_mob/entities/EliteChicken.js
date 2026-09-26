import { system } from "@minecraft/server";
import { defineEntityProfiles } from "../Profiles.js";
import { NameTagComponent } from "../components/NameTag.js";
const Profiles = defineEntityProfiles({
    EliteChicken: {
        displayName: "Elite Chicken",
        type: "minecraft:chicken",
        components: {
            spawnRules: {
                chance: 10,
                overrideGamerules: false,
                dimensions: ["minecraft:overworld"],
                height: { min: -64, max: 320 },
                light: { min: 7, max: 15 },
                density: { radius: 32, maximum: 4 },
            },
            lootable: { table: "EliteChicken" },
            nameTag: { name: "bob" },
            health: {
                vanilla: {
                    value: 1000,
                    regeneration: "10%",
                    regenerationTime: 40,
                },
                armor: { value: 200 },
                hyperarmor: { value: 150 },
            },
            inventory: {
                size: 9,
                dropOnDeath: true,
                items: {
                    0: {
                        item: "minecraft:diamond",
                        amount: 1,
                    },
                },
            },
            spawnEntity: {
                minWaitTime: 300,
                maxWaitTime: 600,
                amount: 1,
                singleUse: false,
                overrideGamerules: false,
            },
            level: 23,
            xp: 50,
        },
    },
});
export class EliteChicken extends Profiles.EliteChicken {
    onSpawn() {
        super.onSpawn();
        this.updateName();
        system.run(() => {
            if (this.entity.isValid)
                this.lightning();
        });
    }
    onHealthChanged(oldHealth, newHealth) {
        super.onHealthChanged(oldHealth, newHealth);
        this.updateName();
    }
    updateName() {
        const nameTag = this.getComponent(NameTagComponent);
        const currentHealth = this.getCurrentHealth();
        const maxHealth = this.getMaxHealth();
        if (!nameTag || currentHealth === undefined || maxHealth === undefined)
            return;
        nameTag.setName(`bob\n\u00a7c${currentHealth.toFixed(0)}\u00a77/\u00a7c${maxHealth}\u00a7f`);
    }
    lightning() {
        this.entity.dimension.spawnEntity("minecraft:lightning_bolt", this.entity.location);
    }
}
export const MobProfiles = Object.freeze({
    EliteChicken,
});
