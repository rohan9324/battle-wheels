import { useRef } from "react";

import { useFrame } from "@react-three/fiber";

// ==========================================
// COMMON LAUNCHER MODEL
// ==========================================

function Launcher({
    position = [0, 0, 0],
    radius = 0.30,
    length = 1.65,
    color = "#258dff",
}) {

    return (

        <group position={position}>

            {/* Main launcher body */}

            <mesh
                rotation={[Math.PI / 2, 0, 0]}
                castShadow
            >

                <cylinderGeometry
                    args={[
                        radius,
                        radius * 1.15,
                        length,
                        8
                    ]}
                />

                <meshStandardMaterial
                    color={color}
                    metalness={0.35}
                    roughness={0.3}
                />

            </mesh>

            {/* Front rim */}

            <mesh
                position={[0, 0, -length / 2]}
                rotation={[0, Math.PI, 0]}
            >

                <torusGeometry
                    args={[
                        radius * 0.8,
                        radius * 0.2,
                        8,
                        8
                    ]}
                />

                <meshStandardMaterial
                    color="#26354b"
                />

            </mesh>

            {/* Dark barrel opening */}

            <mesh
                position={[
                    0,
                    0,
                    -length / 2 - 0.01
                ]}
                rotation={[0, Math.PI, 0]}
            >

                <circleGeometry
                    args={[radius * 0.72, 16]}
                />

                <meshBasicMaterial
                    color="#111827"
                />

            </mesh>

            {/* Rear metal ring */}

            <mesh
                position={[
                    0,
                    0,
                    length * 0.35
                ]}
                rotation={[Math.PI / 2, 0, 0]}
            >

                <cylinderGeometry
                    args={[
                        radius * 1.08,
                        radius * 1.08,
                        0.15,
                        12,
                    ]}
                />

                <meshStandardMaterial
                    color="#344454"
                />

            </mesh>

        </group>
    );
}

// ==========================================
// COMMON METAL BOX
// ==========================================

function MetalBox({
    position = [0, 0, 0],
    size = [1, 1, 1],
    color = "#303744",
    rotation = [0, 0, 0],
}) {

    return (

        <mesh
            position={position}
            rotation={rotation}
            castShadow
        >

            <boxGeometry args={size} />

            <meshStandardMaterial
                color={color}
                metalness={0.55}
                roughness={0.35}
            />

        </mesh>
    );
}

// ==========================================
// GLOWING ENERGY SPHERE
// ==========================================

function EnergyCore({
    position = [0, 0, 0],
    radius = 0.2,
    color = "#00ddff",
    intensity = 3,
}) {

    return (

        <mesh position={position}>

            <sphereGeometry
                args={[radius, 16, 12]}
            />

            <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={intensity}
                roughness={0.2}
            />

        </mesh>
    );
}

// ==========================================
// GLOWING ENERGY RING
// ==========================================

function EnergyRing({
    position = [0, 0, 0],
    radius = 0.4,
    thickness = 0.045,
    color = "#00ddff",
    rotation = [0, 0, 0],
}) {

    return (

        <mesh
            position={position}
            rotation={rotation}
        >

            <torusGeometry
                args={[
                    radius,
                    thickness,
                    8,
                    24
                ]}
            />

            <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={3}
                metalness={0.3}
                roughness={0.2}
            />

        </mesh>
    );
}

// ==========================================
// GLOWING ENERGY STRIP
// ==========================================

function EnergyStrip({
    position = [0, 0, 0],
    size = [0.1, 0.1, 1],
    color = "#00ddff",
}) {

    return (

        <mesh position={position}>

            <boxGeometry args={size} />

            <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={3}
            />

        </mesh>
    );
}

// ==========================================
// 1. TRIPLE ROCKET
// ==========================================

function TripleRocketModel() {

    return (

        <group>

            <Launcher
                position={[-0.65, 0.12, -0.15]}
                radius={0.30}
                length={1.75}
                color="#258dff"
            />

            <Launcher
                position={[0, 0.48, -0.30]}
                radius={0.32}
                length={1.9}
                color="#258dff"
            />

            <Launcher
                position={[0.65, 0.12, -0.15]}
                radius={0.30}
                length={1.75}
                color="#258dff"
            />

        </group>
    );
}

// ==========================================
// 2. MEGA NUKE
// ==========================================

