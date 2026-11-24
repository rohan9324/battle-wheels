
import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Sky, OrbitControls } from "@react-three/drei";
import VillageMap from "./maps/VillageMap";

export default function GameScene() {
    return (
        <Canvas
            shadows
            dpr={[1, 1.5]}
            camera={{
                position: [45, 35, 55],
                fov: 60,
                near: 0.1,
                far: 500,
            }}
            gl={{
                antialias: true,
                powerPreference: "high-performance",
            }}
        >
            {/* Realistic sky */}
            <Sky
                sunPosition={[100, 60, 100]}
                turbidity={5}
                rayleigh={2}
            />

            {/* Ambient lighting */}
            <ambientLight intensity={0.7} />

            {/* Sky and ground lighting */}
            <hemisphereLight
                args={["#cce5ff", "#6c7048", 1.2]}
            />

            {/* Sunlight */}
            <directionalLight
                position={[30, 50, 20]}
                intensity={2.5}
                castShadow
                shadow-mapSize-width={2048}
                shadow-mapSize-height={2048}
                shadow-camera-left={-80}
                shadow-camera-right={80}
                shadow-camera-top={80}
                shadow-camera-bottom={-80}
                shadow-camera-near={0.5}
                shadow-camera-far={200}
                shadow-bias={-0.0002}
                shadow-normalBias={0.03}
            />

            {/* Atmospheric fog */}
            <fog
                attach="fog"
                args={["#c5d5df", 110, 280]}
            />

            {/* Village map */}
            <Suspense fallback={null}>
                <VillageMap />
            </Suspense>

            {/* Temporary development camera */}
            <OrbitControls
                target={[0, 0, 0]}
                enableDamping
                dampingFactor={0.05}
                maxPolarAngle={Math.PI / 2 - 0.05}
                minDistance={5}
                maxDistance={150}
            />
        </Canvas>
    );
}
