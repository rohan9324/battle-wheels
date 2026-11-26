
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";

export default function Driver({
    helmetColor = "#1677ff",
    suitColor = "#183b78"
}) {
    const headRef = useRef();

    useFrame(({ clock }) => {
        if (!headRef.current) return;

        const time = clock.getElapsedTime();

        headRef.current.rotation.y =
            Math.sin(time * 1.5) * 0.035;

        headRef.current.rotation.z =
            Math.sin(time * 2) * 0.015;
    });

    return (
        <group position={[0, 1.02, 0.25]}>

            {/* ================= BODY ================= */}

            <mesh position={[0, 0.32, 0]} castShadow>
                <capsuleGeometry args={[0.29, 0.35, 8, 16]} />
                <meshStandardMaterial
                    color={suitColor}
                    roughness={0.7}
                />
            </mesh>

            {/* Racing suit center stripe */}

            <mesh position={[0, 0.35, -0.285]}>
                <boxGeometry args={[0.075, 0.48, 0.025]} />
                <meshStandardMaterial color="#ffffff" />
            </mesh>

            {/* ================= LEGS ================= */}

            {[-1, 1].map((side) => (
                <group key={side}>

                    <mesh
                        position={[side * 0.17, 0.02, -0.25]}
                        rotation={[Math.PI / 2, 0, 0]}
                        castShadow
                    >
                        <capsuleGeometry args={[0.13, 0.32, 6, 12]} />
                        <meshStandardMaterial color={suitColor} />
                    </mesh>

                    {/* Racing shoes */}

                    <mesh
                        position={[side * 0.17, -0.05, -0.57]}
                        castShadow
                    >
                        <boxGeometry args={[0.24, 0.20, 0.36]} />
                        <meshStandardMaterial color="#151515" />
                    </mesh>

                </group>
            ))}

            {/* ================= ARMS ================= */}

            {[-1, 1].map((side) => (
                <group key={side}>

                    {/* Upper arm */}

                    <mesh
                        position={[side * 0.30, 0.35, -0.12]}
                        rotation={[0.65, 0, side * 0.35]}
                        castShadow
                    >
                        <capsuleGeometry args={[0.105, 0.28, 6, 12]} />
                        <meshStandardMaterial color={suitColor} />
                    </mesh>

                    {/* Forearm */}

                    <mesh
                        position={[side * 0.27, 0.28, -0.48]}
                        rotation={[Math.PI / 2, 0, 0]}
                        castShadow
                    >
                        <capsuleGeometry args={[0.09, 0.42, 6, 12]} />
                        <meshStandardMaterial color={suitColor} />
                    </mesh>

                    {/* Racing gloves */}

                    <mesh
                        position={[side * 0.23, 0.28, -0.77]}
                        castShadow
                    >
                        <sphereGeometry args={[0.125, 16, 16]} />
                        <meshStandardMaterial color="#202020" />
                    </mesh>

                </group>
            ))}

            {/* ================= NECK ================= */}

            <mesh position={[0, 0.65, 0]}>
                <cylinderGeometry args={[0.14, 0.16, 0.22, 16]} />
                <meshStandardMaterial color="#e8b78d" />
            </mesh>

            {/* ================= HEAD ================= */}

            <group ref={headRef} position={[0, 1.04, 0]}>

                {/* Helmet main shell */}

                <mesh castShadow>
                    <sphereGeometry args={[0.47, 32, 32]} />
                    <meshStandardMaterial
                        color={helmetColor}
                        metalness={0.35}
                        roughness={0.23}
                    />
                </mesh>

                {/* Helmet white racing stripe */}

                <mesh rotation={[0, Math.PI / 2, 0]}>
                    <sphereGeometry
                        args={[
                            0.477,
                            32,
                            24,
                            0,
                            0.30,
                            0,
                            Math.PI
                        ]}
                    />
                    <meshStandardMaterial color="#ffffff" />
                </mesh>

                {/* Face */}

                <mesh
                    position={[0, -0.035, -0.31]}
                    scale={[1, 0.78, 0.48]}
                >
                    <sphereGeometry args={[0.35, 24, 24]} />
                    <meshStandardMaterial color="#efbf98" />
                </mesh>

                {/* Eyes */}

                {[-1, 1].map((side) => (
                    <group
                        key={side}
                        position={[side * 0.12, 0.025, -0.46]}
                    >

                        {/* Eye white */}

                        <mesh scale={[0.8, 1, 0.4]}>
                            <sphereGeometry args={[0.105, 16, 16]} />
                            <meshStandardMaterial color="#ffffff" />
                        </mesh>

                        {/* Pupil */}

                        <mesh position={[0, 0, -0.043]}>
                            <sphereGeometry args={[0.048, 16, 16]} />
                            <meshStandardMaterial color="#171717" />
                        </mesh>

                        {/* Eye reflection */}

                        <mesh position={[-0.015, 0.02, -0.08]}>
                            <sphereGeometry args={[0.015, 8, 8]} />
                            <meshStandardMaterial color="#ffffff" />
                        </mesh>

                    </group>
                ))}

                {/* Nose */}

                <mesh position={[0, -0.08, -0.47]}>
                    <sphereGeometry args={[0.055, 16, 16]} />
                    <meshStandardMaterial color="#e3a77d" />
                </mesh>

                {/* Smile */}

                <mesh
                    position={[0, -0.17, -0.435]}
                    rotation={[0, Math.PI, 0]}
                >
                    <torusGeometry args={[0.065, 0.012, 8, 24, Math.PI]} />
                    <meshStandardMaterial color="#753f32" />
                </mesh>

                {/* Helmet visor */}

                <mesh
                    position={[0, 0.13, -0.34]}
                    scale={[1, 0.32, 0.45]}
                >
                    <sphereGeometry args={[0.40, 32, 24]} />
                    <meshStandardMaterial
                        color="#101b2d"
                        metalness={0.7}
                        roughness={0.12}
                        transparent
                        opacity={0.65}
                    />
                </mesh>

                {/* Helmet side details */}

                {[-1, 1].map((side) => (
                    <mesh
                        key={side}
                        position={[side * 0.445, 0, 0]}
                        rotation={[0, 0, Math.PI / 2]}
                    >
                        <cylinderGeometry args={[0.115, 0.115, 0.065, 24]} />
                        <meshStandardMaterial
                            color="#252932"
                            metalness={0.6}
                        />
                    </mesh>
                ))}

            </group>

        </group>
    );
}