function MegaNukeModel() {

    return (

        <group>

            <Launcher
                position={[0, 0.25, -0.30]}
                radius={0.48}
                length={2.1}
                color="#69a83c"
            />

            <mesh
                position={[0, 0.25, -0.60]}
                rotation={[Math.PI / 2, 0, 0]}
            >

                <cylinderGeometry
                    args={[0.51, 0.51, 0.18, 12]}
                />

                <meshStandardMaterial
                    color="#d9e84b"
                />

            </mesh>

        </group>
    );
}

// ==========================================
// 3. CANNON
// ==========================================

function CannonModel() {

    return (

        <Launcher
            position={[0, 0.28, -0.25]}
            radius={0.45}
            length={1.9}
            color="#383d48"
        />

    );
}

// ==========================================
// 4. MACHINE GUN
// ==========================================

function MachineGunModel() {

    return (

        <group>

            <mesh position={[0, 0.15, 0.10]}>

                <boxGeometry
                    args={[0.8, 0.65, 0.95]}
                />

                <meshStandardMaterial
                    color="#eab83c"
                />

            </mesh>

            {[0, 1, 2, 3, 4, 5].map((i) => (

                <Launcher

                    key={i}

                    position={[

                        Math.cos(
                            i * Math.PI / 3
                        ) * 0.22,

                        0.2 + Math.sin(
                            i * Math.PI / 3
                        ) * 0.22,

                        -0.65,

                    ]}

                    radius={0.085}

                    length={1.5}

                    color="#515b69"

                />

            ))}

        </group>
    );
}

// ==========================================
// 5. PLASMA BLASTER
// ==========================================

function PlasmaBlasterModel() {

    return (

        <group>

            <Launcher
                position={[0, 0.2, -0.25]}
                radius={0.35}
                length={1.75}
                color="#274761"
            />

            {[-0.35, 0.35].map((x) => (

                <mesh
                    key={x}
                    position={[x, 0.2, -0.25]}
                >

                    <boxGeometry
                        args={[0.12, 0.2, 1.35]}
                    />

                    <meshStandardMaterial
                        color="#00ddff"
                        emissive="#00ddff"
                        emissiveIntensity={3}
                    />

                </mesh>

            ))}

        </group>
    );
}

// ==========================================
// 6. SNOWBALL LAUNCHER
// ==========================================

function SnowballLauncherModel() {

    return (

        <Launcher
            position={[0, 0.25, -0.25]}
            radius={0.40}
            length={1.7}
            color="#b5e8ff"
        />

    );
}

// ==========================================
// 7. GRENADE LAUNCHER
// ==========================================

function GrenadeLauncherModel() {

    return (

        <group>

            <Launcher
                position={[0, 0.2, -0.25]}
                radius={0.35}
                length={1.7}
                color="#497c39"
            />

            <mesh
                position={[0, -0.05, 0.20]}
                rotation={[0, 0, Math.PI / 2]}
            >

                <cylinderGeometry
                    args={[0.35, 0.35, 0.8, 12]}
                />

                <meshStandardMaterial
                    color="#284036"
                />

            </mesh>

        </group>
    );
}

// ==========================================
// 8. SHOTGUN
// ==========================================

function ShotgunModel() {

    return (

        <group>

            {/* Main weapon body */}

            <MetalBox
                position={[0, 0.18, 0.25]}
                size={[0.85, 0.55, 0.95]}
                color="#9b6337"
            />

            {/* Left barrel */}

            <Launcher
                position={[-0.23, 0.25, -0.45]}
                radius={0.19}
                length={1.65}
                color="#4b515c"
            />

            {/* Right barrel */}

            <Launcher
                position={[0.23, 0.25, -0.45]}
                radius={0.19}
                length={1.65}
                color="#4b515c"
            />

            {/* Barrel connector */}

            <MetalBox
                position={[0, 0.25, -0.85]}
                size={[0.85, 0.22, 0.18]}
                color="#e7b45b"
            />

            {/* Top sight */}

            <MetalBox
                position={[0, 0.52, -0.65]}
                size={[0.10, 0.12, 0.45]}
                color="#222831"
            />

        </group>
    );
}

// ==========================================
// 9. MINI GUN
// ==========================================

