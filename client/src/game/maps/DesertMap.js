import { useEffect, useRef, useMemo } from "react";

import * as THREE from "three";

import {
    registerKartCollider,
    unregisterKartCollider,
} from "../physics/KartCollision";

// ==========================================
// DESERT MAP SETTINGS
// ==========================================

import {
    DESERT_ARENA_CONFIG
} from "./ArenaConfig";

export const DESERT_CONFIG = DESERT_ARENA_CONFIG;

// ==========================================
// REUSABLE COLLISION OBJECT
// ==========================================

function Obstacle({
    position,
    rotation = 0,
    type = "building",
    children,
}) {
    const objectRef = useRef(null);

    useEffect(() => {
        const object = objectRef.current;

        if (!object) return;

        object.updateWorldMatrix(true, true);

        registerKartCollider(object, {
            type,
        });

        return () => {
            unregisterKartCollider(object);
        };
    }, [position, rotation, type]);

    return (
        <group
            ref={objectRef}
            position={position}
            rotation={[0, rotation, 0]}
        >
            {children}
        </group>
    );
}

// ==========================================
// PROCEDURAL DESERT TEXTURE
// ==========================================

function useSandTexture() {
    const texture = useMemo(() => {
        const canvas = document.createElement("canvas");

        canvas.width = 256;
        canvas.height = 256;

        const ctx = canvas.getContext("2d");

        ctx.fillStyle = "#c5a16a";
        ctx.fillRect(0, 0, 256, 256);

        for (let i = 0; i < 14000; i++) {
            const x = Math.random() * 256;
            const y = Math.random() * 256;

            const shade =
                140 + Math.floor(Math.random() * 90);

            ctx.fillStyle =
                `rgba(${shade},${shade - 30},${shade - 65},0.35)`;

            ctx.fillRect(
                x,
                y,
                1 + Math.random() * 2,
                1 + Math.random() * 2
            );
        }

        const map = new THREE.CanvasTexture(canvas);

        map.wrapS = THREE.RepeatWrapping;
        map.wrapT = THREE.RepeatWrapping;

        map.repeat.set(
            DESERT_CONFIG.grassRepeat,
            DESERT_CONFIG.grassRepeat
        );

        map.colorSpace = THREE.SRGBColorSpace;

        map.anisotropy = 8;

        return map;
    }, []);

    useEffect(() => {
        return () => texture.dispose();
    }, [texture]);

    return texture;
}

// ==========================================
// DESERT GROUND
// ==========================================

function Ground() {
    const texture = useSandTexture();

    return (
        <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            receiveShadow
        >
            <planeGeometry
                args={[
                    DESERT_CONFIG.worldSize,
                    DESERT_CONFIG.worldSize,
                ]}
            />

            <meshStandardMaterial
                map={texture}
                roughness={1}
                metalness={0}
            />
        </mesh>
    );
}

// ==========================================
// DESERT ROAD
// ==========================================

function Road({ position, size }) {
    return (
        <mesh
            position={position}
            rotation={[-Math.PI / 2, 0, 0]}
            receiveShadow
        >
            <planeGeometry args={size} />

            <meshStandardMaterial
                color="#92754e"
                roughness={1}
            />
        </mesh>
    );
}

// ==========================================
// MAP BOUNDARY WALL
// ==========================================

function BoundaryWall({ position, rotation = 0 }) {
    return (
        <Obstacle
            position={position}
            rotation={rotation}
            type="wall"
        >
            <mesh
                position={[0, 2, 0]}
                castShadow
                receiveShadow
            >
                <boxGeometry
                    args={[140, 4, 1.5]}
                />

                <meshStandardMaterial
                    color="#8c795c"
                    roughness={0.95}
                />
            </mesh>

            <mesh position={[0, 4.15, 0]}>
                <boxGeometry
                    args={[140, 0.3, 1.8]}
                />

                <meshStandardMaterial
                    color="#5c5141"
                />
            </mesh>

            {Array.from(
                { length: 15 },
                (_, index) => (
                    <mesh
                        key={index}
                        position={[
                            -69 + index * 9.85,
                            2.25,
                            0,
                        ]}
                        castShadow
                    >
                        <boxGeometry
                            args={[1.8, 4.5, 2]}
                        />

                        <meshStandardMaterial
                            color="#74634d"
                            roughness={0.9}
                        />
                    </mesh>
                )
            )}
        </Obstacle>
    );
}

