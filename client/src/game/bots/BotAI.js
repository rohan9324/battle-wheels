import * as THREE from "three";

import {
    ARENA_CONFIG,
} from "../maps/ArenaConfig";

import {
    isKartBlocked,
} from "../physics/KartCollision";

import {
    getAliveEntities,
} from "../combat/EntityManager";

import {
    getPickupPositions,
} from "../pickups/SpawnManager";

import {
    checkProjectileCollision,
} from "../physics/ProjectileCollision";

import {
    requestFire,
} from "../combat/FireManager";

import {
    canEntityFire,
    getMovementMultiplier,
    getDeployedWeapons,
    getPoisonZones,
} from "../combat/SpecialWeaponSystem";

import matchState from "../match/MatchState";

// ==========================================
// BOT AI SETTINGS
// ==========================================

const AI_SETTINGS = {
    detectionRange: 85,
    weaponDetectionRange: 110,
    attackRange: 45,
    grenadeAttackRange: 18,
    minimumAttackDistance: 4,

    get explorationLimit() {
        return ARENA_CONFIG.spawnLimit;
    },

    get minimumExploreDistance() {
        return ARENA_CONFIG.minimumSpawnDistance;
    },

    get maximumExploreDistance() {
        return Math.min(
            100,
            ARENA_CONFIG.spawnLimit
        );
    },
    explorationArrivalDistance: 6,
    explorationTimeout: 12000,

    obstacleDetectionRange: 10,
    obstacleCheckStep: 1,
    entityAvoidanceDistance: 3.5,

    steeringSpeed: 3.2,

    projectileHeight: 1.10,
    muzzleForwardOffset: 2.8,

    stuckCheckInterval: 1500,
    minimumMovementDistance: 1.5,

    fireCooldown: 800,
    randomFireCooldown: 600,

    mineDeploymentRange: 18,
    fakeBoxDeploymentRange: 22,
    maceActivationRange: 8,

    invincibilityHealth: 45,
    invincibilityEnemyRange: 25,

    hazardClearance: 1.5,
};

// ==========================================
// NORMALIZE ANGLE
// ==========================================

export function normalizeAngle(angle) {

    return Math.atan2(
        Math.sin(angle),
        Math.cos(angle)
    );
}

// ==========================================
// CALCULATE DISTANCE
// ==========================================

function getDistance(bot, target) {

    return Math.hypot(
        target.x - bot.x,
        target.z - bot.z
    );
}

// ==========================================
// CHECK BOT STUCK STATE
// ==========================================

function checkBotStuck(bot, now) {

    if (
        !bot.aiLastPosition ||
        bot.aiTrackedLifeId !== bot.lifeId
    ) {

        bot.aiTrackedLifeId = bot.lifeId;

        bot.aiLastPosition = {
            x: bot.x,
            z: bot.z,
        };

        bot.aiLastMovementCheck = now;

        bot.aiExploreTarget = null;

        bot.aiEscapeTarget = null;

        return false;
    }

    if (
        now - bot.aiLastMovementCheck <
        AI_SETTINGS.stuckCheckInterval
    ) {

        return false;
    }

    const distance = Math.hypot(
        bot.x - bot.aiLastPosition.x,
        bot.z - bot.aiLastPosition.z
    );

    bot.aiLastPosition = {
        x: bot.x,
        z: bot.z,
    };

    bot.aiLastMovementCheck = now;

    const movementMultiplier =
        getMovementMultiplier(bot);

    // Do not interrupt intentional combat,
    // firing, or electric stun.

    if (
        bot.aiState === "ATTACK" ||
        bot.aiState === "AIM" ||
        bot.aiState === "STUNNED" ||
        bot.firing ||
        movementMultiplier <= 0
    ) {

        return false;
    }

    return (
        distance <
        AI_SETTINGS.minimumMovementDistance *
        movementMultiplier
    );
}

// ==========================================
// CHECK DANGEROUS MAP POSITION
// ==========================================