function MiniGunModel() {

    const barrelsRef = useRef();

    useFrame((_, delta) => {

        if (!barrelsRef.current) return;

        barrelsRef.current.rotation.z +=

            Math.min(delta, 0.05) * 8;

    });

    return (

        <group>

            {/* Heavy main body */}

            <MetalBox
                position={[0, 0.25, 0.35]}
                size={[0.95, 0.75, 0.95]}
                color="#b47a19"
            />

            {/* Rear motor */}

            <mesh
                position={[0, 0.25, 0.8]}
                rotation={[Math.PI / 2, 0, 0]}
            >

                <cylinderGeometry
                    args={[0.4, 0.4, 0.35, 16]}
                />

                <meshStandardMaterial
                    color="#343b45"
                    metalness={0.7}
                    roughness={0.25}
                />

            </mesh>

            {/* Rotating barrel assembly */}

            <group
                ref={barrelsRef}
                position={[0, 0.25, -0.45]}
            >

                {[0, 1, 2, 3, 4, 5].map((i) => {

                    const angle =

                        i * Math.PI / 3;

                    return (

                        <Launcher

                            key={i}

                            position={[

                                Math.cos(angle) * 0.29,

                                Math.sin(angle) * 0.29,

                                0,

                            ]}

                            radius={0.105}

                            length={1.6}

                            color="#59616d"

                        />
                    );
                })}

                <mesh
                    position={[0, 0, -0.55]}
                    rotation={[Math.PI / 2, 0, 0]}
                >

                    <cylinderGeometry
                        args={[0.42, 0.42, 0.13, 16]}
                    />

                    <meshStandardMaterial
                        color="#272d35"
                        metalness={0.6}
                    />

                </mesh>

                <EnergyCore
                    position={[0, 0, -0.67]}
                    radius={0.1}
                    color="#ffba25"
                />

            </group>

            {/* Side ammo containers */}

            {[-0.55, 0.55].map((x) => (

                <MetalBox

                    key={x}

                    position={[x, 0.05, 0.25]}

                    size={[0.28, 0.48, 0.75]}

                    color="#515744"

                />

            ))}

        </group>
    );
}

// ==========================================
// 10. LASER BLASTER
// ==========================================

function LaserBlasterModel() {

    return (

        <group>

            <MetalBox
                position={[0, 0.25, 0.05]}
                size={[0.85, 0.60, 1.35]}
                color="#242832"
            />

            <Launcher
                position={[0, 0.25, -0.55]}
                radius={0.28}
                length={1.45}
                color="#424957"
            />

            {/* Glowing side rails */}

            {[-0.42, 0.42].map((x) => (

                <EnergyStrip

                    key={x}

                    position={[x, 0.28, -0.15]}

                    size={[0.08, 0.15, 1.45]}

                    color="#ff284a"

                />

            ))}

            {/* Front laser lens */}

            <EnergyCore
                position={[0, 0.25, -1.28]}
                radius={0.18}
                color="#ff284a"
                intensity={5}
            />

            <EnergyRing
                position={[0, 0.25, -1.23]}
                radius={0.30}
                color="#ff284a"
            />

            <EnergyStrip
                position={[0, 0.57, 0.1]}
                size={[0.18, 0.06, 0.85]}
                color="#ff284a"
            />

        </group>
    );
}

// ==========================================
// 11. HOMING MISSILE
// ==========================================

function HomingMissileModel() {

    return (

        <group>

            <Launcher
                position={[0, 0.30, -0.15]}
                radius={0.42}
                length={1.95}
                color="#344e78"
            />

            {/* Missile nose */}

            <mesh
                position={[0, 0.30, -1.28]}
                rotation={[-Math.PI / 2, 0, 0]}
                castShadow
            >

                <coneGeometry
                    args={[0.28, 0.55, 12]}
                />

                <meshStandardMaterial
                    color="#458cff"
                    metalness={0.55}
                    roughness={0.25}
                />

            </mesh>

            {/* Tracking sensor */}

            <EnergyCore
                position={[0, 0.76, 0.20]}
                radius={0.16}
                color="#ff3838"
            />

            <EnergyRing
                position={[0, 0.30, -0.85]}
                radius={0.43}
                color="#458cff"
            />

            {/* Side stabilizers */}

            {[-0.48, 0.48].map((x) => (

                <MetalBox

                    key={x}

                    position={[x, 0.25, 0.45]}

                    size={[0.18, 0.65, 0.60]}

                    color="#596b86"

                />

            ))}

        </group>
    );
}

// ==========================================
// 12. FIREBALL LAUNCHER
// ==========================================

