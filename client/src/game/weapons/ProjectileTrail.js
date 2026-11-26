import { useMemo, useRef } from "react";

import { useFrame } from "@react-three/fiber";

import * as THREE from "three";

// ==========================================
// DEFAULT PARTICLE SETTINGS
// ==========================================

const PARTICLE_COUNT = 24;

// ==========================================
// WEAPON WISE TRAIL CONFIGURATION
// ==========================================

const TRAIL_CONFIG = {

    // ======================================
    // NORMAL ROCKET SMOKE
    // ======================================

    rocket: {

        colors: [
            "#d5d5d5",
            "#c5c5c5",
            "#e2e2e2",
        ],

        maxLife: 0.45,

        interval: 0.018,

        startSize: 0.18,

        growth: 0.65,

        opacity: 0.42,

        riseSpeed: 0.6,

        drift: 0,

        additive: false,

        shape: "sphere",

    },

    // ======================================
    // MEGA NUKE HEAVY SMOKE
    // ======================================

    nuke: {

        colors: [
            "#aaa9a1",
            "#8d8c85",
            "#bcbab2",
        ],

        maxLife: 0.65,

        interval: 0.018,

        startSize: 0.35,

        growth: 0.85,

        opacity: 0.48,

        riseSpeed: 0.8,

        drift: 0.15,

        additive: false,

        shape: "sphere",

    },

    // ======================================
    // GRENADE SMOKE
    // ======================================

    grenade: {

        colors: [
            "#c4c8b9",
            "#a7ad9c",
            "#d6d9cd",
        ],

        maxLife: 0.4,

        interval: 0.025,

        startSize: 0.12,

        growth: 0.35,

        opacity: 0.35,

        riseSpeed: 0.5,

        drift: 0.12,

        additive: false,

        shape: "sphere",

    },

    // ======================================
    // HOMING MISSILE BLUE EXHAUST
    // ======================================

    homing: {

        colors: [
            "#258dff",
            "#75c7ff",
            "#c8f5ff",
        ],

        maxLife: 0.45,

        interval: 0.018,

        startSize: 0.18,

        growth: 0.45,

        opacity: 0.65,

        riseSpeed: 0.25,

        drift: 0.15,

        additive: true,

        shape: "sphere",

    },

    // ======================================
    // FIREBALL FLAME TRAIL
    // ======================================

    fireball: {

        colors: [
            "#ff3300",
            "#ff6500",
            "#ff9d00",
            "#ffdf65",
        ],

        maxLife: 0.4,

        interval: 0.016,

        startSize: 0.25,

        growth: 0.35,

        opacity: 0.8,

        riseSpeed: 1.2,

        drift: 0.5,

        additive: true,

        shape: "sphere",

    },

    // ======================================
    // ICE ROCKET FROZEN TRAIL
    // ======================================

    ice_rocket: {

        colors: [
            "#7bddff",
            "#b8f1ff",
            "#49bbff",
            "#ffffff",
        ],

        maxLife: 0.55,

        interval: 0.018,

        startSize: 0.16,

        growth: 0.30,

        opacity: 0.7,

        riseSpeed: -0.3,

        drift: 0.35,

        additive: true,

        shape: "crystal",

    },

    // ======================================
    // ELECTRIC BLASTER TRAIL
    // ======================================

    electric: {

        colors: [
            "#be65ff",
            "#d6a1ff",
            "#8d36ff",
            "#ffffff",
        ],

        maxLife: 0.25,

        interval: 0.014,

        startSize: 0.10,

        growth: 0.15,

        opacity: 0.85,

        riseSpeed: 0,

        drift: 1.2,

        additive: true,

        shape: "spark",

    },

    // ======================================
    // EMP ENERGY TRAIL
    // ======================================

    emp: {

        colors: [
            "#354bff",
            "#6d8bff",
            "#8ebaff",
        ],

        maxLife: 0.35,

        interval: 0.018,

        startSize: 0.18,

        growth: 0.40,

        opacity: 0.65,

        riseSpeed: 0.15,

        drift: 0.4,

        additive: true,

        shape: "ring",

    },

    // ======================================
    // POISON BOMB GREEN SMOKE
    // ======================================

    poison: {

        colors: [
            "#64e831",
            "#47bd1d",
            "#a1ff46",
            "#375d20",
        ],

        maxLife: 0.75,

        interval: 0.022,

        startSize: 0.20,

        growth: 0.80,

        opacity: 0.50,

        riseSpeed: 0.85,

        drift: 0.35,

        additive: false,

        shape: "sphere",

    },

    // ======================================
    // PLASMA ENERGY TRAIL
    // ======================================

    plasma: {

        colors: [
            "#00ddff",
            "#00aaff",
            "#d9ffff",
        ],

        maxLife: 0.25,

        interval: 0.018,

        startSize: 0.13,

        growth: 0.20,

        opacity: 0.65,

        riseSpeed: 0,

        drift: 0.15,

        additive: true,

        shape: "sphere",

    },

    // ======================================
    // LASER ENERGY TRAIL
    // ======================================

    laser: {

        colors: [
            "#ff284a",
            "#ff5266",
            "#ffb5c1",
        ],

        maxLife: 0.12,

        interval: 0.012,

        startSize: 0.08,

        growth: 0.08,

        opacity: 0.8,

        riseSpeed: 0,

        drift: 0,

        additive: true,

        shape: "spark",

    },

};

