import {
    ARENA_CONFIG
} from "../maps/ArenaConfig";

import {
    isKartBlocked
} from "../physics/KartCollision";

import {
    getAliveEntities
} from "../combat/EntityManager";

// ==========================================
// COMMON PICKUP SPAWN SETTINGS
// ==========================================

const SPAWN_SETTINGS = {

    get mapLimit() {
        return ARENA_CONFIG.pickupSpawnLimit;
    },

    get minimumBoxDistance() {
        return ARENA_CONFIG.pickupMinimumDistance;
    },

    minimumPlayerDistance: 10,

    get minimumPreviousDistance() {
        return Math.min(
            25,
            ARENA_CONFIG.pickupMinimumDistance * 1.5
        );
    },

    obstacleClearance: 2.5,

    maximumAttempts: 500,

    get gridSpacing() {
        return Math.min(
            15,
            ARENA_CONFIG.pickupMinimumDistance
        );
    },

};

// ==========================================
// PICKUP STORAGE
// ==========================================

const positions = new Map();

const inactivePickups = new Set();

// ==========================================
// DEACTIVATE COLLECTED PICKUP
// ==========================================

export function deactivatePickup(id) {

    inactivePickups.add(id);
}

// ==========================================
// CHECK VALID PICKUP POSITION
// ==========================================

function isValidPosition(
    id,
    x,
    z,
    player,
    entities
) {

    // ======================================
    // VALIDATE COORDINATES
    // ======================================

    if (

        !Number.isFinite(x) ||

        !Number.isFinite(z)

    ) {

        return false;
    }

    // ======================================
    // CHECK MAP BOUNDARY
    // ======================================

    const limit =
        SPAWN_SETTINGS.mapLimit;

    if (

        Math.abs(x) > limit ||

        Math.abs(z) > limit

    ) {

        return false;
    }

    // ======================================
    // AVOID MAP OBSTACLES
    // ======================================

    // Uses actual registered map colliders.
    // No hardcoded old obstacle positions.

    if (

        isKartBlocked(

            x,

            z,

            SPAWN_SETTINGS.obstacleClearance

        )

    ) {

        return false;
    }

    // ======================================
    // AVOID LOCAL PLAYER
    // ======================================

    if (

        player &&

        player.alive !== false &&

        Math.hypot(

            x - player.x,

            z - player.z

        ) < SPAWN_SETTINGS.minimumPlayerDistance

    ) {

        return false;
    }

    // ======================================
    // AVOID ALL ACTIVE PLAYER ENTITIES
    // ======================================

    const occupied = entities.some(

        (entity) =>

            Math.hypot(

                x - entity.x,

                z - entity.z

            ) < SPAWN_SETTINGS.minimumPlayerDistance

    );

    if (occupied) {

        return false;
    }

    // ======================================
    // AVOID OTHER MYSTERY BOXES
    // ======================================

    for (const [otherId, position] of positions) {

        if (otherId === id) {

            continue;
        }

        const distance = Math.hypot(

            x - position[0],

            z - position[2]

        );

        if (

            distance <
            SPAWN_SETTINGS.minimumBoxDistance

        ) {

            return false;
        }
    }

    // ======================================
    // AVOID PREVIOUS SPAWN LOCATION
    // ======================================

    const previous = positions.get(id);

    if (previous) {

        const previousDistance = Math.hypot(

            x - previous[0],

            z - previous[2]

        );

        if (

            previousDistance <
            SPAWN_SETTINGS.minimumPreviousDistance

        ) {

            return false;
        }
    }

    return true;
}

// ==========================================
// SAVE NEW PICKUP POSITION
// ==========================================

function saveSpawnPosition(id, x, z) {

    const position = [x, 0, z];

    positions.set(

        id,

        position

    );

    inactivePickups.delete(id);

    return position;
}

// ==========================================
// GENERATE RANDOM PICKUP SPAWN
// ==========================================

export function getRandomSpawn(id, player = null) {

    const limit =
        SPAWN_SETTINGS.mapLimit;

    const entities =
        getAliveEntities();

    // ======================================
    // SEARCH RANDOM LOCATIONS
    // ======================================

    for (

        let attempt = 0;

        attempt < SPAWN_SETTINGS.maximumAttempts;

        attempt++

    ) {

        const x =

            (Math.random() * 2 - 1) * limit;

        const z =

            (Math.random() * 2 - 1) * limit;

        // ==================================
        // VALIDATE RANDOM POSITION
        // ==================================

        if (

            isValidPosition(

                id,

                x,

                z,

                player,

                entities

            )

        ) {

            return saveSpawnPosition(

                id,

                x,

                z

            );
        }
    }

    // ======================================
    // FALLBACK SAFE GRID SEARCH
    // ======================================

    const safePositions = [];

    for (

        let x = -limit;

        x <= limit;

        x += SPAWN_SETTINGS.gridSpacing

    ) {

        for (

            let z = -limit;

            z <= limit;

            z += SPAWN_SETTINGS.gridSpacing

        ) {

            if (

                isValidPosition(

                    id,

                    x,

                    z,

                    player,

                    entities

                )

            ) {

                safePositions.push(

                    [x, 0, z]

                );
            }
        }
    }

    // ======================================
    // SELECT RANDOM SAFE FALLBACK POSITION
    // ======================================

    if (safePositions.length > 0) {

        const index = Math.floor(

            Math.random() * safePositions.length

        );

        const position =
            safePositions[index];

        return saveSpawnPosition(

            id,

            position[0],

            position[2]

        );
    }

    // No safe location available.
    // Pickup component can retry later.

    return null;
}

// ==========================================
// REMOVE PICKUP FROM SPAWN SYSTEM
// ==========================================

export function removeSpawn(id) {

    positions.delete(id);

    inactivePickups.delete(id);
}

// ==========================================
// GET ALL ACTIVE PICKUP POSITIONS
// ==========================================

// Used by BotAI to search for available weapons.

export function getPickupPositions() {

    return Array.from(positions.entries())

        .filter(

            ([id]) =>
                !inactivePickups.has(id)

        )

        .map(

            ([, position]) => position

        );
}

// ==========================================
// GET ACTIVE PICKUP COUNT
// ==========================================

export function getActivePickupCount() {

    let count = 0;

    for (const id of positions.keys()) {

        if (!inactivePickups.has(id)) {

            count++;
        }
    }

    return count;
}

// ==========================================
// CLEAR ALL PICKUP POSITIONS
// ==========================================

export function clearSpawnPositions() {

    positions.clear();

    inactivePickups.clear();
}