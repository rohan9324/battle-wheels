import { useRef, useState } from "react";

import { useFrame } from "@react-three/fiber";

import playerState from "../PlayerState";

import WeaponModel from "./WeaponModel";

// ==========================================
// EQUIPPED WEAPON
// ==========================================

export default function EquippedWeapon({

    entity = playerState,

}) {

    const previousWeapon = useRef(null);

    const [weapon, setWeapon] = useState(null);

    // ======================================
    // CHECK CURRENT EQUIPPED WEAPON
    // ======================================

    useFrame(() => {

        const currentWeapon =

            entity &&

            entity.alive !== false &&

            entity.weapon &&

            entity.weapon.available !== false &&

            (entity.ammo > 0 || entity.firing)

                ? entity.weapon

                : null;

        // ==================================
        // UPDATE ONLY WHEN WEAPON CHANGES
        // ==================================

        if (

            previousWeapon.current !==

            currentWeapon

        ) {

            previousWeapon.current =

                currentWeapon;

            setWeapon(currentWeapon);
        }
    });

    // ======================================
    // NO WEAPON EQUIPPED
    // ======================================

    if (!weapon) {

        return null;
    }

    // ======================================
    // RENDER EQUIPPED WEAPON MODEL
    // ======================================

    return (

        <group

            name="equippedWeaponModel"

            scale={1.15}

        >

            <WeaponModel

                key={weapon.id}

                weapon={weapon}

            />

        </group>
    );
}