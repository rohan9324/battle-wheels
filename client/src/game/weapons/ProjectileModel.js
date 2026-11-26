import { useRef } from "react";
import { useFrame } from "@react-three/fiber";

// ==========================================
// ANIMATED ROCKET EXHAUST
// ==========================================

function RocketFlame({
    large = false,
    color = "#ff6500",
    coreColor = "#ffff80",
}) {

    const flameRef = useRef();

    useFrame(({ clock }) => {

        if (!flameRef.current) return;

        const time = clock.elapsedTime;

        const scale = large ? 1.5 : 1;

        flameRef.current.scale.set(
            scale * (1 + Math.sin(time * 45) * 0.12),
            scale * (1 + Math.sin(time * 32) * 0.22),
            scale * (1 + Math.sin(time * 40) * 0.30)
        );
    });

    return (

        <group
            ref={flameRef}
            position={[0, 0, 0.65]}
            scale={large ? 1.5 : 1}
        >

            <mesh
                position={[0, 0, 0.35]}
                rotation={[Math.PI / 2, 0, 0]}
            >

                <coneGeometry
                    args={[0.19, 0.9, 12]}
                />

                <meshBasicMaterial
                    color={color}
                    toneMapped={false}
                />

            </mesh>

            <mesh
                position={[0, 0, 0.18]}
                rotation={[Math.PI / 2, 0, 0]}
            >

                <coneGeometry
                    args={[0.12, 0.55, 12]}
                />

                <meshBasicMaterial
                    color={coreColor}
                    toneMapped={false}
                />

            </mesh>

        </group>
    );
}

// ==========================================
// COMMON GLOWING SPHERE
// ==========================================

function GlowSphere({
    position = [0, 0, 0],
    radius = 0.25,
    color = "#ffffff",
    opacity = 1,
}) {

    return (

        <mesh position={position}>

            <sphereGeometry
                args={[radius, 16, 12]}
            />

            <meshBasicMaterial
                color={color}
                transparent={opacity < 1}
                opacity={opacity}
                depthWrite={opacity === 1}
                toneMapped={false}
            />

        </mesh>
    );
}

// ==========================================
// COMMON ENERGY RING
// ==========================================

function GlowRing({
    position = [0, 0, 0],
    rotation = [0, 0, 0],
    radius = 0.32,
    thickness = 0.045,
    color = "#00ddff",
}) {

    return (

        <mesh
            position={position}
            rotation={rotation}
        >

            <torusGeometry
                args={[radius, thickness, 8, 24]}
            />

            <meshBasicMaterial
                color={color}
                toneMapped={false}
            />

        </mesh>
    );
}

// ==========================================
// 1. ROCKET AND MEGA NUKE
// ==========================================

function Rocket({
    large = false,
    bodyColor,
    accentColor,
    flameColor = "#ff6500",
    flameCoreColor = "#ffff80",
}) {

    const radius = large ? 0.36 : 0.19;

    const length = large ? 1.6 : 1.1;

    const finOffset = large ? 0.09 : 0.02;

    const finWidth = large ? 0.07 : 0.055;

    const finHeight = large ? 0.25 : 0.14;

    const finLength = large ? 0.35 : 0.30;

    return (

        <group>

            {/* Main rocket body */}

            <mesh rotation={[Math.PI / 2, 0, 0]}>

                <cylinderGeometry
                    args={[
                        radius,
                        radius,
                        length,
                        16
                    ]}
                />

                <meshStandardMaterial
                    color={
                        bodyColor ||
                        (large ? "#77b83c" : "#f5f5f5")
                    }
                    metalness={0.2}
                    roughness={0.35}
                />

            </mesh>

            {/* Front rocket nose */}

            <mesh
                position={[
                    0,
                    0,
                    -length / 2 - 0.18
                ]}
                rotation={[-Math.PI / 2, 0, 0]}
            >

                <coneGeometry
                    args={[radius, 0.36, 16]}
                />

                <meshStandardMaterial
                    color={accentColor || "#f04432"}
                />

            </mesh>

            {/* Colored body rings */}

            {[-0.3, 0.3].map((z) => (

                <mesh
                    key={z}
                    position={[0, 0, z]}
                    rotation={[Math.PI / 2, 0, 0]}
                >

                    <cylinderGeometry
                        args={[
                            radius + 0.015,
                            radius + 0.015,
                            0.12,
                            16
                        ]}
                    />

                    <meshStandardMaterial
                        color={
                            accentColor ||
                            (large ? "#e6d83b" : "#ed4938")
                        }
                    />

                </mesh>

            ))}

            {/* Compact rocket tail fins */}

            {[0, 1, 2, 3].map((index) => (

                <group
                    key={index}
                    rotation={[
                        0,
                        0,
                        index * Math.PI / 2
                    ]}
                >

                    <mesh
                        position={[
                            0,
                            radius + finOffset,
                            length / 2 - 0.15
                        ]}
                    >

                        <boxGeometry
                            args={[
                                finWidth,
                                finHeight,
                                finLength
                            ]}
                        />

                        <meshStandardMaterial
                            color={
                                accentColor ||
                                (large ? "#dfcc35" : "#ff5438")
                            }
                        />

                    </mesh>

                </group>

            ))}

            {/* Rocket exhaust flame */}

            <group
                position={[
                    0,
                    0,
                    length / 2 - 0.65
                ]}
            >

                <RocketFlame
                    large={large}
                    color={flameColor}
                    coreColor={flameCoreColor}
                />

            </group>

        </group>
    );
}

