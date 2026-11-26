import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import {
    getDeployedWeapons,
    getActiveMaces,
    getPoisonZones,
} from "../combat/SpecialWeaponSystem";

import {
    getAliveEntities,
} from "../combat/EntityManager";

// ==========================================
// COMMON SETTINGS
// ==========================================

const REFRESH_INTERVAL = 0.08;

const ignoreRaycast = () => {};

// ==========================================
// LAND MINE MODEL
// ==========================================

function LandMine({ item }) {

    const lightRef = useRef();

    useFrame(({ clock }) => {

        if (!lightRef.current) return;

        const armed =
            performance.now() >= item.armedAt;

        lightRef.current.material.color.set(
            armed ? "#ff2222" : "#ffb300"
        );

        lightRef.current.material.emissive.set(
            armed ? "#ff2222" : "#ffb300"
        );

        lightRef.current.material.emissiveIntensity =
            armed
                ? 1.5 + Math.sin(
                    clock.elapsedTime * 8
                ) * 1.2
                : 0.5;
    });

    return (

        <group position={[item.x, item.y, item.z]}>

            {/* MAIN MINE BODY */}

            <mesh castShadow raycast={ignoreRaycast}>

                <cylinderGeometry
                    args={[0.65, 0.8, 0.28, 24]}
                />

                <meshStandardMaterial
                    color="#465b32"
                    metalness={0.65}
                    roughness={0.4}
                />

            </mesh>

            {/* LOWER METAL RING */}

            <mesh
                position={[0, -0.12, 0]}
                raycast={ignoreRaycast}
            >

                <cylinderGeometry
                    args={[0.8, 0.8, 0.1, 24]}
                />

                <meshStandardMaterial
                    color="#252a25"
                    metalness={0.8}
                />

            </mesh>

            {/* PRESSURE PLATE */}

            <mesh
                position={[0, 0.18, 0]}
                raycast={ignoreRaycast}
            >

                <cylinderGeometry
                    args={[0.4, 0.48, 0.12, 24]}
                />

                <meshStandardMaterial
                    color="#687d4c"
                    metalness={0.5}
                />

            </mesh>

            {/* BLINKING WARNING LIGHT */}

            <mesh
                ref={lightRef}
                position={[0, 0.27, 0]}
                raycast={ignoreRaycast}
            >

                <sphereGeometry
                    args={[0.12, 12, 12]}
                />

                <meshStandardMaterial
                    color="#ff2222"
                    emissive="#ff2222"
                    emissiveIntensity={2}
                />

            </mesh>

            {/* METAL BOLTS */}

            {Array.from({ length: 8 }, (_, index) => {

                const angle =
                    index * Math.PI * 2 / 8;

                return (

                    <mesh
                        key={index}
                        position={[
                            Math.cos(angle) * 0.57,
                            0.15,
                            Math.sin(angle) * 0.57
                        ]}
                        raycast={ignoreRaycast}
                    >

                        <cylinderGeometry
                            args={[0.065, 0.065, 0.06, 6]}
                        />

                        <meshStandardMaterial
                            color="#a2a7a0"
                            metalness={0.9}
                        />

                    </mesh>
                );
            })}

        </group>
    );
}

// ==========================================
// QUESTION MARK SYMBOL
// ==========================================

function QuestionMark({ rotation = [0, 0, 0] }) {

    return (

        <group rotation={rotation}>

            <group position={[0, 0, 0.715]}>

                <mesh
                    position={[0, 0.15, 0]}
                    raycast={ignoreRaycast}
                >

                    <torusGeometry
                        args={[
                            0.19,
                            0.065,
                            8,
                            20,
                            Math.PI * 1.5
                        ]}
                    />

                    <meshBasicMaterial
                        color="#ffffff"
                        toneMapped={false}
                    />

                </mesh>

                <mesh
                    position={[0, -0.08, 0]}
                    raycast={ignoreRaycast}
                >

                    <boxGeometry
                        args={[0.11, 0.24, 0.04]}
                    />

                    <meshBasicMaterial
                        color="#ffffff"
                    />

                </mesh>

                <mesh
                    position={[0, -0.31, 0]}
                    raycast={ignoreRaycast}
                >

                    <sphereGeometry
                        args={[0.075, 8, 8]}
                    />

                    <meshBasicMaterial
                        color="#ffffff"
                    />

                </mesh>

            </group>

        </group>
    );
}

