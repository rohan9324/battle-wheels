import {
    getAliveEntities,
} from "./EntityManager";

import {
    applyDamage,
} from "./DamageSystem";

import {
    isKartBlocked,
} from "../physics/KartCollision";

import {
    ARENA_CONFIG,
} from "../maps/ArenaConfig";

import matchState from "../match/MatchState";

// ==========================================
// SPECIAL WEAPON STORAGE
// ==========================================

const deployedWeapons = new Map();

const activeMaces = new Map();

const poisonZones = new Map();

const activeStatuses = new Map();

let nextSpecialId = 0;

// ==========================================
// COMMON HELPERS
// ==========================================

function isPlaying() {

    return matchState.status === "playing";
}

function getNow() {

    return performance.now();
}

function getDistance(x1, z1, x2, z2) {

    return Math.hypot(
        x1 - x2,
        z1 - z2
    );
}

function isProtected(entity, now = getNow()) {

    return now < (entity.protectedUntil || 0);
}

function canDamage(entity, attackerId) {

    return (

        entity &&

        entity.alive &&

        entity.id !== attackerId &&

        !isProtected(entity)

    );
}

function getEntityById(id) {

    return getAliveEntities().find(

        (entity) => entity.id === id

    ) || null;
}

// ==========================================
// GET NEARBY ENEMIES
// ==========================================

function getNearbyEnemies(
    x,
    z,
    radius,
    attackerId
) {

    return getAliveEntities().filter((entity) => {

        if (!canDamage(entity, attackerId)) {

            return false;
        }

        return getDistance(

            x,
            z,
            entity.x,
            entity.z

        ) <= radius;
    });
}

// ==========================================
// CONSUME SPECIAL WEAPON AMMO
// ==========================================

function consumeAmmo(entity) {

    entity.ammo = Math.max(

        0,

        entity.ammo - 1

    );

    if (entity.ammo <= 0) {

        entity.weapon = null;

        entity.maxAmmo = 0;
    }

    entity.firing = false;
}

// ==========================================
// SEND PLAYER NOTIFICATION
// ==========================================

function notify(entity, message) {

    entity.pickupMessage = message;

    entity.pickupTime = getNow();
}

// ==========================================
// CREATE VISUAL IMPACT
// ==========================================

function emitImpact(
    onImpact,
    type,
    x,
    y,
    z,
    damage = 0
) {

    if (typeof onImpact !== "function") {

        return;
    }

    onImpact({

        type,

        originalType: type,

        position: [x, y, z],

        damage,

    });
}

// ==========================================
// APPLY AREA DAMAGE
// ==========================================

function applyAreaDamage({

    x,

    z,

    radius,

    damage,

    attackerId,

    weaponName,

}) {

    const enemies = getNearbyEnemies(

        x,

        z,

        radius,

        attackerId

    );

    enemies.forEach((entity) => {

        applyDamage(

            entity.id,

            attackerId,

            damage,

            weaponName

        );
    });
}

// ==========================================
// STATUS EFFECT MANAGEMENT
// ==========================================

function getStatus(entity) {

    let status = activeStatuses.get(entity.id);

    if (

        !status ||

        status.lifeId !== entity.lifeId

    ) {

        status = {

            entity,

            lifeId: entity.lifeId,

            burn: null,

            slowUntil: 0,

            slowMultiplier: 1,

            stunUntil: 0,

            empUntil: 0,

        };

        activeStatuses.set(

            entity.id,

            status

        );
    }

    return status;
}

// ==========================================
// 1. FIREBALL BURN DAMAGE
// ==========================================

function applyBurn(entity, shot) {

    if (!canDamage(entity, shot.attackerId)) {

        return;
    }

    const config = shot.config || {};

    const now = getNow();

    const status = getStatus(entity);

    const interval = Math.max(

        100,

        config.burnInterval || 1000

    );

    status.burn = {

        attackerId: shot.attackerId,

        weaponName: shot.weaponName,

        damage: config.burnDamage || 5,

        interval,

        nextDamageAt: now + interval,

        expiresAt: now + (

            config.burnDuration || 3000

        ),

    };

    entity.burnUntil = status.burn.expiresAt;

    notify(entity, "BURNING");
}