function FireballLauncherModel() {

    const coreRef = useRef();

    useFrame(({ clock }) => {

        if (!coreRef.current) return;

        const pulse =

            1 + Math.sin(
                clock.elapsedTime * 7
            ) * 0.12;

        coreRef.current.scale.setScalar(pulse);

    });

    return (

        <group>

            <Launcher
                position={[0, 0.25, -0.25]}
                radius={0.43}
                length={1.8}
                color="#4c2921"
            />

            {[-0.7, -0.25, 0.2].map((z) => (

                <EnergyRing

                    key={z}

                    position={[0, 0.25, z]}

                    radius={0.45}

                    color="#ff581c"

                />

            ))}

            {/* Burning energy core */}

            <group
                ref={coreRef}
                position={[0, 0.25, -1.18]}
            >

                <EnergyCore
                    radius={0.23}
                    color="#ff4815"
                    intensity={4}
                />

                <EnergyCore
                    radius={0.12}
                    color="#ffdc54"
                    intensity={6}
                />

            </group>

            {/* Side heat shields */}

            {[-0.48, 0.48].map((x) => (

                <MetalBox

                    key={x}

                    position={[x, 0.25, 0.15]}

                    size={[0.16, 0.55, 0.85]}

                    color="#6c3020"

                />

            ))}

        </group>
    );
}

// ==========================================
// 13. ICE ROCKET
// ==========================================

function IceRocketModel() {

    return (

        <group>

            {[-0.5, 0.5].map((x) => (

                <group
                    key={x}
                    position={[x, 0.22, -0.15]}
                >

                    <Launcher
                        radius={0.30}
                        length={1.8}
                        color="#75b9d9"
                    />

                    <EnergyRing
                        position={[0, 0, -0.75]}
                        radius={0.32}
                        color="#7bddff"
                    />

                    <EnergyStrip
                        position={[0, 0.31, 0]}
                        size={[0.13, 0.08, 1.2]}
                        color="#c8f5ff"
                    />

                </group>

            ))}

            {/* Ice crystal */}

            <mesh
                position={[0, 0.55, 0.1]}
                rotation={[0, Math.PI / 4, 0]}
            >

                <octahedronGeometry
                    args={[0.36, 0]}
                />

                <meshStandardMaterial
                    color="#a9eaff"
                    emissive="#49bbff"
                    emissiveIntensity={1.2}
                    transparent
                    opacity={0.85}
                    roughness={0.1}
                    metalness={0.2}
                />

            </mesh>

        </group>
    );
}

// ==========================================
// 14. ELECTRIC BLASTER
// ==========================================

function ElectricBlasterModel() {

    const coreRef = useRef();

    useFrame((_, delta) => {

        if (!coreRef.current) return;

        coreRef.current.rotation.z +=

            Math.min(delta, 0.05) * 3;

    });

    return (

        <group>

            <MetalBox
                position={[0, 0.2, 0.15]}
                size={[0.85, 0.6, 0.9]}
                color="#38264e"
            />

            <Launcher
                position={[0, 0.25, -0.35]}
                radius={0.23}
                length={1.55}
                color="#5a4774"
            />

            {/* Electric coils */}

            {[-0.85, -0.5, -0.15, 0.2].map((z) => (

                <EnergyRing

                    key={z}

                    position={[0, 0.25, z]}

                    radius={0.38}

                    thickness={0.06}

                    color="#be65ff"

                />

            ))}

            <group
                ref={coreRef}
                position={[0, 0.25, -1.2]}
            >

                <EnergyCore
                    radius={0.18}
                    color="#be65ff"
                    intensity={4}
                />

                <EnergyRing
                    radius={0.29}
                    color="#d6a1ff"
                />

                <EnergyRing
                    radius={0.29}
                    color="#be65ff"
                    rotation={[0, Math.PI / 2, 0]}
                />

            </group>

        </group>
    );
}

// ==========================================
// COMMON LAND MINE MODEL
// ==========================================

function MineModel({
    position = [0, 0, 0],
}) {

    return (

        <group position={position}>

            <mesh castShadow>

                <cylinderGeometry
                    args={[0.36, 0.42, 0.20, 16]}
                />

                <meshStandardMaterial
                    color="#52663d"
                    metalness={0.45}
                    roughness={0.5}
                />

            </mesh>

            <mesh position={[0, 0.14, 0]}>

                <cylinderGeometry
                    args={[0.18, 0.23, 0.10, 12]}
                />

                <meshStandardMaterial
                    color="#30382c"
                />

            </mesh>

            <EnergyCore
                position={[0, 0.22, 0]}
                radius={0.075}
                color="#ff3030"
                intensity={3}
            />

            <EnergyRing
                position={[0, 0.11, 0]}
                radius={0.27}
                thickness={0.025}
                color="#e3b934"
                rotation={[Math.PI / 2, 0, 0]}
            />

        </group>
    );
}

