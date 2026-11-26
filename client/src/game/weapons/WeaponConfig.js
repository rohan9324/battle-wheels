export const WEAPONS = {

    // ======================================
    // 1. TRIPLE ROCKET
    // ======================================

    triple_rocket: {
        id: "triple_rocket",
        name: "Triple Rocket",
        ammo: 1,
        damage: 35,
        projectileSpeed: 160,
        projectileSize: 1.65,
        projectileCount: 3,
        burstCount: 1,
        burstInterval: 0,
        spread: 0,
        projectileSpacing: 1.15,
        color: "#258dff",
        type: "rocket",
    },

    // ======================================
    // 2. MEGA NUKE
    // ======================================

    mega_nuke: {
        id: "mega_nuke",
        name: "Mega Nuke",
        ammo: 1,
        damage: 100,
        projectileSpeed: 135,
        projectileSize: 2.1,
        projectileCount: 1,
        burstCount: 1,
        burstInterval: 0,
        spread: 0,
        projectileSpacing: 0,
        color: "#83c94b",
        type: "nuke",
    },

    // ======================================
    // 3. CANNON
    // ======================================

    cannon: {
        id: "cannon",
        name: "Cannon",
        ammo: 1,
        damage: 45,
        projectileSpeed: 155,
        projectileSize: 1.8,
        projectileCount: 3,
        burstCount: 1,
        burstInterval: 0,
        spread: 0,
        projectileSpacing: 1.15,
        color: "#454b59",
        type: "cannonball",
    },

    // ======================================
    // 4. MACHINE GUN
    // ======================================

    machine_gun: {
        id: "machine_gun",
        name: "Machine Gun",
        ammo: 1,
        damage: 8,
        projectileSpeed: 380,
        projectileSize: 1.6,
        projectileCount: 1,
        burstCount: 13,
        burstInterval: 80,
        spread: 0,
        projectileSpacing: 0,
        color: "#ffbf32",
        type: "bullet",
    },

    // ======================================
    // 5. PLASMA BLASTER
    // ======================================

    plasma_gun: {
        id: "plasma_gun",
        name: "Plasma Blaster",
        ammo: 1,
        damage: 20,
        projectileSpeed: 210,
        projectileSize: 1.7,
        projectileCount: 1,
        burstCount: 5,
        burstInterval: 130,
        spread: 0,
        projectileSpacing: 0,
        color: "#00ddff",
        type: "plasma",
    },

    // ======================================
    // 6. SNOWBALL LAUNCHER
    // ======================================

    snowball: {
        id: "snowball",
        name: "Snowball Launcher",
        ammo: 1,
        damage: 15,
        projectileSpeed: 150,
        projectileSize: 1.8,
        projectileCount: 1,
        burstCount: 3,
        burstInterval: 150,
        spread: 0,
        projectileSpacing: 0,
        color: "#bbeeff",
        type: "snowball",
    },

    // ======================================
    // 7. GRENADE LAUNCHER
    // ======================================

    grenade_launcher: {
        id: "grenade_launcher",
        name: "Grenade Launcher",
        ammo: 1,
        damage: 35,
        projectileSpeed: 95,
        projectileSize: 1.7,
        projectileCount: 1,
        burstCount: 3,
        burstInterval: 180,
        spread: 0,
        projectileSpacing: 0,
        color: "#65df55",
        type: "grenade",
    },

    // ======================================
    // 8. SHOTGUN
    // ======================================

    shotgun: {
        id: "shotgun",
        name: "Shotgun",
        available: true,
        ammo: 1,
        damage: 18,
        projectileSpeed: 260,
        projectileSize: 0.65,
        projectileCount: 7,
        burstCount: 1,
        burstInterval: 0,
        spread: 0.30,
        projectileSpacing: 0,
        maxRange: 28,
        color: "#e7b45b",
        type: "pellet",
    },

    // ======================================
    // 9. MINI GUN
    // ======================================

    mini_gun: {
        id: "mini_gun",
        name: "Mini Gun",
        available: true,
        ammo: 1,
        damage: 5,
        projectileSpeed: 400,
        projectileSize: 0.85,
        projectileCount: 1,
        burstCount: 30,
        burstInterval: 45,
        spread: 0.025,
        projectileSpacing: 0,
        color: "#ffba25",
        type: "minigun_bullet",
    },

    // ======================================
    // 10. LASER BLASTER
    // ======================================

    laser_blaster: {
        id: "laser_blaster",
        name: "Laser Blaster",
        available: true,
        ammo: 1,
        damage: 34,
        projectileSpeed: 500,
        projectileSize: 1.2,
        projectileCount: 1,
        burstCount: 3,
        burstInterval: 180,
        spread: 0,
        projectileSpacing: 0,
        color: "#ff284a",
        type: "laser",
    },

    // ======================================
    // 11. HOMING MISSILE
    // ======================================

    homing_missile: {
        id: "homing_missile",
        name: "Homing Missile",
        available: true,
        ammo: 1,
        damage: 65,
        projectileSpeed: 95,
        projectileSize: 1.9,
        projectileCount: 1,
        burstCount: 1,
        burstInterval: 0,
        spread: 0,
        projectileSpacing: 0,

        homing: true,
        homingRange: 100,
        homingTurnSpeed: 2.8,
        maxLifetime: 5000,

        color: "#458cff",
        type: "homing",
    },

    // ======================================
    // 12. FIREBALL LAUNCHER
    // ======================================

    fireball: {
        id: "fireball",
        name: "Fireball Launcher",
        available: true,
        ammo: 1,
        damage: 30,
        projectileSpeed: 145,
        projectileSize: 1.8,
        projectileCount: 1,
        burstCount: 3,
        burstInterval: 180,
        spread: 0,
        projectileSpacing: 0,

        burnDamage: 5,
        burnDuration: 3000,
        burnInterval: 1000,

        color: "#ff581c",
        type: "fireball",
    },

    // ======================================
    // 13. ICE ROCKET
    // ======================================

    ice_rocket: {
        id: "ice_rocket",
        name: "Ice Rocket",
        available: true,
        ammo: 1,
        damage: 35,
        projectileSpeed: 145,
        projectileSize: 1.75,
        projectileCount: 2,
        burstCount: 1,
        burstInterval: 0,
        spread: 0,
        projectileSpacing: 1.15,

        slowMultiplier: 0.45,
        slowDuration: 3000,

        color: "#7bddff",
        type: "ice_rocket",
    },

    // ======================================
    // 14. ELECTRIC BLASTER
    // ======================================

    electric_blaster: {
        id: "electric_blaster",
        name: "Electric Blaster",
        available: true,
        ammo: 1,
        damage: 30,
        projectileSpeed: 280,
        projectileSize: 1.4,
        projectileCount: 1,
        burstCount: 3,
        burstInterval: 150,
        spread: 0,
        projectileSpacing: 0,

        stunDuration: 1000,

        color: "#be65ff",
        type: "electric",
    },

    // ======================================
    // 15. LAND MINES
    // ======================================

    land_mines: {
        id: "land_mines",
        name: "Land Mines",
        available: true,
        ammo: 3,
        damage: 65,
        projectileSpeed: 0,
        projectileSize: 1.2,
        projectileCount: 1,
        burstCount: 1,
        burstInterval: 0,
        spread: 0,
        projectileSpacing: 0,

        deployable: true,
        deployDistance: 3,
        triggerRadius: 2.5,
        explosionRadius: 5,
        armDelay: 800,
        lifetime: 30000,

        color: "#648b43",
        type: "mine",
    },

    // ======================================
    // 16. FAKE MYSTERY BOX
    // ======================================

    fake_box: {
        id: "fake_box",
        name: "Fake Mystery Box",
        available: true,
        ammo: 2,
        damage: 75,
        projectileSpeed: 0,
        projectileSize: 1.5,
        projectileCount: 1,
        burstCount: 1,
        burstInterval: 0,
        spread: 0,
        projectileSpacing: 0,

        deployable: true,
        deployDistance: 3,
        triggerRadius: 2.5,
        explosionRadius: 5,
        armDelay: 1000,
        lifetime: 40000,

        color: "#b652ff",
        type: "fake_box",
    },

    // ======================================
    // 17. SPINNING MACE
    // ======================================

    spinning_mace: {
        id: "spinning_mace",
        name: "Spinning Mace",
        available: true,
        ammo: 1,
        damage: 40,
        projectileSpeed: 0,
        projectileSize: 1.4,
        projectileCount: 1,
        burstCount: 1,
        burstInterval: 0,
        spread: 0,
        projectileSpacing: 0,

        melee: true,
        orbitRadius: 3.2,
        orbitSpeed: 6,
        hitRadius: 1.1,
        activeDuration: 6000,
        hitCooldown: 800,

        color: "#a2a7b0",
        type: "mace",
    },

    // ======================================
    // 18. EMP BLASTER
    // ======================================

    emp_blaster: {
        id: "emp_blaster",
        name: "EMP Blaster",
        available: true,
        ammo: 1,
        damage: 20,
        projectileSpeed: 180,
        projectileSize: 1.8,
        projectileCount: 1,
        burstCount: 1,
        burstInterval: 0,
        spread: 0,
        projectileSpacing: 0,

        empRadius: 7,
        disableDuration: 3000,

        color: "#354bff",
        type: "emp",
    },

    // ======================================
    // 19. POISON BOMB
    // ======================================

    poison_bomb: {
        id: "poison_bomb",
        name: "Poison Bomb",
        available: true,
        ammo: 1,
        damage: 15,
        projectileSpeed: 90,
        projectileSize: 1.8,
        projectileCount: 1,
        burstCount: 1,
        burstInterval: 0,
        spread: 0,
        projectileSpacing: 0,

        poisonRadius: 6,
        poisonDamage: 8,
        poisonDuration: 5000,
        poisonInterval: 1000,

        color: "#64e831",
        type: "poison",
    },

    // ======================================
    // 20. INVINCIBILITY STAR
    // ======================================

    invincibility: {
        id: "invincibility",
        name: "Invincibility Star",
        available: true,
        ammo: 1,
        damage: 0,
        projectileSpeed: 0,
        projectileSize: 1.5,
        projectileCount: 1,
        burstCount: 1,
        burstInterval: 0,
        spread: 0,
        projectileSpacing: 0,

        powerUp: true,
        protectionDuration: 8000,

        color: "#ffd700",
        type: "invincibility",
    },

};

// ==========================================
// GET ALL IMPLEMENTED WEAPONS
// ==========================================

export function getAvailableWeapons() {

    return Object.values(WEAPONS).filter(

        (weapon) => weapon.available !== false

    );
}

// ==========================================
// GET WEAPON BY ID
// ==========================================

export function getWeaponById(id) {

    return WEAPONS[id] || null;
}

// ==========================================
// GET RANDOM ENABLED WEAPON
// ==========================================

export function getRandomWeapon(enabledIds = null) {

    let weapons = getAvailableWeapons();

    if (Array.isArray(enabledIds)) {

        weapons = weapons.filter(

            (weapon) =>
                enabledIds.includes(weapon.id)

        );
    }

    if (weapons.length === 0) {

        return null;
    }

    const index = Math.floor(

        Math.random() * weapons.length

    );

    return { ...weapons[index] };
}