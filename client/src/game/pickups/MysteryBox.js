import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { ARENA_CONFIG } from "../maps/ArenaConfig";
import { useGame } from "../../context/GameContext";

import playerState from "../PlayerState";

import {
    getAliveEntities,
} from "../combat/EntityManager";

import matchState from "../match/MatchState";

import {
    getRandomWeapon,
} from "../weapons/WeaponConfig";

import {
    getRandomSpawn,
    removeSpawn,
    deactivatePickup,
} from "./SpawnManager";

// ==========================================
// MYSTERY BOX SETTINGS
// ==========================================

const BOX_SIZE = 1.8;

const PICKUP_DISTANCE = 2.3;

const SPAWN_RETRY_DELAY = 500;

// ==========================================
// QUESTION MARK TEXTURE
// ==========================================

function createQuestionTexture() {

    const canvas = document.createElement("canvas");

    canvas.width = 256;
    canvas.height = 256;

    const ctx = canvas.getContext("2d");

    ctx.font = "bold 200px Arial";

    ctx.textAlign = "center";

    ctx.textBaseline = "middle";

    ctx.shadowColor = "#ffdf60";

    ctx.shadowBlur = 18;

    ctx.fillStyle = "#fff5b5";

    ctx.fillText("?", 128, 140);

    const texture = new THREE.CanvasTexture(canvas);

    texture.colorSpace = THREE.SRGBColorSpace;

    return texture;
}

// ==========================================
// CHECK ENTITY PICKUP ELIGIBILITY
// ==========================================

function canCollectWeapon(entity) {

    if (!entity || !entity.alive) {

        return false;
    }

    // Do not replace an active firing weapon.

    if (entity.firing) {

        return false;
    }

    // Do not replace a weapon with remaining ammo.

    if (entity.ammo > 0) {

        return false;
    }

    // Do not collect another weapon while
    // Spinning Mace is still active.

    if (
        (Number(entity.maceUntil) || 0) >
        performance.now()
    ) {

        return false;
    }

    return true;
}

// ==========================================
// FIND NEAREST ELIGIBLE COLLECTOR
// ==========================================

function findNearestCollector(boxX, boxZ) {

    const entities = getAliveEntities();

    let collector = null;

    let nearestDistance = Infinity;

    for (const entity of entities) {

        if (!canCollectWeapon(entity)) {

            continue;
        }

        const distance = Math.hypot(

            entity.x - boxX,

            entity.z - boxZ
        );

        if (

            distance <= PICKUP_DISTANCE &&

            distance < nearestDistance

        ) {

            collector = entity;

            nearestDistance = distance;
        }
    }

    return collector;
}

// ==========================================
// GIVE WEAPON TO PLAYER OR BOT
// ==========================================

function giveWeapon(entity, weapon, now) {

    if (
        !entity ||
        !weapon ||
        weapon.available === false
    ) {

        return false;
    }

    if (!canCollectWeapon(entity)) {

        return false;
    }

    // Read actual ammo from WeaponConfig.
    // Land Mines = 3
    // Fake Mystery Box = 2
    // Other weapons use their configured ammo.

    const configuredAmmo = Number(weapon.ammo);

    const ammo = Number.isFinite(configuredAmmo)

        ? Math.max(1, Math.floor(configuredAmmo))

        : 1;

    entity.weapon = weapon;

    entity.ammo = ammo;

    entity.maxAmmo = ammo;

    entity.firing = false;

    entity.pickupMessage =

        weapon.name + " Acquired!";

    entity.pickupTime = now;

    return true;
}

// ==========================================
// MAIN MYSTERY BOX COMPONENT
// ==========================================