// ==========================================
// 2. ICE ROCKET SLOW EFFECT
// ==========================================

function applySlow(entity, shot) {

    if (!canDamage(entity, shot.attackerId)) {

        return;
    }

    const config = shot.config || {};

    const status = getStatus(entity);

    const now = getNow();

    const multiplier = Math.max(

        0.1,

        Math.min(

            1,

            config.slowMultiplier ?? 0.45

        )

    );

    status.slowUntil = Math.max(

        status.slowUntil,

        now + (config.slowDuration || 3000)

    );

    status.slowMultiplier = Math.min(

        status.slowMultiplier,

        multiplier

    );

    entity.slowUntil = status.slowUntil;

    entity.slowMultiplier = status.slowMultiplier;

    notify(entity, "FROZEN");
}

// ==========================================
// 3. ELECTRIC BLASTER STUN
// ==========================================

function applyStun(entity, shot) {

    if (!canDamage(entity, shot.attackerId)) {

        return;
    }

    const config = shot.config || {};

    const status = getStatus(entity);

    status.stunUntil = Math.max(

        status.stunUntil,

        getNow() + (

            config.stunDuration || 1000

        )

    );

    entity.stunUntil = status.stunUntil;

    entity.speed = 0;

    notify(entity, "ELECTRIC SHOCK");
}

// ==========================================
// 4. EMP WEAPON DISABLE
// ==========================================

function applyEMP(entity, shot) {

    if (!canDamage(entity, shot.attackerId)) {

        return;
    }

    const config = shot.config || {};

    const status = getStatus(entity);

    status.empUntil = Math.max(

        status.empUntil,

        getNow() + (

            config.disableDuration || 3000

        )

    );

    entity.empUntil = status.empUntil;

    notify(entity, "WEAPON DISABLED");
}

// ==========================================
// EMP AREA EFFECT
// ==========================================

function applyEMPArea(shot, position) {

    const config = shot.config || {};

    const radius = config.empRadius || 7;

    const enemies = getNearbyEnemies(

        position[0],

        position[2],

        radius,

        shot.attackerId

    );

    enemies.forEach((entity) => {

        applyEMP(entity, shot);
    });
}

// ==========================================
// 5. POISON BOMB AREA
// ==========================================

function createPoisonZone(shot, position) {

    const config = shot.config || {};

    const now = getNow();

    const id = ++nextSpecialId;

    const interval = Math.max(

        100,

        config.poisonInterval || 1000

    );

    const zone = {

        id,

        type: "poison",

        attackerId: shot.attackerId,

        weaponName: shot.weaponName,

        x: position[0],

        y: Math.max(0.15, position[1]),

        z: position[2],

        radius: config.poisonRadius || 6,

        damage: config.poisonDamage || 8,

        interval,

        createdAt: now,

        nextDamageAt: now + interval,

        expiresAt: now + (

            config.poisonDuration || 5000

        ),

    };

    poisonZones.set(id, zone);

    return zone;
}

// ==========================================
// HANDLE SPECIAL PROJECTILE IMPACT
// ==========================================

export function handleSpecialProjectileImpact({

    shot,

    entityId = null,

    position,

    damageApplied = false,

}) {

    if (!isPlaying() || !shot || !position) {

        return;
    }

    const target = entityId

        ? getEntityById(entityId)

        : null;

    switch (shot.type) {

        // Fireball burning effect

        case "fireball":

            if (target && damageApplied) {

                applyBurn(target, shot);
            }

            break;

        // Ice rocket slowing effect

        case "ice_rocket":

            if (target && damageApplied) {

                applySlow(target, shot);
            }

            break;

        // Electric blaster stun

        case "electric":

            if (target && damageApplied) {

                applyStun(target, shot);
            }

            break;

        // EMP area effect

        case "emp":

            applyEMPArea(

                shot,

                position

            );

            break;

        // Poison damage zone

        case "poison":

            createPoisonZone(

                shot,

                position

            );

            break;

        default:

            break;
    }
}

