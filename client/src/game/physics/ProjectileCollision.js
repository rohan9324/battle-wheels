import * as THREE from "three";

import {
    getAliveEntities
} from "../combat/EntityManager";

// ==========================================
// PROJECTILE COLLISION SETTINGS
// ==========================================

const COLLISION_SETTINGS = {

    hitboxTolerance: 0.12,

    minimumMovement: 0.00001,

    distanceTolerance: 0.0001,

};

// ==========================================
// COMMON KART PROJECTILE HITBOXES
// ==========================================

export const KART_HITBOXES = {

    body: new THREE.Box3(

        new THREE.Vector3(
            -1.28,
            0.05,
            -1.80
        ),

        new THREE.Vector3(
            1.28,
            1.20,
            1.80
        )

    ),

    driver: new THREE.Box3(

        new THREE.Vector3(
            -0.48,
            1.10,
            -0.35
        ),

        new THREE.Vector3(
            0.48,
            2.35,
            0.95
        )

    ),

};

// ==========================================
// REUSABLE COLLISION OBJECTS
// ==========================================

const raycaster = new THREE.Raycaster();

const direction = new THREE.Vector3();

const localRay = new THREE.Ray();

const inverseMatrix = new THREE.Matrix4();

const localHitPoint = new THREE.Vector3();

const worldHitPoint = new THREE.Vector3();

const expandedHitbox = new THREE.Box3();

const colliders = new Set();

// ==========================================
// REGISTER ADDITIONAL COLLIDER
// ==========================================

export function registerCollider(object) {

    if (object) {

        colliders.add(object);
    }
}

// ==========================================
// REMOVE COLLIDER
// ==========================================

export function unregisterCollider(object) {

    colliders.delete(object);
}

// ==========================================
// CHECK OBJECT VISIBILITY
// ==========================================

function isObjectVisible(object) {

    let current = object;

    while (current) {

        if (!current.visible) {

            return false;
        }

        current = current.parent;
    }

    return true;
}

// ==========================================
// CHECK DECORATIVE OBJECT
// ==========================================

function isDecoration(object) {

    let current = object;

    while (current) {

        if (

            current.name ===
            "nonBlockingDecorations"

        ) {

            return true;
        }

        current = current.parent;
    }

    return false;
}

// ==========================================
// VALIDATE PROJECTILE POSITION
// ==========================================

function isValidPosition(position) {

    return Boolean(

        position &&

        Number.isFinite(position.x) &&

        Number.isFinite(position.y) &&

        Number.isFinite(position.z)

    );
}

// ==========================================
// CHECK KART HITBOX COLLISION
// ==========================================

function checkEntityHitbox(

    entity,

    previousPosition,

    maximumDistance,

    hitboxTolerance

) {

    if (

        !entity ||

        !entity.alive ||

        !entity.object ||

        !isObjectVisible(entity.object)

    ) {

        return null;
    }

    const object = entity.object;

    // ======================================
    // UPDATE ENTITY WORLD TRANSFORM
    // ======================================

    object.updateWorldMatrix(

        true,

        false

    );

    // ======================================
    // CONVERT WORLD RAY TO LOCAL KART RAY
    // ======================================

    inverseMatrix

        .copy(object.matrixWorld)

        .invert();

    localRay

        .copy(raycaster.ray)

        .applyMatrix4(inverseMatrix);

    let nearestHit = null;

    // ======================================
    // CHECK BODY AND DRIVER HITBOXES
    // ======================================

    for (const [hitboxName, hitbox] of
        Object.entries(KART_HITBOXES)) {

        // ==================================
        // SMALL PROJECTILE HITBOX TOLERANCE
        // ==================================

        expandedHitbox

            .copy(hitbox)

            .expandByScalar(
                hitboxTolerance
            );

        let intersection;

        // ==================================
        // PROJECTILE STARTS INSIDE HITBOX
        // ==================================

        if (

            expandedHitbox.containsPoint(
                localRay.origin
            )

        ) {

            intersection = localHitPoint.copy(

                localRay.origin

            );

        } else {

            // ==============================
            // CONTINUOUS RAY HITBOX CHECK
            // ==============================

            intersection = localRay.intersectBox(

                expandedHitbox,

                localHitPoint

            );
        }

        if (!intersection) {

            continue;
        }

        // ==================================
        // CONVERT HIT POINT TO WORLD POSITION
        // ==================================

        worldHitPoint

            .copy(intersection)

            .applyMatrix4(object.matrixWorld);

        const distance =
            previousPosition.distanceTo(

                worldHitPoint

            );

        // ==================================
        // IGNORE HITS OUTSIDE CURRENT SEGMENT
        // ==================================

        if (

            distance >

            maximumDistance +
            COLLISION_SETTINGS.distanceTolerance

        ) {

            continue;
        }

        // ==================================
        // SELECT NEAREST KART HITBOX
        // ==================================

        if (

            !nearestHit ||

            distance < nearestHit.distance

        ) {

            nearestHit = {

                point: worldHitPoint.clone(),

                object,

                distance,

                entityId: entity.id,

                hitbox: hitboxName,

            };
        }
    }

    return nearestHit;
}

