import {
    useEffect,
    useRef,
    useState,
} from "react";

import {
    useFrame,
    useThree,
} from "@react-three/fiber";

import * as THREE from "three";

import playerState from "../PlayerState";

import ProjectileModel from "./ProjectileModel";
import ProjectileTrail from "./ProjectileTrail";
import ImpactEffects from "./ImpactEffects";
import SpecialWeaponRenderer from "./SpecialWeaponRenderer";
import { ARENA_CONFIG } from "../maps/ArenaConfig";

import {
    checkProjectileCollision,
} from "../physics/ProjectileCollision";

import {
    registerFireHandler,
    requestFire,
} from "../combat/FireManager";

import {
    getAliveEntities,
} from "../combat/EntityManager";

import {
    applyDamage,
} from "../combat/DamageSystem";

import {
    activateSpecialWeapon,
    handleSpecialProjectileImpact,
    updateSpecialWeapons,
    clearSpecialWeapons,
    canEntityFire,
} from "../combat/SpecialWeaponSystem";

import matchState from "../match/MatchState";

// ==========================================
// COMMON WEAPON SETTINGS
// ==========================================

const FORWARD = new THREE.Vector3(0, 0, -1);

const UP = new THREE.Vector3(0, 1, 0);

const PROJECTILE_HEIGHT_OFFSET = -0.05;

const GROUND_IMPACT_HEIGHT = 0.15;

let nextProjectileId = 0;

let nextImpactId = 0;

// ==========================================
// PROJECTILE TRAIL TYPES
// ==========================================

const TRAIL_TYPES = new Set([

    "rocket",

    "nuke",

    "grenade",

    "homing",

    "ice_rocket",

    "fireball",

    "poison",

    "electric",

    "emp",

    "plasma",

    "laser",

]);

// ==========================================
// GET HOMING MISSILE TARGET
// ==========================================

function getHomingTarget(
    attackerId,
    position,
    range
) {

    let nearest = null;

    let nearestDistance = range;

    const now = performance.now();

    for (const entity of getAliveEntities()) {

        if (

            entity.id === attackerId ||

            !entity.alive ||

            !entity.object ||

            entity.object.visible === false ||

            now < (entity.protectedUntil || 0)

        ) {

            continue;
        }

        const distance = Math.hypot(

            entity.x - position.x,

            entity.z - position.z

        );

        if (distance < nearestDistance) {

            nearest = entity;

            nearestDistance = distance;
        }
    }

    return nearest;
}

// ==========================================
// SINGLE PROJECTILE
// ==========================================

