import * as THREE from "three";

import {
    ARENA_CONFIG
} from "../maps/ArenaConfig";

import {
    getAliveEntities
} from "../combat/EntityManager";

// ==========================================
// COMMON KART COLLISION SETTINGS
// ==========================================

export const KART_COLLISION_CONFIG = Object.freeze({

    radius: 1.30,

    height: 1.80,

    movementStep: 0.15,

    get arenaLimit() {
        return ARENA_CONFIG.collisionLimit;
    },

    kartRadius: 1.30,

    kartHalfLength: 1.75,

    kartHalfWidth: 1.25,

    contactTolerance: 0.02,

});

// ==========================================
// REGISTERED MAP COLLIDERS
// ==========================================

const colliders = new Map();

const tempPoint = new THREE.Vector3();

const localPoint = new THREE.Vector3();

const inverseMatrix = new THREE.Matrix4();

// ==========================================
// CALCULATE LOCAL MODEL BOUNDING BOX
// ==========================================

function getLocalBoundingBox(object) {

    object.updateWorldMatrix(true, true);

    const result = new THREE.Box3();

    const meshBox = new THREE.Box3();

    const relativeMatrix = new THREE.Matrix4();

    inverseMatrix
        .copy(object.matrixWorld)
        .invert();

    object.traverse((child) => {

        if (!child.isMesh || !child.geometry) {

            return;
        }

        if (!child.geometry.boundingBox) {

            child.geometry.computeBoundingBox();
        }

        if (!child.geometry.boundingBox) {

            return;
        }

        relativeMatrix.multiplyMatrices(

            inverseMatrix,

            child.matrixWorld

        );

        meshBox
            .copy(child.geometry.boundingBox)
            .applyMatrix4(relativeMatrix);

        result.union(meshBox);

    });

    return result;
}

// ==========================================
// REGISTER MAP OBSTACLE
// ==========================================

export function registerKartCollider(
    object,
    options = {}
) {

    if (!object) return;

    const type = options.type || "building";

    // Decorative objects do not block karts

    if (

        type === "bush" ||

        type === "decoration" ||

        type === "grass" ||

        type === "smallRock"

    ) {

        return;
    }

    object.updateWorldMatrix(true, true);

    // ======================================
    // TREE TRUNK COLLISION
    // ======================================

    if (type === "tree") {

        const position = new THREE.Vector3();

        object.getWorldPosition(position);

        colliders.set(object.uuid, {

            type: "circle",

            x: position.x,

            z: position.z,

            radius: Math.max(

                0.25,

                options.trunkRadius || 0.35

            ),

        });

        return;
    }

    // ======================================
    // BUILDING AND SOLID OBJECT COLLISION
    // ======================================

    const box = getLocalBoundingBox(object);

    if (box.isEmpty()) {

        return;
    }

    const worldBox = box.clone()
        .applyMatrix4(object.matrixWorld);

    const worldScale = new THREE.Vector3();

    object.getWorldScale(worldScale);

    colliders.set(object.uuid, {

        type: "box",

        box,

        worldBox,

        inverseMatrix: object.matrixWorld
            .clone()
            .invert(),

        scaleX: Math.abs(worldScale.x) || 1,

        scaleZ: Math.abs(worldScale.z) || 1,

    });
}

// ==========================================
// REMOVE MAP COLLIDER
// ==========================================

export function unregisterKartCollider(object) {

    if (!object) return;

    colliders.delete(object.uuid);
}

// ==========================================
// CHECK TREE TRUNK COLLISION
// ==========================================

function checkCircleCollision(

    x,

    z,

    radius,

    collider

) {

    const dx = x - collider.x;

    const dz = z - collider.z;

    const combinedRadius =
        radius + collider.radius;

    return (

        dx * dx + dz * dz <

        combinedRadius * combinedRadius

    );
}

// ==========================================
// CHECK ROTATED MAP OBJECT COLLISION
// ==========================================