// ==========================================
// FIND SAFE DEPLOYMENT POSITION
// ==========================================

function getDeploymentPosition(entity, weapon) {

    const distance = weapon.deployDistance || 3;

    const limit = ARENA_CONFIG.spawnLimit;

    // Deploy behind the kart.

    const x = entity.x +

        Math.sin(entity.rotation) * distance;

    const z = entity.z +

        Math.cos(entity.rotation) * distance;

    if (

        Math.abs(x) > limit ||

        Math.abs(z) > limit

    ) {

        return null;
    }

    if (isKartBlocked(x, z, 0.65)) {

        return null;
    }

    // Prevent overlapping deployed weapons.

    for (const item of deployedWeapons.values()) {

        if (

            getDistance(

                x,

                z,

                item.x,

                item.z

            ) < 1.5

        ) {

            return null;
        }
    }

    return {

        x,

        y: 0.25,

        z,

    };
}

// ==========================================
// 6. LAND MINES AND FAKE BOX DEPLOYMENT
// ==========================================

function deployWeapon(entity, weapon) {

    const position = getDeploymentPosition(

        entity,

        weapon

    );

    if (!position) {

        notify(

            entity,

            "DEPLOYMENT BLOCKED"

        );

        return false;
    }

    const now = getNow();

    const id = ++nextSpecialId;

    const item = {

        id,

        type: weapon.type,

        attackerId: entity.id,

        weaponName: weapon.name,

        x: position.x,

        y: position.y,

        z: position.z,

        damage: weapon.damage,

        triggerRadius:

            weapon.triggerRadius || 2.5,

        explosionRadius:

            weapon.explosionRadius || 5,

        createdAt: now,

        armedAt: now + (

            weapon.armDelay || 800

        ),

        expiresAt: now + (

            weapon.lifetime || 30000

        ),

        color: weapon.color,

    };

    deployedWeapons.set(id, item);

    consumeAmmo(entity);

    notify(

        entity,

        weapon.type === "mine"

            ? "LAND MINE DEPLOYED"

            : "FAKE BOX DEPLOYED"

    );

    return true;
}

// ==========================================
// EXPLODE DEPLOYED WEAPON
// ==========================================

function explodeDeployedWeapon(
    item,
    onImpact
) {

    // Remove before applying damage to prevent
    // the same weapon exploding twice.

    deployedWeapons.delete(item.id);

    applyAreaDamage({

        x: item.x,

        z: item.z,

        radius: item.explosionRadius,

        damage: item.damage,

        attackerId: item.attackerId,

        weaponName: item.weaponName,

    });

    emitImpact(

        onImpact,

        item.type,

        item.x,

        item.y,

        item.z,

        item.damage

    );
}

// ==========================================
// UPDATE DEPLOYED WEAPONS
// ==========================================

function updateDeployedWeapons(
    now,
    onImpact
) {

    for (const item of deployedWeapons.values()) {

        // Remove expired mines and fake boxes.

        if (now >= item.expiresAt) {

            deployedWeapons.delete(item.id);

            continue;
        }

        // Wait until the weapon is armed.

        if (now < item.armedAt) {

            continue;
        }

        const enemies = getNearbyEnemies(

            item.x,

            item.z,

            item.triggerRadius,

            item.attackerId

        );

        if (enemies.length > 0) {

            explodeDeployedWeapon(

                item,

                onImpact

            );
        }
    }
}

// ==========================================
// 7. SPINNING MACE ACTIVATION
// ==========================================

