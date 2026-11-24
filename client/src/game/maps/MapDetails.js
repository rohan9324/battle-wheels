
import { useMemo } from "react";

// ==========================================
// CONCRETE BOUNDARY WALL
// ==========================================

function Wall({ position, size }) {
    return (
        <group position={position}>
            <mesh castShadow receiveShadow>
                <boxGeometry args={size} />
                <meshStandardMaterial
                    color="#96958c"
                    roughness={1}
                />
            </mesh>

            <mesh position={[0, size[1] / 2, 0]}>
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
            <mesh
                position={[0, size / 2, 0]}
                castShadow
                receiveShadow
            >
                <boxGeometry args={[size, size, size]} />
                <meshStandardMaterial
                    color="#88623c"
                    roughness={1}
                />
            </mesh>

            {[0.2, 0.8].map((height, index) => (
                <mesh
                    key={index}
                    position={[0, size * height, 0]}
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

function Barricade({ position, rotation = 0 }) {
    return (
        <group
            position={position}
            rotation={[0, rotation, 0]}
        >
            <mesh
                position={[0, 0.25, 0]}
                castShadow
                receiveShadow
            >
                <boxGeometry args={[5, 0.5, 1.8]} />
                <meshStandardMaterial color="#777870" />
            </mesh>

            <mesh
                position={[0, 0.9, 0]}
                castShadow
                receiveShadow
            >
                <boxGeometry args={[5, 1, 1]} />
                <meshStandardMaterial
                    color="#a4a398"
                    roughness={1}
                />
            </mesh>

            {[-1.8, -0.6, 0.6, 1.8].map((x, index) => (
                <mesh
                    key={index}
                    position={[x, 0.9, 0.51]}
                    rotation={[0, 0, -0.4]}
                >
                    <planeGeometry args={[0.45, 0.8]} />
                    <meshStandardMaterial
                        color="#c7a039"
                    />
                </mesh>
            ))}
        </group>
    );
}

// ==========================================
// ROCK
// ==========================================

function Rock({ position, size = 1 }) {
    return (
        <mesh
            position={[
                position[0],
                position[1] + size * 0.35,
                position[2]
            ]}
            rotation={[0.2, position[0], 0.1]}
            scale={[size, size * 0.7, size * 0.8]}
            castShadow
            receiveShadow
        >
            <dodecahedronGeometry args={[1, 0]} />
            <meshStandardMaterial
                color="#77766b"
                roughness={1}
                flatShading
            />
        </mesh>
    );
}

// ==========================================
// BUSH
// ==========================================

function Bush({ position, size = 1 }) {
    return (
        <group position={position} scale={size}>
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
                    <icosahedronGeometry args={[0.9, 1]} />
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
// COMPLETE MAP DETAILS
// ==========================================

export default function MapDetails() {

    const natureObjects = useMemo(() => {
        return Array.from({ length: 60 }, (_, i) => {
            const angle = i * 2.399963;
            const radius = 45 + (i % 7) * 5;

            return {
                position: [
                    Math.cos(angle) * radius,
                    0,
                    Math.sin(angle) * radius
                ],
                size: 0.7 + (i % 4) * 0.3
            };
        }).filter(({ position }) => {
            return (
                Math.abs(position[0]) > 8 &&
                Math.abs(position[2]) > 8
            );
        });
    }, []);

    return (
        <group>

            {/* Arena boundary walls */}

            <Wall
                position={[0, 2, -90]}
                size={[180, 4, 1.5]}
            />

            <Wall
                position={[0, 2, 90]}
                size={[180, 4, 1.5]}
            />

            <Wall
                position={[-90, 2, 0]}
                size={[1.5, 4, 180]}
            />

            <Wall
                position={[90, 2, 0]}
                size={[1.5, 4, 180]}
            />

            {/* Wooden crates */}

            <Crate position={[-12, 0, -14]} />
            <Crate position={[-14, 0, -14]} />
            <Crate position={[-12, 2, -14]} />

            <Crate position={[12, 0, 14]} />
            <Crate position={[14, 0, 14]} />

            <Crate
                position={[-28, 0, 10]}
                rotation={0.3}
                size={2.5}
            />

            <Crate
                position={[28, 0, -10]}
                rotation={0.6}
            />

            {/* Military barricades */}

            <Barricade position={[-9, 0, -25]} />

            <Barricade position={[9, 0, 25]} />

            <Barricade
                position={[-25, 0, 9]}
                rotation={Math.PI / 2}
            />

            <Barricade
                position={[25, 0, -9]}
                rotation={Math.PI / 2}
            />

            {/* Rocks and bushes */}

            {natureObjects.map((item, index) =>
                index % 3 === 0 ? (
                    <Rock
                        key={index}
                        position={item.position}
                        size={item.size}
                    />
                ) : (
                    <Bush
                        key={index}
                        position={item.position}
                        size={item.size}
                    />
                )
            )}

        </group>
    );
}