// ==========================================
// 15. LAND MINES DEPLOYER
// ==========================================

function LandMinesModel() {

    return (

        <group>

            {/* Deployment platform */}

            <MetalBox
                position={[0, 0.05, 0]}
                size={[1.15, 0.25, 1.1]}
                color="#424e39"
            />

            {/* Stored mines */}

            <MineModel
                position={[-0.40, 0.28, 0.1]}
            />

            <MineModel
                position={[0.40, 0.28, 0.1]}
            />

            <MineModel
                position={[0, 0.53, 0.1]}
            />

            {/* Deployment rails */}

            {[-0.6, 0.6].map((x) => (

                <MetalBox

                    key={x}

                    position={[x, 0.12, 0]}

                    size={[0.12, 0.35, 1.2]}

                    color="#747d67"

                />

            ))}

        </group>
    );
}

// ==========================================
// 16. FAKE MYSTERY BOX
// ==========================================

function FakeMysteryBoxModel() {

    const boxRef = useRef();

    useFrame(({ clock }, delta) => {

        if (!boxRef.current) return;

        boxRef.current.rotation.y +=

            Math.min(delta, 0.05) * 0.8;

        boxRef.current.position.y =

            0.42 +

            Math.sin(
                clock.elapsedTime * 3
            ) * 0.08;

    });

    return (

        <group>

            <MetalBox
                position={[0, 0.02, 0]}
                size={[1.05, 0.22, 1.05]}
                color="#42304e"
            />

            <group
                ref={boxRef}
                position={[0, 0.42, 0]}
            >

                <mesh castShadow>

                    <boxGeometry
                        args={[0.72, 0.72, 0.72]}
                    />

                    <meshStandardMaterial
                        color="#7230b5"
                        emissive="#6821ae"
                        emissiveIntensity={0.8}
                        metalness={0.25}
                        roughness={0.3}
                    />

                </mesh>

                {/* Glowing cross symbols */}

                {[0, Math.PI / 2, Math.PI, -Math.PI / 2]
                    .map((rotation, index) => (

                        <group

                            key={index}

                            rotation={[0, rotation, 0]}

                        >

                            <EnergyStrip
                                position={[0, 0, 0.37]}
                                size={[0.12, 0.42, 0.025]}
                                color="#e6b3ff"
                            />

                            <EnergyStrip
                                position={[0, 0, 0.37]}
                                size={[0.42, 0.12, 0.025]}
                                color="#e6b3ff"
                            />

                        </group>

                    ))}

                {/* Box corner protection */}

                {[-1, 1].map((x) =>

                    [-1, 1].map((y) =>

                        [-1, 1].map((z) => (

                            <MetalBox

                                key={`${x}-${y}-${z}`}

                                position={[

                                    x * 0.34,

                                    y * 0.34,

                                    z * 0.34,

                                ]}

                                size={[0.14, 0.14, 0.14]}

                                color="#b652ff"

                            />

                        ))
                    )
                )}

            </group>

        </group>
    );
}

// ==========================================
// COMMON SPIKED BALL MODEL
// ==========================================

function SpikedBall({
    position = [0, 0, 0],
}) {

    const spikes = [

        [1, 0, 0, 0, 0, -Math.PI / 2],

        [-1, 0, 0, 0, 0, Math.PI / 2],

        [0, 1, 0, 0, 0, 0],

        [0, -1, 0, Math.PI, 0, 0],

        [0, 0, 1, Math.PI / 2, 0, 0],

        [0, 0, -1, -Math.PI / 2, 0, 0],

    ];

    return (

        <group position={position}>

            <mesh castShadow>

                <sphereGeometry
                    args={[0.38, 16, 12]}
                />

                <meshStandardMaterial
                    color="#68717e"
                    metalness={0.8}
                    roughness={0.25}
                />

            </mesh>

            {spikes.map((spike, index) => (

                <mesh

                    key={index}

                    position={[

                        spike[0] * 0.44,

                        spike[1] * 0.44,

                        spike[2] * 0.44,

                    ]}

                    rotation={[

                        spike[3],

                        spike[4],

                        spike[5],

                    ]}

                    castShadow

                >

                    <coneGeometry
                        args={[0.13, 0.35, 8]}
                    />

                    <meshStandardMaterial
                        color="#b8c0cc"
                        metalness={0.8}
                        roughness={0.2}
                    />

                </mesh>

            ))}

        </group>
    );
}

