import {
    getEntity,
    resetEntityStatus,
} from "./EntityManager";

import {
    clearEntityStatus,
} from "./SpecialWeaponSystem";

import matchState, {
    finishMatch,
    addKillFeed,
} from "../match/MatchState";

// ==========================================
// DAMAGE SETTINGS
// ==========================================

const DAMAGE_SETTINGS = {

    respawnDelay: 3000,

};

// ==========================================
// CHECK ENTITY PROTECTION
// ==========================================

export function isEntityProtected(entity) {

    if (!entity || !entity.alive) {

        return false;
    }

    const protectedUntil =

        Number(entity.protectedUntil) || 0;

    return performance.now() < protectedUntil;
}

// ==========================================
// CLEAR ENTITY WEAPON INFORMATION
// ==========================================

function clearWeaponInformation(entity) {

    entity.weapon = null;

    entity.ammo = 0;

    entity.maxAmmo = 0;

    entity.firing = false;

    entity.pickupMessage = "";

    entity.pickupTime = 0;
}

// ==========================================
// CLEAR SPECIAL WEAPON EFFECTS
// ==========================================

function clearDamageEffects(entity) {

    // Remove active special weapon status records.

    clearEntityStatus(entity);

    // Reset all special weapon status fields.

    resetEntityStatus(entity);
}

// ==========================================
// ELIMINATE ENTITY
// ==========================================

function eliminateEntity(
    target,
    attacker,
    weaponName,
    now
) {

    if (!target || !target.alive) {

        return false;
    }

    // ======================================
    // UPDATE ENTITY LIFE STATUS
    // ======================================

    target.alive = false;

    target.health = 0;

    target.deaths += 1;

    target.lifeId += 1;

    target.speed = 0;

    // ======================================
    // REMOVE EXISTING PROTECTION
    // ======================================

    target.protectedUntil = 0;

    // ======================================
    // CLEAR SPECIAL WEAPON EFFECTS
    // ======================================

    clearDamageEffects(target);

    // ======================================
    // CLEAR WEAPON INFORMATION
    // ======================================

    clearWeaponInformation(target);

    // ======================================
    // RESET BOT AI INFORMATION
    // ======================================

    if (target.isBot) {

        target.aiState = "DEAD";

        target.aiExploreTarget = null;

        target.aiExploreUntil = 0;

        target.aiEscapeTarget = null;

        target.aiEscapeUntil = 0;

        target.aiLastPosition = null;

        target.aiLastMovementCheck = 0;

        target.nextFireAt = 0;
    }

    // ======================================
    // SAVE KILLER INFORMATION
    // ======================================

    target.killedBy =

        attacker?.name || "Unknown";

    target.killedByWeapon =

        weaponName || "Unknown Weapon";

    target.deathTime = now;

    // ======================================
    // THREE SECOND RESPAWN COUNTDOWN
    // ======================================

    target.respawnAt =

        now + DAMAGE_SETTINGS.respawnDelay;

    target.respawnRequested = false;

    // ======================================
    // HIDE DESTROYED KART
    // ======================================

    if (target.object) {

        target.object.visible = false;
    }

    // ======================================
    // UPDATE LIVE KILL FEED
    // ======================================

    addKillFeed(

        attacker,

        target,

        target.killedByWeapon

    );

    // ======================================
    // AWARD SCORE TO ATTACKER
    // ======================================

    if (attacker) {

        attacker.score += 1;

        // ==================================
        // CHECK POINTS MATCH WINNER
        // ==================================

        if (

            matchState.matchType === "points" &&

            attacker.score >= matchState.targetPoints

        ) {

            finishMatch(attacker);
        }
    }

    return true;
}

// ==========================================
// APPLY DAMAGE
// ==========================================

export function applyDamage(

    targetId,

    attackerId,

    damage,

    weaponName = "Weapon"

) {

    // ======================================
    // MATCH MUST BE RUNNING
    // ======================================

    if (matchState.status !== "playing") {

        return false;
    }

    const target = getEntity(targetId);

    const attacker = getEntity(attackerId);

    // ======================================
    // VALIDATE TARGET
    // ======================================

    if (!target || !target.alive) {

        return false;
    }

    // ======================================
    // PREVENT SELF DAMAGE
    // ======================================

    if (targetId === attackerId) {

        return false;
    }

    // ======================================
    // CHECK SPAWN AND INVINCIBILITY PROTECTION
    // ======================================

    if (isEntityProtected(target)) {

        // Shield is active.
        // Projectile impact visuals are allowed,
        // but health will not decrease.

        return false;
    }

    // ======================================
    // VALIDATE DAMAGE
    // ======================================

    const damageAmount = Number(damage);

    if (

        !Number.isFinite(damageAmount) ||

        damageAmount <= 0

    ) {

        return false;
    }

    // ======================================
    // VALIDATE CURRENT HEALTH
    // ======================================

    const currentHealth = Number(target.health);

    if (

        !Number.isFinite(currentHealth) ||

        currentHealth <= 0

    ) {

        return false;
    }

    const now = performance.now();

    // ======================================
    // REDUCE HEALTH
    // ======================================

    target.health = Math.max(

        0,

        currentHealth - damageAmount

    );

    // ======================================
    // ENTITY IS STILL ALIVE
    // ======================================

    if (target.health > 0) {

        return true;
    }

    // ======================================
    // ELIMINATE ENTITY
    // ======================================

    return eliminateEntity(

        target,

        attacker,

        weaponName,

        now

    );
}