function activateMace(entity, weapon) {

    if (activeMaces.has(entity.id)) {

        return false;
    }

    const now = getNow();

    const mace = {

        id: ++nextSpecialId,

        attackerId: entity.id,

        lifeId: entity.lifeId,

        weaponName: weapon.name,

        weapon,

        damage: weapon.damage,

        orbitRadius: weapon.orbitRadius || 3.2,

        orbitSpeed: weapon.orbitSpeed || 6,

        hitRadius: weapon.hitRadius || 1.1,

        hitCooldown: weapon.hitCooldown || 800,

        createdAt: now,

        expiresAt: now + (

            weapon.activeDuration || 6000

        ),

        hitTimes: new Map(),

        x: entity.x,

        y: 1.15,

        z: entity.z,

        previousX: null,

        previousZ: null,

    };

    activeMaces.set(

        entity.id,

        mace

    );

    entity.ammo = Math.max(

        0,

        entity.ammo - 1

    );

    // Keep weapon equipped during activation.

    entity.firing = true;

    entity.maceUntil = mace.expiresAt;

    notify(entity, "SPINNING MACE ACTIVATED");

    return true;
}

// ==========================================
// FINISH SPINNING MACE
// ==========================================

function finishMace(mace) {

    activeMaces.delete(mace.attackerId);

    const entity = getEntityById(

        mace.attackerId

    );

    if (

        !entity ||

        entity.lifeId !== mace.lifeId

    ) {

        return;
    }

    entity.maceUntil = 0;

    if (entity.weapon === mace.weapon) {

        entity.firing = false;

        if (entity.ammo <= 0) {

            entity.weapon = null;

            entity.ammo = 0;

            entity.maxAmmo = 0;
        }
    }
}

// ==========================================
// DISTANCE FROM POINT TO MOVEMENT SEGMENT
// ==========================================

function distanceToSegment(

    px,

    pz,

    ax,

    az,

    bx,

    bz

) {

    const dx = bx - ax;

    const dz = bz - az;

    const lengthSquared =

        dx * dx + dz * dz;

    if (lengthSquared <= 0.000001) {

        return getDistance(

            px,

            pz,

            ax,

            az

        );
    }

    const t = Math.max(

        0,

        Math.min(

            1,

            (

                (px - ax) * dx +

                (pz - az) * dz

            ) / lengthSquared

        )

    );

    return getDistance(

        px,

        pz,

        ax + dx * t,

        az + dz * t

    );
}

// ==========================================
// UPDATE ACTIVE SPINNING MACES
// ==========================================

function updateMaces(now, onImpact) {

    for (const mace of activeMaces.values()) {

        const attacker = getEntityById(

            mace.attackerId

        );

        if (

            !attacker ||

            !attacker.alive ||

            attacker.lifeId !== mace.lifeId ||

            attacker.weapon !== mace.weapon ||

            now >= mace.expiresAt ||

            now < (attacker.empUntil || 0)

        ) {

            finishMace(mace);

            continue;
        }

        const elapsed =

            (now - mace.createdAt) / 1000;

        const angle =

            elapsed * mace.orbitSpeed;

        mace.x = attacker.x +

            Math.cos(angle) * mace.orbitRadius;

        mace.z = attacker.z +

            Math.sin(angle) * mace.orbitRadius;

        const previousX =

            mace.previousX ?? mace.x;

        const previousZ =

            mace.previousZ ?? mace.z;

        for (const enemy of getAliveEntities()) {

            if (!canDamage(enemy, attacker.id)) {

                continue;
            }

            const lastHit =

                mace.hitTimes.get(enemy.id);

            if (

                lastHit !== undefined &&

                now - lastHit < mace.hitCooldown

            ) {

                continue;
            }

            const distance = distanceToSegment(

                enemy.x,

                enemy.z,

                previousX,

                previousZ,

                mace.x,

                mace.z

            );

            // Include the approximate kart radius.

            if (distance > mace.hitRadius + 1.25) {

                continue;
            }

            mace.hitTimes.set(

                enemy.id,

                now

            );

            applyDamage(

                enemy.id,

                attacker.id,

                mace.damage,

                mace.weaponName

            );

            emitImpact(

                onImpact,

                "mace",

                enemy.x,

                1.1,

                enemy.z,

                mace.damage

            );
        }

        mace.previousX = mace.x;

        mace.previousZ = mace.z;
    }
}