// ==========================================
// 17. SPINNING MACE
// ==========================================

function SpinningMaceModel() {

    const maceRef = useRef();

    useFrame((_, delta) => {

        if (!maceRef.current) return;

        maceRef.current.rotation.y +=

            Math.min(delta, 0.05) * 2;

    });

    return (

        <group>

            <MetalBox
                position={[0, 0.10, 0]}
                size={[0.85, 0.35, 0.85]}
                color="#454c58"
            />

            <group
                ref={maceRef}
                position={[0, 0.45, 0]}
            >

                {/* Holding arm */}

                <mesh
                    position={[0, 0, -0.45]}
                    rotation={[Math.PI / 2, 0, 0]}
                >

                    <cylinderGeometry
                        args={[0.075, 0.075, 0.9, 8]}
                    />

                    <meshStandardMaterial
                        color="#a2a7b0"
                        metalness={0.8}
                    />

                </mesh>

                <SpikedBall
                    position={[0, 0, -0.95]}
                />

            </group>

        </group>
    );
}

// ==========================================
// 18. EMP BLASTER
// ==========================================

function EMPBlasterModel() {

    const ringRef = useRef();

    useFrame((_, delta) => {

        if (!ringRef.current) return;

        ringRef.current.rotation.z +=

            Math.min(delta, 0.05) * 2.5;

    });

    return (

        <group>

            <MetalBox
                position={[0, 0.25, 0.15]}
                size={[1.0, 0.7, 1.05]}
                color="#222d62"
            />

            <Launcher
                position={[0, 0.25, -0.35]}
                radius={0.34}
                length={1.65}
                color="#394478"
            />

            {[-0.75, -0.35, 0.05].map((z) => (

                <EnergyRing

                    key={z}

                    position={[0, 0.25, z]}

                    radius={0.43}

                    color="#354bff"

                />

            ))}

            <group
                ref={ringRef}
                position={[0, 0.25, -1.18]}
            >

                <EnergyRing
                    radius={0.42}
                    color="#6d8bff"
                />

                {[0, 1, 2, 3].map((i) => (

                    <EnergyCore

                        key={i}

                        position={[

                            Math.cos(
                                i * Math.PI / 2
                            ) * 0.42,

                            Math.sin(
                                i * Math.PI / 2
                            ) * 0.42,

                            0,

                        ]}

                        radius={0.075}

                        color="#a3c4ff"

                    />

                ))}

            </group>

            <EnergyCore
                position={[0, 0.25, -1.22]}
                radius={0.19}
                color="#354bff"
                intensity={4}
            />

        </group>
    );
}

// ==========================================
// 19. POISON BOMB LAUNCHER
// ==========================================

function PoisonBombModel() {

    return (

        <group>

            <Launcher
                position={[0, 0.25, -0.25]}
                radius={0.35}
                length={1.7}
                color="#3b5130"
            />

            {/* Poison storage tanks */}

            {[-0.45, 0.45].map((x) => (

                <group

                    key={x}

                    position={[x, 0.30, 0.35]}

                >

                    <mesh
                        rotation={[Math.PI / 2, 0, 0]}
                    >

                        <cylinderGeometry
                            args={[0.21, 0.21, 0.85, 12]}
                        />

                        <meshStandardMaterial
                            color="#64e831"
                            emissive="#47bd1d"
                            emissiveIntensity={1.5}
                            transparent
                            opacity={0.85}
                        />

                    </mesh>

                    {[-0.42, 0.42].map((z) => (

                        <mesh

                            key={z}

                            position={[0, 0, z]}

                            rotation={[Math.PI / 2, 0, 0]}

                        >

                            <cylinderGeometry
                                args={[
                                    0.24,
                                    0.24,
                                    0.12,
                                    12
                                ]}
                            />

                            <meshStandardMaterial
                                color="#29352a"
                                metalness={0.5}
                            />

                        </mesh>

                    ))}

                </group>

            ))}

            <EnergyRing
                position={[0, 0.25, -1.1]}
                radius={0.37}
                color="#64e831"
            />

            <EnergyCore
                position={[0, 0.25, -1.12]}
                radius={0.14}
                color="#a1ff46"
                intensity={3}
            />

        </group>
    );
}