function checkBoxCollision(

    x,

    z,

    radius,

    collider

) {

    const {

        box,

        worldBox,

        inverseMatrix,

        scaleX,

        scaleZ

    } = collider;

    // Ignore objects above kart height

    if (

        worldBox.min.y >
        KART_COLLISION_CONFIG.height ||

        worldBox.max.y < 0.1

    ) {

        return false;
    }

    // Fast world boundary check

    if (

        x < worldBox.min.x - radius ||

        x > worldBox.max.x + radius ||

        z < worldBox.min.z - radius ||

        z > worldBox.max.z + radius

    ) {

        return false;
    }

    // Convert kart position into obstacle
    // local coordinate system

    tempPoint.set(x, 0, z);

    localPoint
        .copy(tempPoint)
        .applyMatrix4(inverseMatrix);

    const closestX = THREE.MathUtils.clamp(

        localPoint.x,

        box.min.x,

        box.max.x

    );

    const closestZ = THREE.MathUtils.clamp(

        localPoint.z,

        box.min.z,

        box.max.z

    );

    const dx =
        (localPoint.x - closestX) * scaleX;

    const dz =
        (localPoint.z - closestZ) * scaleZ;

    const distanceSquared =
        dx * dx + dz * dz;

    return (

        distanceSquared < radius * radius

    );
}

// ==========================================
// CHECK MAP POSITION
// ==========================================

export function isKartBlocked(

    x,

    z,

    radius = KART_COLLISION_CONFIG.radius

) {

    if (

        !Number.isFinite(x) ||

        !Number.isFinite(z)

    ) {

        return true;
    }

    // ======================================
    // LARGE ARENA BOUNDARY
    // ======================================

    const limit =
        KART_COLLISION_CONFIG.arenaLimit;

    if (

        Math.abs(x) + radius > limit ||

        Math.abs(z) + radius > limit

    ) {

        return true;
    }

    // ======================================
    // CHECK REGISTERED MAP OBSTACLES
    // ======================================

    for (const collider of colliders.values()) {

        if (collider.type === "circle") {

            if (

                checkCircleCollision(

                    x,

                    z,

                    radius,

                    collider

                )

            ) {

                return true;
            }

            continue;
        }

        if (collider.type === "box") {

            if (

                checkBoxCollision(

                    x,

                    z,

                    radius,

                    collider

                )

            ) {

                return true;
            }
        }
    }

    return false;
}

// ==========================================
// CREATE ROTATED KART HITBOX
// ==========================================

function createKartHitbox(

    x,

    z,

    rotation = 0

) {

    const angle = Number.isFinite(rotation)
        ? rotation
        : 0;

    const cos = Math.cos(angle);

    const sin = Math.sin(angle);

    return {

        x,

        z,

        halfWidth:
            KART_COLLISION_CONFIG.kartHalfWidth,

        halfLength:
            KART_COLLISION_CONFIG.kartHalfLength,

        right: {

            x: cos,

            z: -sin,

        },

        forward: {

            x: -sin,

            z: -cos,

        },

    };
}

// ==========================================
// PROJECT KART HITBOX ON COLLISION AXIS
// ==========================================

function getProjectionRadius(hitbox, axis) {

    const rightProjection = Math.abs(

        hitbox.right.x * axis.x +

        hitbox.right.z * axis.z

    );

    const forwardProjection = Math.abs(

        hitbox.forward.x * axis.x +

        hitbox.forward.z * axis.z

    );

    return (

        rightProjection * hitbox.halfWidth +

        forwardProjection * hitbox.halfLength

    );
}

// ==========================================
// CHECK ROTATED KART HITBOX OVERLAP
// ==========================================

function getKartOverlap(first, second) {

    const dx = second.x - first.x;

    const dz = second.z - first.z;

    // Fast distance check before detailed SAT

    if (dx * dx + dz * dz > 25) {

        return 0;
    }

    const axes = [

        first.right,

        first.forward,

        second.right,

        second.forward,

    ];

    let minimumOverlap = Infinity;

    for (const axis of axes) {

        const centerDistance = Math.abs(

            dx * axis.x +

            dz * axis.z

        );

        const firstRadius =
            getProjectionRadius(first, axis);

        const secondRadius =
            getProjectionRadius(second, axis);

        const overlap =

            firstRadius +

            secondRadius -

            centerDistance;

        // No collision on this axis

        if (

            overlap <=
            KART_COLLISION_CONFIG.contactTolerance

        ) {

            return 0;
        }

        minimumOverlap = Math.min(

            minimumOverlap,

            overlap

        );
    }

    return minimumOverlap;
}

// ==========================================
// CHECK COLLISION WITH OTHER KARTS
// ==========================================