// ==========================================
// GET PARTICLE GEOMETRY
// ==========================================

function ParticleGeometry({ shape }) {

    switch (shape) {

        case "crystal":

            return (

                <octahedronGeometry
                    args={[1, 0]}
                />

            );

        case "spark":

            return (

                <boxGeometry
                    args={[0.4, 0.4, 2.2]}
                />

            );

        case "ring":

            return (

                <torusGeometry
                    args={[1, 0.12, 6, 12]}
                />

            );

        default:

            return (

                <sphereGeometry
                    args={[1, 8, 8]}
                />

            );
    }
}

// ==========================================
// MAIN PROJECTILE TRAIL
// ==========================================

export default function ProjectileTrail({

    projectileRef,

    type,

}) {

    const config = TRAIL_CONFIG[type];

    const groupRef = useRef();

    const meshes = useRef([]);

    const timer = useRef(0);

    const cursor = useRef(0);

    const initialized = useRef(false);

    // ======================================
    // REUSABLE VECTOR OBJECTS
    // ======================================

    const worldPosition = useRef(

        new THREE.Vector3()

    );

    const currentPosition = useRef(

        new THREE.Vector3()

    );

    const previousPosition = useRef(

        new THREE.Vector3()

    );

    const spawnPosition = useRef(

        new THREE.Vector3()

    );

    const worldQuaternion = useRef(

        new THREE.Quaternion()

    );

    // ======================================
    // REUSABLE PARTICLE POOL
    // ======================================

    const particles = useMemo(() => {

        return Array.from(

            { length: PARTICLE_COUNT },

            () => ({

                position: new THREE.Vector3(),

                velocity: new THREE.Vector3(),

                quaternion: new THREE.Quaternion(),

                life: 0,

                maxLife: 0.45,

                sizeMultiplier: 1,

                rotationSpeed: 0,

            })

        );

    }, []);

    // ======================================
    // UPDATE PARTICLES
    // ======================================

    useFrame((_, delta) => {

        if (!config || !groupRef.current) {

            return;
        }

        const dt = Math.min(delta, 0.05);

        if (dt <= 0) return;

        // ==================================
        // UPDATE EXISTING PARTICLES
        // ==================================

        particles.forEach((particle, index) => {

            const mesh = meshes.current[index];

            if (!mesh) return;

            if (particle.life <= 0) {

                mesh.visible = false;

                return;
            }

            particle.life -= dt;

            if (particle.life <= 0) {

                mesh.visible = false;

                return;
            }

            mesh.visible = true;

            // ==============================
            // PARTICLE LIFE PROGRESS
            // ==============================

            const progress = THREE.MathUtils.clamp(

                1 - particle.life / particle.maxLife,

                0,

                1

            );

            // ==============================
            // PARTICLE MOVEMENT
            // ==============================

            particle.position.addScaledVector(

                particle.velocity,

                dt

            );

            mesh.position.copy(

                particle.position

            );

            // ==============================
            // PARTICLE SIZE
            // ==============================

            const size = (

                config.startSize +

                progress * config.growth

            ) * particle.sizeMultiplier;

            mesh.scale.setScalar(size);

            // ==============================
            // PARTICLE FADE OUT
            // ==============================

            mesh.material.opacity =

                (1 - progress) *

                config.opacity;

            // ==============================
            // SPECIAL PARTICLE ROTATION
            // ==============================

            if (

                config.shape === "crystal" ||

                config.shape === "ring" ||

                config.shape === "spark"

            ) {

                mesh.rotation.z +=

                    particle.rotationSpeed * dt;

                if (config.shape === "crystal") {

                    mesh.rotation.x +=

                        particle.rotationSpeed * dt * 0.5;
                }
            }
        });

        // ==================================
        // CHECK PROJECTILE AVAILABILITY
        // ==================================

        const projectile = projectileRef.current;

        if (

            !projectile ||

            projectile.visible === false

        ) {

            initialized.current = false;

            timer.current = 0;

            return;
        }

        // ==================================
        // GET PROJECTILE WORLD POSITION
        // ==================================

        projectile.getWorldPosition(

            worldPosition.current

        );

        projectile.getWorldQuaternion(

            worldQuaternion.current

        );

        // Convert world position into the
        // trail group's local coordinate space.

        currentPosition.current.copy(

            worldPosition.current

        );

        groupRef.current.worldToLocal(

            currentPosition.current

        );

        // ==================================
        // INITIALIZE TRAIL POSITION
        // ==================================

        if (!initialized.current) {

            previousPosition.current.copy(

                currentPosition.current

            );

            initialized.current = true;

            timer.current = config.interval;
        }

        // ==================================
        // PARTICLE SPAWN TIMER
        // ==================================

        const previousTimer = timer.current;

        timer.current += dt;

        const spawnCount = Math.min(

            Math.floor(

                timer.current / config.interval

            ),

            4

        );

        // ==================================
        // CREATE NEW TRAIL PARTICLES
        // ==================================

        for (let i = 0; i < spawnCount; i++) {

            const index =

                cursor.current % PARTICLE_COUNT;

            const particle = particles[index];

            const mesh = meshes.current[index];

            if (!mesh) continue;

            // ==============================
            // SMOOTH PARTICLE SPACING
            // ==============================

            const spawnTime =

                config.interval * (i + 1) -

                previousTimer;

            const alpha = THREE.MathUtils.clamp(

                spawnTime / dt,

                0,

                1

            );

            spawnPosition.current.lerpVectors(

                previousPosition.current,

                currentPosition.current,

                alpha

            );

            particle.position.copy(

                spawnPosition.current

            );

            // ==============================
            // PARTICLE RANDOM MOVEMENT
            // ==============================

            particle.velocity.set(

                (Math.random() - 0.5) *

                    config.drift,

                config.riseSpeed +

                    (Math.random() - 0.5) *

                    config.drift,

                (Math.random() - 0.5) *

                    config.drift

            );

            // ==============================
            // PARTICLE LIFETIME
            // ==============================

            particle.maxLife = config.maxLife;

            particle.life = particle.maxLife;

            particle.sizeMultiplier =

                0.8 + Math.random() * 0.4;

            particle.rotationSpeed =

                (Math.random() - 0.5) * 8;

            // ==============================
            // RANDOM PARTICLE COLOR
            // ==============================

            const colorIndex = Math.floor(

                Math.random() *

                config.colors.length

            );

            mesh.material.color.set(

                config.colors[colorIndex]

            );

            // ==============================
            // SET INITIAL PARTICLE TRANSFORM
            // ==============================

            mesh.position.copy(

                particle.position

            );

            mesh.scale.setScalar(

                config.startSize *

                particle.sizeMultiplier

            );

            if (

                config.shape === "spark" ||

                config.shape === "ring"

            ) {

                groupRef.current.getWorldQuaternion(

                    particle.quaternion

                );

                particle.quaternion.invert()

                    .multiply(

                        worldQuaternion.current

                    );

                mesh.quaternion.copy(

                    particle.quaternion

                );

            } else {

                mesh.rotation.set(

                    Math.random() * Math.PI,

                    Math.random() * Math.PI,

                    Math.random() * Math.PI

                );
            }

            mesh.material.opacity =

                config.opacity;

            mesh.visible = true;

            cursor.current++;
        }

        // ==================================
        // KEEP REMAINING SPAWN TIME
        // ==================================

        timer.current %= config.interval;

        // ==================================
        // SAVE PREVIOUS PROJECTILE POSITION
        // ==================================

        previousPosition.current.copy(

            currentPosition.current

        );
    });

    // ======================================
    // UNSUPPORTED PROJECTILE TYPE
    // ======================================

    if (!config) {

        return null;
    }

    // ======================================
    // RENDER REUSABLE PARTICLE MESHES
    // ======================================

    return (

        <group

            ref={groupRef}

            name={`projectileTrail_${type}`}

        >

            {particles.map((_, index) => (

                <mesh

                    key={index}

                    visible={false}

                    frustumCulled={false}

                    ref={(element) => {

                        meshes.current[index] = element;

                    }}

                >

                    <ParticleGeometry

                        shape={config.shape}

                    />

                    <meshBasicMaterial

                        color={config.colors[0]}

                        transparent

                        opacity={0}

                        depthWrite={false}

                        toneMapped={false}

                        blending={

                            config.additive

                                ? THREE.AdditiveBlending

                                : THREE.NormalBlending

                        }

                    />

                </mesh>

            ))}

        </group>
    );
}