function isHazardousPosition(
    bot,
    x,
    z,
    traps = getDeployedWeapons(),
    zones = getPoisonZones()
) {

    const now = performance.now();

    // Protected bots can safely cross hazards.

    if (now < (bot.protectedUntil || 0)) {
        return false;
    }

    // Avoid enemy land mines and fake boxes.

    for (const trap of traps) {

        if (
            trap.attackerId === bot.id ||
            now >= trap.expiresAt
        ) {

            continue;
        }

        const distance = Math.hypot(
            trap.x - x,
            trap.z - z
        );

        const dangerRadius =
            (trap.triggerRadius || 2.5) +
            AI_SETTINGS.hazardClearance;

        if (distance < dangerRadius) {
            return true;
        }
    }

    // Avoid enemy poison damage zones.

    for (const zone of zones) {

        if (
            zone.attackerId === bot.id ||
            now >= zone.expiresAt
        ) {

            continue;
        }

        const distance = Math.hypot(
            zone.x - x,
            zone.z - z
        );

        if (
            distance <
            zone.radius +
            AI_SETTINGS.hazardClearance
        ) {

            return true;
        }
    }

    return false;
}

// ==========================================
// FIND NEAREST VALID ENEMY
// ==========================================

function findNearestEnemy(
    bot,
    range = AI_SETTINGS.detectionRange,
    ignoreProtected = true
) {

    const now = performance.now();

    let nearest = null;

    let nearestDistance = range;

    for (const entity of getAliveEntities()) {

        if (
            entity.id === bot.id ||
            !entity.alive
        ) {

            continue;
        }

        if (
            ignoreProtected &&
            now < (entity.protectedUntil || 0)
        ) {

            continue;
        }

        const distance =
            getDistance(bot, entity);

        if (distance <= nearestDistance) {

            nearest = entity;

            nearestDistance = distance;
        }
    }

    return nearest;
}

// ==========================================
// CREATE RANDOM EXPLORATION TARGET
// ==========================================

function createExploreTarget(bot) {

    const limit =
        AI_SETTINGS.explorationLimit;

    for (let attempt = 0; attempt < 80; attempt++) {

        const angle =
            Math.random() * Math.PI * 2;

        const distance =
            AI_SETTINGS.minimumExploreDistance +
            Math.random() * (
                AI_SETTINGS.maximumExploreDistance -
                AI_SETTINGS.minimumExploreDistance
            );

        const x = THREE.MathUtils.clamp(
            bot.x + Math.sin(angle) * distance,
            -limit,
            limit
        );

        const z = THREE.MathUtils.clamp(
            bot.z + Math.cos(angle) * distance,
            -limit,
            limit
        );

        if (
            isKartBlocked(x, z) ||
            isHazardousPosition(bot, x, z)
        ) {

            continue;
        }

        if (
            Math.hypot(
                x - bot.x,
                z - bot.z
            ) < AI_SETTINGS.minimumExploreDistance
        ) {

            continue;
        }

        return {
            type: "explore",
            x,
            z,
        };
    }

    // Fallback: search the entire playable map.

    for (let attempt = 0; attempt < 80; attempt++) {

        const x =
            (Math.random() * 2 - 1) * limit;

        const z =
            (Math.random() * 2 - 1) * limit;

        if (
            !isKartBlocked(x, z) &&
            !isHazardousPosition(bot, x, z) &&
            Math.hypot(
                x - bot.x,
                z - bot.z
            ) > 10
        ) {

            return {
                type: "explore",
                x,
                z,
            };
        }
    }

    return null;
}

// ==========================================
// GET CURRENT EXPLORATION TARGET
// ==========================================

function getExploreTarget(bot, now) {

    const currentTarget =
        bot.aiExploreTarget;

    const needsNewTarget =
        !currentTarget ||
        getDistance(bot, currentTarget) <
        AI_SETTINGS.explorationArrivalDistance ||
        now >= (bot.aiExploreUntil || 0) ||
        isKartBlocked(
            currentTarget.x,
            currentTarget.z
        ) ||
        isHazardousPosition(
            bot,
            currentTarget.x,
            currentTarget.z
        );

    if (needsNewTarget) {

        bot.aiExploreTarget =
            createExploreTarget(bot);

        bot.aiExploreUntil =
            now + AI_SETTINGS.explorationTimeout;
    }

    bot.aiState = "EXPLORE";

    return bot.aiExploreTarget;
}

// ==========================================
// FIND NEAREST AVAILABLE WEAPON
// ==========================================