function Projectile({

    shot,

    remove,

    onImpact,

}) {

    const ref = useRef();

    const position = useRef(

        new THREE.Vector3(...shot.position)

    );

    const nextPosition = useRef(

        new THREE.Vector3()

    );

    const velocity = useRef(

        new THREE.Vector3(...shot.velocity)

    );

    const direction = useRef(

        new THREE.Vector3()

    );

    const targetDirection = useRef(

        new THREE.Vector3()

    );

    const targetPosition = useRef(

        new THREE.Vector3()

    );

    const turnQuaternion = useRef(

        new THREE.Quaternion()

    );

    const steeringQuaternion = useRef(

        new THREE.Quaternion()

    );

    const groundPosition = useRef(

        new THREE.Vector3()

    );

    const elapsed = useRef(0);

    const travelled = useRef(0);

    const expired = useRef(false);

    // ======================================
    // REMOVE PROJECTILE SAFELY
    // ======================================

    function destroyProjectile() {

        if (expired.current) return;

        expired.current = true;

        if (ref.current) {

            ref.current.visible = false;
        }

        remove(shot.id);
    }

    // ======================================
    // PROCESS PROJECTILE IMPACT
    // ======================================

    function processImpact(

        impactPosition,

        entityId = null,

        object = null

    ) {

        if (expired.current) return;

        let damageApplied = false;

        // APPLY DIRECT DAMAGE

        if (entityId !== null) {

            damageApplied = applyDamage(

                entityId,

                shot.attackerId,

                shot.damage,

                shot.weaponName

            ) === true;
        }

        const impactPoint =

            impactPosition.toArray();

        // APPLY SPECIAL WEAPON EFFECTS

        handleSpecialProjectileImpact({

            shot,

            entityId,

            position: impactPoint,

            damageApplied,

        });

        // CREATE VISUAL IMPACT

        onImpact({

            type: shot.type,

            originalType: shot.type,

            position: impactPoint,

            damage: shot.damage,

            object,

        });

        destroyProjectile();
    }

    // ======================================
    // PROJECTILE FRAME UPDATE
    // ======================================

    useFrame(({ scene }, delta) => {

        if (!ref.current || expired.current) {

            return;
        }

        if (matchState.status !== "playing") {

            destroyProjectile();

            return;
        }

        const dt = Math.min(delta, 0.05);

        if (dt <= 0) return;

        elapsed.current += dt * 1000;

        // ==================================
        // MAXIMUM PROJECTILE LIFETIME
        // ==================================

        if (

            elapsed.current >= shot.maxLifetime

        ) {

            destroyProjectile();

            return;
        }

        // ==================================
        // HOMING MISSILE TRACKING
        // ==================================

        if (shot.homing) {

            const target = getHomingTarget(

                shot.attackerId,

                position.current,

                shot.homingRange

            );

            if (target) {

                targetPosition.current.set(

                    target.x,

                    1.1,

                    target.z

                );

                targetDirection.current

                    .copy(targetPosition.current)

                    .sub(position.current);

                if (

                    targetDirection.current.lengthSq() >

                    0.000001

                ) {

                    targetDirection.current.normalize();

                    direction.current

                        .copy(velocity.current)

                        .normalize();

                    const angle =

                        direction.current.angleTo(

                            targetDirection.current

                        );

                    if (angle > 0.0001) {

                        turnQuaternion.current

                            .setFromUnitVectors(

                                direction.current,

                                targetDirection.current

                            );

                        const turnAmount = Math.min(

                            1,

                            (shot.homingTurnSpeed * dt) /

                            angle

                        );

                        steeringQuaternion.current

                            .identity()

                            .slerp(

                                turnQuaternion.current,

                                turnAmount

                            );

                        velocity.current

                            .applyQuaternion(

                                steeringQuaternion.current

                            )

                            .normalize()

                            .multiplyScalar(shot.speed);
                    }
                }
            }
        }

        // ==================================
        // GRENADE AND POISON GRAVITY
        // ==================================

        const isArcingProjectile =

            shot.type === "grenade" ||

            shot.type === "poison";

        if (isArcingProjectile) {

            velocity.current.y -= 20 * dt;
        }

        // ==================================
        // CALCULATE NEXT POSITION
        // ==================================

        nextPosition.current

            .copy(position.current)

            .addScaledVector(

                velocity.current,

                dt

            );

        // ==================================
        // MAXIMUM PROJECTILE RANGE
        // ==================================

        let movementDistance =

            position.current.distanceTo(

                nextPosition.current

            );

        const remainingRange =

            shot.maxRange - travelled.current;

        if (remainingRange <= 0) {

            destroyProjectile();

            return;
        }

        if (

            movementDistance > remainingRange &&

            movementDistance > 0

        ) {

            nextPosition.current.lerpVectors(

                position.current,

                nextPosition.current,

                remainingRange / movementDistance

            );

            movementDistance = remainingRange;
        }

        // ==================================
        // CONTINUOUS COLLISION DETECTION
        // ==================================

        const hit = checkProjectileCollision(

            scene,

            position.current,

            nextPosition.current,

            shot.attackerId

        );

        // ==================================
        // POISON BOMB GROUND COLLISION
        // ==================================

        if (

            shot.type === "poison" &&

            nextPosition.current.y <=

            GROUND_IMPACT_HEIGHT &&

            position.current.y >

            GROUND_IMPACT_HEIGHT

        ) {

            const heightDifference =

                position.current.y -

                nextPosition.current.y;

            if (heightDifference > 0.000001) {

                const alpha = THREE.MathUtils.clamp(

                    (

                        position.current.y -

                        GROUND_IMPACT_HEIGHT

                    ) / heightDifference,

                    0,

                    1

                );

                groundPosition.current.lerpVectors(

                    position.current,

                    nextPosition.current,

                    alpha

                );

                groundPosition.current.y =

                    GROUND_IMPACT_HEIGHT;

                const groundDistance =

                    position.current.distanceTo(

                        groundPosition.current

                    );

                const hitDistance = hit

                    ? position.current.distanceTo(

                        hit.point

                    )

                    : Infinity;

                // Process whichever collision
                // occurs first.

                if (groundDistance <= hitDistance) {

                    processImpact(

                        groundPosition.current

                    );

                    return;
                }
            }
        }

        // ==================================
        // ENTITY OR ENVIRONMENT IMPACT
        // ==================================

        if (hit) {

            processImpact(

                hit.point,

                hit.entityId ?? null,

                hit.object ?? null

            );

            return;
        }

        // ==================================
        // UPDATE PROJECTILE POSITION
        // ==================================

        travelled.current += movementDistance;

        position.current.copy(

            nextPosition.current

        );

        ref.current.position.copy(

            position.current

        );

        // ==================================
        // FACE MOVEMENT DIRECTION
        // ==================================

        if (

            velocity.current.lengthSq() >

            0.000001

        ) {

            direction.current

                .copy(velocity.current)

                .normalize();

            ref.current.quaternion

                .setFromUnitVectors(

                    FORWARD,

                    direction.current

                );
        }

        // ==================================
        // REMOVE OUTSIDE ARENA
        // ==================================

        if (

            Math.abs(position.current.x) >

            ARENA_CONFIG.projectileLimit ||

            Math.abs(position.current.z) >

            ARENA_CONFIG.projectileLimit ||

            position.current.y < -2 ||

            position.current.y > 100 ||

            travelled.current >= shot.maxRange

        ) {

            destroyProjectile();
        }
    });

    // ======================================
    // PROJECTILE TRAIL
    // ======================================

    const hasTrail = TRAIL_TYPES.has(shot.type);

    // ======================================
    // RENDER PROJECTILE
    // ======================================

    return (

        <group>

            <group

                ref={ref}

                position={shot.position}

                quaternion={shot.quaternion}

                scale={shot.size}

            >

                <ProjectileModel

                    type={shot.type}

                />

            </group>

            {hasTrail && (

                <ProjectileTrail

                    projectileRef={ref}

                    type={shot.type}

                />

            )}

        </group>
    );
}