// ==========================================
// 3. MACHINE GUN BULLET
// ==========================================

function Bullet() {

    return (

        <group>

            <mesh rotation={[Math.PI / 2, 0, 0]}>

                <capsuleGeometry
                    args={[0.085, 0.65, 4, 8]}
                />

                <meshBasicMaterial
                    color="#fff5aa"
                    toneMapped={false}
                />

            </mesh>

            <mesh position={[0, 0, 1.1]}>

                <boxGeometry
                    args={[0.055, 0.055, 2.2]}
                />

                <meshBasicMaterial
                    color="#ffb000"
                    transparent
                    opacity={0.8}
                    depthWrite={false}
                    toneMapped={false}
                />

            </mesh>

        </group>
    );
}

// ==========================================
// 4. PLASMA PROJECTILE
// ==========================================

function Plasma() {

    const ringRef = useRef();

    useFrame((_, delta) => {

        if (ringRef.current) {

            ringRef.current.rotation.z += delta * 15;
        }
    });

    return (

        <group>

            <mesh>

                <sphereGeometry
                    args={[0.25, 16, 16]}
                />

                <meshBasicMaterial
                    color="#d9ffff"
                    toneMapped={false}
                />

            </mesh>

            <mesh ref={ringRef}>

                <torusGeometry
                    args={[0.32, 0.07, 8, 24]}
                />

                <meshBasicMaterial
                    color="#00ddff"
                    toneMapped={false}
                />

            </mesh>

            <mesh position={[0, 0, 0.6]}>

                <sphereGeometry
                    args={[0.18, 12, 12]}
                />

                <meshBasicMaterial
                    color="#00aaff"
                    transparent
                    opacity={0.5}
                    depthWrite={false}
                />

            </mesh>

        </group>
    );
}

// ==========================================
// 5. CANNONBALL PROJECTILE
// ==========================================

function Cannonball() {

    return (

        <mesh>

            <sphereGeometry
                args={[0.25, 20, 20]}
            />

            <meshStandardMaterial
                color="#282d36"
                metalness={0.6}
                roughness={0.3}
            />

        </mesh>
    );
}

// ==========================================
// 6. SNOWBALL PROJECTILE
// ==========================================

function Snowball() {

    return (

        <mesh>

            <sphereGeometry
                args={[0.4, 20, 20]}
            />

            <meshStandardMaterial
                color="#effaff"
                roughness={0.85}
            />

        </mesh>
    );
}

// ==========================================
// 7. GRENADE PROJECTILE
// ==========================================

function Grenade() {

    return (

        <group>

            <mesh>

                <sphereGeometry
                    args={[0.32, 12, 12]}
                />

                <meshStandardMaterial
                    color="#496c32"
                />

            </mesh>

            <mesh position={[0, 0.32, 0]}>

                <boxGeometry
                    args={[0.18, 0.15, 0.18]}
                />

                <meshStandardMaterial
                    color="#343b36"
                />

            </mesh>

        </group>
    );
}