function findNearestPickup(bot) {

    const pickups =
        getPickupPositions();

    let nearest = null;

    let nearestDistance =
        AI_SETTINGS.weaponDetectionRange;

    for (const position of pickups) {

        const x = position[0];

        const z = position[2];

        const distance = Math.hypot(
            x - bot.x,
            z - bot.z
        );

        if (distance >= nearestDistance) {
            continue;
        }

        if (
            isKartBlocked(x, z) ||
            isHazardousPosition(bot, x, z)
        ) {

            continue;
        }

        nearest = position;

        nearestDistance = distance;
    }

    if (!nearest) {
        return null;
    }

    return {
        type: "pickup",
        x: nearest[0],
        z: nearest[2],
    };
}

// ==========================================
// FIND SAFE ESCAPE DIRECTION
// ==========================================

function createEscapeTarget(bot) {

    const offsets = [
        Math.PI / 2,
        -Math.PI / 2,
        Math.PI,
        0.75,
        -0.75,
        2.2,
        -2.2,
        0,
    ];

    const currentlyInHazard =
        isHazardousPosition(
            bot,
            bot.x,
            bot.z
        );

    for (const offset of offsets) {

        const angle =
            bot.rotation + offset;

        let blocked = false;

        for (
            let distance = 1;
            distance <= 12;
            distance++
        ) {

            const x =
                bot.x -
                Math.sin(angle) * distance;

            const z =
                bot.z -
                Math.cos(angle) * distance;

            if (
                isKartBlocked(x, z) ||
                (
                    !currentlyInHazard &&
                    isHazardousPosition(bot, x, z)
                )
            ) {

                blocked = true;

                break;
            }
        }

        const targetX =
            bot.x - Math.sin(angle) * 12;

        const targetZ =
            bot.z - Math.cos(angle) * 12;

        if (
            !blocked &&
            !isHazardousPosition(
                bot,
                targetX,
                targetZ
            )
        ) {

            return {
                type: "explore",
                x: targetX,
                z: targetZ,
            };
        }
    }

    return createExploreTarget(bot);
}

// ==========================================
// COMMON BOT FIRE REQUEST
// ==========================================

function fireBotWeapon(bot, now) {

    if (
        !bot.alive ||
        !bot.weapon ||
        bot.weapon.available === false ||
        bot.ammo <= 0 ||
        bot.firing ||
        !canEntityFire(bot) ||
        matchState.status !== "playing" ||
        now < (bot.nextFireAt || 0)
    ) {

        return false;
    }

    if (!requestFire(bot)) {
        return false;
    }

    bot.aiState = "ATTACK";

    bot.nextFireAt =
        now +
        AI_SETTINGS.fireCooldown +
        Math.random() *
        AI_SETTINGS.randomFireCooldown;

    return true;
}

// ==========================================
// CHECK ENEMY BEHIND BOT
// ==========================================

function isEnemyBehindBot(bot, enemy) {

    const dx = enemy.x - bot.x;

    const dz = enemy.z - bot.z;

    const distance =
        Math.hypot(dx, dz);

    if (distance < 0.001) {
        return false;
    }

    const forwardX =
        -Math.sin(bot.rotation);

    const forwardZ =
        -Math.cos(bot.rotation);

    const dot =
        forwardX * (dx / distance) +
        forwardZ * (dz / distance);

    return dot < -0.15;
}

// ==========================================
// CHECK SAFE TRAP DEPLOYMENT POSITION
// ==========================================

function canDeployTrap(bot, weapon) {

    const distance =
        weapon.deployDistance || 3;

    const x =
        bot.x +
        Math.sin(bot.rotation) * distance;

    const z =
        bot.z +
        Math.cos(bot.rotation) * distance;

    const limit = ARENA_CONFIG.spawnLimit;

    if (
        Math.abs(x) > limit ||
        Math.abs(z) > limit ||
        isKartBlocked(x, z, 0.65)
    ) {

        return false;
    }

    const existingTrap =
        getDeployedWeapons().some((trap) => {

            return Math.hypot(
                trap.x - x,
                trap.z - z
            ) < 1.5;
        });

    return !existingTrap;
}

