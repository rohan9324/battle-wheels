import matchState from "../match/MatchState";

import {
    canEntityFire,
} from "./SpecialWeaponSystem";

let fireHandler = null;

// ==========================================
// REGISTER FIRE HANDLER
// ==========================================

export function registerFireHandler(handler) {

    fireHandler = handler;

    return () => {

        if (fireHandler === handler) {

            fireHandler = null;
        }
    };
}

// ==========================================
// REQUEST WEAPON FIRE
// ==========================================

export function requestFire(entity) {

    if (matchState.status !== "playing") {

        return false;
    }

    if (
        !entity ||
        !entity.alive ||
        !entity.weapon ||
        entity.weapon.available === false ||
        entity.ammo <= 0 ||
        entity.firing ||
        typeof fireHandler !== "function"
    ) {

        return false;
    }

    // Prevent firing during EMP or electric stun.

    if (!canEntityFire(entity)) {

        return false;
    }

    return fireHandler(entity);
}