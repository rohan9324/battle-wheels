import {
    getAliveEntities,
    resetEntityStatus,
} from "./EntityManager";

import {
    ARENA_CONFIG,
} from "../maps/ArenaConfig";

import {
    isKartBlocked,
} from "../physics/KartCollision";

import {
    clearEntityStatus,
    getDeployedWeapons,
    getPoisonZones,
} from "./SpecialWeaponSystem";

import matchState from "../match/MatchState";

// ==========================================
// SPAWN SETTINGS
// ==========================================

const SPAWN_SETTINGS = {

    get spawnLimit() {
        return ARENA_CONFIG.spawnLimit;
    },

    get minimumDistance() {
        return ARENA_CONFIG.minimumSpawnDistance;
    },

    obstacleClearance: 2.5,

    maximumAttempts: 300,

    get gridStep() {
        return Math.min(
            15,
            ARENA_CONFIG.minimumSpawnDistance / 2
        );
    },

    hazardClearance: 3,

    protectionDuration: 5000,

    botFireDelay: 1500,

};

// ==========================================
// CHECK SPECIAL WEAPON HAZARDS
// ==========================================

function isSpawnHazardous(
    entity,
    x,
    z,
    deployedWeapons,
    poisonZones,
    now
) {

    // ======================================
    // CHECK LAND MINES AND FAKE BOXES
    // ======================================

    for (const weapon of deployedWeapons) {

        if (
            weapon.attackerId === entity.id ||
            now >= weapon.expiresAt
        ) {

            continue;
        }

        const distance = Math.hypot(
            weapon.x - x,
            weapon.z - z
        );

        const dangerRadius = Math.max(

            weapon.triggerRadius || 2.5,

            weapon.explosionRadius || 5

        ) + SPAWN_SETTINGS.hazardClearance;

        if (distance < dangerRadius) {

            return true;
        }
    }

    // ======================================
    // CHECK ACTIVE POISON ZONES
    // ======================================

    for (const zone of poisonZones) {

        if (
            zone.attackerId === entity.id ||
            now >= zone.expiresAt
        ) {

            continue;
        }

        const distance = Math.hypot(
            zone.x - x,
            zone.z - z
        );

        const dangerRadius =
            zone.radius +
            SPAWN_SETTINGS.hazardClearance;

        if (distance < dangerRadius) {

            return true;
        }
    }

    return false;
}

// ==========================================
// VALIDATE SPAWN POSITION
// ==========================================

function isSafeSpawnPosition(
    entity,
    x,
    z,
    otherEntities,
    deployedWeapons,
    poisonZones,
    now
) {

    // ======================================
    // CHECK ARENA BOUNDARY
    // ======================================

    const limit =
        SPAWN_SETTINGS.spawnLimit;

    if (
        Math.abs(x) > limit ||
        Math.abs(z) > limit
    ) {

        return false;
    }

    // ======================================
    // AVOID MAP OBSTACLES
    // ======================================

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
    // AVOID OTHER PLAYERS AND BOTS
    // ======================================

    const occupied = otherEntities.some(

        (other) =>

            Math.hypot(
                other.x - x,
                other.z - z
            ) < SPAWN_SETTINGS.minimumDistance

    );

    if (occupied) {

        return false;
    }

    // ======================================
    // AVOID SPECIAL WEAPON HAZARDS
    // ======================================

    if (

        isSpawnHazardous(
            entity,
            x,
            z,
            deployedWeapons,
            poisonZones,
            now
        )

    ) {

        return false;
    }

    return true;
}

// ==========================================
// FIND SAFE SPAWN POSITION
// ==========================================

export function findSafeSpawn(entity) {

    if (!entity) {

        return null;
    }

    const limit =
        SPAWN_SETTINGS.spawnLimit;

    const now =
        performance.now();

    const otherEntities =
        getAliveEntities().filter(

            (other) => other.id !== entity.id

        );

    // Get current special weapon objects once
    // before searching for a spawn position.

    const deployedWeapons =
        getDeployedWeapons();

    const poisonZones =
        getPoisonZones();

    // ======================================
    // SEARCH RANDOM SAFE LOCATIONS
    // ======================================

    for (

        let i = 0;

        i < SPAWN_SETTINGS.maximumAttempts;

        i++

    ) {

        const x =
            (Math.random() * 2 - 1) * limit;

        const z =
            (Math.random() * 2 - 1) * limit;

        const safe = isSafeSpawnPosition(

            entity,

            x,

            z,

            otherEntities,

            deployedWeapons,

            poisonZones,

            now

        );

        if (!safe) {

            continue;
        }

        return [x, 0, z];
    }

    // ======================================
    // FALLBACK SAFE GRID SEARCH
    // ======================================

    const safePositions = [];

    for (

        let x = -limit;

        x <= limit;

        x += SPAWN_SETTINGS.gridStep

    ) {

        for (

            let z = -limit;

            z <= limit;

            z += SPAWN_SETTINGS.gridStep

        ) {

            const safe = isSafeSpawnPosition(

                entity,

                x,

                z,

                otherEntities,

                deployedWeapons,

                poisonZones,

                now

            );

            if (!safe) {

                continue;
            }

            safePositions.push(
                [x, 0, z]
            );
        }
    }

    // ======================================
    // SELECT RANDOM FALLBACK POSITION
    // ======================================

    if (safePositions.length > 0) {

        const index = Math.floor(

            Math.random() *
            safePositions.length

        );

        return safePositions[index];
    }

    // No safe position available.
    // Retry during the next respawn attempt.

    return null;
}