// ==========================================
// ACTIVATE SPECIAL BOT WEAPONS
// ==========================================

function trySpecialWeapon(bot, enemy, now) {

    const weapon = bot.weapon;

    if (
        !weapon ||
        weapon.available === false ||
        bot.ammo <= 0 ||
        bot.firing ||
        !canEntityFire(bot) ||
        now < (bot.nextFireAt || 0)
    ) {

        return false;
    }

    const distance = enemy
        ? getDistance(bot, enemy)
        : Infinity;

    // ======================================
    // INVINCIBILITY STAR
    // ======================================

    if (weapon.type === "invincibility") {

        // Do not waste invincibility while
        // existing spawn protection is active.

        if (now < (bot.protectedUntil || 0)) {
            return false;
        }

        const healthPercentage =
            bot.health /
            (bot.maxHealth || 100) * 100;

        const lowHealth =
            healthPercentage <=
            AI_SETTINGS.invincibilityHealth;

        const enemyNearby =
            distance <=
            AI_SETTINGS.invincibilityEnemyRange;

        const insideHazard =
            isHazardousPosition(
                bot,
                bot.x,
                bot.z
            );

        if (
            lowHealth ||
            enemyNearby ||
            insideHazard
        ) {

            return fireBotWeapon(bot, now);
        }

        return false;
    }

    // Other special weapons require an enemy.

    if (
        !enemy ||
        !enemy.alive ||
        now < (enemy.protectedUntil || 0)
    ) {

        return false;
    }

    // ======================================
    // LAND MINES
    // ======================================

    if (weapon.type === "mine") {

        if (
            distance <=
            AI_SETTINGS.mineDeploymentRange &&
            isEnemyBehindBot(bot, enemy) &&
            canDeployTrap(bot, weapon)
        ) {

            return fireBotWeapon(bot, now);
        }

        return false;
    }

    // ======================================
    // FAKE MYSTERY BOX
    // ======================================

    if (weapon.type === "fake_box") {

        if (
            distance <=
            AI_SETTINGS.fakeBoxDeploymentRange &&
            isEnemyBehindBot(bot, enemy) &&
            canDeployTrap(bot, weapon)
        ) {

            return fireBotWeapon(bot, now);
        }

        return false;
    }

    // ======================================
    // SPINNING MACE
    // ======================================

    if (weapon.type === "mace") {

        if (
            distance <=
            AI_SETTINGS.maceActivationRange
        ) {

            return fireBotWeapon(bot, now);
        }

        return false;
    }

    return false;
}

// ==========================================
// CREATE ENEMY TARGET
// ==========================================

function createEnemyTarget(enemy) {

    return {
        type: "enemy",
        entity: enemy,
        x: enemy.x,
        z: enemy.z,
    };
}

// ==========================================
// CREATE TRAP LURING TARGET
// ==========================================

function createTrapLureTarget(bot, enemy) {

    const dx = bot.x - enemy.x;

    const dz = bot.z - enemy.z;

    const distance =
        Math.hypot(dx, dz) || 1;

    const limit =
        AI_SETTINGS.explorationLimit;

    const targetX = THREE.MathUtils.clamp(
        bot.x + dx / distance * 18,
        -limit,
        limit
    );

    const targetZ = THREE.MathUtils.clamp(
        bot.z + dz / distance * 18,
        -limit,
        limit
    );

    if (
        !isKartBlocked(targetX, targetZ) &&
        !isHazardousPosition(
            bot,
            targetX,
            targetZ
        )
    ) {

        return {
            type: "explore",
            x: targetX,
            z: targetZ,
        };
    }

    return createEscapeTarget(bot);
}

// ==========================================
// MAIN BOT TARGET SELECTION
// ==========================================