// ==========================================
// 8. SHOTGUN PELLET
// ==========================================

function ShotgunPellet() {

    return (

        <group>

            {/* Small golden pellet */}

            <GlowSphere
                radius={0.11}
                color="#fff1b0"
            />

            {/* Short bullet tracer */}

            <mesh position={[0, 0, 0.45]}>

                <boxGeometry
                    args={[0.055, 0.055, 0.9]}
                />

                <meshBasicMaterial
                    color="#e7b45b"
                    transparent
                    opacity={0.75}
                    depthWrite={false}
                    toneMapped={false}
                />

            </mesh>

        </group>
    );
}

// ==========================================
// 9. MINI GUN BULLET
// ==========================================

function MiniGunBullet() {

    return (

        <group>

            <mesh rotation={[Math.PI / 2, 0, 0]}>

                <capsuleGeometry
                    args={[0.07, 0.48, 4, 8]}
                />

                <meshBasicMaterial
                    color="#fff8c4"
                    toneMapped={false}
                />

            </mesh>

            {/* Fast orange tracer */}

            <mesh position={[0, 0, 0.85]}>

                <boxGeometry
                    args={[0.04, 0.04, 1.7]}
                />

                <meshBasicMaterial
                    color="#ff9d00"
                    transparent
                    opacity={0.85}
                    depthWrite={false}
                    toneMapped={false}
                />

            </mesh>

        </group>
    );
}

// ==========================================
// 10. LASER PROJECTILE
// ==========================================

function LaserProjectile() {

    return (

        <group>

            {/* Bright central laser beam */}

            <mesh position={[0, 0, 0.65]}>

                <boxGeometry
                    args={[0.09, 0.09, 2.5]}
                />

                <meshBasicMaterial
                    color="#fff0f0"
                    toneMapped={false}
                />

            </mesh>

            {/* Red outer laser glow */}

            <mesh position={[0, 0, 0.65]}>

                <boxGeometry
                    args={[0.19, 0.19, 2.65]}
                />

                <meshBasicMaterial
                    color="#ff284a"
                    transparent
                    opacity={0.55}
                    depthWrite={false}
                    toneMapped={false}
                />

            </mesh>

            {/* Laser front energy */}

            <GlowSphere
                position={[0, 0, -0.65]}
                radius={0.12}
                color="#ff5266"
            />

        </group>
    );
}

// ==========================================
// 11. HOMING MISSILE
// ==========================================

function HomingMissile() {

    return (

        <group>

            <Rocket
                bodyColor="#526e9b"
                accentColor="#458cff"
                flameColor="#258dff"
                flameCoreColor="#c8f5ff"
            />

            {/* Missile tracking sensor */}

            <GlowSphere
                position={[0, 0, -0.94]}
                radius={0.075}
                color="#ff3030"
            />

            {/* Tracking ring */}

            <GlowRing
                position={[0, 0, -0.25]}
                radius={0.21}
                thickness={0.025}
                color="#458cff"
            />

        </group>
    );
}

// ==========================================
// 12. FIREBALL PROJECTILE
// ==========================================

function FireballProjectile() {

    const flameRef = useRef();

    useFrame(({ clock }, delta) => {

        if (!flameRef.current) return;

        const time = clock.elapsedTime;

        flameRef.current.rotation.z += delta * 9;

        const pulse =

            1 + Math.sin(time * 22) * 0.12;

        flameRef.current.scale.setScalar(pulse);
    });

    return (

        <group>

            {/* Main burning fireball */}

            <GlowSphere
                radius={0.30}
                color="#ff4815"
            />

            <GlowSphere
                position={[0, 0, -0.20]}
                radius={0.19}
                color="#fff09a"
            />

            {/* Animated fire particles */}

            <group ref={flameRef}>

                {[0, 1, 2, 3, 4, 5].map((i) => {

                    const angle = i * Math.PI / 3;

                    return (

                        <GlowSphere

                            key={i}

                            position={[
                                Math.cos(angle) * 0.27,
                                Math.sin(angle) * 0.27,
                                0.16
                            ]}

                            radius={0.13}

                            color={
                                i % 2 === 0
                                    ? "#ff8c00"
                                    : "#ff3900"
                            }

                            opacity={0.8}

                        />
                    );
                })}

            </group>

            {/* Fireball tail */}

            {[0, 1, 2, 3].map((i) => (

                <GlowSphere
                    key={i}
                    position={[
                        0,
                        0,
                        0.35 + i * 0.22
                    ]}
                    radius={0.22 - i * 0.04}
                    color="#ff6500"
                    opacity={0.75 - i * 0.15}
                />

            ))}

        </group>
    );
}

