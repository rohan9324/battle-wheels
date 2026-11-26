import { forwardRef } from "react";

import Driver from "../characters/Driver";

import EquippedWeapon from "../weapons/EquippedWeapon";

import SpawnShield from "./SpawnShield";

import playerState from "../PlayerState";

// ==========================================
// KART WHEEL
// ==========================================

function Wheel({ position }) {

    return (

        <group
            position={position}
            name="kartWheel"
        >

            {/* Black tyre */}

            <mesh
                rotation={[0, 0, Math.PI / 2]}
                castShadow
                receiveShadow
            >

                <cylinderGeometry
                    args={[0.48, 0.48, 0.38, 32]}
                />

                <meshStandardMaterial
                    color="#151515"
                    roughness={0.85}
                />

            </mesh>

            {/* Alloy rim */}

            <mesh rotation={[0, 0, Math.PI / 2]}>

                <cylinderGeometry
                    args={[0.28, 0.28, 0.40, 24]}
                />

                <meshStandardMaterial
                    color="#aeb5c0"
                    metalness={0.8}
                    roughness={0.25}
                />

            </mesh>

            {/* Wheel center */}

            <mesh rotation={[0, 0, Math.PI / 2]}>

                <cylinderGeometry
                    args={[0.10, 0.10, 0.43, 16]}
                />

                <meshStandardMaterial
                    color="#303030"
                />

            </mesh>

            {/* Tyre grip */}

            {Array.from({ length: 20 }, (_, i) => {

                const angle =
                    (i / 20) * Math.PI * 2;

                return (

                    <mesh
                        key={i}
                        position={[
                            0,
                            Math.cos(angle) * 0.47,
                            Math.sin(angle) * 0.47
                        ]}
                        rotation={[angle, 0, 0]}
                    >

                        <boxGeometry
                            args={[0.36, 0.045, 0.10]}
                        />

                        <meshStandardMaterial
                            color="#202020"
                        />

                    </mesh>
                );
            })}

        </group>
    );
}

// ==========================================
// MAIN KART
// ==========================================