export function getBotTarget(bot) {

    if (
        !bot.alive ||
        matchState.status !== "playing"
    ) {

        return null;
    }

    const now = performance.now();

    if (getMovementMultiplier(bot) <= 0) {

        bot.aiState = "STUNNED";

        return null;
    }

    const enemy =
        findNearestEnemy(bot);

    // ======================================
    // ACTIVATE SPECIAL WEAPONS
    // ======================================

    // This runs even when the bot does not
    // currently have an enemy movement target.

    trySpecialWeapon(bot, enemy, now);

    // ======================================
    // ESCAPE FROM ACTIVE HAZARDS
    // ======================================

    if (
        isHazardousPosition(
            bot,
            bot.x,
            bot.z
        )
    ) {

        const escapeTarget =
            createEscapeTarget(bot);

        if (escapeTarget) {

            bot.aiEscapeTarget =
                escapeTarget;

            bot.aiEscapeUntil =
                now + 2500;

            bot.aiState = "ESCAPE";

            return escapeTarget;
        }
    }

    // ======================================
    // CHECK IF BOT IS STUCK
    // ======================================

    if (checkBotStuck(bot, now)) {

        bot.aiExploreTarget = null;

        bot.aiEscapeTarget =
            createEscapeTarget(bot);

        bot.aiEscapeUntil =
            now + 2500;
    }

    // ======================================
    // ESCAPE FROM OBSTACLES
    // ======================================

    if (bot.aiEscapeTarget) {

        const distance = getDistance(
            bot,
            bot.aiEscapeTarget
        );

        if (
            now < bot.aiEscapeUntil &&
            distance > 3
        ) {

            bot.aiState = "ESCAPE";

            return bot.aiEscapeTarget;
        }

        bot.aiEscapeTarget = null;
    }

    // ======================================
    // SEARCH WEAPON WHEN UNARMED
    // ======================================

    if (
        (
            !bot.weapon ||
            bot.ammo <= 0 ||
            bot.weapon.available === false
        ) &&
        !bot.firing
    ) {

        const pickup =
            findNearestPickup(bot);

        if (pickup) {

            bot.aiState = "SEARCH_WEAPON";

            return pickup;
        }

        return getExploreTarget(bot, now);
    }

    // ======================================
    // TRAP WEAPON MOVEMENT STRATEGY
    // ======================================

    if (
        enemy &&
        bot.weapon &&
        (
            bot.weapon.type === "mine" ||
            bot.weapon.type === "fake_box"
        )
    ) {

        const distance =
            getDistance(bot, enemy);

        if (distance <= 25) {

            const lureTarget =
                createTrapLureTarget(
                    bot,
                    enemy
                );

            if (lureTarget) {

                bot.aiState = "ESCAPE";

                return lureTarget;
            }
        }
    }

    // ======================================
    // ACTIVE SPINNING MACE
    // ======================================

    if (
        enemy &&
        bot.weapon?.type === "mace" &&
        bot.firing
    ) {

        bot.aiState = "CHASE";

        return createEnemyTarget(enemy);
    }

    // ======================================
    // SEARCH NEARBY ENEMY
    // ======================================

    if (enemy && enemy.alive) {

        bot.aiState = "CHASE";

        return createEnemyTarget(enemy);
    }

    // ======================================
    // NO NEARBY ENEMY: EXPLORE
    // ======================================

    return getExploreTarget(bot, now);
}

// ==========================================
// CHECK WHETHER A DIRECTION IS SAFE
// ==========================================

function getDirectionClearance(
    bot,
    angle,
    entities,
    target,
    traps,
    zones
) {

    const range =
        AI_SETTINGS.obstacleDetectionRange;

    let clearance = range;

    const startsInHazard =
        isHazardousPosition(
            bot,
            bot.x,
            bot.z,
            traps,
            zones
        );

    let exitedHazard =
        !startsInHazard;

    for (
        let distance = 1;
        distance <= range;
        distance += AI_SETTINGS.obstacleCheckStep
    ) {

        const x =
            bot.x -
            Math.sin(angle) * distance;

        const z =
            bot.z -
            Math.cos(angle) * distance;

        // Check houses, walls, trees,
        // containers and other solid objects.

        if (isKartBlocked(x, z)) {

            clearance = distance - 1;

            break;
        }

        // Avoid enemy traps and poison.

        const hazardous =
            isHazardousPosition(
                bot,
                x,
                z,
                traps,
                zones
            );

        if (!hazardous) {

            exitedHazard = true;

        } else if (exitedHazard) {

            clearance = distance - 1;

            break;
        }

        // Avoid driving into other karts.

        const occupied = entities.some(
            (entity) => {

                if (entity.id === bot.id) {
                    return false;
                }

                return (
                    Math.hypot(
                        entity.x - x,
                        entity.z - z
                    ) <
                    AI_SETTINGS.entityAvoidanceDistance
                );
            }
        );

        if (occupied) {

            clearance = distance - 1;

            break;
        }

        // No need to check beyond
        // a nearby weapon pickup.

        if (
            target.type === "pickup" &&
            Math.hypot(
                target.x - x,
                target.z - z
            ) < 1.5
        ) {

            return range;
        }
    }

    // Prefer directions that escape
    // an existing poison or trap zone.

    if (
        startsInHazard &&
        !exitedHazard
    ) {

        clearance *= 0.5;
    }

    return clearance;
}