// ==========================================
// REQUEST MANUAL PLAYER RESPAWN
// ==========================================

export function requestRespawn(entity) {

    if (!entity || entity.alive) {

        return false;
    }

    // MATCH MUST BE RUNNING

    if (matchState.status !== "playing") {

        return false;
    }

    // WAIT FOR RESPAWN COUNTDOWN

    if (

        performance.now() <
        entity.respawnAt

    ) {

        return false;
    }

    // ALLOW MANUAL RESPAWN

    entity.respawnRequested = true;

    return true;
}

// ==========================================
// RESET WEAPON INFORMATION
// ==========================================

function resetWeaponInformation(entity) {

    entity.weapon = null;

    entity.ammo = 0;

    entity.maxAmmo = 0;

    entity.firing = false;

    entity.pickupMessage = "";

    entity.pickupTime = 0;
}

// ==========================================
// RESET SPECIAL WEAPON EFFECTS
// ==========================================

function resetSpecialWeaponEffects(entity) {

    // Remove active status records from
    // the SpecialWeaponSystem.

    clearEntityStatus(entity);

    // Reset all entity status fields.

    resetEntityStatus(entity);
}

// ==========================================
// RESET DEATH INFORMATION
// ==========================================

function resetDeathInformation(entity) {

    entity.killedBy = null;

    entity.killedByWeapon = null;

    entity.deathTime = 0;

    entity.respawnAt = 0;

    entity.respawnRequested = false;
}

// ==========================================
// RESET BOT AI INFORMATION
// ==========================================

function resetBotInformation(entity, now) {

    if (!entity.isBot) {

        return;
    }

    entity.aiState = "SEARCH_WEAPON";

    entity.aiExploreTarget = null;

    entity.aiExploreUntil = 0;

    entity.aiEscapeTarget = null;

    entity.aiEscapeUntil = 0;

    entity.aiLastPosition = null;

    entity.aiLastMovementCheck = now;

    entity.aiTrackedLifeId = entity.lifeId;

    entity.nextFireAt =
        now + SPAWN_SETTINGS.botFireDelay;
}

// ==========================================
// COMMON ENTITY RESPAWN SYSTEM
// ==========================================

export function respawnEntity(entity) {

    // ======================================
    // VALIDATE ENTITY
    // ======================================

    if (!entity || entity.alive) {

        return false;
    }

    if (matchState.status !== "playing") {

        return false;
    }

    const now = performance.now();

    // ======================================
    // WAIT FOR RESPAWN COUNTDOWN
    // ======================================

    if (now < entity.respawnAt) {

        return false;
    }

    // ======================================
    // MANUAL PLAYER RESPAWN
    // ======================================

    // Bots respawn automatically.
    // Players must press a keyboard key.

    if (

        !entity.isBot &&
        !entity.respawnRequested

    ) {

        return false;
    }

    // ======================================
    // FIND SAFE POSITION IN LARGE MAP
    // ======================================

    const position = findSafeSpawn(entity);

    if (!position) {

        return false;
    }

    // ======================================
    // CLEAR PREVIOUS SPECIAL WEAPON EFFECTS
    // ======================================

    resetSpecialWeaponEffects(entity);

    // ======================================
    // RESET ENTITY POSITION
    // ======================================

    entity.x = position[0];

    entity.z = position[2];

    entity.rotation =
        Math.random() * Math.PI * 2;

    entity.speed = 0;

    // ======================================
    // RESTORE FULL HEALTH
    // ======================================

    entity.health = entity.maxHealth;

    // ======================================
    // RESET WEAPON INFORMATION
    // ======================================

    resetWeaponInformation(entity);

    // ======================================
    // RESET DEATH INFORMATION
    // ======================================

    resetDeathInformation(entity);

    // ======================================
    // RESET BOT AI INFORMATION
    // ======================================

    const respawnTime = performance.now();

    resetBotInformation(
        entity,
        respawnTime
    );

    // ======================================
    // FIVE SECOND SPAWN PROTECTION
    // ======================================

    // Start protection only after a safe
    // spawn position has been found.

    entity.protectedUntil =

        respawnTime +
        SPAWN_SETTINGS.protectionDuration;

    // ======================================
    // RESTORE ENTITY ALIVE STATUS
    // ======================================

    entity.alive = true;

    // ======================================
    // UPDATE KART OBJECT
    // ======================================

    if (entity.object) {

        entity.object.position.set(

            position[0],

            position[1],

            position[2]

        );

        entity.object.rotation.set(

            0,

            entity.rotation,

            0

        );

        entity.object.updateWorldMatrix(

            true,

            true

        );

        entity.object.visible = true;
    }

    return true;
}