export function isOtherKartBlocked(

    x,

    z,

    entityId,

    rotation = 0,

    previousX = x,

    previousZ = z

) {

    if (entityId === null || entityId === undefined) {

        return false;
    }

    const targetHitbox = createKartHitbox(

        x,

        z,

        rotation

    );

    const previousHitbox = createKartHitbox(

        previousX,

        previousZ,

        rotation

    );

    const entities = getAliveEntities();

    for (const entity of entities) {

        // Ignore own kart

        if (entity.id === entityId) {

            continue;
        }

        // Ignore destroyed or invalid karts

        if (

            !entity.alive ||

            !entity.object ||

            !entity.object.visible ||

            !Number.isFinite(entity.x) ||

            !Number.isFinite(entity.z)

        ) {

            continue;
        }

        const otherHitbox = createKartHitbox(

            entity.x,

            entity.z,

            entity.rotation

        );

        const newOverlap = getKartOverlap(

            targetHitbox,

            otherHitbox

        );

        if (newOverlap <= 0) {

            continue;
        }

        const oldOverlap = getKartOverlap(

            previousHitbox,

            otherHitbox

        );

        // If already overlapping, allow movement
        // that reduces the overlap.

        if (

            oldOverlap > 0 &&

            newOverlap < oldOverlap - 0.00001

        ) {

            continue;
        }

        return true;
    }

    return false;
}

// ==========================================
// CHECK COMPLETE MOVEMENT COLLISION
// ==========================================

function checkMovementCollision(

    x,

    z,

    radius,

    entityId,

    rotation,

    previousX,

    previousZ

) {

    // Check buildings, trees and boundaries

    if (isKartBlocked(x, z, radius)) {

        return true;
    }

    // Check all other active karts

    return isOtherKartBlocked(

        x,

        z,

        entityId,

        rotation,

        previousX,

        previousZ

    );
}

// ==========================================
// RESOLVE COMMON KART MOVEMENT
// ==========================================

export function resolveKartMovement(

    currentX,

    currentZ,

    targetX,

    targetZ,

    radius = KART_COLLISION_CONFIG.radius,

    entityId = null,

    rotation = 0

) {

    if (

        !Number.isFinite(currentX) ||

        !Number.isFinite(currentZ) ||

        !Number.isFinite(targetX) ||

        !Number.isFinite(targetZ)

    ) {

        return {

            x: currentX,

            z: currentZ,

            collided: true,

        };
    }

    const dx = targetX - currentX;

    const dz = targetZ - currentZ;

    const distance = Math.hypot(dx, dz);

    if (distance < 0.00001) {

        return {

            x: currentX,

            z: currentZ,

            collided: false,

        };
    }

    // ======================================
    // SMALL MOVEMENT STEPS
    // ======================================

    const steps = Math.max(

        1,

        Math.ceil(

            distance /

            KART_COLLISION_CONFIG.movementStep

        )

    );

    const stepX = dx / steps;

    const stepZ = dz / steps;

    let x = currentX;

    let z = currentZ;

    let collided = false;

    // ======================================
    // CHECK EACH MOVEMENT STEP
    // ======================================

    for (let i = 0; i < steps; i++) {

        const nextX = x + stepX;

        const nextZ = z + stepZ;

        // ==================================
        // FREE MOVEMENT
        // ==================================

        if (

            !checkMovementCollision(

                nextX,

                nextZ,

                radius,

                entityId,

                rotation,

                x,

                z

            )

        ) {

            x = nextX;

            z = nextZ;

            continue;
        }

        collided = true;

        // ==================================
        // SLIDE ALONG X AXIS
        // ==================================

        if (

            !checkMovementCollision(

                nextX,

                z,

                radius,

                entityId,

                rotation,

                x,

                z

            )

        ) {

            x = nextX;
        }

        // ==================================
        // SLIDE ALONG Z AXIS
        // ==================================

        if (

            !checkMovementCollision(

                x,

                nextZ,

                radius,

                entityId,

                rotation,

                x,

                z

            )

        ) {

            z = nextZ;
        }
    }

    return {

        x,

        z,

        collided,

    };
}

// ==========================================
// COLLISION DEBUG INFORMATION
// ==========================================

export function getColliderCount() {

    return colliders.size;
}

// ==========================================
// CLEAR MAP COLLIDERS
// ==========================================

export function clearKartColliders() {

    colliders.clear();
}