// ==========================================
// INTELLIGENT OBSTACLE AVOIDANCE
// ==========================================

export function getBotHeading(bot, target) {

    if (!target) {
        return bot.rotation;
    }

    const dx = target.x - bot.x;

    const dz = target.z - bot.z;

    if (Math.hypot(dx, dz) < 0.01) {
        return bot.rotation;
    }

    const desiredHeading =
        Math.atan2(-dx, -dz);

    const offsets = [
        0,
        0.25,
        -0.25,
        0.50,
        -0.50,
        0.85,
        -0.85,
        1.20,
        -1.20,
        1.60,
        -1.60,
        2.20,
        -2.20,
        Math.PI,
    ];

    const entities =
        getAliveEntities();

    const traps =
        getDeployedWeapons();

    const zones =
        getPoisonZones();

    let bestHeading =
        bot.rotation + Math.PI;

    let bestScore = -Infinity;

    for (const offset of offsets) {

        const angle =
            desiredHeading + offset;

        const clearance =
            getDirectionClearance(
                bot,
                angle,
                entities,
                target,
                traps,
                zones
            );

        if (clearance < 2) {
            continue;
        }

        const headingDifference = Math.abs(
            normalizeAngle(
                angle - bot.rotation
            )
        );

        const score =
            clearance * 2.5 -
            Math.abs(offset) * 3 -
            headingDifference * 0.75;

        if (score > bestScore) {

            bestScore = score;

            bestHeading = angle;
        }
    }

    return normalizeAngle(bestHeading);
}

// ==========================================
// UPDATE BOT STEERING
// ==========================================

export function updateBotSteering(
    bot,
    target,
    delta,
    directAim = false
) {

    if (
        !target ||
        getMovementMultiplier(bot) <= 0
    ) {

        return 0;
    }

    let desiredHeading;

    // ======================================
    // DIRECT ENEMY AIMING
    // ======================================

    if (directAim) {

        desiredHeading = Math.atan2(
            -(target.x - bot.x),
            -(target.z - bot.z)
        );

    } else {

        desiredHeading =
            getBotHeading(bot, target);
    }

    const difference = normalizeAngle(
        desiredHeading - bot.rotation
    );

    const turnSpeed =
        AI_SETTINGS.steeringSpeed *
        Math.min(delta, 0.05);

    bot.rotation += THREE.MathUtils.clamp(
        difference,
        -turnSpeed,
        turnSpeed
    );

    bot.rotation = normalizeAngle(
        bot.rotation
    );

    return Math.abs(difference);
}

// ==========================================
// GET WEAPON ATTACK RANGE
// ==========================================

export function getWeaponAttackRange(weapon) {

    if (!weapon) {
        return AI_SETTINGS.attackRange;
    }

    let range = AI_SETTINGS.attackRange;

    switch (weapon.type) {

        case "grenade":

        case "poison":

            range =
                AI_SETTINGS.grenadeAttackRange;

            break;

        case "pellet":

            range = 25;

            break;

        case "homing":

            range = Math.min(
                45,
                weapon.homingRange || 100
            );

            break;

        case "mace":

            range =
                AI_SETTINGS.maceActivationRange;

            break;

        case "mine":

            range =
                AI_SETTINGS.mineDeploymentRange;

            break;

        case "fake_box":

            range =
                AI_SETTINGS.fakeBoxDeploymentRange;

            break;

        case "invincibility":

            range =
                AI_SETTINGS.invincibilityEnemyRange;

            break;

        default:

            range = AI_SETTINGS.attackRange;

            break;
    }

    return Math.min(
        range,
        weapon.maxRange ?? Infinity
    );
}

