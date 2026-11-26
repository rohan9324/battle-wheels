import { useRef } from "react";

import { useFrame } from "@react-three/fiber";

import * as THREE from "three";

// ==========================================
// SHIELD SETTINGS
// ==========================================

const SHIELD_SETTINGS = {

    radius: 1,

    width: 1.95,

    height: 1.75,

    length: 2.65,

    centerHeight: 1.50,

    color: "#38bdf8",

    glowColor: "#7de9ff",

    opacity: 0.12,

    ringOpacity: 0.65,

    rotationSpeed: 0.65,

    warningDuration: 1000,

};

// ==========================================
// IGNORE SHIELD IN MESH RAYCASTING
// ==========================================

function ignoreRaycast() {

    // Shield is a visual effect only.
    // Damage protection is handled
    // by DamageSystem.js.

}

// ==========================================
// MAIN SPAWN PROTECTION SHIELD
// ==========================================

export default function SpawnShield({ entity }) {

    const shieldRef = useRef();

    const materialRef = useRef();

    const glowMaterialRef = useRef();

    const ringOneRef = useRef();

    const ringTwoRef = useRef();

    const ringThreeRef = useRef();

    // ======================================
    // SHIELD ANIMATION
    // ======================================

    useFrame(({ clock }, delta) => {

        const shield = shieldRef.current;

        if (!shield) {

            return;
        }

        const now = performance.now();

        // ==================================
        // CHECK ENTITY STATUS
        // ==================================

        if (!entity || !entity.alive) {

            shield.visible = false;

            return;
        }

        // ==================================
        // CHECK REMAINING PROTECTION TIME
        // ==================================

        const remainingTime =

            (entity.protectedUntil || 0) - now;

        // ==================================
        // HIDE EXPIRED SHIELD
        // ==================================

        if (remainingTime <= 0) {

            shield.visible = false;

            return;
        }

        shield.visible = true;

        const time = clock.elapsedTime;

        // ==================================
        // LAST SECOND BLINKING EFFECT
        // ==================================

        const isExpiring =

            remainingTime <=

            SHIELD_SETTINGS.warningDuration;

        const blink = isExpiring

            ? 0.25 + 0.75 *

                Math.abs(Math.sin(time * 18))

            : 1;

        // ==================================
        // SHIELD PULSING EFFECT
        // ==================================

        const pulse =

            1 + Math.sin(time * 4) * 0.025;

        shield.scale.setScalar(pulse);

        // ==================================
        // TRANSPARENT SHIELD MATERIAL
        // ==================================

        if (materialRef.current) {

            materialRef.current.opacity =

                (

                    SHIELD_SETTINGS.opacity +

                    Math.sin(time * 3) * 0.025

                ) * blink;
        }

        // ==================================
        // OUTER SHIELD GLOW
        // ==================================

        if (glowMaterialRef.current) {

            glowMaterialRef.current.opacity =

                0.045 * blink;
        }

        // ==================================
        // ROTATING ENERGY RINGS
        // ==================================

        const dt = Math.min(delta, 0.05);

        if (ringOneRef.current) {

            ringOneRef.current.rotation.y +=

                dt * SHIELD_SETTINGS.rotationSpeed;

            ringOneRef.current.material.opacity =

                SHIELD_SETTINGS.ringOpacity * blink;
        }

        if (ringTwoRef.current) {

            ringTwoRef.current.rotation.z -=

                dt * 0.45;

            ringTwoRef.current.material.opacity =

                0.45 * blink;
        }

        if (ringThreeRef.current) {

            ringThreeRef.current.rotation.x +=

                dt * 0.35;

            ringThreeRef.current.material.opacity =

                0.35 * blink;
        }
    });

    // ======================================
    // RENDER TRANSPARENT SHIELD
    // ======================================

    return (

        <group

            ref={shieldRef}

            name="spawnProtectionShield"

            position={[

                0,

                SHIELD_SETTINGS.centerHeight,

                0

            ]}

            visible={false}

        >

            {/* ==================================
                MAIN TRANSPARENT SHIELD
            ================================== */}

            <mesh

                scale={[

                    SHIELD_SETTINGS.width,

                    SHIELD_SETTINGS.height,

                    SHIELD_SETTINGS.length

                ]}

                raycast={ignoreRaycast}

                renderOrder={10}

            >

                <sphereGeometry

                    args={[

                        SHIELD_SETTINGS.radius,

                        40,

                        32

                    ]}

                />

                <meshBasicMaterial

                    ref={materialRef}

                    color={SHIELD_SETTINGS.color}

                    transparent

                    opacity={SHIELD_SETTINGS.opacity}

                    depthWrite={false}

                    side={THREE.FrontSide}

                    toneMapped={false}

                />

            </mesh>

            {/* ==================================
                OUTER ENERGY GLOW
            ================================== */}

            <mesh

                scale={[

                    SHIELD_SETTINGS.width + 0.04,

                    SHIELD_SETTINGS.height + 0.04,

                    SHIELD_SETTINGS.length + 0.04

                ]}

                raycast={ignoreRaycast}

                renderOrder={11}

            >

                <sphereGeometry

                    args={[1, 32, 24]}

                />

                <meshBasicMaterial

                    ref={glowMaterialRef}

                    color={SHIELD_SETTINGS.glowColor}

                    transparent

                    opacity={0.045}

                    depthWrite={false}

                    side={THREE.BackSide}

                    blending={THREE.AdditiveBlending}

                    toneMapped={false}

                />

            </mesh>

            {/* ==================================
                ENERGY RING GROUP
            ================================== */}

            <group

                scale={[

                    SHIELD_SETTINGS.width,

                    SHIELD_SETTINGS.height,

                    SHIELD_SETTINGS.length

                ]}

            >

                {/* HORIZONTAL ENERGY RING */}

                <mesh

                    ref={ringOneRef}

                    rotation={[Math.PI / 2, 0, 0]}

                    raycast={ignoreRaycast}

                    renderOrder={12}

                >

                    <torusGeometry

                        args={[1, 0.008, 8, 80]}

                    />

                    <meshBasicMaterial

                        color="#7de9ff"

                        transparent

                        opacity={0.65}

                        depthWrite={false}

                        blending={THREE.AdditiveBlending}

                        toneMapped={false}

                    />

                </mesh>

                {/* VERTICAL ENERGY RING */}

                <mesh

                    ref={ringTwoRef}

                    rotation={[0, Math.PI / 4, 0]}

                    raycast={ignoreRaycast}

                    renderOrder={12}

                >

                    <torusGeometry

                        args={[1, 0.006, 8, 80]}

                    />

                    <meshBasicMaterial

                        color="#38bdf8"

                        transparent

                        opacity={0.45}

                        depthWrite={false}

                        blending={THREE.AdditiveBlending}

                        toneMapped={false}

                    />

                </mesh>

                {/* DIAGONAL ENERGY RING */}

                <mesh

                    ref={ringThreeRef}

                    rotation={[

                        Math.PI / 3,

                        Math.PI / 4,

                        Math.PI / 6

                    ]}

                    raycast={ignoreRaycast}

                    renderOrder={12}

                >

                    <torusGeometry

                        args={[1, 0.006, 8, 80]}

                    />

                    <meshBasicMaterial

                        color="#9beaff"

                        transparent

                        opacity={0.35}

                        depthWrite={false}

                        blending={THREE.AdditiveBlending}

                        toneMapped={false}

                    />

                </mesh>

            </group>

        </group>
    );
}