// ==========================================
// FAKE MYSTERY BOX
// ==========================================

function FakeMysteryBox({ item }) {

    const boxRef = useRef();

    const glowRef = useRef();

    useFrame(({ clock }, delta) => {

        const time = clock.elapsedTime;

        if (boxRef.current) {

            boxRef.current.rotation.y +=
                delta * 0.7;

            boxRef.current.position.y =
                0.95 + Math.sin(time * 2.5) * 0.15;
        }

        if (glowRef.current) {

            glowRef.current.material.opacity =
                0.15 + Math.sin(time * 3) * 0.05;
        }
    });

    return (

        <group position={[item.x, 0, item.z]}>

            <group ref={boxRef} position={[0, 0.95, 0]}>

                {/* MYSTERY BOX BODY */}

                <mesh castShadow raycast={ignoreRaycast}>

                    <boxGeometry
                        args={[1.4, 1.4, 1.4]}
                    />

                    <meshStandardMaterial
                        color="#7c3aed"
                        emissive="#6d28d9"
                        emissiveIntensity={0.8}
                        metalness={0.35}
                        roughness={0.3}
                    />

                </mesh>

                {/* GLOWING BOX EDGES */}

                <mesh raycast={ignoreRaycast}>

                    <boxGeometry
                        args={[1.43, 1.43, 1.43]}
                    />

                    <meshBasicMaterial
                        color="#d8b4fe"
                        wireframe
                        toneMapped={false}
                    />

                </mesh>

                {/* QUESTION MARKS */}

                <QuestionMark />

                <QuestionMark
                    rotation={[0, Math.PI / 2, 0]}
                />

                <QuestionMark
                    rotation={[0, Math.PI, 0]}
                />

                <QuestionMark
                    rotation={[0, -Math.PI / 2, 0]}
                />

            </group>

            {/* GROUND GLOW */}

            <mesh
                ref={glowRef}
                position={[0, 0.035, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
                raycast={ignoreRaycast}
            >

                <circleGeometry args={[1.2, 32]} />

                <meshBasicMaterial
                    color="#a855f7"
                    transparent
                    opacity={0.15}
                    depthWrite={false}
                />

            </mesh>

        </group>
    );
}

// ==========================================
// SPINNING MACE MODEL
// ==========================================

const MACE_SPIKE_DIRECTIONS = [

    [1, 0, 0],
    [-1, 0, 0],

    [0, 1, 0],
    [0, -1, 0],

    [0, 0, 1],
    [0, 0, -1],

    [1, 1, 1],
    [-1, 1, 1],

    [1, -1, 1],
    [1, 1, -1],

    [-1, -1, 1],
    [-1, 1, -1],

    [1, -1, -1],
    [-1, -1, -1],

].map((direction) => {

    const vector =
        new THREE.Vector3(...direction).normalize();

    return {

        position:
            vector.clone().multiplyScalar(0.72).toArray(),

        quaternion:
            new THREE.Quaternion()
                .setFromUnitVectors(
                    new THREE.Vector3(0, 1, 0),
                    vector
                )
                .toArray(),

    };
});

function SpinningMace({ mace }) {

    const groupRef = useRef();

    const ballRef = useRef();

    const chainRef = useRef();

    const direction = useRef(
        new THREE.Vector3()
    );

    const up = useRef(
        new THREE.Vector3(0, 1, 0)
    );

    useFrame((_, delta) => {

        const attacker = getAliveEntities().find(
            (entity) => entity.id === mace.attackerId
        );

        if (
            !attacker ||
            attacker.lifeId !== mace.lifeId ||
            performance.now() >= mace.expiresAt
        ) {

            if (groupRef.current) {
                groupRef.current.visible = false;
            }

            return;
        }

        if (groupRef.current) {

            groupRef.current.visible = true;

            groupRef.current.position.set(
                attacker.x,
                1.15,
                attacker.z
            );
        }

        const offsetX = mace.x - attacker.x;

        const offsetZ = mace.z - attacker.z;

        if (ballRef.current) {

            ballRef.current.position.set(
                offsetX,
                0,
                offsetZ
            );

            ballRef.current.rotation.x += delta * 5;

            ballRef.current.rotation.z += delta * 4;
        }

        if (chainRef.current) {

            direction.current.set(
                offsetX,
                0,
                offsetZ
            );

            const length =
                direction.current.length();

            chainRef.current.position.set(
                offsetX / 2,
                0,
                offsetZ / 2
            );

            chainRef.current.scale.y = length;

            if (length > 0.001) {

                chainRef.current.quaternion
                    .setFromUnitVectors(
                        up.current,
                        direction.current.normalize()
                    );
            }
        }
    });

    return (

        <group ref={groupRef}>

            {/* ROTATING METAL ARM */}

            <mesh
                ref={chainRef}
                raycast={ignoreRaycast}
            >

                <cylinderGeometry
                    args={[0.075, 0.075, 1, 8]}
                />

                <meshStandardMaterial
                    color="#a2a7b0"
                    metalness={0.95}
                    roughness={0.25}
                />

            </mesh>

            {/* SPIKED METAL BALL */}

            <group ref={ballRef}>

                <mesh castShadow raycast={ignoreRaycast}>

                    <sphereGeometry
                        args={[0.62, 20, 20]}
                    />

                    <meshStandardMaterial
                        color="#555b66"
                        metalness={0.9}
                        roughness={0.25}
                    />

                </mesh>

                {MACE_SPIKE_DIRECTIONS.map(
                    (spike, index) => (

                        <mesh
                            key={index}
                            position={spike.position}
                            quaternion={spike.quaternion}
                            raycast={ignoreRaycast}
                        >

                            <coneGeometry
                                args={[0.16, 0.38, 6]}
                            />

                            <meshStandardMaterial
                                color="#c2c7d0"
                                metalness={0.95}
                                roughness={0.2}
                            />

                        </mesh>
                    )
                )}

            </group>

        </group>
    );
}

// ==========================================
// POISON CLOUD SETTINGS
// ==========================================

const POISON_PARTICLES = Array.from(

    { length: 16 },

    (_, index) => ({

        angle: index * 2.399963,

        radius:
            0.25 + (index % 5) * 0.15,

        height:
            0.3 + (index % 4) * 0.35,

        size:
            0.7 + (index % 3) * 0.25,

        speed:
            0.3 + (index % 4) * 0.1,

    })
);

// ==========================================
// PERSISTENT POISON DAMAGE ZONE
// ==========================================

function PoisonZone({ zone }) {

    const cloudRefs = useRef([]);

    const ringRef = useRef();

    const groundRef = useRef();

    useFrame(({ clock }) => {

        const now = performance.now();

        const totalDuration = Math.max(
            1,
            zone.expiresAt - zone.createdAt
        );

        const remaining = THREE.MathUtils.clamp(
            (zone.expiresAt - now) / totalDuration,
            0,
            1
        );

        const fade = Math.min(
            1,
            remaining * 5
        );

        const time = clock.elapsedTime;

        POISON_PARTICLES.forEach(
            (particle, index) => {

                const mesh =
                    cloudRefs.current[index];

                if (!mesh) return;

                const angle =
                    particle.angle +
                    time * particle.speed;

                const distance =
                    particle.radius * zone.radius;

                mesh.position.set(

                    Math.cos(angle) * distance,

                    particle.height +
                    Math.sin(time * 1.5 + index) * 0.2,

                    Math.sin(angle) * distance
                );

                const size =
                    particle.size *
                    (
                        1 +
                        Math.sin(time * 2 + index) * 0.15
                    );

                mesh.scale.setScalar(size);

                mesh.material.opacity = 0.20 * fade;
            }
        );

        if (ringRef.current) {

            ringRef.current.material.opacity =
                (
                    0.4 +
                    Math.sin(time * 4) * 0.15
                ) * fade;
        }

        if (groundRef.current) {

            groundRef.current.material.opacity =
                0.12 * fade;
        }
    });

    return (

        <group position={[zone.x, 0, zone.z]}>

            {/* POISON DAMAGE AREA */}

            <mesh
                ref={groundRef}
                position={[0, 0.025, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
                raycast={ignoreRaycast}
            >

                <circleGeometry
                    args={[zone.radius, 48]}
                />

                <meshBasicMaterial
                    color="#4ade00"
                    transparent
                    opacity={0.12}
                    depthWrite={false}
                />

            </mesh>

            {/* DAMAGE ZONE BOUNDARY */}

            <mesh
                ref={ringRef}
                position={[0, 0.045, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
                raycast={ignoreRaycast}
            >

                <ringGeometry
                    args={[
                        Math.max(0, zone.radius - 0.12),
                        zone.radius,
                        48
                    ]}
                />

                <meshBasicMaterial
                    color="#84ff35"
                    transparent
                    opacity={0.5}
                    depthWrite={false}
                    side={THREE.DoubleSide}
                    toneMapped={false}
                />

            </mesh>

            {/* ANIMATED GREEN POISON CLOUD */}

            {POISON_PARTICLES.map((_, index) => (

                <mesh
                    key={index}
                    ref={(element) => {
                        cloudRefs.current[index] = element;
                    }}
                    raycast={ignoreRaycast}
                >

                    <sphereGeometry args={[1, 10, 10]} />

                    <meshBasicMaterial
                        color={
                            index % 2 === 0
                                ? "#64e831"
                                : "#3e9c20"
                        }
                        transparent
                        opacity={0.2}
                        depthWrite={false}
                    />

                </mesh>

            ))}

        </group>
    );
}

// ==========================================
// MAIN SPECIAL WEAPON RENDERER
// ==========================================

export default function SpecialWeaponRenderer() {

    const [deployedWeapons, setDeployedWeapons] =
        useState([]);

    const [activeMaces, setActiveMaces] =
        useState([]);

    const [poisonZones, setPoisonZones] =
        useState([]);

    const timer = useRef(0);

    const previousSignature = useRef("");

    // ======================================
    // SYNCHRONIZE SPECIAL WEAPON OBJECTS
    // ======================================

    useFrame((_, delta) => {

        timer.current += delta;

        if (timer.current < REFRESH_INTERVAL) {

            return;
        }

        timer.current = 0;

        const deployed = getDeployedWeapons();

        const maces = getActiveMaces();

        const zones = getPoisonZones();

        const signature = JSON.stringify([

            deployed.map((item) => item.id),

            maces.map((item) => item.id),

            zones.map((item) => item.id),

        ]);

        // Update React state only when objects
        // are created or removed.

        if (signature === previousSignature.current) {

            return;
        }

        previousSignature.current = signature;

        setDeployedWeapons(deployed);

        setActiveMaces(maces);

        setPoisonZones(zones);
    });

    // ======================================
    // RENDER ALL SPECIAL WEAPONS
    // ======================================

    return (

        <group name="specialWeaponEffects">

            {/* LAND MINES AND FAKE BOXES */}

            {deployedWeapons.map((item) => {

                if (item.type === "mine") {

                    return (

                        <LandMine
                            key={`mine-${item.id}`}
                            item={item}
                        />

                    );
                }

                if (item.type === "fake_box") {

                    return (

                        <FakeMysteryBox
                            key={`fake-box-${item.id}`}
                            item={item}
                        />

                    );
                }

                return null;
            })}

            {/* ACTIVE SPINNING MACES */}

            {activeMaces.map((mace) => (

                <SpinningMace
                    key={`mace-${mace.id}`}
                    mace={mace}
                />

            ))}

            {/* ACTIVE POISON DAMAGE ZONES */}

            {poisonZones.map((zone) => (

                <PoisonZone
                    key={`poison-${zone.id}`}
                    zone={zone}
                />

            ))}

        </group>
    );
}