// ==========================================
// CHECK CLEAR PROJECTILE PATH
// ==========================================

export function hasClearShot(
    scene,
    bot,
    enemy
) {

    if (
        !enemy ||
        !enemy.alive ||
        !bot.weapon
    ) {

        return false;
    }

    // Special weapons do not require
    // normal projectile aiming.

    if (
        bot.weapon.deployable ||
        bot.weapon.melee ||
        bot.weapon.powerUp
    ) {

        return false;
    }

    const forwardOffset =
        bot.weapon.type === "nuke"
            ? 2.95
            : AI_SETTINGS.muzzleForwardOffset;

    const start = new THREE.Vector3(
        bot.x -
        Math.sin(bot.rotation) * forwardOffset,
        AI_SETTINGS.projectileHeight,
        bot.z -
        Math.cos(bot.rotation) * forwardOffset
    );

    const end = new THREE.Vector3(
        enemy.x,
        AI_SETTINGS.projectileHeight,
        enemy.z
    );

    const hit = checkProjectileCollision(
        scene,
        start,
        end,
        bot.id,
        true
    );

    if (!hit) {
        return true;
    }

    return hit.entityId === enemy.id;
}

// ==========================================
// GET WEAPON AIM TOLERANCE
// ==========================================

function getAimTolerance(weapon, config) {

    const accuracy = THREE.MathUtils.clamp(
        config.accuracy ?? 0.75,
        0,
        1
    );

    const baseTolerance =
        0.05 + (1 - accuracy) * 0.12;

    switch (weapon.type) {

        case "pellet":

            return baseTolerance + 0.10;

        case "homing":

            return baseTolerance + 0.15;

        case "grenade":

        case "poison":

            return baseTolerance + 0.04;

        case "laser":

            return baseTolerance * 0.8;

        default:

            return baseTolerance;
    }
}

// ==========================================
// UPDATE BOT COMBAT
// ==========================================

export function updateBotCombat(
    scene,
    bot,
    enemy,
    config,
    now
) {

    // ======================================
    // VALIDATE COMBAT STATE
    // ======================================

    if (
        matchState.status !== "playing" ||
        !bot.alive ||
        !bot.weapon ||
        bot.weapon.available === false ||
        bot.ammo <= 0 ||
        bot.firing ||
        !canEntityFire(bot)
    ) {

        return false;
    }

    // ======================================
    // FIRE COOLDOWN
    // ======================================

    if (now < (bot.nextFireAt || 0)) {
        return false;
    }

    const weapon = bot.weapon;

    // ======================================
    // HANDLE SPECIAL WEAPONS
    // ======================================

    if (
        weapon.deployable ||
        weapon.melee ||
        weapon.powerUp
    ) {

        return trySpecialWeapon(
            bot,
            enemy,
            now
        );
    }

    // ======================================
    // VALIDATE ENEMY
    // ======================================

    if (
        !enemy ||
        !enemy.alive ||
        now < (enemy.protectedUntil || 0)
    ) {

        return false;
    }

    const distance =
        getDistance(bot, enemy);

    const attackRange =
        getWeaponAttackRange(weapon);

    // ======================================
    // CHECK ATTACK DISTANCE
    // ======================================

    if (
        distance <
        AI_SETTINGS.minimumAttackDistance ||
        distance > attackRange
    ) {

        return false;
    }

    // ======================================
    // CHECK AIM DIRECTION
    // ======================================

    const desiredHeading = Math.atan2(
        -(enemy.x - bot.x),
        -(enemy.z - bot.z)
    );

    const angleDifference = Math.abs(
        normalizeAngle(
            desiredHeading - bot.rotation
        )
    );

    const aimTolerance =
        getAimTolerance(weapon, config);

    if (angleDifference > aimTolerance) {
        return false;
    }

    // ======================================
    // CHECK OBSTACLES BETWEEN BOT AND ENEMY
    // ======================================

    if (!hasClearShot(scene, bot, enemy)) {
        return false;
    }

    // ======================================
    // REQUEST COMMON WEAPON FIRING
    // ======================================

    return fireBotWeapon(bot, now);
}