// ==========================================
// 8. INVINCIBILITY STAR
// ==========================================

function activateInvincibility(

    entity,

    weapon,

    onImpact

) {

    const now = getNow();

    entity.protectedUntil = Math.max(

        entity.protectedUntil || 0,

        now + (

            weapon.protectionDuration || 8000

        )

    );

    clearEntityStatus(entity);

    consumeAmmo(entity);

    notify(

        entity,

        "INVINCIBILITY ACTIVATED"

    );

    emitImpact(

        onImpact,

        "invincibility",

        entity.x,

        1.1,

        entity.z

    );

    return true;
}

// ==========================================
// ACTIVATE SPECIAL WEAPON
// ==========================================

export function activateSpecialWeapon(

    entity,

    weapon,

    onImpact

) {

    if (

        !isPlaying() ||

        !entity ||

        !entity.alive ||

        !weapon ||

        entity.weapon !== weapon ||

        weapon.available === false ||

        entity.ammo <= 0 ||

        entity.firing

    ) {

        return false;
    }

    const now = getNow();

    if (

        now < (entity.empUntil || 0) ||

        now < (entity.stunUntil || 0)

    ) {

        return false;
    }

    switch (weapon.type) {

        case "mine":

        case "fake_box":

            return deployWeapon(

                entity,

                weapon

            );

        case "mace":

            return activateMace(

                entity,

                weapon

            );

        case "invincibility":

            return activateInvincibility(

                entity,

                weapon,

                onImpact

            );

        default:

            return false;
    }
}

// ==========================================
// UPDATE POISON DAMAGE ZONES
// ==========================================

function updatePoisonZones(now) {

    for (const zone of poisonZones.values()) {

        while (

            now >= zone.nextDamageAt &&

            zone.nextDamageAt <= zone.expiresAt &&

            isPlaying()

        ) {

            applyAreaDamage({

                x: zone.x,

                z: zone.z,

                radius: zone.radius,

                damage: zone.damage,

                attackerId: zone.attackerId,

                weaponName: zone.weaponName,

            });

            zone.nextDamageAt += zone.interval;
        }

        if (now >= zone.expiresAt) {

            poisonZones.delete(zone.id);
        }
    }
}

// ==========================================
// RESET ENTITY STATUS
// ==========================================

export function clearEntityStatus(entity) {

    if (!entity) return;

    activeStatuses.delete(entity.id);

    entity.burnUntil = 0;

    entity.slowUntil = 0;

    entity.slowMultiplier = 1;

    entity.stunUntil = 0;

    entity.empUntil = 0;

    entity.poisonUntil = 0;
}

// ==========================================
// UPDATE BURN, SLOW, STUN AND EMP
// ==========================================