// ==========================================
// MILITARY BUNKER
// ==========================================

function Bunker({
    position,
    rotation = 0,
}) {
    return (
        <Obstacle
            position={position}
            rotation={rotation}
        >
            {/* Main concrete building */}

            <mesh
                position={[0, 2.5, 0]}
                castShadow
                receiveShadow
            >
                <boxGeometry args={[10, 5, 8]} />

                <meshStandardMaterial
                    color="#b0a183"
                    roughness={0.95}
                />
            </mesh>

            {/* Roof */}

            <mesh
                position={[0, 5.2, 0]}
                castShadow
            >
                <boxGeometry
                    args={[10.8, 0.4, 8.8]}
                />

                <meshStandardMaterial
                    color="#756e59"
                    roughness={0.85}
                />
            </mesh>

            {/* Front door */}

            <mesh position={[0, 1.5, 4.02]}>
                <boxGeometry
                    args={[2.2, 3, 0.1]}
                />

                <meshStandardMaterial
                    color="#393d32"
                    metalness={0.4}
                    roughness={0.6}
                />
            </mesh>

            {/* Windows */}

            {[-3.3, 3.3].map((x) => (
                <mesh
                    key={x}
                    position={[x, 3.3, 4.03]}
                >
                    <boxGeometry
                        args={[1.8, 0.8, 0.12]}
                    />

                    <meshStandardMaterial
                        color="#252d30"
                        metalness={0.5}
                    />
                </mesh>
            ))}

            {/* Roof ventilation unit */}

            <mesh
                position={[2.5, 5.8, -1.5]}
                castShadow
            >
                <boxGeometry
                    args={[1.8, 0.8, 1.8]}
                />

                <meshStandardMaterial
                    color="#60645a"
                    metalness={0.5}
                />
            </mesh>
        </Obstacle>
    );
}

// ==========================================
// MILITARY TENT
// ==========================================

function MilitaryTent({
    position,
    rotation = 0,
}) {
    return (
        <Obstacle
            position={position}
            rotation={rotation}
        >
            <mesh
                position={[0, 2.2, 0]}
                rotation={[0, Math.PI / 4, 0]}
                castShadow
                receiveShadow
            >
                <coneGeometry
                    args={[5.5, 4.4, 4]}
                />

                <meshStandardMaterial
                    color="#626b3c"
                    roughness={1}
                />
            </mesh>

            {/* Tent base */}

            <mesh position={[0, 0.15, 0]}>
                <boxGeometry
                    args={[7.8, 0.3, 7.8]}
                />

                <meshStandardMaterial
                    color="#4c5134"
                />
            </mesh>
        </Obstacle>
    );
}

// ==========================================
// SHIPPING CONTAINER
// ==========================================

function Container({
    position,
    rotation = 0,
    color = "#66724a",
}) {
    return (
        <Obstacle
            position={position}
            rotation={rotation}
            type="container"
        >
            <mesh
                position={[0, 1.7, 0]}
                castShadow
                receiveShadow
            >
                <boxGeometry
                    args={[9, 3.4, 3.5]}
                />

                <meshStandardMaterial
                    color={color}
                    metalness={0.45}
                    roughness={0.65}
                />
            </mesh>

            {/* Metal ridges */}

            {Array.from(
                { length: 13 },
                (_, index) => (
                    <group key={index}>
                        <mesh
                            position={[
                                -4.2 + index * 0.7,
                                1.7,
                                1.78,
                            ]}
                        >
                            <boxGeometry
                                args={[0.12, 3.3, 0.12]}
                            />

                            <meshStandardMaterial
                                color="#41483b"
                            />
                        </mesh>

                        <mesh
                            position={[
                                -4.2 + index * 0.7,
                                1.7,
                                -1.78,
                            ]}
                        >
                            <boxGeometry
                                args={[0.12, 3.3, 0.12]}
                            />

                            <meshStandardMaterial
                                color="#41483b"
                            />
                        </mesh>
                    </group>
                )
            )}
        </Obstacle>
    );
}

// ==========================================
// WOODEN SUPPLY CRATE
// ==========================================

