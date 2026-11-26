import {
    useEffect,
    useRef,
    useMemo,
} from "react";

import * as THREE from "three";

import {
    registerKartCollider,
    unregisterKartCollider,
} from "../physics/KartCollision";

// ==========================================
// SNOW MAP CONFIGURATION
// ==========================================

import {
    SNOW_ARENA_CONFIG
} from "./ArenaConfig";

export const SNOW_CONFIG = SNOW_ARENA_CONFIG;

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
// PROCEDURAL SNOW TEXTURE
// ==========================================

function useSnowTexture() {

    const texture = useMemo(() => {

        const canvas = document.createElement("canvas");

        canvas.width = 256;

        canvas.height = 256;

        const ctx = canvas.getContext("2d");

        ctx.fillStyle = "#e6eef5";

        ctx.fillRect(0, 0, 256, 256);

        for (let i = 0; i < 18000; i++) {

            const x = Math.random() * 256;

            const y = Math.random() * 256;

            const shade =
                205 + Math.floor(Math.random() * 45);

            ctx.fillStyle =

                `rgba(${shade},${Math.min(255, shade + 5)},255,0.45)`;

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
            SNOW_CONFIG.grassRepeat,
            SNOW_CONFIG.grassRepeat
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
// SNOW GROUND
// ==========================================

function SnowGround() {

    const texture = useSnowTexture();

    return (

        <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            receiveShadow
        >

            <planeGeometry
                args={[
                    SNOW_CONFIG.worldSize,
                    SNOW_CONFIG.worldSize,
                ]}
            />

            <meshStandardMaterial
                map={texture}
                color="#ffffff"
                roughness={0.95}
                metalness={0}
            />

        </mesh>
    );
}

// ==========================================
// FROZEN ROAD
// ==========================================

function FrozenRoad({

    position,

    size,

}) {

    return (

        <group position={position}>

            <mesh
                rotation={[-Math.PI / 2, 0, 0]}
                receiveShadow
            >

                <planeGeometry args={size} />

                <meshStandardMaterial
                    color="#9baebc"
                    roughness={0.55}
                    metalness={0.08}
                />

            </mesh>

        </group>
    );
}

// ==========================================
// SNOW BOUNDARY WALL
// ==========================================

function SnowWall({

    position,

    rotation = 0,

}) {

    return (

        <Obstacle
            position={position}
            rotation={rotation}
            type="wall"
        >

            {/* Main stone wall */}

            <mesh
                position={[0, 2, 0]}
                castShadow
                receiveShadow
            >

                <boxGeometry
                    args={[280, 4, 1.5]}
                />

                <meshStandardMaterial
                    color="#647583"
                    roughness={0.95}
                />

            </mesh>

            {/* Snow on top */}

            <mesh
                position={[0, 4.15, 0]}
                receiveShadow
            >

                <boxGeometry
                    args={[280, 0.35, 1.9]}
                />

                <meshStandardMaterial
                    color="#f3f8ff"
                    roughness={1}
                />

            </mesh>

            {/* Wall support pillars */}

            {Array.from(

                { length: 15 },

                (_, index) => (

                    <group
                        key={index}
                        position={[
                            -139 + index * (278 / 14),
                            0,
                            0,
                        ]}
                    >

                        <mesh
                            position={[0, 2.3, 0]}
                            castShadow
                        >

                            <boxGeometry
                                args={[2, 4.6, 2.2]}
                            />

                            <meshStandardMaterial
                                color="#526472"
                            />

                        </mesh>

                        <mesh position={[0, 4.65, 0]}>

                            <boxGeometry
                                args={[2.3, 0.3, 2.5]}
                            />

                            <meshStandardMaterial
                                color="#ffffff"
                            />

                        </mesh>

                    </group>

                )

            )}

        </Obstacle>
    );
}

// ==========================================
// SNOW COVERED PINE TREE
// ==========================================

function PineTree({

    position,

    size = 9,

    rotation = 0,

}) {

    const scale = size / 9;

    return (

        <Obstacle
            position={position}
            rotation={rotation}
            type="building"
        >

            <group scale={scale}>

                {/* Tree trunk */}

                <mesh
                    position={[0, 1.5, 0]}
                    castShadow
                >

                    <cylinderGeometry
                        args={[0.3, 0.45, 3, 8]}
                    />

                    <meshStandardMaterial
                        color="#594536"
                        roughness={1}
                    />

                </mesh>

                {/* Pine leaves and snow layers */}

                {[

                    {
                        y: 3.5,
                        radius: 2.6,
                        height: 4,
                    },

                    {
                        y: 5.5,
                        radius: 2,
                        height: 3.5,
                    },

                    {
                        y: 7.3,
                        radius: 1.4,
                        height: 3.4,
                    },

                ].map((layer, index) => (

                    <group key={index}>

                        <mesh
                            position={[0, layer.y, 0]}
                            castShadow
                            receiveShadow
                        >

                            <coneGeometry
                                args={[
                                    layer.radius,
                                    layer.height,
                                    8,
                                ]}
                            />

                            <meshStandardMaterial
                                color="#254f46"
                                roughness={1}
                            />

                        </mesh>

                        <mesh
                            position={[
                                0,
                                layer.y + 0.3,
                                0,
                            ]}
                            receiveShadow
                        >

                            <coneGeometry
                                args={[
                                    layer.radius * 0.82,
                                    layer.height * 0.84,
                                    8,
                                ]}
                            />

                            <meshStandardMaterial
                                color="#edf6ff"
                                roughness={1}
                            />

                        </mesh>

                    </group>

                ))}

            </group>

        </Obstacle>
    );
}

// ==========================================
// WOODEN SNOW CABIN
// ==========================================

function SnowCabin({

    position,

    rotation = 0,

}) {

    return (

        <Obstacle
            position={position}
            rotation={rotation}
            type="building"
        >

            {/* Wooden cabin body */}

            <mesh
                position={[0, 2.5, 0]}
                castShadow
                receiveShadow
            >

                <boxGeometry args={[10, 5, 8]} />

                <meshStandardMaterial
                    color="#79513b"
                    roughness={0.95}
                />

            </mesh>

            {/* Wooden horizontal panels */}

            {Array.from(

                { length: 9 },

                (_, index) => (

                    <group key={index}>

                        {[-1, 1].map((side) => (

                            <mesh
                                key={side}
                                position={[
                                    0,
                                    0.4 + index * 0.5,
                                    side * 4.04,
                                ]}
                            >

                                <boxGeometry
                                    args={[10, 0.08, 0.1]}
                                />

                                <meshStandardMaterial
                                    color="#50382b"
                                />

                            </mesh>

                        ))}

                    </group>

                )

            )}

            {/* Sloped snow-covered roof */}

            {[-1, 1].map((side) => (

                <group
                    key={side}
                    position={[
                        side * 2.65,
                        6.2,
                        0,
                    ]}
                    rotation={[
                        0,
                        0,
                        -side * Math.PI / 7,
                    ]}
                >

                    <mesh castShadow>

                        <boxGeometry
                            args={[6.1, 0.45, 9.4]}
                        />

                        <meshStandardMaterial
                            color="#39434b"
                            roughness={0.9}
                        />

                    </mesh>

                    <mesh
                        position={[0, 0.35, 0]}
                        receiveShadow
                    >

                        <boxGeometry
                            args={[6.2, 0.3, 9.5]}
                        />

                        <meshStandardMaterial
                            color="#f2f7ff"
                            roughness={1}
                        />

                    </mesh>

                </group>

            ))}

            {/* Front door */}

            <mesh position={[0, 1.5, 4.06]}>

                <boxGeometry
                    args={[2, 3, 0.15]}
                />

                <meshStandardMaterial
                    color="#3c2b23"
                />

            </mesh>

            {/* Door handle */}

            <mesh position={[0.65, 1.4, 4.17]}>

                <sphereGeometry args={[0.12, 8, 8]} />

                <meshStandardMaterial
                    color="#c2a05c"
                    metalness={0.7}
                    roughness={0.3}
                />

            </mesh>

            {/* Warm glowing windows */}

            {[-3.2, 3.2].map((x) => (

                <group
                    key={x}
                    position={[x, 2.9, 4.08]}
                >

                    <mesh>

                        <boxGeometry
                            args={[2.1, 1.8, 0.15]}
                        />

                        <meshStandardMaterial
                            color="#362c25"
                        />

                    </mesh>

                    <mesh position={[0, 0, 0.1]}>

                        <planeGeometry
                            args={[1.7, 1.4]}
                        />

                        <meshStandardMaterial
                            color="#ffd18a"
                            emissive="#ffb34a"
                            emissiveIntensity={0.7}
                        />

                    </mesh>

                    <mesh position={[0, 0, 0.15]}>

                        <boxGeometry
                            args={[0.1, 1.5, 0.1]}
                        />

                        <meshStandardMaterial
                            color="#594536"
                        />

                    </mesh>

                    <mesh position={[0, 0, 0.15]}>

                        <boxGeometry
                            args={[1.8, 0.1, 0.1]}
                        />

                        <meshStandardMaterial
                            color="#594536"
                        />

                    </mesh>

                </group>

            ))}

            {/* Chimney */}

            <mesh
                position={[3, 7, -2]}
                castShadow
            >

                <boxGeometry
                    args={[1.1, 3, 1.1]}
                />

                <meshStandardMaterial
                    color="#6e747a"
                    roughness={1}
                />

            </mesh>

            <mesh position={[3, 8.6, -2]}>

                <boxGeometry
                    args={[1.5, 0.25, 1.5]}
                />

                <meshStandardMaterial
                    color="#edf6ff"
                />

            </mesh>

        </Obstacle>
    );
}

// ==========================================
// ICE ROCK
// ==========================================

function IceRock({

    position,

    size = 3,

    rotation = 0,

}) {

    return (

        <Obstacle
            position={position}
            rotation={rotation}
            type="rock"
        >

            <mesh
                position={[0, size * 0.55, 0]}
                scale={[1.2, 0.8, 0.9]}
                castShadow
                receiveShadow
            >

                <dodecahedronGeometry
                    args={[size, 0]}
                />

                <meshStandardMaterial
                    color="#91c5df"
                    roughness={0.25}
                    metalness={0.15}
                    flatShading
                />

            </mesh>

            <mesh
                position={[0, size * 0.9, 0]}
                scale={[1.05, 0.35, 0.8]}
                receiveShadow
            >

                <dodecahedronGeometry
                    args={[size, 0]}
                />

                <meshStandardMaterial
                    color="#edf7ff"
                    roughness={0.9}
                    flatShading
                />

            </mesh>

        </Obstacle>
    );
}

// ==========================================
// SNOW COVERED CONTAINER
// ==========================================

function SnowContainer({

    position,

    rotation = 0,

    color = "#496b80",

}) {

    return (

        <Obstacle
            position={position}
            rotation={rotation}
            type="container"
        >

            <mesh
                position={[0, 1.8, 0]}
                castShadow
                receiveShadow
            >

                <boxGeometry
                    args={[10, 3.6, 4]}
                />

                <meshStandardMaterial
                    color={color}
                    roughness={0.65}
                    metalness={0.35}
                />

            </mesh>

            {/* Metal ridges */}

            {Array.from(

                { length: 13 },

                (_, index) => (

                    <group key={index}>

                        {[-1, 1].map((side) => (

                            <mesh
                                key={side}
                                position={[
                                    -4.5 + index * 0.75,
                                    1.8,
                                    side * 2.05,
                                ]}
                            >

                                <boxGeometry
                                    args={[0.15, 3.5, 0.15]}
                                />

                                <meshStandardMaterial
                                    color="#354b5c"
                                />

                            </mesh>

                        ))}

                    </group>

                )

            )}

            {/* Snow layer */}

            <mesh
                position={[0, 3.75, 0]}
                receiveShadow
            >

                <boxGeometry
                    args={[10.3, 0.3, 4.3]}
                />

                <meshStandardMaterial
                    color="#f1f7ff"
                    roughness={1}
                />

            </mesh>

        </Obstacle>
    );
}

// ==========================================
// WOODEN SUPPLY CRATE
// ==========================================

function SnowCrate({

    position,

    size = 2.8,

    rotation = 0,

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
                    color="#82654b"
                    roughness={1}
                />

            </mesh>

            {[-1, 1].map((side) => (

                <mesh
                    key={side}
                    position={[
                        0,
                        size / 2,
                        side * (size / 2 + 0.06),
                    ]}
                    rotation={[0, 0, Math.PI / 4]}
                >

                    <boxGeometry
                        args={[size * 1.3, 0.2, 0.12]}
                    />

                    <meshStandardMaterial
                        color="#4f3e2e"
                    />

                </mesh>

            ))}

            <mesh
                position={[0, size + 0.12, 0]}
            >

                <boxGeometry
                    args={[
                        size + 0.2,
                        0.25,
                        size + 0.2,
                    ]}
                />

                <meshStandardMaterial
                    color="#f3f8ff"
                />

            </mesh>

        </Obstacle>
    );
}

// ==========================================
// FROZEN LAKE
// ==========================================

function FrozenLake({ position }) {

    return (

        <group position={position}>

            {/* Flat, driveable ice surface */}

            <mesh
                rotation={[-Math.PI / 2, 0, 0]}
                position={[0, 0.012, 0]}
                scale={[1.3, 0.85, 1]}
                receiveShadow
            >

                <circleGeometry args={[23, 64]} />

                <meshStandardMaterial
                    color="#94cbe2"
                    roughness={0.2}
                    metalness={0.1}
                />

            </mesh>

            {/* Snow around the lake */}

            <mesh
                rotation={[-Math.PI / 2, 0, 0]}
                position={[0, 0.016, 0]}
                scale={[1.3, 0.85, 1]}
            >

                <ringGeometry
                    args={[22.3, 24, 64]}
                />

                <meshStandardMaterial
                    color="#edf7ff"
                    roughness={1}
                />

            </mesh>

        </group>
    );
}

// ==========================================
// WOODEN BRIDGE
// ==========================================

function WoodenBridge({

    position,

    rotation = 0,

}) {

    return (

        <group
            position={position}
            rotation={[0, rotation, 0]}
        >

            {/* Flat driveable wooden surface */}

            {Array.from(

                { length: 20 },

                (_, index) => (

                    <mesh
                        key={index}
                        position={[
                            0,
                            0.035,
                            -9.5 + index,
                        ]}
                        receiveShadow
                    >

                        <boxGeometry
                            args={[10, 0.07, 0.96]}
                        />

                        <meshStandardMaterial
                            color={
                                index % 2 === 0
                                    ? "#927254"
                                    : "#826247"
                            }
                            roughness={1}
                        />

                    </mesh>

                )

            )}

            {/* Bridge side rails */}

            {[-1, 1].map((side) => (

                <Obstacle
                    key={side}
                    position={[side * 5, 0, 0]}
                    type="barrier"
                >

                    <mesh
                        position={[0, 1, 0]}
                        castShadow
                    >

                        <boxGeometry
                            args={[0.3, 0.35, 20]}
                        />

                        <meshStandardMaterial
                            color="#614936"
                        />

                    </mesh>

                    {[-9, -6, -3, 0, 3, 6, 9].map((z) => (

                        <mesh
                            key={z}
                            position={[0, 0.65, z]}
                            castShadow
                        >

                            <boxGeometry
                                args={[0.4, 1.3, 0.4]}
                            />

                            <meshStandardMaterial
                                color="#70543c"
                            />

                        </mesh>

                    ))}

                </Obstacle>

            ))}

        </group>
    );
}

// ==========================================
// BACKGROUND SNOW MOUNTAINS
// ==========================================

function Mountain({

    position,

    height = 55,

    radius = 25,

    rotation = 0,

}) {

    return (

        <group
            position={position}
            rotation={[0, rotation, 0]}
        >

            {/* Mountain body */}

            <mesh position={[0, height / 2, 0]}>

                <coneGeometry
                    args={[radius, height, 7]}
                />

                <meshStandardMaterial
                    color="#788d9f"
                    roughness={1}
                    flatShading
                />

            </mesh>

            {/* Mountain snow cap */}

            <mesh
                position={[0, height * 0.78, 0]}
            >

                <coneGeometry
                    args={[
                        radius * 0.46,
                        height * 0.46,
                        7,
                    ]}
                />

                <meshStandardMaterial
                    color="#edf6ff"
                    roughness={1}
                    flatShading
                />

            </mesh>

        </group>
    );
}

// ==========================================
// MAP OBJECT POSITIONS
// ==========================================

const CABINS = [

    { position: [-45, 0, -45], rotation: 0 },

    { position: [45, 0, 45], rotation: Math.PI },

    { position: [-90, 0, 70], rotation: Math.PI / 2 },

    { position: [90, 0, -70], rotation: -Math.PI / 2 },

    { position: [-95, 0, -90], rotation: 0.4 },

    { position: [95, 0, 90], rotation: -0.4 },

];

const TREES = [

    [-25, 0, -35],

    [-35, 0, -65],

    [-65, 0, -35],

    [-75, 0, -65],

    [-110, 0, -45],

    [-120, 0, -85],

    [-115, 0, -115],

    [-60, 0, -120],

    [-30, 0, -110],

    [25, 0, 35],

    [35, 0, 65],

    [65, 0, 35],

    [75, 0, 65],

    [110, 0, 45],

    [120, 0, 85],

    [115, 0, 115],

    [60, 0, 120],

    [30, 0, 110],

    [-120, 0, 30],

    [-120, 0, 110],

    [-70, 0, 115],

    [-45, 0, 90],

    [120, 0, -30],

    [120, 0, -110],

    [70, 0, -115],

    [45, 0, -90],

    [-30, 0, 25],

    [30, 0, -25],

];

const CONTAINERS = [

    {
        position: [-28, 0, 45],
        rotation: Math.PI / 2,
        color: "#486b83",
    },

    {
        position: [-40, 0, 48],
        rotation: 0,
        color: "#667780",
    },

    {
        position: [28, 0, -45],
        rotation: Math.PI / 2,
        color: "#486b83",
    },

    {
        position: [40, 0, -48],
        rotation: 0,
        color: "#667780",
    },

    {
        position: [-85, 0, -25],
        rotation: Math.PI / 2,
        color: "#536b70",
    },

    {
        position: [85, 0, 25],
        rotation: Math.PI / 2,
        color: "#536b70",
    },

];

const ROCKS = [

    [-18, 0, -20],

    [18, 0, 20],

    [-20, 0, 18],

    [20, 0, -18],

    [-65, 0, -85],

    [65, 0, 85],

    [-110, 0, 15],

    [110, 0, -15],

    [-85, 0, 110],

    [85, 0, -110],

    [-125, 0, -125],

    [125, 0, 125],

    [-20, 0, 120],

    [20, 0, -120],

];

const CRATES = [

    [-52, 0, -38],

    [-38, 0, -52],

    [52, 0, 38],

    [38, 0, 52],

    [-30, 0, 55],

    [30, 0, -55],

    [-95, 0, 60],

    [95, 0, -60],

    [-85, 0, -15],

    [85, 0, 15],

];

const MOUNTAINS = [

    [-175, 0, -150],

    [-100, 0, -180],

    [0, 0, -185],

    [100, 0, -180],

    [175, 0, -150],

    [-185, 0, -50],

    [-185, 0, 50],

    [-175, 0, 150],

    [185, 0, -50],

    [185, 0, 50],

    [175, 0, 150],

    [-100, 0, 180],

    [0, 0, 185],

    [100, 0, 180],

];

// ==========================================
// COMPLETE SNOW VALLEY MAP
// ==========================================

export default function SnowMap() {

    return (

        <group name="villageCollisionMap">

            {/* Snow covered ground */}

            <SnowGround />

            {/* Main frozen roads */}

            <FrozenRoad
                position={[0, 0.02, 0]}
                size={[12, 280]}
            />

            <FrozenRoad
                position={[0, 0.03, 0]}
                size={[280, 12]}
            />

            {/* Secondary roads */}

            <FrozenRoad
                position={[-75, 0.02, 0]}
                size={[8, 240]}
            />

            <FrozenRoad
                position={[75, 0.02, 0]}
                size={[8, 240]}
            />

            {/* Four boundary walls */}

            <SnowWall
                position={[0, 0, -140]}
            />

            <SnowWall
                position={[0, 0, 140]}
            />

            <SnowWall
                position={[-140, 0, 0]}
                rotation={Math.PI / 2}
            />

            <SnowWall
                position={[140, 0, 0]}
                rotation={Math.PI / 2}
            />

            {/* Frozen lake */}

            <FrozenLake
                position={[-70, 0, 45]}
            />

            {/* Wooden bridge */}

            <WoodenBridge
                position={[-75, 0, 45]}
            />

            {/* Wooden snow cabins */}

            {CABINS.map((item, index) => (

                <SnowCabin
                    key={`cabin-${index}`}
                    {...item}
                />

            ))}

            {/* Snow covered pine trees */}

            {TREES.map((position, index) => (

                <PineTree
                    key={`tree-${index}`}
                    position={position}
                    size={8 + (index % 4) * 1.5}
                    rotation={index * 0.7}
                />

            ))}

            {/* Shipping containers */}

            {CONTAINERS.map((item, index) => (

                <SnowContainer
                    key={`container-${index}`}
                    {...item}
                />

            ))}

            {/* Ice rocks */}

            {ROCKS.map((position, index) => (

                <IceRock
                    key={`rock-${index}`}
                    position={position}
                    size={2 + (index % 3) * 0.8}
                    rotation={index * 0.9}
                />

            ))}

            {/* Wooden supply crates */}

            {CRATES.map((position, index) => (

                <SnowCrate
                    key={`crate-${index}`}
                    position={position}
                    size={2.5 + (index % 3) * 0.3}
                    rotation={index * 0.5}
                />

            ))}

            {/* Background mountains */}

            <group name="nonBlockingDecorations">

                {MOUNTAINS.map((position, index) => (

                    <Mountain
                        key={`mountain-${index}`}
                        position={position}
                        height={45 + (index % 4) * 12}
                        radius={28 + (index % 3) * 5}
                        rotation={index * 0.6}
                    />

                ))}

            </group>

        </group>
    );
}