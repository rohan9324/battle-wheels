import * as THREE from "three";

import { ARENA_CONFIG } from "../maps/ArenaConfig";

import {
    isKartBlocked,
    isKartBodyBlocked,
    isOtherKartBlocked,
    KART_COLLISION_CONFIG,
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
    obstacleCheckStep: 0.5,

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
// CALCULATE TARGET HEADING
// ==========================================

function getTargetHeading(bot, x, z) {
    const dx = x - bot.x;
    const dz = z - bot.z;

    if (Math.hypot(dx, dz) < 0.001) {
        return bot.rotation || 0;
    }

    return Math.atan2(-dx, -dz);
}

// ==========================================
// ACCURATE MAP POSITION CHECK
// ==========================================

function isBotPositionBlocked(
    bot,
    x,
    z,
    rotation = bot.rotation
) {
    return isKartBodyBlocked(
        x,
        z,
        rotation
    );
}

// ==========================================
// CHECK SAFE TARGET POSITION
// ==========================================

function isTargetPositionBlocked(bot, x, z) {
    const heading = getTargetHeading(
        bot,
        x,
        z
    );

    return isBotPositionBlocked(
        bot,
        x,
        z,
        heading
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

    if (
        bot.aiState === "ATTACK" ||
        bot.aiState === "AIM" ||
        bot.aiState === "STUNNED" ||
        bot.aiState === "RECOVER" ||
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

    // Avoid active poison zones.

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

        const distance = getDistance(
            bot,
            entity
        );

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

    const limit = AI_SETTINGS.explorationLimit;

    const traps = getDeployedWeapons();
    const zones = getPoisonZones();

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
            isTargetPositionBlocked(bot, x, z) ||
            isHazardousPosition(
                bot,
                x,
                z,
                traps,
                zones
            )
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
            !isTargetPositionBlocked(bot, x, z) &&
            !isHazardousPosition(
                bot,
                x,
                z,
                traps,
                zones
            ) &&
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

    const currentTarget = bot.aiExploreTarget;

    const needsNewTarget =
        !currentTarget ||
        getDistance(bot, currentTarget) <
            AI_SETTINGS.explorationArrivalDistance ||
        now >= (bot.aiExploreUntil || 0) ||
        isTargetPositionBlocked(
            bot,
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

    const pickups = getPickupPositions();

    const traps = getDeployedWeapons();
    const zones = getPoisonZones();

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
            isTargetPositionBlocked(bot, x, z) ||
            isHazardousPosition(
                bot,
                x,
                z,
                traps,
                zones
            )
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

    const traps = getDeployedWeapons();
    const zones = getPoisonZones();

    const currentlyInHazard =
        isHazardousPosition(
            bot,
            bot.x,
            bot.z,
            traps,
            zones
        );

    let bestTarget = null;
    let bestClearance = 0;

    for (const offset of offsets) {

        const angle = normalizeAngle(
            bot.rotation + offset
        );

        let clearance = 0;

        let exitedHazard = !currentlyInHazard;

        for (
            let distance = AI_SETTINGS.obstacleCheckStep;
            distance <= 12;
            distance += AI_SETTINGS.obstacleCheckStep
        ) {

            const x =
                bot.x -
                Math.sin(angle) * distance;

            const z =
                bot.z -
                Math.cos(angle) * distance;

            // Check actual rectangular kart body.

            if (
                isBotPositionBlocked(
                    bot,
                    x,
                    z,
                    angle
                )
            ) {
                break;
            }

            // Check other karts.

            if (
                isOtherKartBlocked(
                    x,
                    z,
                    bot.id,
                    angle
                )
            ) {
                break;
            }

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
                break;
            }

            if (!hazardous) {
                clearance = distance;
            }
        }

        if (
            clearance >= 4 &&
            clearance > bestClearance
        ) {

            bestClearance = clearance;

            bestTarget = {
                type: "explore",

                x:
                    bot.x -
                    Math.sin(angle) * clearance,

                z:
                    bot.z -
                    Math.cos(angle) * clearance,
            };
        }
    }

    return bestTarget || createExploreTarget(bot);
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

    const distance = Math.hypot(dx, dz);

    if (distance < 0.001) {
        return false;
    }

    const forwardX = -Math.sin(bot.rotation);
    const forwardZ = -Math.cos(bot.rotation);

    const dot =
        forwardX * (dx / distance) +
        forwardZ * (dz / distance);

    return dot < -0.15;
}

// ==========================================
// CHECK SAFE TRAP DEPLOYMENT POSITION
// ==========================================

function canDeployTrap(bot, weapon) {

    const distance = weapon.deployDistance || 3;

    const x =
        bot.x +
        Math.sin(bot.rotation) * distance;

    const z =
        bot.z +
        Math.cos(bot.rotation) * distance;

    const limit = ARENA_CONFIG.spawnLimit;

    // Circular check is intentionally retained.
    // This checks the trap, not the kart body.

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

    const distance = Math.hypot(dx, dz) || 1;

    const limit = AI_SETTINGS.explorationLimit;

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
        !isTargetPositionBlocked(
            bot,
            targetX,
            targetZ
        ) &&
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

    const enemy = findNearestEnemy(bot);

    // Activate special weapons.

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

            bot.aiEscapeTarget = escapeTarget;

            bot.aiEscapeUntil = now + 2500;

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

        bot.aiEscapeUntil = now + 2500;
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

        const pickup = findNearestPickup(bot);

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

        const distance = getDistance(
            bot,
            enemy
        );

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

    const step =
        AI_SETTINGS.obstacleCheckStep;

    let clearance = range;

    const startsInHazard =
        isHazardousPosition(
            bot,
            bot.x,
            bot.z,
            traps,
            zones
        );

    let exitedHazard = !startsInHazard;

    const nearbyEntities = entities.filter(
        (entity) => {

            if (
                entity.id === bot.id ||
                !entity.alive ||
                !entity.object ||
                !entity.object.visible
            ) {
                return false;
            }

            const maximumDistance =
                range +
                Math.hypot(
                    KART_COLLISION_CONFIG.kartHalfWidth,
                    KART_COLLISION_CONFIG.kartHalfLength
                ) * 2;

            return (
                Math.hypot(
                    entity.x - bot.x,
                    entity.z - bot.z
                ) <= maximumDistance
            );
        }
    );

    let previousX = bot.x;
    let previousZ = bot.z;

    for (
        let distance = step;
        distance <= range;
        distance += step
    ) {

        const x =
            bot.x -
            Math.sin(angle) * distance;

        const z =
            bot.z -
            Math.cos(angle) * distance;

        // ==================================
        // RECTANGULAR MAP COLLISION
        // ==================================

        if (
            isBotPositionBlocked(
                bot,
                x,
                z,
                angle
            )
        ) {
            clearance = Math.max(
                0,
                distance - step
            );

            break;
        }

        // ==================================
        // AVOID SPECIAL WEAPON HAZARDS
        // ==================================

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

            clearance = Math.max(
                0,
                distance - step
            );

            break;
        }

        // ==================================
        // ACCURATE KART-TO-KART PREDICTION
        // ==================================

        if (
            nearbyEntities.length > 0 &&
            isOtherKartBlocked(
                x,
                z,
                bot.id,
                angle,
                previousX,
                previousZ
            )
        ) {
            clearance = Math.max(
                0,
                distance - step
            );

            break;
        }

        // ==================================
        // STOP CHECKING AFTER REACHING PICKUP
        // ==================================

        if (
            target.type === "pickup" &&
            Math.hypot(
                target.x - x,
                target.z - z
            ) < 1.5
        ) {
            return range;
        }

        previousX = x;
        previousZ = z;
    }

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

    const entities = getAliveEntities();

    const traps = getDeployedWeapons();

    const zones = getPoisonZones();

    let bestHeading = bot.rotation;

    let bestScore = -Infinity;

    let fallbackHeading = bot.rotation;

    let fallbackClearance = 0;

    for (const offset of offsets) {

        const angle = normalizeAngle(
            desiredHeading + offset
        );

        const clearance =
            getDirectionClearance(
                bot,
                angle,
                entities,
                target,
                traps,
                zones
            );

        if (clearance > fallbackClearance) {

            fallbackClearance = clearance;

            fallbackHeading = angle;
        }

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

    // If no ideal route exists, use the
    // direction with the best available clearance.

    if (bestScore === -Infinity) {

        return normalizeAngle(
            fallbackClearance > 0
                ? fallbackHeading
                : bot.rotation + Math.PI
        );
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

    // Final rotation validation is handled
    // by BotKart.js using isKartRotationBlocked().

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

    const distance = getDistance(
        bot,
        enemy
    );

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