// ==========================================
// GET MAP COLLISION OBJECTS
// ==========================================

function getMapCollisionObjects(scene) {

    const objects = new Set();

    // ======================================
    // MAIN VILLAGE MAP
    // ======================================

    const villageMap = scene.getObjectByName(

        "villageCollisionMap"

    );

    if (villageMap) {

        objects.add(villageMap);
    }

    // ======================================
    // ADDITIONAL REGISTERED COLLIDERS
    // ======================================

    colliders.forEach((object) => {

        if (object && object.parent) {

            objects.add(object);
        }
    });

    return Array.from(objects);
}

// ==========================================
// CHECK ENVIRONMENT COLLISION
// ==========================================

function checkEnvironmentCollision(scene) {

    const objects =
        getMapCollisionObjects(scene);

    if (objects.length === 0) {

        return null;
    }

    const intersections =
        raycaster.intersectObjects(

            objects,

            true

        );

    for (const hit of intersections) {

        // ==================================
        // IGNORE INVISIBLE OBJECTS
        // ==================================

        if (!isObjectVisible(hit.object)) {

            continue;
        }

        // ==================================
        // IGNORE NON-BLOCKING DECORATIONS
        // ==================================

        if (isDecoration(hit.object)) {

            continue;
        }

        // ==================================
        // RETURN NEAREST ENVIRONMENT HIT
        // ==================================

        return {

            point: hit.point.clone(),

            object: hit.object,

            distance: hit.distance,

            entityId: null,

            hitbox: "environment",

        };
    }

    return null;
}

// ==========================================
// MAIN PROJECTILE COLLISION SYSTEM
// ==========================================

export function checkProjectileCollision(

    scene,

    previousPosition,

    nextPosition,

    attackerId = null,

    includeEntities = true,

    hitboxTolerance =
        COLLISION_SETTINGS.hitboxTolerance

) {

    // ======================================
    // VALIDATE COLLISION INPUTS
    // ======================================

    if (

        !scene ||

        !isValidPosition(previousPosition) ||

        !isValidPosition(nextPosition)

    ) {

        return null;
    }

    // ======================================
    // CALCULATE PROJECTILE MOVEMENT
    // ======================================

    direction.subVectors(

        nextPosition,

        previousPosition

    );

    const distance =
        direction.length();

    if (

        distance <
        COLLISION_SETTINGS.minimumMovement

    ) {

        return null;
    }

    direction.normalize();

    // ======================================
    // CONFIGURE CONTINUOUS RAYCAST
    // ======================================

    raycaster.set(

        previousPosition,

        direction

    );

    raycaster.near = 0;

    raycaster.far = distance;

    // ======================================
    // CHECK MAP COLLISION FIRST
    // ======================================

    let nearestHit =
        checkEnvironmentCollision(scene);

    // ======================================
    // SKIP ENTITIES IF NOT REQUIRED
    // ======================================

    if (!includeEntities) {

        return nearestHit;
    }

    // ======================================
    // VALIDATE HITBOX TOLERANCE
    // ======================================

    const tolerance =

        Number.isFinite(hitboxTolerance)

            ? THREE.MathUtils.clamp(

                hitboxTolerance,

                0,

                0.20

            )

            : COLLISION_SETTINGS.hitboxTolerance;

    // ======================================
    // GET ALL ACTIVE PLAYER ENTITIES
    // ======================================

    const entities = getAliveEntities();

    for (const entity of entities) {

        // ==================================
        // PREVENT SELF DAMAGE
        // ==================================

        if (entity.id === attackerId) {

            continue;
        }

        // ==================================
        // IGNORE DEAD OR INVALID ENTITIES
        // ==================================

        if (

            !entity.alive ||

            !entity.object

        ) {

            continue;
        }

        // ==================================
        // CHECK INDIVIDUAL PROJECTILE HIT
        // ==================================

        const entityHit = checkEntityHitbox(

            entity,

            previousPosition,

            distance,

            tolerance

        );

        if (!entityHit) {

            continue;
        }

        // ==================================
        // SELECT NEAREST VALID COLLISION
        // ==================================

        // Environment objects must block
        // projectiles before opponents.

        if (

            !nearestHit ||

            entityHit.distance <
            nearestHit.distance

        ) {

            nearestHit = entityHit;
        }
    }

    return nearestHit;
}