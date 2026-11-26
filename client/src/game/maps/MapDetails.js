import {
    useMemo,
    useEffect,
    useRef
} from "react";

import {
    ARENA_CONFIG,
    CRATES,
    BARRICADES,
    HOUSES,
    TREES,
    CONTAINERS
} from "./ArenaConfig";

import {
    registerKartCollider,
    unregisterKartCollider
} from "../physics/KartCollision";

// ==========================================
// COLLISION OBJECT
// ==========================================

function CollisionObject({
    children,
    type = "building"
}) {

    const ref = useRef(null);

    useEffect(() => {

        const object = ref.current;

        if (!object) return;

        registerKartCollider(object, {
            type
        });

        return () => {
            unregisterKartCollider(object);
        };

    }, [type]);

    return (
        <group ref={ref}>
            {children}
        </group>
    );
}

// ==========================================
// CONCRETE BOUNDARY WALL
// ==========================================

function Wall({
    position,
    size
}) {

    return (

        <group position={position}>

            {/* Main concrete wall */}

            <mesh
                castShadow
                receiveShadow
            >

                <boxGeometry args={size} />

                <meshStandardMaterial
                    color="#96958c"
                    roughness={1}
                />

            </mesh>

            {/* Wall top decoration */}

            <mesh
                position={[
                    0,
                    size[1] / 2,
                    0
                ]}
            >

                <boxGeometry
                    args={[
                        size[0] + 0.3,
                        0.25,
                        size[2] + 0.3
                    ]}
                />

                <meshStandardMaterial
                    color="#686861"
                    roughness={1}
                />

            </mesh>

        </group>
    );
}

// ==========================================
// WOODEN CRATE
// ==========================================

function Crate({

    position,

    rotation = 0,

    size = 2

}) {

    return (

        <group
            position={position}
            rotation={[0, rotation, 0]}
        >

            {/* Main wooden box */}

            <mesh

                position={[0, size / 2, 0]}

                castShadow

                receiveShadow

            >

                <boxGeometry
                    args={[size, size, size]}
                />

                <meshStandardMaterial
                    color="#88623c"
                    roughness={1}
                />

            </mesh>

            {/* Wooden support strips */}

            {[0.2, 0.8].map((height, index) => (

                <mesh

                    key={index}

                    position={[
                        0,
                        size * height,
                        0
                    ]}

                >

                    <boxGeometry
                        args={[
                            size + 0.08,
                            0.18,
                            size + 0.08
                        ]}
                    />

                    <meshStandardMaterial
                        color="#4e3925"
                        roughness={1}
                    />

                </mesh>

            ))}

        </group>
    );
}

// ==========================================
// MILITARY BARRICADE
// ==========================================

function Barricade({

    position,

    rotation = 0

}) {

    return (

        <group

            position={position}

            rotation={[0, rotation, 0]}

        >

            {/* Bottom support */}

            <mesh

                position={[0, 0.25, 0]}

                castShadow

                receiveShadow

            >

                <boxGeometry
                    args={[5, 0.5, 1.8]}
                />

                <meshStandardMaterial
                    color="#777870"
                    roughness={1}
                />

            </mesh>

            {/* Main concrete barricade */}

            <mesh

                position={[0, 0.9, 0]}

                castShadow

                receiveShadow

            >

                <boxGeometry
                    args={[5, 1, 1]}
                />

                <meshStandardMaterial
                    color="#a4a398"
                    roughness={1}
                />

            </mesh>

            {/* Yellow warning strips */}

            {[-1.8, -0.6, 0.6, 1.8].map(
                (x, index) => (

                    <mesh

                        key={index}

                        position={[x, 0.9, 0.51]}

                        rotation={[0, 0, -0.4]}

                    >

                        <planeGeometry
                            args={[0.45, 0.8]}
                        />

                        <meshStandardMaterial
                            color="#c7a039"
                        />

                    </mesh>

                )
            )}

        </group>
    );
}

// ==========================================
// SMALL DECORATIVE ROCK
// NO KART COLLISION
// ==========================================

function Rock({

    position,

    size = 1

}) {

    return (

        <mesh

            position={[
                position[0],
                position[1] + size * 0.35,
                position[2]
            ]}

            rotation={[
                0.2,
                position[0],
                0.1
            ]}

            scale={[
                size,
                size * 0.7,
                size * 0.8
            ]}

            castShadow

            receiveShadow

        >

            <dodecahedronGeometry
                args={[1, 0]}
            />

            <meshStandardMaterial

                color="#77766b"

                roughness={1}

                flatShading

            />

        </mesh>
    );
}

// ==========================================
// DECORATIVE BUSH
// NO KART COLLISION
// ==========================================