function updateStatuses(now) {

    for (const status of activeStatuses.values()) {

        const entity = status.entity;

        // Remove effects after death or respawn.

        if (

            !entity ||

            !entity.alive ||

            entity.lifeId !== status.lifeId ||

            isProtected(entity, now)

        ) {

            clearEntityStatus(entity);

            continue;
        }

        // ==================================
        // BURN DAMAGE
        // ==================================

        if (status.burn) {

            const burn = status.burn;

            while (

                now >= burn.nextDamageAt &&

                burn.nextDamageAt <= burn.expiresAt &&

                entity.alive &&

                isPlaying()

            ) {

                applyDamage(

                    entity.id,

                    burn.attackerId,

                    burn.damage,

                    burn.weaponName

                );

                burn.nextDamageAt += burn.interval;
            }

            if (

                now >= burn.expiresAt ||

                !entity.alive

            ) {

                status.burn = null;

                entity.burnUntil = 0;
            }
        }

        if (!entity.alive) {

            clearEntityStatus(entity);

            continue;
        }

        // ==================================
        // ICE SLOW EXPIRATION
        // ==================================

        if (now >= status.slowUntil) {

            status.slowUntil = 0;

            status.slowMultiplier = 1;

            entity.slowUntil = 0;

            entity.slowMultiplier = 1;
        }

        // ==================================
        // STUN EXPIRATION
        // ==================================

        if (now >= status.stunUntil) {

            status.stunUntil = 0;

            entity.stunUntil = 0;
        }

        // ==================================
        // EMP EXPIRATION
        // ==================================

        if (now >= status.empUntil) {

            status.empUntil = 0;

            entity.empUntil = 0;
        }

        // ==================================
        // REMOVE INACTIVE STATUS RECORD
        // ==================================

        if (

            !status.burn &&

            status.slowUntil === 0 &&

            status.stunUntil === 0 &&

            status.empUntil === 0

        ) {

            activeStatuses.delete(entity.id);
        }
    }
}

// ==========================================
// GET CURRENT MOVEMENT MULTIPLIER
// ==========================================

export function getMovementMultiplier(entity) {

    if (!entity || !entity.alive) {

        return 0;
    }

    const now = getNow();

    if (now < (entity.stunUntil || 0)) {

        return 0;
    }

    if (now < (entity.slowUntil || 0)) {

        return Math.max(

            0.1,

            Math.min(

                1,

                entity.slowMultiplier ?? 1

            )

        );
    }

    return 1;
}

// ==========================================
// CHECK FIRING AVAILABILITY
// ==========================================

export function canEntityFire(entity) {

    if (!entity || !entity.alive) {

        return false;
    }

    const now = getNow();

    return (

        now >= (entity.empUntil || 0) &&

        now >= (entity.stunUntil || 0)

    );
}

// ==========================================
// GET ACTIVE SPECIAL WEAPONS
// USED BY FUTURE 3D RENDERING COMPONENT
// ==========================================

export function getDeployedWeapons() {

    return Array.from(

        deployedWeapons.values()

    );
}

export function getActiveMaces() {

    return Array.from(

        activeMaces.values()

    );
}

export function getPoisonZones() {

    return Array.from(

        poisonZones.values()

    );
}

// ==========================================
// GET ENTITY STATUS INFORMATION
// ==========================================

export function getEntityStatus(entity) {

    const now = getNow();

    return {

        burning:

            now < (entity?.burnUntil || 0),

        frozen:

            now < (entity?.slowUntil || 0),

        stunned:

            now < (entity?.stunUntil || 0),

        empDisabled:

            now < (entity?.empUntil || 0),

        protected:

            now < (entity?.protectedUntil || 0),

        movementMultiplier:

            getMovementMultiplier(entity),

    };
}

// ==========================================
// MAIN SPECIAL WEAPON UPDATE
// ==========================================

export function updateSpecialWeapons(onImpact) {

    if (!isPlaying()) {

        return;
    }

    const now = getNow();

    updateStatuses(now);

    if (!isPlaying()) return;

    updateDeployedWeapons(

        now,

        onImpact

    );

    if (!isPlaying()) return;

    updateMaces(

        now,

        onImpact

    );

    if (!isPlaying()) return;

    updatePoisonZones(now);
}

// ==========================================
// CLEAR SPECIAL WEAPONS ON MATCH EXIT
// ==========================================

export function clearSpecialWeapons() {

    for (const mace of activeMaces.values()) {

        finishMace(mace);
    }

    for (const status of activeStatuses.values()) {

        clearEntityStatus(status.entity);
    }

    deployedWeapons.clear();

    activeMaces.clear();

    poisonZones.clear();

    activeStatuses.clear();

    nextSpecialId = 0;
}