// ==========================================
// 13. ICE ROCKET PROJECTILE
// ==========================================

function IceRocketProjectile() {

    const iceRef = useRef();

    useFrame((_, delta) => {

        if (iceRef.current) {

            iceRef.current.rotation.z += delta * 5;
        }
    });

    return (

        <group>

            <Rocket
                bodyColor="#a9e5ff"
                accentColor="#49bfff"
                flameColor="#75dfff"
                flameCoreColor="#ffffff"
            />

            {/* Rotating ice crystals */}

            <group ref={iceRef}>

                {[0, 1, 2, 3].map((i) => {

                    const angle = i * Math.PI / 2;

                    return (

                        <mesh

                            key={i}

                            position={[
                                Math.cos(angle) * 0.24,
                                Math.sin(angle) * 0.24,
                                0.05
                            ]}

                            rotation={[
                                Math.PI / 2,
                                0,
                                angle
                            ]}

                        >

                            <octahedronGeometry
                                args={[0.16, 0]}
                            />

                            <meshStandardMaterial
                                color="#b8f1ff"
                                emissive="#49bbff"
                                emissiveIntensity={1.5}
                                transparent
                                opacity={0.85}
                                roughness={0.1}
                                depthWrite={false}
                            />

                        </mesh>
                    );
                })}

            </group>

            <GlowRing
                radius={0.25}
                thickness={0.035}
                color="#7bddff"
            />

        </group>
    );
}

// ==========================================
// 14. ELECTRIC PROJECTILE
// ==========================================

function ElectricProjectile() {

    const electricRef = useRef();

    useFrame((_, delta) => {

        if (!electricRef.current) return;

        electricRef.current.rotation.x += delta * 8;

        electricRef.current.rotation.z += delta * 12;
    });

    return (

        <group>

            {/* Electric energy core */}

            <GlowSphere
                radius={0.22}
                color="#f3d8ff"
            />

            <GlowSphere
                radius={0.32}
                color="#be65ff"
                opacity={0.35}
            />

            {/* Rotating electric rings */}

            <group ref={electricRef}>

                <GlowRing
                    radius={0.34}
                    thickness={0.04}
                    color="#be65ff"
                />

                <GlowRing
                    radius={0.34}
                    thickness={0.035}
                    color="#d6a1ff"
                    rotation={[Math.PI / 2, 0, 0]}
                />

                <GlowRing
                    radius={0.34}
                    thickness={0.035}
                    color="#8d36ff"
                    rotation={[0, Math.PI / 2, 0]}
                />

                {/* Electric sparks */}

                {[0, 1, 2, 3, 4, 5].map((i) => {

                    const angle = i * Math.PI / 3;

                    return (

                        <GlowSphere

                            key={i}

                            position={[
                                Math.cos(angle) * 0.37,
                                Math.sin(angle) * 0.37,
                                0
                            ]}

                            radius={0.055}

                            color="#ffffff"

                        />
                    );
                })}

            </group>

            {/* Electric tail */}

            <GlowSphere
                position={[0, 0, 0.55]}
                radius={0.14}
                color="#be65ff"
                opacity={0.5}
            />

        </group>
    );
}

// ==========================================
// 15. EMP PROJECTILE
// ==========================================

