import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// ==========================================
// DEFAULT IMPACT CONFIGURATION
// ==========================================

const DEFAULT_IMPACT = {

    power: 0.45,

    duration: 0.22,

    particleCount: 8,

    particleSize: 0.12,

    colors: ["#ff9d22"],

    flashColor: "#ff9d22",

    ringColor: "#ffb333",

    shockwave: false,

    gravity: 12,

    speed: 1,

    shape: "sphere",

    cloud: false,

    additive: false,

};

// ==========================================
// WEAPON WISE IMPACT CONFIGURATION
// ==========================================

const IMPACT_CONFIG = {

    // ======================================
    // TRIPLE ROCKET
    // ======================================

    rocket: {

        power: 1.6,

        duration: 0.65,

        particleCount: 24,

        colors: ["#ff9d22"],

        flashColor: "#fff3a0",

        ringColor: "#ffb333",

        shockwave: true,

    },

    // ======================================
    // MEGA NUKE
    // ======================================

    nuke: {

        power: 3.5,

        duration: 0.65,

        particleCount: 24,

        colors: ["#ff9d22"],

        flashColor: "#fff3a0",

        ringColor: "#ffb333",

        shockwave: true,

    },

    // ======================================
    // CANNON
    // ======================================

    cannonball: {

        power: 1.6,

        duration: 0.65,

        particleCount: 24,

        colors: ["#ff9d22"],

        flashColor: "#fff3a0",

        ringColor: "#ffb333",

        shockwave: true,

    },

    // ======================================
    // MACHINE GUN
    // ======================================

    bullet: {

        power: 0.45,

        duration: 0.22,

        particleCount: 8,

        colors: ["#ff9d22"],

        flashColor: "#ff9d22",

    },

    // ======================================
    // PLASMA BLASTER
    // ======================================

    plasma: {

        power: 0.45,

        duration: 0.22,

        particleCount: 8,

        colors: ["#00ddff"],

        flashColor: "#00ddff",

    },

    // ======================================
    // SNOWBALL LAUNCHER
    // ======================================

    snowball: {

        power: 0.45,

        duration: 0.22,

        particleCount: 8,

        colors: ["#eaffff"],

        flashColor: "#eaffff",

    },

    // ======================================
    // GRENADE LAUNCHER
    // ======================================

    grenade: {

        power: 1.6,

        duration: 0.65,

        particleCount: 24,

        colors: ["#ff9d22"],

        flashColor: "#fff3a0",

        ringColor: "#ffb333",

        shockwave: true,

    },

    // ======================================
    // SHOTGUN
    // ======================================

    pellet: {

        power: 0.28,

        duration: 0.16,

        particleCount: 4,

        particleSize: 0.075,

        colors: [
            "#fff1b0",
            "#e7b45b",
        ],

        flashColor: "#fff1b0",

        gravity: 10,

        shape: "spark",

        additive: true,

    },

    // ======================================
    // MINI GUN
    // ======================================

    minigun_bullet: {

        power: 0.30,

        duration: 0.15,

        particleCount: 4,

        particleSize: 0.07,

        colors: [
            "#ffba25",
            "#fff8c4",
        ],

        flashColor: "#ffba25",

        shape: "spark",

        additive: true,

    },

    // ======================================
    // LASER BLASTER
    // ======================================

    laser: {

        power: 0.65,

        duration: 0.30,

        particleCount: 12,

        particleSize: 0.09,

        colors: [
            "#ff284a",
            "#ff5266",
            "#ffffff",
        ],

        flashColor: "#ff284a",

        ringColor: "#ff5266",

        shockwave: true,

        gravity: 2,

        shape: "spark",

        additive: true,

    },

    // ======================================
    // HOMING MISSILE
    // ======================================

    homing: {

        power: 2.1,

        duration: 0.75,

        particleCount: 28,

        particleSize: 0.15,

        colors: [
            "#458cff",
            "#75c7ff",
            "#ff9d22",
            "#ffffff",
        ],

        flashColor: "#c8f5ff",

        ringColor: "#458cff",

        shockwave: true,

        gravity: 10,

    },

    // ======================================
    // FIREBALL LAUNCHER
    // ======================================

    fireball: {

        power: 1.5,

        duration: 0.85,

        particleCount: 28,

        particleSize: 0.17,

        colors: [
            "#ff3300",
            "#ff6500",
            "#ff9d00",
            "#ffdf65",
        ],

        flashColor: "#fff09a",

        ringColor: "#ff581c",

        shockwave: true,

        gravity: -2,

        speed: 0.65,

        cloud: true,

        cloudColor: "#ff6500",

        additive: true,

    },

    // ======================================
    // ICE ROCKET
    // ======================================

    ice_rocket: {

        power: 1.5,

        duration: 0.9,

        particleCount: 26,

        particleSize: 0.16,

        colors: [
            "#7bddff",
            "#b8f1ff",
            "#49bbff",
            "#ffffff",
        ],

        flashColor: "#eaffff",

        ringColor: "#7bddff",

        shockwave: true,

        gravity: 7,

        speed: 0.8,

        shape: "crystal",

        cloud: true,

        cloudColor: "#b8f1ff",

    },

    // ======================================
    // ELECTRIC BLASTER
    // ======================================

    electric: {

        power: 1.1,

        duration: 0.55,

        particleCount: 20,

        particleSize: 0.12,

        colors: [
            "#be65ff",
            "#d6a1ff",
            "#8d36ff",
            "#ffffff",
        ],

        flashColor: "#f3d8ff",

        ringColor: "#be65ff",

        shockwave: true,

        gravity: 0,

        speed: 1.2,

        shape: "spark",

        additive: true,

    },

    // ======================================
    // LAND MINES
    // ======================================

    mine: {

        power: 2.2,

        duration: 0.85,

        particleCount: 30,

        particleSize: 0.18,

        colors: [
            "#ff6500",
            "#ffb333",
            "#52663d",
            "#696969",
        ],

        flashColor: "#fff3a0",

        ringColor: "#ff9d22",

        shockwave: true,

        gravity: 12,

        cloud: true,

        cloudColor: "#777777",

    },

    // ======================================
    // FAKE MYSTERY BOX
    // ======================================

    fake_box: {

        power: 2.3,

        duration: 0.85,

        particleCount: 30,

        particleSize: 0.16,

        colors: [
            "#b652ff",
            "#e6b3ff",
            "#ff6500",
            "#ffffff",
        ],

        flashColor: "#e6b3ff",

        ringColor: "#b652ff",

        shockwave: true,

        gravity: 9,

        shape: "crystal",

    },

    // ======================================
    // SPINNING MACE
    // ======================================

    mace: {

        power: 0.85,

        duration: 0.35,

        particleCount: 14,

        particleSize: 0.10,

        colors: [
            "#a2a7b0",
            "#ffffff",
            "#ffba25",
        ],

        flashColor: "#fff1b0",

        gravity: 12,

        shape: "spark",

    },

    // ======================================
    // EMP BLASTER
    // ======================================

    emp: {

        power: 2.2,

        duration: 0.85,

        particleCount: 24,

        particleSize: 0.12,

        colors: [
            "#354bff",
            "#6d8bff",
            "#8ebaff",
            "#ffffff",
        ],

        flashColor: "#b4c7ff",

        ringColor: "#354bff",

        shockwave: true,

        gravity: 0,

        speed: 0.75,

        shape: "ring",

        additive: true,

    },

    // ======================================
    // POISON BOMB
    // ======================================

    poison: {

        power: 1.8,

        duration: 1.5,

        particleCount: 24,

        particleSize: 0.22,

        colors: [
            "#64e831",
            "#47bd1d",
            "#a1ff46",
            "#375d20",
        ],

        flashColor: "#a1ff46",

        ringColor: "#64e831",

        shockwave: true,

        gravity: -0.5,

        speed: 0.35,

        cloud: true,

        cloudColor: "#64e831",

    },

    // ======================================
    // INVINCIBILITY STAR ACTIVATION
    // ======================================

    invincibility: {

        power: 1.5,

        duration: 0.8,

        particleCount: 20,

        particleSize: 0.12,

        colors: [
            "#ffd700",
            "#ffb300",
            "#fff4a3",
        ],

        flashColor: "#fff4a3",

        ringColor: "#ffd700",

        shockwave: true,

        gravity: -1,

        speed: 0.5,

        shape: "crystal",

        additive: true,

    },

};

