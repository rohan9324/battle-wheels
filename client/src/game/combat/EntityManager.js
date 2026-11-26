const entities = new Map();

// ==========================================
// REGISTER ENTITY
// ==========================================

export function registerEntity(entity) {

    entities.set(entity.id, entity);
}

// ==========================================
// UNREGISTER ENTITY
// ==========================================

export function unregisterEntity(id, entity) {

    if (entities.get(id) === entity) {

        entities.delete(id);
    }
}

// ==========================================
// GET SINGLE ENTITY
// ==========================================

export function getEntity(id) {

    return entities.get(id);
}

// ==========================================
// GET ALL ENTITIES
// ==========================================

export function getEntities() {

    return Array.from(entities.values());
}

// ==========================================
// GET ALIVE ENTITIES
// ==========================================

export function getAliveEntities() {

    return getEntities().filter(
        (entity) => entity.alive
    );
}

// ==========================================
// GET NEAREST ENEMY
// ==========================================

export function getNearestEnemy(entity) {

    let nearest = null;

    let nearestDistance = Infinity;

    for (const enemy of getAliveEntities()) {

        if (enemy.id === entity.id) continue;

        const distance = Math.hypot(

            enemy.x - entity.x,

            enemy.z - entity.z

        );

        if (distance < nearestDistance) {

            nearest = enemy;

            nearestDistance = distance;
        }
    }

    return nearest;
}

// ==========================================
// RESET SPECIAL WEAPON STATUS FIELDS
// ==========================================

export function resetEntityStatus(entity) {

    if (!entity) return;

    // FIREBALL BURNING

    entity.burnUntil = 0;

    // ICE ROCKET SLOWDOWN

    entity.slowUntil = 0;

    entity.slowMultiplier = 1;

    // ELECTRIC BLASTER STUN

    entity.stunUntil = 0;

    // EMP FIRING DISABLE

    entity.empUntil = 0;

    // POISON EFFECT

    entity.poisonUntil = 0;

    // SPINNING MACE

    entity.maceUntil = 0;
}

// ==========================================
// CREATE NEW ENTITY
// ==========================================

export function createEntity(config) {

    const entity = {

        // ENTITY INFORMATION

        id: config.id,

        name: config.name,

        isBot: config.isBot || false,

        // POSITION AND MOVEMENT

        x: 0,

        z: 0,

        rotation: 0,

        speed: 0,

        // HEALTH

        health: 100,

        maxHealth: 100,

        // SCORE

        score: 0,

        deaths: 0,

        alive: true,

        // WEAPON

        weapon: null,

        ammo: 0,

        maxAmmo: 0,

        firing: false,

        // PICKUP

        pickupMessage: "",

        pickupTime: 0,

        // RESPAWN AND PROTECTION

        respawnAt: 0,

        protectedUntil: 0,

        lifeId: 0,

        respawnRequested: false,

        // DEATH INFORMATION

        killedBy: null,

        killedByWeapon: null,

        deathTime: 0,

        // BOT AI INFORMATION

        aiState: "WAITING",

        aiExploreTarget: null,

        aiExploreUntil: 0,

        aiEscapeTarget: null,

        aiEscapeUntil: 0,

        aiLastPosition: null,

        aiLastMovementCheck: 0,

        aiTrackedLifeId: -1,

        nextFireAt: 0,

        // THREE.JS OBJECT

        object: null,
    };

    // INITIALIZE SPECIAL WEAPON STATUS

    resetEntityStatus(entity);

    return entity;
}