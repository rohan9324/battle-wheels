import { WEAPONS } from "../game/weapons/WeaponConfig";

// ==========================================
// COMPLETE WEAPON CATALOG
// ==========================================

export const WEAPON_CATALOG = Object.values(WEAPONS).map(
    (weapon) => ({

        id: weapon.id,

        name: weapon.name,

        color: weapon.color,

        available: weapon.available !== false,

    })
);

// ==========================================
// AVAILABLE WEAPONS
// ==========================================

export const AVAILABLE_WEAPONS = WEAPON_CATALOG.filter(

    (weapon) => weapon.available

);

// ==========================================
// AVAILABLE WEAPON IDS
// ==========================================

export const AVAILABLE_WEAPON_IDS = AVAILABLE_WEAPONS.map(

    (weapon) => weapon.id

);

// ==========================================
// GET WEAPON FROM CATALOG
// ==========================================

export function getCatalogWeapon(id) {

    return WEAPON_CATALOG.find(

        (weapon) => weapon.id === id

    ) || null;
}

// ==========================================
// CHECK WEAPON AVAILABILITY
// ==========================================

export function isWeaponAvailable(id) {

    const weapon = getCatalogWeapon(id);

    return weapon?.available === true;
}

// ==========================================
// DEFAULT EXPORT
// ==========================================

export default WEAPON_CATALOG;