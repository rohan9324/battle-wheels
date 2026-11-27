import * as THREE from "three";

import { ARENA_CONFIG } from "../maps/ArenaConfig";

import { getAliveEntities } from "../combat/EntityManager";

// ==========================================
// COMMON COLLISION SETTINGS
// ==========================================

export const KART_COLLISION_CONFIG = Object.freeze({
    radius: 1.30,

    height: 1.80,

    movementStep: 0.08,

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

function getLocalBoundingBox(object, options = {}) {
    object.updateWorldMatrix(true, true);

    const result = new THREE.Box3();

    const meshBox = new THREE.Box3();

    const worldMeshBox = new THREE.Box3();

    const relativeMatrix = new THREE.Matrix4();

    const groundCollisionOnly =
        options.groundCollisionOnly === true;

    inverseMatrix
        .copy(object.matrixWorld)
        .invert();

    object.traverse((child) => {
        if (!child.isMesh || !child.geometry) {
            return;
        }

        if (child.userData?.ignoreKartCollision === true) {
            return;
        }

        if (!child.geometry.boundingBox) {
            child.geometry.computeBoundingBox();
        }

        if (!child.geometry.boundingBox) {
            return;
        }

        if (groundCollisionOnly) {
            worldMeshBox
                .copy(child.geometry.boundingBox)
                .applyMatrix4(child.matrixWorld);

            if (
                worldMeshBox.min.y >
                    KART_COLLISION_CONFIG.height ||
                worldMeshBox.max.y < 0.1
            ) {
                return;
            }
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
// CREATE RECTANGULAR KART HITBOX
// ==========================================

function createKartHitbox(x, z, rotation = 0) {
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
// CREATE ROTATED OBSTACLE HITBOX
// ==========================================

function createObstacleHitbox(object, box) {
    const center = box.getCenter(
        new THREE.Vector3()
    );

    const size = box.getSize(
        new THREE.Vector3()
    );

    center.applyMatrix4(object.matrixWorld);

    const elements = object.matrixWorld.elements;

    const rightX = elements[0];

    const rightZ = elements[2];

    const forwardX = elements[8];

    const forwardZ = elements[10];

    const scaleX =
        Math.hypot(rightX, rightZ) || 1;

    const scaleZ =
        Math.hypot(forwardX, forwardZ) || 1;

    return {
        x: center.x,

        z: center.z,

        halfWidth: (size.x * scaleX) / 2,

        halfLength: (size.z * scaleZ) / 2,

        right: {
            x: rightX / scaleX,
            z: rightZ / scaleX,
        },

        forward: {
            x: forwardX / scaleZ,
            z: forwardZ / scaleZ,
        },
    };
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

    colliders.delete(object.uuid);

    // Ignore non-blocking decorations.

    if (
        type === "bush" ||
        type === "decoration" ||
        type === "grass" ||
        type === "smallRock" ||
        options.enabled === false
    ) {
        return;
    }

    object.updateWorldMatrix(true, true);

    // ======================================
    // CIRCULAR OBSTACLE COLLISION
    // ======================================

    if (
        type === "tree" ||
        options.shape === "circle"
    ) {
        const position = new THREE.Vector3();

        const offset = options.offset || [0, 0, 0];

        position
            .set(
                offset[0] || 0,
                offset[1] || 0,
                offset[2] || 0
            )
            .applyMatrix4(object.matrixWorld);

        const radius = Math.max(
            0.01,
            options.radius ??
                options.trunkRadius ??
                0.35
        );

        colliders.set(object.uuid, {
            type: "circle",

            x: position.x,

            z: position.z,

            radius,
        });

        return;
    }

    // ======================================
    // CUSTOM BOX COLLISION
    // ======================================

    let box;

    if (
        Array.isArray(options.size) &&
        options.size.length === 3 &&
        options.size.every(
            (value) =>
                Number.isFinite(value) &&
                value > 0
        )
    ) {
        const [width, height, depth] =
            options.size;

        const offset = options.offset || [
            0,
            height / 2,
            0,
        ];

        const center = new THREE.Vector3(
            offset[0] || 0,
            offset[1] || 0,
            offset[2] || 0
        );

        const size = new THREE.Vector3(
            width,
            height,
            depth
        );

        box = new THREE.Box3();

        box.setFromCenterAndSize(
            center,
            size
        );
    } else {
        box = getLocalBoundingBox(
            object,
            options
        );
    }

    if (box.isEmpty()) {
        return;
    }

    // ======================================
    // WORLD COLLISION INFORMATION
    // ======================================

    const worldBox = box
        .clone()
        .applyMatrix4(object.matrixWorld);

    const worldScale = new THREE.Vector3();

    object.getWorldScale(worldScale);

    const hitbox = createObstacleHitbox(
        object,
        box
    );

    colliders.set(object.uuid, {
        type: "box",

        box,

        worldBox,

        hitbox,

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
// PROJECT HITBOX ON COLLISION AXIS
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
// RECTANGLE VS RECTANGLE COLLISION
// ==========================================

function getKartOverlap(first, second) {
    const dx = second.x - first.x;

    const dz = second.z - first.z;

    // Dynamic broad-phase distance.
    // Supports small karts and large buildings.

    const firstRadius = Math.hypot(
        first.halfWidth,
        first.halfLength
    );

    const secondRadius = Math.hypot(
        second.halfWidth,
        second.halfLength
    );

    const maximumDistance =
        firstRadius + secondRadius;

    if (
        dx * dx + dz * dz >
        maximumDistance * maximumDistance
    ) {
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
            dx * axis.x + dz * axis.z
        );

        const firstProjection =
            getProjectionRadius(first, axis);

        const secondProjection =
            getProjectionRadius(second, axis);

        const overlap =
            firstProjection +
            secondProjection -
            centerDistance;

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
// RECTANGULAR KART VS CIRCULAR OBJECT
// ==========================================

function checkKartCircleCollision(
    hitbox,
    collider
) {
    const dx = collider.x - hitbox.x;

    const dz = collider.z - hitbox.z;

    const localX =
        dx * hitbox.right.x +
        dz * hitbox.right.z;

    const localZ =
        dx * hitbox.forward.x +
        dz * hitbox.forward.z;

    const closestX = THREE.MathUtils.clamp(
        localX,
        -hitbox.halfWidth,
        hitbox.halfWidth
    );

    const closestZ = THREE.MathUtils.clamp(
        localZ,
        -hitbox.halfLength,
        hitbox.halfLength
    );

    const distanceX = localX - closestX;

    const distanceZ = localZ - closestZ;

    const radius = Math.max(
        0.001,
        collider.radius -
            KART_COLLISION_CONFIG.contactTolerance
    );

    return (
        distanceX * distanceX +
        distanceZ * distanceZ <
        radius * radius
    );
}

// ==========================================
// CIRCLE VS CIRCLE COLLISION
// Used by spawn and pickup safety checks.
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
// CHECK OBSTACLE HEIGHT
// ==========================================

function isBlockingHeight(collider) {
    return !(
        collider.worldBox.min.y >
            KART_COLLISION_CONFIG.height ||
        collider.worldBox.max.y < 0.1
    );
}

// ==========================================
// CIRCLE VS ROTATED MAP OBJECT
// Used by spawn and pickup safety checks.
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
        scaleZ,
    } = collider;

    if (!isBlockingHeight(collider)) {
        return false;
    }

    if (
        x < worldBox.min.x - radius ||
        x > worldBox.max.x + radius ||
        z < worldBox.min.z - radius ||
        z > worldBox.max.z + radius
    ) {
        return false;
    }

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

    return (
        dx * dx + dz * dz <
        radius * radius
    );
}

// ==========================================
// CHECK CIRCULAR MAP POSITION
// Existing API preserved.
// ==========================================

export function isKartBlocked(
    x,
    z,
    radius = KART_COLLISION_CONFIG.radius
) {
    if (
        !Number.isFinite(x) ||
        !Number.isFinite(z) ||
        !Number.isFinite(radius) ||
        radius < 0
    ) {
        return true;
    }

    const limit =
        KART_COLLISION_CONFIG.arenaLimit;

    if (
        Math.abs(x) + radius > limit ||
        Math.abs(z) + radius > limit
    ) {
        return true;
    }

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
// ACCURATE RECTANGULAR MAP COLLISION
// Used by player and bot movement.
// ==========================================

export function isKartBodyBlocked(
    x,
    z,
    rotation = 0
) {
    if (
        !Number.isFinite(x) ||
        !Number.isFinite(z)
    ) {
        return true;
    }

    const hitbox = createKartHitbox(
        x,
        z,
        rotation
    );

    // ======================================
    // CHECK ACTUAL KART BOUNDARY
    // ======================================

    const extentX =
        Math.abs(hitbox.right.x) *
            hitbox.halfWidth +
        Math.abs(hitbox.forward.x) *
            hitbox.halfLength;

    const extentZ =
        Math.abs(hitbox.right.z) *
            hitbox.halfWidth +
        Math.abs(hitbox.forward.z) *
            hitbox.halfLength;

    const limit =
        KART_COLLISION_CONFIG.arenaLimit;

    const tolerance =
        KART_COLLISION_CONFIG.contactTolerance;

    if (
        Math.abs(x) + extentX >
            limit + tolerance ||
        Math.abs(z) + extentZ >
            limit + tolerance
    ) {
        return true;
    }

    // ======================================
    // CHECK ALL MAP OBJECTS
    // ======================================

    for (const collider of colliders.values()) {
        // Trees, rocks and circular obstacles.

        if (collider.type === "circle") {
            if (
                checkKartCircleCollision(
                    hitbox,
                    collider
                )
            ) {
                return true;
            }

            continue;
        }

        // Buildings, containers, walls and crates.

        if (collider.type === "box") {
            if (!isBlockingHeight(collider)) {
                continue;
            }

            const worldBox = collider.worldBox;

            // Fast bounding-box rejection.

            if (
                x + extentX < worldBox.min.x ||
                x - extentX > worldBox.max.x ||
                z + extentZ < worldBox.min.z ||
                z - extentZ > worldBox.max.z
            ) {
                continue;
            }

            const overlap = getKartOverlap(
                hitbox,
                collider.hitbox
            );

            if (overlap > 0) {
                return true;
            }
        }
    }

    return false;
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
    if (
        entityId === null ||
        entityId === undefined
    ) {
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
        if (entity.id === entityId) {
            continue;
        }

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

        // Allow movement away from an
        // existing kart overlap.

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
// CHECK SAFE KART ROTATION
// ==========================================

export function isKartRotationBlocked(
    x,
    z,
    entityId,
    rotation = 0
) {
    if (
        isKartBodyBlocked(
            x,
            z,
            rotation
        )
    ) {
        return true;
    }

    return isOtherKartBlocked(
        x,
        z,
        entityId,
        rotation
    );
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
    const hasEntity =
        entityId !== null &&
        entityId !== undefined;

    // Actual rectangular kart collision.

    const mapBlocked = hasEntity
        ? isKartBodyBlocked(
            x,
            z,
            rotation
        )
        : isKartBlocked(
            x,
            z,
            radius
        );

    if (mapBlocked) {
        return true;
    }

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
    // SMALL ACCURATE MOVEMENT STEPS
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

        // Normal free movement.

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
            Math.abs(stepX) > 0.000001 &&
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
            Math.abs(stepZ) > 0.000001 &&
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
// CLEAR ALL MAP COLLIDERS
// ==========================================

export function clearKartColliders() {
    colliders.clear();
}