function Bush({

    position,

    size = 1

}) {

    return (

        <group

            position={position}

            scale={size}

        >

            {[

                [0, 0.6, 0],

                [-0.7, 0.4, 0],

                [0.7, 0.4, 0],

                [0, 0.4, 0.6]

            ].map((point, index) => (

                <mesh

                    key={index}

                    position={point}

                    castShadow

                    receiveShadow

                >

                    <icosahedronGeometry
                        args={[0.9, 1]}
                    />

                    <meshStandardMaterial

                        color={

                            index % 2 === 0

                                ? "#3c5829"

                                : "#536d32"

                        }

                        roughness={1}

                        flatShading

                    />

                </mesh>

            ))}

        </group>
    );
}

// ==========================================
// COMPLETE LARGE MAP DETAILS
// ==========================================

export default function MapDetails() {

    const {

        halfSize,

        playableSize,

        wallHeight,

        wallThickness,

        roadWidth

    } = ARENA_CONFIG;

    // ======================================
    // REDUCED NATURE OBJECTS
    // ======================================

    const natureObjects = useMemo(() => {

        const occupiedPositions = [

            ...HOUSES.map(
                (item) => item.position
            ),

            ...TREES,

            ...CONTAINERS.map(
                (item) => item.position
            ),

            ...CRATES.map(
                (item) => item.position
            ),

            ...BARRICADES.map(
                (item) => item.position
            )

        ];

        return Array.from(
            { length: 20 },
            (_, index) => {

                const angle =
                    index * 2.399963;

                const radius =
                    90 + (index % 7) * 20;

                return {

                    position: [

                        Math.cos(angle) * radius,

                        0,

                        Math.sin(angle) * radius

                    ],

                    size:
                        0.5 + (index % 3) * 0.2

                };
            }
        ).filter(({ position }) => {

            const [x, , z] = position;

            // Keep roads completely clear

            if (

                Math.abs(x) < roadWidth / 2 + 8 ||

                Math.abs(z) < roadWidth / 2 + 8

            ) {

                return false;
            }

            // Keep decorations inside arena

            if (

                Math.abs(x) > halfSize - 15 ||

                Math.abs(z) > halfSize - 15

            ) {

                return false;
            }

            // Avoid placing decorations near
            // houses, trees and containers

            return occupiedPositions.every(
                ([objectX, , objectZ]) =>

                    Math.hypot(

                        x - objectX,

                        z - objectZ

                    ) > 12
            );

        });

    }, [halfSize, roadWidth]);

    return (

        <group name="largeArenaDetails">

            {/* ==================================
                NORTH BOUNDARY WALL
            ================================== */}

            <CollisionObject type="wall">

                <Wall

                    position={[
                        0,
                        wallHeight / 2,
                        -halfSize
                    ]}

                    size={[
                        playableSize,
                        wallHeight,
                        wallThickness
                    ]}

                />

            </CollisionObject>

            {/* ==================================
                SOUTH BOUNDARY WALL
            ================================== */}

            <CollisionObject type="wall">

                <Wall

                    position={[
                        0,
                        wallHeight / 2,
                        halfSize
                    ]}

                    size={[
                        playableSize,
                        wallHeight,
                        wallThickness
                    ]}

                />

            </CollisionObject>

            {/* ==================================
                WEST BOUNDARY WALL
            ================================== */}

            <CollisionObject type="wall">

                <Wall

                    position={[
                        -halfSize,
                        wallHeight / 2,
                        0
                    ]}

                    size={[
                        wallThickness,
                        wallHeight,
                        playableSize
                    ]}

                />

            </CollisionObject>

            {/* ==================================
                EAST BOUNDARY WALL
            ================================== */}

            <CollisionObject type="wall">

                <Wall

                    position={[
                        halfSize,
                        wallHeight / 2,
                        0
                    ]}

                    size={[
                        wallThickness,
                        wallHeight,
                        playableSize
                    ]}

                />

            </CollisionObject>

            {/* ==================================
                WOODEN CRATES
            ================================== */}

            {CRATES.map((crate, index) => (

                <CollisionObject

                    key={`crate-${index}`}

                    type="crate"

                >

                    <Crate

                        position={crate.position}

                        rotation={crate.rotation}

                        size={crate.size}

                    />

                </CollisionObject>

            ))}

            {/* ==================================
                MILITARY BARRICADES
            ================================== */}

            {BARRICADES.map(
                (barricade, index) => (

                    <CollisionObject

                        key={`barricade-${index}`}

                        type="barricade"

                    >

                        <Barricade

                            position={
                                barricade.position
                            }

                            rotation={
                                barricade.rotation
                            }

                        />

                    </CollisionObject>

                )
            )}

            {/* ==================================
                DECORATIVE ROCKS AND BUSHES

                NO KART COLLISION
            ================================== */}

            <group name="nonBlockingDecorations">

                {natureObjects.map(
                    (item, index) => (

                        index % 3 === 0

                            ? (

                                <Rock

                                    key={`rock-${index}`}

                                    position={
                                        item.position
                                    }

                                    size={item.size}

                                />

                            )

                            : (

                                <Bush

                                    key={`bush-${index}`}

                                    position={
                                        item.position
                                    }

                                    size={item.size}

                                />

                            )

                    )
                )}

            </group>

        </group>
    );
}