// ==========================================
// MUZZLE FLASH
// ==========================================

function MuzzleFlash({

    flash,

    remove,

}) {

    const ref = useRef();

    const elapsed = useRef(0);

    const finished = useRef(false);

    useFrame((_, delta) => {

        if (

            !ref.current ||

            finished.current

        ) {

            return;
        }

        elapsed.current += delta;

        const progress = Math.min(

            elapsed.current / 0.09,

            1

        );

        ref.current.scale.setScalar(

            flash.size * (1 - progress)

        );

        if (progress >= 1) {

            finished.current = true;

            remove(flash.id);
        }
    });

    return (

        <group

            ref={ref}

            position={flash.position}

            quaternion={flash.quaternion}

            scale={flash.size}

        >

            <mesh>

                <sphereGeometry

                    args={[0.25, 8, 8]}

                />

                <meshBasicMaterial

                    color="#ffffb0"

                    toneMapped={false}

                />

            </mesh>

            <mesh

                position={[0, 0, -0.35]}

                rotation={[-Math.PI / 2, 0, 0]}

            >

                <coneGeometry

                    args={[0.32, 0.8, 8]}

                />

                <meshBasicMaterial

                    color={flash.color || "#ff9d00"}

                    toneMapped={false}

                />

            </mesh>

        </group>
    );
}

// ==========================================
// MAIN WEAPON SYSTEM
// ==========================================

