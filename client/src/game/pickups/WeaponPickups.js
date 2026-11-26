import MysteryBox from "./MysteryBox";

import {
    ARENA_CONFIG
} from "../maps/ArenaConfig";

// ==========================================
// WEAPON PICKUPS
// ==========================================

export default function WeaponPickups() {

    const totalBoxes = ARENA_CONFIG.pickupCount;

    return (

        <group name="weaponPickups">

            {Array.from(

                { length: totalBoxes },

                (_, index) => (

                    <MysteryBox

                        key={index}

                        id={index}

                    />

                )

            )}

        </group>
    );
}