// ==========================================
// 20. INVINCIBILITY STAR
// ==========================================

function InvincibilityStarModel() {

    const starRef = useRef();

    useFrame(({ clock }, delta) => {

        if (!starRef.current) return;

        starRef.current.rotation.y +=

            Math.min(delta, 0.05) * 2;

        starRef.current.position.y =

            0.65 +

            Math.sin(
                clock.elapsedTime * 3
            ) * 0.10;

    });

    return (

        <group>

            {/* Golden power-up platform */}

            <mesh position={[0, 0.05, 0]}>

                <cylinderGeometry
                    args={[0.5, 0.6, 0.18, 16]}
                />

                <meshStandardMaterial
                    color="#aa791b"
                    metalness={0.75}
                    roughness={0.2}
                />

            </mesh>

            <EnergyRing
                position={[0, 0.18, 0]}
                radius={0.45}
                color="#ffd700"
                rotation={[Math.PI / 2, 0, 0]}
            />

            {/* Floating golden star */}

            <group
                ref={starRef}
                position={[0, 0.65, 0]}
            >

                <mesh>

                    <cylinderGeometry
                        args={[0.27, 0.27, 0.18, 5]}
                    />

                    <meshStandardMaterial
                        color="#ffd700"
                        emissive="#ffb300"
                        emissiveIntensity={2}
                        metalness={0.5}
                        roughness={0.2}
                    />

                </mesh>

                {[0, 1, 2, 3, 4].map((i) => {

                    const angle =

                        i * Math.PI * 2 / 5;

                    return (

                        <group

                            key={i}

                            rotation={[0, 0, angle]}

                        >

                            <mesh
                                position={[0, 0.35, 0]}
                            >

                                <coneGeometry
                                    args={[0.22, 0.45, 4]}
                                />

                                <meshStandardMaterial
                                    color="#ffd700"
                                    emissive="#ffb300"
                                    emissiveIntensity={2.5}
                                    metalness={0.4}
                                    roughness={0.2}
                                />

                            </mesh>

                        </group>
                    );
                })}

                {/* Central golden core */}

                <EnergyCore
                    radius={0.22}
                    color="#fff4a3"
                    intensity={3}
                />

                {/* Rotating power-up ring */}

                <EnergyRing
                    radius={0.65}
                    thickness={0.025}
                    color="#ffd700"
                />

            </group>

        </group>
    );
}

// ==========================================
// ALL WEAPON MODEL REGISTRY
// ==========================================

const WEAPON_MODELS = {

    triple_rocket: TripleRocketModel,

    mega_nuke: MegaNukeModel,

    cannon: CannonModel,

    machine_gun: MachineGunModel,

    plasma_gun: PlasmaBlasterModel,

    snowball: SnowballLauncherModel,

    grenade_launcher: GrenadeLauncherModel,

    shotgun: ShotgunModel,

    mini_gun: MiniGunModel,

    laser_blaster: LaserBlasterModel,

    homing_missile: HomingMissileModel,

    fireball: FireballLauncherModel,

    ice_rocket: IceRocketModel,

    electric_blaster: ElectricBlasterModel,

    land_mines: LandMinesModel,

    fake_box: FakeMysteryBoxModel,

    spinning_mace: SpinningMaceModel,

    emp_blaster: EMPBlasterModel,

    poison_bomb: PoisonBombModel,

    invincibility: InvincibilityStarModel,

};

// ==========================================
// MAIN WEAPON MODEL
// ==========================================

export default function WeaponModel({ weapon }) {

    if (!weapon) {

        return null;
    }

    const Model = WEAPON_MODELS[weapon.id];

    if (!Model) {

        return null;
    }

    return (

        <group name={`weaponModel_${weapon.id}`}>

            {/* Common mounting platform */}

            <mesh
                position={[0, -0.20, 0.10]}
                castShadow
            >

                <boxGeometry
                    args={[0.95, 0.25, 0.85]}
                />

                <meshStandardMaterial
                    color="#262b35"
                    metalness={0.5}
                    roughness={0.4}
                />

            </mesh>

            {/* Selected weapon 3D model */}

            <Model />

        </group>
    );
}