export default function WeaponSystem() {

    const { scene } = useThree();

    const [shots, setShots] = useState([]);

    const [impacts, setImpacts] = useState([]);

    const [flashes, setFlashes] = useState([]);

    const activeBursts = useRef(

        new Map()

    );

    const nextFlashId = useRef(0);

    const specialMatchActive = useRef(false);

    // ======================================
    // REMOVE PROJECTILE
    // ======================================

    function removeProjectile(id) {

        setShots((old) =>

            old.filter(

                (shot) => shot.id !== id

            )

        );
    }

    // ======================================
    // CREATE IMPACT
    // ======================================

    function createImpact(hit) {

        const impact = {

            id: ++nextImpactId,

            type: hit.type,

            originalType:

                hit.originalType || hit.type,

            position: hit.position,

            damage: hit.damage ?? 0,

        };

        setImpacts((old) => [

            ...old,

            impact,

        ]);
    }

    // ======================================
    // REMOVE IMPACT
    // ======================================

    function removeImpact(id) {

        setImpacts((old) =>

            old.filter(

                (impact) => impact.id !== id

            )

        );
    }

    // ======================================
    // REMOVE MUZZLE FLASH
    // ======================================

    function removeFlash(id) {

        setFlashes((old) =>

            old.filter(

                (flash) => flash.id !== id

            )

        );
    }

    // ======================================
    // UPDATE SPECIAL WEAPON MECHANICS
    // ======================================

    useFrame(() => {

        if (matchState.status !== "playing") {

            if (specialMatchActive.current) {

                clearSpecialWeapons();

                specialMatchActive.current = false;
            }

            return;
        }

        specialMatchActive.current = true;

        updateSpecialWeapons(createImpact);

    });

    // ======================================
    // REGISTER WEAPON SYSTEM
    // ======================================

    useEffect(() => {

        // ==================================
        // FIRE SINGLE VOLLEY
        // ==================================

        function fireVolley(entity, weapon) {

            if (

                !entity.alive ||

                matchState.status !== "playing" ||

                !canEntityFire(entity)

            ) {

                return;
            }

            // ==============================
            // GET ENTITY WEAPON MOUNT
            // ==============================

            const mount =

                entity.object?.getObjectByName(

                    "weaponMount"

                );

            const mountPosition =

                new THREE.Vector3();

            const mountQuaternion =

                new THREE.Quaternion();

            if (mount) {

                mount.updateWorldMatrix(

                    true,

                    false

                );

                mount.getWorldPosition(

                    mountPosition

                );

                mount.getWorldQuaternion(

                    mountQuaternion

                );

            } else {

                mountPosition.set(

                    entity.x -

                    Math.sin(entity.rotation) * 1.35,

                    1.15,

                    entity.z -

                    Math.cos(entity.rotation) * 1.35

                );

                mountQuaternion.setFromAxisAngle(

                    UP,

                    entity.rotation

                );
            }

            // ==============================
            // PROJECTILE FORWARD DIRECTION
            // ==============================

            const forward = FORWARD.clone()

                .applyQuaternion(mountQuaternion);

            forward.y = 0;

            forward.normalize();

            const right = new THREE.Vector3()

                .crossVectors(forward, UP)

                .normalize();

            // ==============================
            // WEAPON SETTINGS
            // ==============================

            const count = Math.max(

                1,

                weapon.projectileCount || 1

            );

            const speed =

                weapon.projectileSpeed || 160;

            const spacing =

                weapon.projectileSpacing ?? 0;

            const spread =

                weapon.spread || 0;

            const newShots = [];

            const newFlashes = [];

            // ==============================
            // CREATE PROJECTILES
            // ==============================

            for (let i = 0; i < count; i++) {

                const offset =

                    i - (count - 1) / 2;

                let spreadAngle =

                    offset * spread;

                // ==========================
                // SHOTGUN SPREAD
                // ==========================

                if (

                    weapon.type === "pellet" &&

                    count > 1

                ) {

                    spreadAngle =

                        (offset / (count - 1)) *

                        spread;
                }

                // ==========================
                // MINI GUN RANDOM SPREAD
                // ==========================

                if (weapon.type === "minigun_bullet") {

                    spreadAngle +=

                        (Math.random() - 0.5) *

                        spread * 2;
                }

                // ==========================
                // PROJECTILE DIRECTION
                // ==========================

                const direction = forward.clone()

                    .applyAxisAngle(

                        UP,

                        -spreadAngle

                    )

                    .normalize();

                // ==========================
                // PROJECTILE ORIGIN
                // ==========================

                const origin =

                    mountPosition.clone();

                origin.addScaledVector(

                    forward,

                    weapon.type === "nuke"

                        ? 1.6

                        : 1.45

                );

                origin.y +=

                    PROJECTILE_HEIGHT_OFFSET;

                // ==========================
                // MULTIPLE PARALLEL BARRELS
                // ==========================

                if (count > 1 && spacing > 0) {

                    origin.addScaledVector(

                        right,

                        offset * spacing

                    );
                }

                // ==========================
                // PROJECTILE VELOCITY
                // ==========================

                const velocity =

                    direction.multiplyScalar(speed);

                if (

                    weapon.type === "grenade" ||

                    weapon.type === "poison"

                ) {

                    velocity.y = 12;
                }

                // ==========================
                // PROJECTILE ROTATION
                // ==========================

                const rotation =

                    new THREE.Quaternion()

                        .setFromUnitVectors(

                            FORWARD,

                            velocity.clone().normalize()

                        );

                // ==========================
                // SAVE PROJECTILE DATA
                // ==========================

                newShots.push({

                    id: ++nextProjectileId,

                    attackerId: entity.id,

                    weaponId: weapon.id,

                    weaponName:

                        weapon.name || "Weapon",

                    type: weapon.type,

                    damage: weapon.damage,

                    color: weapon.color,

                    size:

                        weapon.projectileSize || 1,

                    speed,

                    position: origin.toArray(),

                    velocity: velocity.toArray(),

                    quaternion: rotation.toArray(),

                    // PROJECTILE RANGE

                    maxRange:

                        weapon.maxRange ?? Infinity,

                    maxLifetime:

                        weapon.maxLifetime ?? 10000,

                    // HOMING MISSILE

                    homing:

                        weapon.homing === true,

                    homingRange:

                        weapon.homingRange || 100,

                    homingTurnSpeed:

                        weapon.homingTurnSpeed || 2.8,

                    // SPECIAL WEAPON CONFIGURATION

                    config: { ...weapon },

                });

                // ==========================
                // CREATE MUZZLE FLASH
                // ==========================

                newFlashes.push({

                    id: ++nextFlashId.current,

                    position: origin.toArray(),

                    quaternion: rotation.toArray(),

                    color: weapon.color,

                    size:

                        weapon.type === "nuke"

                            ? 2.5

                            : 1.3,

                });
            }

            // ==============================
            // ADD PROJECTILES
            // ==============================

            setShots((old) => [

                ...old,

                ...newShots,

            ]);

            setFlashes((old) => [

                ...old,

                ...newFlashes,

            ]);
        }

        // ==================================
        // FINISH FIRING
        // ==================================

        function finishFiring(entity, burst) {

            if (

                activeBursts.current.get(entity.id)

                !== burst

            ) {

                return;
            }

            clearTimeout(burst.timer);

            activeBursts.current.delete(

                entity.id

            );

            // IGNORE PREVIOUS PLAYER LIFE

            if (

                entity.lifeId !== burst.lifeId

            ) {

                return;
            }

            // DO NOT MODIFY A DIFFERENT WEAPON

            if (entity.weapon !== burst.weapon) {

                return;
            }

            // REMOVE WEAPON WHEN AMMO IS EMPTY

            if (entity.ammo <= 0) {

                entity.weapon = null;

                entity.ammo = 0;

                entity.maxAmmo = 0;

                entity.pickupMessage = "";
            }

            entity.firing = false;
        }

        // ==================================
        // START FIRING
        // ==================================

        function startFiring(entity) {

            if (

                !entity ||

                matchState.status !== "playing" ||

                !entity.alive ||

                !entity.weapon ||

                entity.ammo <= 0 ||

                entity.firing

            ) {

                return false;
            }

            const weapon = entity.weapon;

            // ==============================
            // PREVENT UNIMPLEMENTED WEAPONS
            // ==============================

            if (weapon.available === false) {

                return false;
            }

            // ==============================
            // EMP AND STUN RESTRICTION
            // ==============================

            if (!canEntityFire(entity)) {

                return false;
            }

            // ==============================
            // ACTIVATE SPECIAL WEAPONS
            // ==============================

            if (

                weapon.powerUp ||

                weapon.deployable ||

                weapon.melee

            ) {

                return activateSpecialWeapon(

                    entity,

                    weapon,

                    createImpact

                );
            }

            // ==============================
            // REMOVE PREVIOUS BURST
            // ==============================

            const previousBurst =

                activeBursts.current.get(

                    entity.id

                );

            if (previousBurst) {

                clearTimeout(

                    previousBurst.timer

                );

                activeBursts.current.delete(

                    entity.id

                );
            }

            const config = { ...weapon };

            const burst = {

                entity,

                weapon,

                lifeId: entity.lifeId,

                fired: 0,

                timer: null,

            };

            activeBursts.current.set(

                entity.id,

                burst

            );

            entity.firing = true;

            // ==============================
            // CONSUME ONE AMMO PER ATTACK
            // ==============================

            entity.ammo = Math.max(

                0,

                entity.ammo - 1

            );

            const total = Math.max(

                1,

                config.burstCount || 1

            );

            const interval = Math.max(

                0,

                config.burstInterval ?? 80

            );

            // ==============================
            // FIRE NEXT BURST
            // ==============================

            function fireNext() {

                if (

                    activeBursts.current.get(entity.id)

                    !== burst

                ) {

                    return;
                }

                // STOP AFTER DEATH,
                // EMP, STUN OR MATCH COMPLETION

                if (

                    matchState.status !== "playing" ||

                    !entity.alive ||

                    entity.lifeId !== burst.lifeId ||

                    entity.weapon !== weapon ||

                    !canEntityFire(entity)

                ) {

                    finishFiring(

                        entity,

                        burst

                    );

                    return;
                }

                fireVolley(

                    entity,

                    config

                );

                burst.fired += 1;

                // ALL PROJECTILES FIRED

                if (burst.fired >= total) {

                    finishFiring(

                        entity,

                        burst

                    );

                    return;
                }

                burst.timer = window.setTimeout(

                    fireNext,

                    interval

                );
            }

            fireNext();

            return true;
        }

        // ==================================
        // REGISTER PLAYER AND BOT FIRING
        // ==================================

        const unregisterFireHandler =

            registerFireHandler(

                startFiring

            );

        // ==================================
        // PLAYER KEYBOARD FIRING
        // ==================================

        function handleKeyDown(event) {

            if (event.code !== "Space") {

                return;
            }

            if (

                matchState.status !== "playing" ||

                !playerState.alive

            ) {

                return;
            }

            // IGNORE FORM INPUTS

            if (

                event.target instanceof HTMLElement &&

                event.target.closest(

                    "input, textarea, button, select, [contenteditable]"

                )

            ) {

                return;
            }

            event.preventDefault();

            // PREVENT HOLDING SPACEBAR

            if (event.repeat) {

                return;
            }

            requestFire(playerState);
        }

        window.addEventListener(

            "keydown",

            handleKeyDown

        );

        // ==================================
        // CLEANUP
        // ==================================

        return () => {

            window.removeEventListener(

                "keydown",

                handleKeyDown

            );

            unregisterFireHandler();

            for (

                const burst of

                activeBursts.current.values()

            ) {

                clearTimeout(burst.timer);

                const entity = burst.entity;

                if (

                    entity &&

                    entity.lifeId === burst.lifeId &&

                    entity.weapon === burst.weapon

                ) {

                    entity.firing = false;

                    if (entity.ammo <= 0) {

                        entity.weapon = null;

                        entity.ammo = 0;

                        entity.maxAmmo = 0;
                    }
                }
            }

            activeBursts.current.clear();

            clearSpecialWeapons();

            specialMatchActive.current = false;
        };

    }, [scene]);

    // ======================================
    // RENDER PROJECTILES AND EFFECTS
    // ======================================

    return (

        <group name="weaponProjectiles">
            <SpecialWeaponRenderer />

            {/* ACTIVE PROJECTILES */}

            {shots.map((shot) => (

                <Projectile

                    key={shot.id}

                    shot={shot}

                    remove={removeProjectile}

                    onImpact={createImpact}

                />

            ))}

            {/* PROJECTILE IMPACT EFFECTS */}

            {impacts.map((impact) => (

                <ImpactEffects

                    key={impact.id}

                    impact={impact}

                    remove={removeImpact}

                />

            ))}

            {/* WEAPON MUZZLE FLASHES */}

            {flashes.map((flash) => (

                <MuzzleFlash

                    key={flash.id}

                    flash={flash}

                    remove={removeFlash}

                />

            ))}

        </group>
    );
}