function SupplyCrate({
    position,
    rotation = 0,
    size = 2.5,
}) {
    return (
        <Obstacle
            position={position}
            rotation={rotation}
            type="crate"
        >
            <mesh
                position={[0, size / 2, 0]}
                castShadow
                receiveShadow
            >
                <boxGeometry
                    args={[size, size, size]}
                />

                <meshStandardMaterial
                    color="#947047"
                    roughness={1}
                />
            </mesh>

            {[-1, 1].map((side) => (
                <mesh
                    key={side}
                    position={[
                        0,
                        size / 2,
                        side * (size / 2 + 0.04),
                    ]}
                    rotation={[0, 0, Math.PI / 4]}
                >
                    <boxGeometry
                        args={[
                            size * 1.3,
                            0.2,
                            0.12,
                        ]}
                    />

                    <meshStandardMaterial
                        color="#59452d"
                    />
                </mesh>
            ))}
        </Obstacle>
    );
}

// ==========================================
// CONCRETE BARRICADE
// ==========================================

function Barricade({
    position,
    rotation = 0,
}) {
    return (
        <Obstacle
            position={position}
            rotation={rotation}
            type="barrier"
        >
            <mesh
                position={[0, 0.8, 0]}
                castShadow
                receiveShadow
            >
                <boxGeometry
                    args={[5, 1.6, 1.4]}
                />

                <meshStandardMaterial
                    color="#96918a"
                    roughness={1}
                />
            </mesh>

            <mesh position={[0, 1.2, 0.72]}>
                <boxGeometry
                    args={[5, 0.4, 0.04]}
                />

                <meshStandardMaterial
                    color="#d6a42d"
                />
            </mesh>

            {[-1.8, -0.6, 0.6, 1.8].map((x) => (
                <mesh
                    key={x}
                    position={[x, 1.2, 0.75]}
                    rotation={[0, 0, -0.5]}
                >
                    <boxGeometry
                        args={[0.4, 0.45, 0.04]}
                    />

                    <meshStandardMaterial
                        color="#292929"
                    />
                </mesh>
            ))}
        </Obstacle>
    );
}

// ==========================================
// DESERT ROCK
// ==========================================

function Rock({
    position,
    size = 2,
    rotation = 0,
}) {
    return (
        <Obstacle
            position={position}
            rotation={rotation}
            type="rock"
        >
            <mesh
                position={[0, size * 0.45, 0]}
                scale={[1.2, 0.7, 0.9]}
                castShadow
                receiveShadow
            >
                <dodecahedronGeometry
                    args={[size, 0]}
                />

                <meshStandardMaterial
                    color="#9c8059"
                    roughness={1}
                    flatShading
                />
            </mesh>
        </Obstacle>
    );
}

// ==========================================
// DESERT CACTUS
// ==========================================

function Cactus({ position, size = 3 }) {
    return (
        <Obstacle
            position={position}
            type="building"
        >
            <mesh
                position={[0, size / 2, 0]}
                castShadow
            >
                <cylinderGeometry
                    args={[0.32, 0.4, size, 8]}
                />

                <meshStandardMaterial
                    color="#52733b"
                    roughness={0.9}
                />
            </mesh>

            {[-1, 1].map((side) => (
                <group
                    key={side}
                    position={[
                        side * 0.55,
                        size * 0.55,
                        0,
                    ]}
                >
                    <mesh rotation={[0, 0, Math.PI / 2]}>
                        <cylinderGeometry
                            args={[0.19, 0.19, 1.1, 8]}
                        />

                        <meshStandardMaterial
                            color="#52733b"
                        />
                    </mesh>

                    <mesh
                        position={[
                            side * 0.45,
                            0.5,
                            0,
                        ]}
                    >
                        <cylinderGeometry
                            args={[0.19, 0.19, 1.2, 8]}
                        />

                        <meshStandardMaterial
                            color="#52733b"
                        />
                    </mesh>
                </group>
            ))}
        </Obstacle>
    );
}

// ==========================================
// MAP OBJECT POSITIONS
// ==========================================

const BUNKERS = [
    { position: [-28, 0, -28], rotation: 0 },
    { position: [28, 0, 28], rotation: Math.PI },
    { position: [40, 0, -40], rotation: Math.PI / 2 },
    { position: [-40, 0, 40], rotation: -Math.PI / 2 },
];