// ==========================================
// PARTICLE GEOMETRY
// ==========================================

function ImpactParticleGeometry({

    shape,

    size,

}) {

    switch (shape) {

        case "crystal":

            return (

                <octahedronGeometry
                    args={[size, 0]}
                />

            );

        case "spark":

            return (

                <boxGeometry
                    args={[
                        size * 0.45,
                        size * 0.45,
                        size * 3
                    ]}
                />

            );

        case "ring":

            return (

                <torusGeometry
                    args={[
                        size,
                        size * 0.20,
                        6,
                        12
                    ]}
                />

            );

        default:

            return (

                <sphereGeometry
                    args={[size, 6, 6]}
                />

            );
    }
}

// ==========================================
// MAIN IMPACT EFFECT
// ==========================================

export default function ImpactEffects({

    impact,

    remove,

}) {

    const flashRef = useRef();

    const ringRef = useRef();

    const secondRingRef = useRef();

    const particlesRef = useRef([]);

    const cloudsRef = useRef([]);

    const elapsed = useRef(0);

    const finished = useRef(false);

    // ======================================
    // GET ACTUAL IMPACT TYPE
    // ======================================

    const type =

        impact.originalType ||

        impact.type;

    // ======================================
    // GET WEAPON IMPACT SETTINGS
    // ======================================

    const config = useMemo(() => ({

        ...DEFAULT_IMPACT,

        ...(IMPACT_CONFIG[type] || {}),

    }), [type]);

    const power = config.power;

    const duration = config.duration;

    // ======================================
    // REUSABLE PARTICLE DATA
    // ======================================

    const particles = useMemo(() => {

        return Array.from(

            { length: config.particleCount },

            () => {

                const colorIndex = Math.floor(

                    Math.random() *

                    config.colors.length

                );

                return {

                    velocity: new THREE.Vector3(

                        (Math.random() - 0.5) * 12,

                        Math.random() * 8,

                        (Math.random() - 0.5) * 12

                    ).multiplyScalar(

                        power * config.speed

                    ),

                    color: config.colors[colorIndex],

                    rotationSpeed: new THREE.Vector3(

                        (Math.random() - 0.5) * 10,

                        (Math.random() - 0.5) * 10,

                        (Math.random() - 0.5) * 10

                    ),

                };
            }

        );

    }, [config, power]);

    // ======================================
    // SMOKE AND ENERGY CLOUD DATA
    // ======================================

    const clouds = useMemo(() => {

        if (!config.cloud) return [];

        return Array.from(

            { length: 8 },

            (_, index) => {

                const angle =

                    index * Math.PI * 2 / 8;

                return {

                    x: Math.cos(angle),

                    z: Math.sin(angle),

                    y: Math.random() * 0.4,

                    size: 0.7 + Math.random() * 0.5,

                };
            }

        );

    }, [config]);

    // ======================================
    // ANIMATE IMPACT EFFECT
    // ======================================

    useFrame((_, delta) => {

        if (finished.current) return;

        const dt = Math.min(delta, 0.05);

        elapsed.current += dt;

        const progress = Math.min(

            elapsed.current / duration,

            1

        );

        // ==================================
        // IMPACT FLASH
        // ==================================

        if (flashRef.current) {

            flashRef.current.scale.setScalar(

                power *

                (0.3 + progress * 1.8)

            );

            flashRef.current.material.opacity =

                Math.max(

                    0,

                    1 - progress * 2

                );
        }

        // ==================================
        // PRIMARY SHOCKWAVE
        // ==================================

        if (ringRef.current) {

            ringRef.current.scale.setScalar(

                power *

                (0.3 + progress * 3)

            );

            ringRef.current.material.opacity =

                1 - progress;
        }

        // ==================================
        // SECOND ENERGY SHOCKWAVE
        // ==================================

        if (secondRingRef.current) {

            const secondProgress =

                THREE.MathUtils.clamp(

                    (progress - 0.12) / 0.88,

                    0,

                    1

                );

            secondRingRef.current.visible =

                progress >= 0.12;

            secondRingRef.current.scale.setScalar(

                power *

                (0.2 + secondProgress * 2.5)

            );

            secondRingRef.current.material.opacity =

                (1 - secondProgress) * 0.65;
        }

        // ==================================
        // UPDATE FLYING PARTICLES
        // ==================================

        particles.forEach((particle, index) => {

            const mesh =

                particlesRef.current[index];

            if (!mesh) return;

            // Gravity

            particle.velocity.y -=

                config.gravity * dt;

            // Movement

            mesh.position.addScaledVector(

                particle.velocity,

                dt

            );

            // Rotation

            mesh.rotation.x +=

                particle.rotationSpeed.x * dt;

            mesh.rotation.y +=

                particle.rotationSpeed.y * dt;

            mesh.rotation.z +=

                particle.rotationSpeed.z * dt;

            // Fade out

            mesh.material.opacity =

                1 - progress;

            // Reduce particle size

            mesh.scale.setScalar(

                Math.max(

                    0.05,

                    1 - progress

                )

            );
        });

        // ==================================
        // ANIMATE SMOKE AND ENERGY CLOUDS
        // ==================================

        clouds.forEach((cloud, index) => {

            const mesh = cloudsRef.current[index];

            if (!mesh) return;

            const spread =

                power *

                (0.2 + progress * 1.6);

            mesh.position.set(

                cloud.x * spread,

                cloud.y + progress * power * 0.7,

                cloud.z * spread

            );

            mesh.scale.setScalar(

                cloud.size *

                power *

                (0.25 + progress * 0.9)

            );

            mesh.material.opacity =

                (1 - progress) * 0.35;
        });

        // ==================================
        // REMOVE COMPLETED IMPACT
        // ==================================

        if (progress >= 1) {

            finished.current = true;

            remove(impact.id);
        }
    });

    // ======================================
    // SPECIAL DOUBLE SHOCKWAVE TYPES
    // ======================================

    const doubleShockwave = [

        "emp",

        "electric",

        "ice_rocket",

        "invincibility",

    ].includes(type);

    // ======================================
    // MATERIAL BLENDING
    // ======================================

    const blending = config.additive

        ? THREE.AdditiveBlending

        : THREE.NormalBlending;

    // ======================================
    // RENDER IMPACT EFFECT
    // ======================================

    return (

        <group

            position={impact.position}

            name={`impactEffect_${type}`}

        >

            {/* ==============================
                MAIN IMPACT FLASH
            ============================== */}

            <mesh

                ref={flashRef}

                scale={power * 0.3}

            >

                <sphereGeometry
                    args={[1, 16, 16]}
                />

                <meshBasicMaterial

                    color={config.flashColor}

                    transparent

                    opacity={1}

                    depthWrite={false}

                    toneMapped={false}

                    blending={blending}

                />

            </mesh>

            {/* ==============================
                PRIMARY SHOCKWAVE
            ============================== */}

            {config.shockwave && (

                <mesh

                    ref={ringRef}

                    rotation={[
                        -Math.PI / 2,
                        0,
                        0
                    ]}

                    scale={power * 0.3}

                >

                    <ringGeometry
                        args={[0.85, 1, 32]}
                    />

                    <meshBasicMaterial

                        color={config.ringColor}

                        transparent

                        opacity={1}

                        depthWrite={false}

                        side={THREE.DoubleSide}

                        toneMapped={false}

                        blending={blending}

                    />

                </mesh>

            )}

            {/* ==============================
                SECOND ENERGY SHOCKWAVE
            ============================== */}

            {doubleShockwave && (

                <mesh

                    ref={secondRingRef}

                    visible={false}

                    rotation={[
                        -Math.PI / 2,
                        0,
                        0
                    ]}

                >

                    <ringGeometry
                        args={[0.90, 1, 32]}
                    />

                    <meshBasicMaterial

                        color={config.ringColor}

                        transparent

                        opacity={0}

                        depthWrite={false}

                        side={THREE.DoubleSide}

                        toneMapped={false}

                        blending={THREE.AdditiveBlending}

                    />

                </mesh>

            )}

            {/* ==============================
                FLYING IMPACT PARTICLES
            ============================== */}

            {particles.map((particle, index) => (

                <mesh

                    key={index}

                    ref={(element) => {

                        particlesRef.current[index] =

                            element;

                    }}

                >

                    <ImpactParticleGeometry

                        shape={config.shape}

                        size={config.particleSize}

                    />

                    <meshBasicMaterial

                        color={particle.color}

                        transparent

                        opacity={1}

                        depthWrite={false}

                        toneMapped={false}

                        blending={blending}

                    />

                </mesh>

            ))}

            {/* ==============================
                SMOKE AND ENERGY CLOUDS
            ============================== */}

            {clouds.map((cloud, index) => (

                <mesh

                    key={`cloud-${index}`}

                    scale={0.01}

                    ref={(element) => {

                        cloudsRef.current[index] =

                            element;

                    }}

                >

                    <sphereGeometry
                        args={[1, 8, 8]}
                    />

                    <meshBasicMaterial

                        color={config.cloudColor}

                        transparent

                        opacity={0}

                        depthWrite={false}

                        toneMapped={false}

                        blending={blending}

                    />

                </mesh>

            ))}

        </group>
    );
}