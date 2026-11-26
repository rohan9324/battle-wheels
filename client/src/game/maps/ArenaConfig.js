// ==========================================
// BATTLE WHEELS - CENTRAL ARENA CONFIG
// ==========================================

// ==========================================
// VILLAGE ARENA - LARGE MAP
// ==========================================

export const VILLAGE_ARENA_CONFIG = Object.freeze({

    worldSize: 500,

    playableSize: 480,

    halfSize: 240,

    wallHeight: 4,

    wallThickness: 1.5,

    movementLimit: 237,

    collisionLimit: 239.25,

    spawnLimit: 225,

    minimumSpawnDistance: 35,

    pickupCount: 40,

    pickupSpawnLimit: 228,

    pickupMinimumDistance: 18,

    pickupRespawnDelay: 5000,

    roadWidth: 14,

    roadLength: 480,

    cameraFar: 1000,

    fogNear: 220,

    fogFar: 550,

    projectileLimit: 265,

    grassRepeat: 150,

});

// ==========================================
// DESERT OUTPOST - SMALL MAP
// ==========================================

export const DESERT_ARENA_CONFIG = Object.freeze({

    worldSize: 150,

    playableSize: 140,

    halfSize: 70,

    wallHeight: 4,

    wallThickness: 1.5,

    movementLimit: 67,

    collisionLimit: 69.25,

    spawnLimit: 60,

    minimumSpawnDistance: 12,

    pickupCount: 15,

    pickupSpawnLimit: 62,

    pickupMinimumDistance: 10,

    pickupRespawnDelay: 5000,

    roadWidth: 10,

    roadLength: 140,

    cameraFar: 500,

    fogNear: 100,

    fogFar: 220,

    projectileLimit: 85,

    grassRepeat: 45,

});

// ==========================================
// SNOW VALLEY - MEDIUM MAP
// ==========================================

export const SNOW_ARENA_CONFIG = Object.freeze({

    worldSize: 300,

    playableSize: 280,

    halfSize: 140,

    wallHeight: 4,

    wallThickness: 1.5,

    movementLimit: 137,

    collisionLimit: 139.25,

    spawnLimit: 125,

    minimumSpawnDistance: 22,

    pickupCount: 25,

    pickupSpawnLimit: 128,

    pickupMinimumDistance: 14,

    pickupRespawnDelay: 5000,

    roadWidth: 12,

    roadLength: 280,

    cameraFar: 750,

    fogNear: 150,

    fogFar: 380,

    projectileLimit: 165,

    grassRepeat: 85,

});

// ==========================================
// ALL AVAILABLE ARENA CONFIGURATIONS
// ==========================================

export const ARENA_CONFIGS = Object.freeze({

    village: VILLAGE_ARENA_CONFIG,

    desert: DESERT_ARENA_CONFIG,

    snow: SNOW_ARENA_CONFIG,

});

// ==========================================
// CURRENT ACTIVE MAP
// ==========================================

let activeMapId = "village";

// ==========================================
// ACTIVE ARENA CONFIGURATION
// ==========================================

// Keep the same object reference so existing
// imports continue working across all modules.

export const ARENA_CONFIG = {

    ...VILLAGE_ARENA_CONFIG,

};

// ==========================================
// GET ARENA CONFIGURATION BY MAP ID
// ==========================================

export function getArenaConfig(mapId = activeMapId) {

    if (

        Object.prototype.hasOwnProperty.call(

            ARENA_CONFIGS,

            mapId

        )

    ) {

        return ARENA_CONFIGS[mapId];
    }

    return VILLAGE_ARENA_CONFIG;
}

// ==========================================
// SET ACTIVE ARENA
// ==========================================

export function setActiveArena(mapId = "village") {

    const validMapId =

        Object.prototype.hasOwnProperty.call(

            ARENA_CONFIGS,

            mapId

        )

            ? mapId

            : "village";

    const config = getArenaConfig(validMapId);

    activeMapId = validMapId;

    // Update existing object without replacing
    // its reference.

    Object.assign(

        ARENA_CONFIG,

        config

    );

    return ARENA_CONFIG;
}

// ==========================================
// GET ACTIVE MAP ID
// ==========================================

export function getActiveMapId() {

    return activeMapId;
}

// ==========================================
// RESET ARENA CONFIGURATION
// ==========================================

export function resetArenaConfig() {

    return setActiveArena("village");
}

// ==========================================
// VILLAGE HOUSE POSITIONS
// ==========================================

export const HOUSES = [

    {
        position: [-65, 0, -75],
        rotation: 0,
        size: 10,
    },

    {
        position: [-85, 0, -95],
        rotation: Math.PI / 2,
        size: 11,
    },

    {
        position: [95, 0, -110],
        rotation: Math.PI,
        size: 12,
    },

    {
        position: [135, 0, 85],
        rotation: -Math.PI / 2,
        size: 10,
    },

    {
        position: [-145, 0, 125],
        rotation: Math.PI / 2,
        size: 12,
    },

    {
        position: [65, 0, 165],
        rotation: 0,
        size: 11,
    },

];

// ==========================================
// VILLAGE TREE POSITIONS
// ==========================================

export const TREES = [

    [-45, 0, -140],

    [-120, 0, -175],

    [-185, 0, -80],

    [-200, 0, 35],

    [-165, 0, 185],

    [-70, 0, 190],

    [35, 0, 210],

    [145, 0, 190],

    [205, 0, 110],

    [185, 0, -45],

    [165, 0, -175],

    [45, 0, -190],

    [-95, 0, 45],

    [85, 0, 55],

    [-180, 0, -190],

    [200, 0, 200],

];

// ==========================================
// VILLAGE SHIPPING CONTAINER POSITIONS
// ==========================================

export const CONTAINERS = [

    {
        position: [-110, 0, 85],
        rotation: 0,
        size: 10,
    },

    {
        position: [155, 0, -65],
        rotation: Math.PI / 2,
        size: 10,
    },

];

// ==========================================
// VILLAGE WOODEN CRATE POSITIONS
// ==========================================

export const CRATES = [

    {
        position: [-58, 0, -75],
        rotation: 0,
        size: 2,
    },

    {
        position: [102, 0, -110],
        rotation: 0,
        size: 2,
    },

    {
        position: [-110, 0, 92],
        rotation: 0,
        size: 2.5,
    },

    {
        position: [155, 0, -58],
        rotation: 0,
        size: 2.5,
    },

];

// ==========================================
// VILLAGE BARRICADE POSITIONS
// ==========================================

export const BARRICADES = [

    {
        position: [-125, 0, -45],
        rotation: 0,
    },

    {
        position: [125, 0, 45],
        rotation: Math.PI / 2,
    },

];