const TENTS = [
    { position: [-48, 0, -42], rotation: 0 },
    { position: [-48, 0, -28], rotation: 0 },
    { position: [48, 0, 42], rotation: Math.PI },
    { position: [48, 0, 28], rotation: Math.PI },
];

const CONTAINERS = [
    {
        position: [-20, 0, 20],
        rotation: Math.PI / 2,
        color: "#657447",
    },
    {
        position: [-30, 0, 18],
        rotation: 0,
        color: "#956844",
    },
    {
        position: [20, 0, -20],
        rotation: Math.PI / 2,
        color: "#657447",
    },
    {
        position: [30, 0, -18],
        rotation: 0,
        color: "#956844",
    },
];

const CRATES = [
    [-20, 0, -30],
    [-17, 0, -34],
    [20, 0, 30],
    [17, 0, 34],
    [-35, 0, 22],
    [35, 0, -22],
    [-50, 0, 10],
    [50, 0, -10],
];

const BARRICADES = [
    { position: [-12, 0, -14], rotation: 0 },
    { position: [12, 0, 14], rotation: 0 },
    { position: [-14, 0, 12], rotation: Math.PI / 2 },
    { position: [14, 0, -12], rotation: Math.PI / 2 },
    { position: [-45, 0, -12], rotation: 0 },
    { position: [45, 0, 12], rotation: 0 },
];

const ROCKS = [
    [-58, 0, -55],
    [-55, 0, 55],
    [58, 0, 55],
    [55, 0, -55],
    [-30, 0, 55],
    [30, 0, -55],
    [-58, 0, 22],
    [58, 0, -22],
    [-22, 0, -50],
    [22, 0, 50],
];

const CACTUSES = [
    [-62, 0, -35],
    [-62, 0, 35],
    [62, 0, -35],
    [62, 0, 35],
    [-35, 0, -62],
    [35, 0, -62],
    [-35, 0, 62],
    [35, 0, 62],
];

// ==========================================
// COMPLETE DESERT MAP
// ==========================================

export default function DesertMap() {
    return (
        <group name="villageCollisionMap">

            {/* Desert sand ground */}

            <Ground />

            {/* Main vertical road */}

            <Road
                position={[0, 0.02, 0]}
                size={[10, 140]}
            />

            {/* Main horizontal road */}

            <Road
                position={[0, 0.03, 0]}
                size={[140, 10]}
            />

            {/* Four boundary walls */}

            <BoundaryWall
                position={[0, 0, -70]}
            />

            <BoundaryWall
                position={[0, 0, 70]}
            />

            <BoundaryWall
                position={[-70, 0, 0]}
                rotation={Math.PI / 2}
            />

            <BoundaryWall
                position={[70, 0, 0]}
                rotation={Math.PI / 2}
            />

            {/* Military bunkers */}

            {BUNKERS.map((item, index) => (
                <Bunker
                    key={`bunker-${index}`}
                    {...item}
                />
            ))}

            {/* Military tents */}

            {TENTS.map((item, index) => (
                <MilitaryTent
                    key={`tent-${index}`}
                    {...item}
                />
            ))}

            {/* Shipping containers */}

            {CONTAINERS.map((item, index) => (
                <Container
                    key={`container-${index}`}
                    {...item}
                />
            ))}

            {/* Supply crates */}

            {CRATES.map((position, index) => (
                <SupplyCrate
                    key={`crate-${index}`}
                    position={position}
                    rotation={index * 0.3}
                    size={2 + (index % 3) * 0.3}
                />
            ))}

            {/* Concrete barricades */}

            {BARRICADES.map((item, index) => (
                <Barricade
                    key={`barricade-${index}`}
                    {...item}
                />
            ))}

            {/* Desert rocks */}

            {ROCKS.map((position, index) => (
                <Rock
                    key={`rock-${index}`}
                    position={position}
                    size={1.5 + (index % 3) * 0.6}
                    rotation={index * 0.8}
                />
            ))}

            {/* Cactus plants */}

            {CACTUSES.map((position, index) => (
                <Cactus
                    key={`cactus-${index}`}
                    position={position}
                    size={3 + (index % 3) * 0.5}
                />
            ))}

        </group>
    );
}