export default function MysteryBox({ id }) {

    const rootRef = useRef();

    const boxRef = useRef();

    const ringRef = useRef();

    const { settings } = useGame();

    const active = useRef(false);

    const respawnAt = useRef(0);

    // ======================================
    // CREATE QUESTION MARK TEXTURE
    // ======================================

    const questionTexture = useMemo(

        () => createQuestionTexture(),

        []
    );

    // ======================================
    // CREATE BOX EDGES
    // ======================================

    const edgeGeometry = useMemo(() => {

        const geometry = new THREE.BoxGeometry(

            BOX_SIZE,

            BOX_SIZE,

            BOX_SIZE
        );

        const edges = new THREE.EdgesGeometry(
            geometry
        );

        geometry.dispose();

        return edges;

    }, []);

    // ======================================
    // INITIALIZE AND CLEANUP PICKUP
    // ======================================

    useEffect(() => {

        active.current = false;

        respawnAt.current = 0;

        if (rootRef.current) {

            rootRef.current.visible = false;
        }

        return () => {

            removeSpawn(id);

            active.current = false;

            respawnAt.current = 0;
        };

    }, [id]);

    // ======================================
    // DISPOSE THREE.JS RESOURCES
    // ======================================

    useEffect(() => {

        return () => {

            questionTexture.dispose();

            edgeGeometry.dispose();
        };

    }, [questionTexture, edgeGeometry]);

    // ======================================
    // GAME LOOP
    // ======================================

    useFrame(({ clock }, delta) => {

        if (
            !rootRef.current ||
            !boxRef.current
        ) {

            return;
        }

        // ==================================
        // MATCH MUST BE RUNNING
        // ==================================

        if (matchState.status !== "playing") {

            if (active.current) {

                active.current = false;

                rootRef.current.visible = false;

                removeSpawn(id);
            }

            respawnAt.current = 0;

            return;
        }

        const now = performance.now();

        const time = clock.getElapsedTime();

        // ==================================
        // VALIDATE SELECTED WEAPONS
        // ==================================

        const selectedWeapons = settings.weapons;

        if (
            !Array.isArray(selectedWeapons) ||
            selectedWeapons.length === 0
        ) {

            if (active.current) {

                active.current = false;

                rootRef.current.visible = false;

                deactivatePickup(id);
            }

            return;
        }

        // ==================================
        // RANDOM SPAWN AND RESPAWN
        // ==================================

        if (!active.current) {

            if (now < respawnAt.current) {

                return;
            }

            const position = getRandomSpawn(

                id,

                playerState
            );

            if (!position) {

                respawnAt.current =

                    now + SPAWN_RETRY_DELAY;

                return;
            }

            rootRef.current.position.set(

                ...position
            );

            rootRef.current.visible = true;

            active.current = true;
        }

        // ==================================
        // FLOATING BOX ANIMATION
        // ==================================

        boxRef.current.position.y =

            1.6 +

            Math.sin(time * 2.5 + id) * 0.22;

        boxRef.current.rotation.y +=

            delta * 0.8;

        boxRef.current.rotation.z =

            Math.sin(time * 1.5 + id) * 0.06;

        // ==================================
        // GROUND RING ANIMATION
        // ==================================

        if (ringRef.current) {

            ringRef.current.scale.setScalar(

                1 +

                Math.sin(time * 3 + id) * 0.12
            );
        }

        // ==================================
        // FIND NEAREST PLAYER OR BOT
        // ==================================

        const boxX = rootRef.current.position.x;

        const boxZ = rootRef.current.position.z;

        const collector = findNearestCollector(

            boxX,

            boxZ
        );

        if (!collector) {

            return;
        }

        // ==================================
        // SELECT RANDOM ENABLED WEAPON
        // ==================================

        const weapon = getRandomWeapon(

            selectedWeapons
        );

        if (

            !weapon ||

            weapon.available === false ||

            !selectedWeapons.includes(weapon.id)

        ) {

            return;
        }

        // ==================================
        // GIVE SELECTED WEAPON
        // ==================================

        const collected = giveWeapon(

            collector,

            weapon,

            now
        );

        if (!collected) {

            return;
        }

        // ==================================
        // HIDE COLLECTED MYSTERY BOX
        // ==================================

        active.current = false;

        rootRef.current.visible = false;

        // Remove collected box from bot targets.

        deactivatePickup(id);

        // ==================================
        // SET RESPAWN TIME
        // ==================================

        respawnAt.current =
            now + ARENA_CONFIG.pickupRespawnDelay;
    });

    // ======================================
    // MYSTERY BOX DESIGN
    // ======================================

    return (

        <group
            ref={rootRef}
            visible={false}
            name={`mysteryBox_${id}`}
        >

            {/* Ground ring */}

            <mesh
                ref={ringRef}
                position={[0, 0.045, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
            >

                <ringGeometry
                    args={[1.05, 1.3, 48]}
                />

                <meshBasicMaterial
                    color="#d8a4ff"
                    transparent
                    opacity={0.85}
                    depthWrite={false}
                />

            </mesh>

            {/* Floating mystery box */}

            <group
                ref={boxRef}
                position={[0, 1.6, 0]}
            >

                {/* Main purple box */}

                <RoundedBox
                    args={[
                        BOX_SIZE,
                        BOX_SIZE,
                        BOX_SIZE,
                    ]}
                    radius={0.12}
                    smoothness={3}
                    castShadow
                >

                    <meshStandardMaterial
                        color="#8833ee"
                        emissive="#6c18d8"
                        emissiveIntensity={0.65}
                        metalness={0.3}
                        roughness={0.3}
                    />

                </RoundedBox>

                {/* Golden box edges */}

                <lineSegments
                    geometry={edgeGeometry}
                >

                    <lineBasicMaterial
                        color="#ffe066"
                    />

                </lineSegments>

                {/* Question marks on four sides */}

                {[
                    0,
                    Math.PI / 2,
                    Math.PI,
                    Math.PI * 1.5,

                ].map((rotation, index) => (

                    <group
                        key={index}
                        rotation={[
                            0,
                            rotation,
                            0,
                        ]}
                    >

                        <mesh
                            position={[
                                0,
                                0,
                                0.92,
                            ]}
                        >

                            <planeGeometry
                                args={[1.5, 1.5]}
                            />

                            <meshBasicMaterial
                                map={questionTexture}
                                transparent
                                depthWrite={false}
                                toneMapped={false}
                            />

                        </mesh>

                    </group>

                ))}

                {/* Top question mark */}

                <mesh
                    position={[0, 0.92, 0]}
                    rotation={[
                        -Math.PI / 2,
                        0,
                        0,
                    ]}
                >

                    <planeGeometry
                        args={[1.5, 1.5]}
                    />

                    <meshBasicMaterial
                        map={questionTexture}
                        transparent
                        depthWrite={false}
                        toneMapped={false}
                    />

                </mesh>

            </group>

        </group>
    );
}