const Kart = forwardRef(function Kart(

    {

        position = [0, 0, 0],

        color = "#e61932",

        helmetColor = "#1677ff",

        suitColor = "#183b78",

        entity = playerState,

        showWeapon = true,

        showShield = true,

    },

    ref

) {

    return (

        <group
            ref={ref}
            position={position}
        >

            {/* ==================================
                MAIN CHASSIS
            ================================== */}

            <mesh
                position={[0, 0.38, 0]}
                castShadow
                receiveShadow
            >

                <boxGeometry
                    args={[1.65, 0.25, 2.8]}
                />

                <meshStandardMaterial
                    color="#17191e"
                    metalness={0.5}
                    roughness={0.4}
                />

            </mesh>

            {/* ==================================
                MAIN BODY
            ================================== */}

            <mesh
                position={[0, 0.65, 0]}
                castShadow
            >

                <boxGeometry
                    args={[1.45, 0.42, 2.45]}
                />

                <meshStandardMaterial
                    color={color}
                    metalness={0.45}
                    roughness={0.25}
                />

            </mesh>

            {/* ==================================
                FRONT NOSE
            ================================== */}

            <mesh
                position={[0, 0.77, -1.15]}
                rotation={[-0.15, 0, 0]}
                castShadow
            >

                <boxGeometry
                    args={[1.25, 0.40, 0.85]}
                />

                <meshStandardMaterial
                    color={color}
                    metalness={0.5}
                    roughness={0.22}
                />

            </mesh>

            {/* White racing stripe */}

            <mesh position={[0, 0.98, -1.10]}>

                <boxGeometry
                    args={[0.22, 0.025, 0.65]}
                />

                <meshStandardMaterial
                    color="#ffffff"
                />

            </mesh>

            {/* ==================================
                SIDE PANELS
            ================================== */}

            {[-1, 1].map((side) => (

                <group key={side}>

                    <mesh
                        position={[
                            side * 0.82,
                            0.57,
                            0
                        ]}
                        castShadow
                    >

                        <boxGeometry
                            args={[0.28, 0.40, 1.65]}
                        />

                        <meshStandardMaterial
                            color={color}
                            metalness={0.4}
                            roughness={0.3}
                        />

                    </mesh>

                    <mesh
                        position={[
                            side * 0.97,
                            0.45,
                            0
                        ]}
                    >

                        <boxGeometry
                            args={[0.12, 0.15, 1.55]}
                        />

                        <meshStandardMaterial
                            color="#181818"
                        />

                    </mesh>

                </group>
            ))}

            {/* ==================================
                FRONT BUMPER
            ================================== */}

            <mesh
                position={[0, 0.40, -1.65]}
                castShadow
            >

                <boxGeometry
                    args={[1.95, 0.22, 0.25]}
                />

                <meshStandardMaterial
                    color="#252525"
                    metalness={0.4}
                />

            </mesh>

            {/* ==================================
                REAR BUMPER
            ================================== */}

            <mesh
                position={[0, 0.42, 1.58]}
                castShadow
            >

                <boxGeometry
                    args={[1.95, 0.25, 0.25]}
                />

                <meshStandardMaterial
                    color="#252525"
                />

            </mesh>

            {/* ==================================
                RACING SEAT BOTTOM
            ================================== */}

            <mesh
                position={[0, 0.93, 0.35]}
                castShadow
            >

                <boxGeometry
                    args={[0.78, 0.18, 0.85]}
                />

                <meshStandardMaterial
                    color="#20232a"
                />

            </mesh>

            {/* Racing seat back */}

            <mesh
                position={[0, 1.25, 0.75]}
                rotation={[0.12, 0, 0]}
                castShadow
            >

                <boxGeometry
                    args={[0.80, 0.78, 0.20]}
                />

                <meshStandardMaterial
                    color="#20232a"
                />

            </mesh>

            {/* ==================================
                STEERING COLUMN
            ================================== */}

            <mesh
                position={[0, 1.05, -0.65]}
                rotation={[-0.40, 0, 0]}
            >

                <cylinderGeometry
                    args={[0.045, 0.045, 0.55, 12]}
                />

                <meshStandardMaterial
                    color="#777777"
                    metalness={0.8}
                />

            </mesh>

            {/* ==================================
                STEERING WHEEL
            ================================== */}

            <group
                position={[0, 1.30, -0.55]}
                rotation={[Math.PI / 3, 0, 0]}
            >

                <mesh>

                    <torusGeometry
                        args={[0.26, 0.045, 12, 32]}
                    />

                    <meshStandardMaterial
                        color="#111111"
                    />

                </mesh>

                <mesh>

                    <boxGeometry
                        args={[0.48, 0.045, 0.045]}
                    />

                    <meshStandardMaterial
                        color="#555555"
                    />

                </mesh>

                <mesh>

                    <boxGeometry
                        args={[0.045, 0.48, 0.045]}
                    />

                    <meshStandardMaterial
                        color="#555555"
                    />

                </mesh>

            </group>

            {/* ==================================
                ENGINE
            ================================== */}

            <mesh
                position={[0, 0.90, 1.18]}
                castShadow
            >

                <boxGeometry
                    args={[0.85, 0.50, 0.65]}
                />

                <meshStandardMaterial
                    color="#45484e"
                    metalness={0.7}
                    roughness={0.35}
                />

            </mesh>

            {/* Engine cooling fins */}

            {Array.from({ length: 5 }, (_, i) => (

                <mesh
                    key={i}
                    position={[
                        0,
                        0.72 + i * 0.09,
                        1.18
                    ]}
                >

                    <boxGeometry
                        args={[0.95, 0.035, 0.72]}
                    />

                    <meshStandardMaterial
                        color="#777b82"
                        metalness={0.7}
                    />

                </mesh>

            ))}

            {/* ==================================
                EXHAUST PIPES
            ================================== */}

            {[-0.48, 0.48].map((x) => (

                <mesh
                    key={x}
                    position={[x, 0.85, 1.42]}
                    rotation={[Math.PI / 2, 0, 0]}
                >

                    <cylinderGeometry
                        args={[0.12, 0.12, 0.65, 16]}
                    />

                    <meshStandardMaterial
                        color="#a5a5a5"
                        metalness={0.9}
                        roughness={0.2}
                    />

                </mesh>

            ))}

            {/* ==================================
                FRONT HEADLIGHTS
            ================================== */}

            {[-0.48, 0.48].map((x) => (

                <mesh
                    key={x}
                    position={[x, 0.77, -1.58]}
                >

                    <boxGeometry
                        args={[0.28, 0.16, 0.06]}
                    />

                    <meshStandardMaterial
                        color="#ffffff"
                        emissive="#fff3cf"
                        emissiveIntensity={1.5}
                    />

                </mesh>

            ))}

            {/* ==================================
                REAR LIGHTS
            ================================== */}

            {[-0.65, 0.65].map((x) => (

                <mesh
                    key={x}
                    position={[x, 0.65, 1.72]}
                >

                    <boxGeometry
                        args={[0.25, 0.15, 0.05]}
                    />

                    <meshStandardMaterial
                        color="#ff0000"
                        emissive="#ff0000"
                        emissiveIntensity={1}
                    />

                </mesh>

            ))}

            {/* ==================================
                CARTOON RACING DRIVER
            ================================== */}

            <Driver
                helmetColor={helmetColor}
                suitColor={suitColor}
            />

            {/* ==================================
                FOUR KART WHEELS
            ================================== */}

            <Wheel
                position={[-1.05, 0.48, -0.98]}
            />

            <Wheel
                position={[1.05, 0.48, -0.98]}
            />

            <Wheel
                position={[-1.05, 0.48, 0.98]}
            />

            <Wheel
                position={[1.05, 0.48, 0.98]}
            />

            {/* ==================================
                ACTIVE WEAPON ATTACHMENT
            ================================== */}

            <group
                name="weaponMount"
                position={[0, 1.15, -1.35]}
            >

                {showWeapon && (

                    <EquippedWeapon
                        entity={entity}
                    />

                )}

            </group>

            {/* ==================================
                FIVE SECOND PROTECTION SHIELD
            ================================== */}

            {showShield && entity && (

                <SpawnShield
                    entity={entity}
                />

            )}

        </group>
    );
});

export default Kart;