function EMPProjectile() {

    const ringRef = useRef();

    useFrame(({ clock }, delta) => {

        if (!ringRef.current) return;

        ringRef.current.rotation.y += delta * 8;

        ringRef.current.rotation.z += delta * 5;

        const pulse =

            1 + Math.sin(
                clock.elapsedTime * 12
            ) * 0.12;

        ringRef.current.scale.setScalar(pulse);
    });

    return (

        <group>

            {/* Blue electromagnetic core */}

            <GlowSphere
                radius={0.23}
                color="#b4c7ff"
            />

            <GlowSphere
                radius={0.35}
                color="#354bff"
                opacity={0.25}
            />

            {/* Electromagnetic rings */}

            <group ref={ringRef}>

                <GlowRing
                    radius={0.38}
                    thickness={0.045}
                    color="#354bff"
                />

                <GlowRing
                    radius={0.38}
                    thickness={0.04}
                    color="#6d8bff"
                    rotation={[Math.PI / 2, 0, 0]}
                />

                <GlowRing
                    radius={0.38}
                    thickness={0.04}
                    color="#8ebaff"
                    rotation={[0, Math.PI / 2, 0]}
                />

            </group>

            <GlowSphere
                position={[0, 0, 0.55]}
                radius={0.15}
                color="#354bff"
                opacity={0.6}
            />

        </group>
    );
}

// ==========================================
// 16. POISON BOMB PROJECTILE
// ==========================================

function PoisonBombProjectile() {

    const bombRef = useRef();

    useFrame((_, delta) => {

        if (!bombRef.current) return;

        bombRef.current.rotation.x += delta * 3;

        bombRef.current.rotation.z += delta * 2;
    });

    return (

        <group>

            <group ref={bombRef}>

                {/* Poison bomb outer body */}

                <mesh>

                    <sphereGeometry
                        args={[0.33, 16, 12]}
                    />

                    <meshStandardMaterial
                        color="#405c29"
                        metalness={0.45}
                        roughness={0.35}
                    />

                </mesh>

                {/* Glowing poison center */}

                <GlowSphere
                    radius={0.35}
                    color="#64e831"
                    opacity={0.28}
                />

                {/* Poison storage rings */}

                <GlowRing
                    radius={0.34}
                    thickness={0.045}
                    color="#64e831"
                />

                <GlowRing
                    radius={0.34}
                    thickness={0.045}
                    color="#a1ff46"
                    rotation={[Math.PI / 2, 0, 0]}
                />

                {/* Bomb cap */}

                <mesh position={[0, 0.35, 0]}>

                    <cylinderGeometry
                        args={[0.12, 0.16, 0.16, 8]}
                    />

                    <meshStandardMaterial
                        color="#29352a"
                        metalness={0.5}
                    />

                </mesh>

                <GlowSphere
                    position={[0, 0.46, 0]}
                    radius={0.075}
                    color="#a1ff46"
                />

            </group>

            {/* Poison particles */}

            {[0, 1, 2, 3].map((i) => (

                <GlowSphere

                    key={i}

                    position={[
                        Math.sin(i * 2) * 0.12,
                        Math.cos(i * 2) * 0.12,
                        0.35 + i * 0.20
                    ]}

                    radius={0.15 - i * 0.025}

                    color="#64e831"

                    opacity={0.6 - i * 0.12}

                />

            ))}

        </group>
    );
}

// ==========================================
// PROJECTILE MODEL REGISTRY
// ==========================================

const PROJECTILE_MODELS = {

    // Existing projectile models

    rocket: Rocket,

    bullet: Bullet,

    plasma: Plasma,

    cannonball: Cannonball,

    snowball: Snowball,

    grenade: Grenade,

    // New projectile models

    pellet: ShotgunPellet,

    minigun_bullet: MiniGunBullet,

    laser: LaserProjectile,

    homing: HomingMissile,

    fireball: FireballProjectile,

    ice_rocket: IceRocketProjectile,

    electric: ElectricProjectile,

    emp: EMPProjectile,

    poison: PoisonBombProjectile,

};

// ==========================================
// MAIN PROJECTILE MODEL
// ==========================================

export default function ProjectileModel({ type }) {

    // Mega Nuke uses the larger rocket model.

    if (type === "nuke") {

        return <Rocket large />;
    }

    const Model = PROJECTILE_MODELS[type];

    if (!Model) {

        return null;
    }

    return <Model />;
}