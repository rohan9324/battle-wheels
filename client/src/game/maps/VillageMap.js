
import { useMemo, useEffect, Suspense } from "react";
import { useTexture, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import MapDetails from "./MapDetails";
// ==========================================
// MODEL PATHS
// ==========================================

const MODELS = {
    house: "/models/house.glb",
    tree: "/models/tree.glb",
    container: "/models/container.glb",
};

// ==========================================
// REUSABLE TEXTURE HOOK
// ==========================================

function useRepeatedTexture(path, repeatX, repeatY) {
    const source = useTexture(path);

    const texture = useMemo(() => {
        const map = source.clone();

        map.wrapS = THREE.RepeatWrapping;
        map.wrapT = THREE.RepeatWrapping;

        map.repeat.set(repeatX, repeatY);

        map.colorSpace = THREE.SRGBColorSpace;
        map.anisotropy = 8;
        map.needsUpdate = true;

        return map;
    }, [source, repeatX, repeatY]);

    useEffect(() => {
        return () => texture.dispose();
    }, [texture]);

    return texture;
}

// ==========================================
// REUSABLE 3D MODEL COMPONENT
// ==========================================

function Model({
    path,
    position = [0, 0, 0],
    rotation = 0,
    targetSize = 8,
    sizeAxis = "max",
}) {
    const { scene } = useGLTF(path);

    const model = useMemo(() => {
        const clonedScene = scene.clone(true);

        clonedScene.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        // Calculate original model dimensions
        clonedScene.updateMatrixWorld(true);

        const box = new THREE.Box3().setFromObject(
            clonedScene
        );

        const size = new THREE.Vector3();

        box.getSize(size);

        // Select scaling axis
        const originalSize =
            sizeAxis === "height"
                ? size.y
                : Math.max(size.x, size.y, size.z);

        const scale =
            originalSize > 0
                ? targetSize / originalSize
                : 1;

        // Wrapper keeps original model transforms safe
        const wrapper = new THREE.Group();

        wrapper.add(clonedScene);
        wrapper.scale.setScalar(scale);

        wrapper.updateMatrixWorld(true);

        // Calculate scaled model boundaries
        const scaledBox = new THREE.Box3().setFromObject(
            wrapper
        );

        const center = new THREE.Vector3();

        scaledBox.getCenter(center);

        // Center model and align bottom with ground
        wrapper.position.set(
            -center.x,
            -scaledBox.min.y,
            -center.z
        );

        return wrapper;
    }, [scene, targetSize, sizeAxis]);

    return (
        <group
            position={position}
            rotation={[0, rotation, 0]}
            dispose={null}
        >
            <primitive object={model} />
        </group>
    );
}

// ==========================================
// REALISTIC GRASS GROUND
// ==========================================

function Ground() {
    const texture = useRepeatedTexture(
        "/textures/grass.jpg",
        60,
        60
    );

    return (
        <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            receiveShadow
        >
            <planeGeometry args={[200, 200]} />

            <meshStandardMaterial
                map={texture}
                roughness={1}
                metalness={0}
            />
        </mesh>
    );
}

// ==========================================
// REALISTIC DIRT ROAD
// ==========================================

function Road({ position, size }) {
    const texture = useRepeatedTexture(
        "/textures/dirt.jpg",
        size[0] / 4,
        size[1] / 4
    );

    return (
        <mesh
            position={position}
            rotation={[-Math.PI / 2, 0, 0]}
            receiveShadow
        >
            <planeGeometry args={size} />

            <meshStandardMaterial
                map={texture}
                roughness={1}
                metalness={0}
            />
        </mesh>
    );
}

// ==========================================
// REALISTIC HOUSE
// ==========================================

function House({
    position,
    rotation = 0,
    size = 10,
}) {
    return (
        <Model
            path={MODELS.house}
            position={position}
            rotation={rotation}
            targetSize={size}
        />
    );
}

// ==========================================
// REALISTIC TREE
// ==========================================

function Tree({
    position,
    rotation = 0,
    size = 8,
}) {
    return (
        <Model
            path={MODELS.tree}
            position={position}
            rotation={rotation}
            targetSize={size}
            sizeAxis="height"
        />
    );
}

// ==========================================
// REALISTIC SHIPPING CONTAINER
// ==========================================

function Container({
    position,
    rotation = 0,
    size = 10,
}) {
    return (
        <Model
            path={MODELS.container}
            position={position}
            rotation={rotation}
            targetSize={size}
        />
    );
}

// ==========================================
// HOUSE POSITIONS
// ==========================================

const HOUSES = [
    {
        position: [-18, 0, -18],
        rotation: 0,
        size: 10,
    },
    {
        position: [18, 0, -18],
        rotation: Math.PI,
        size: 11,
    },
    {
        position: [-18, 0, 18],
        rotation: Math.PI / 2,
        size: 10,
    },
    {
        position: [18, 0, 18],
        rotation: -Math.PI / 2,
        size: 12,
    },
    {
        position: [-35, 0, -30],
        rotation: Math.PI / 2,
        size: 12,
    },
    {
        position: [35, 0, 30],
        rotation: -Math.PI / 2,
        size: 10,
    },
];

// ==========================================
// TREE POSITIONS
// ==========================================

const TREES = [
    [-12, 0, -35],
    [12, 0, -35],
    [-35, 0, 12],
    [35, 0, -12],
    [-12, 0, 35],
    [12, 0, 35],
    [-40, 0, -40],
    [40, 0, 40],
    [40, 0, -40],
    [-40, 0, 40],

    // Additional trees
    [-50, 0, -20],
    [-50, 0, 20],
    [50, 0, -20],
    [50, 0, 20],
    [-25, 0, -50],
    [25, 0, -50],
    [-25, 0, 50],
    [25, 0, 50],
    [-55, 0, -55],
    [55, 0, 55],
    [55, 0, -55],
    [-55, 0, 55],
];

// ==========================================
// COMPLETE VILLAGE MAP
// ==========================================

export default function VillageMap() {
    return (
        <group>

            {/* Grass ground */}
            <Ground />
            <MapDetails />

            {/* Main vertical road */}
            <Road
                position={[0, 0.02, 0]}
                size={[12, 180]}
            />

            {/* Main horizontal road */}
            <Road
                position={[0, 0.03, 0]}
                size={[180, 12]}
            />

            <Suspense fallback={null}>

                {/* Realistic village houses */}
                {HOUSES.map((house, index) => (
                    <House
                        key={`house-${index}`}
                        position={house.position}
                        rotation={house.rotation}
                        size={house.size}
                    />
                ))}

                {/* Shipping containers */}
                <Container
                    position={[-25, 0, 5]}
                    rotation={0}
                    size={10}
                />

                <Container
                    position={[25, 0, -5]}
                    rotation={Math.PI}
                    size={10}
                />

                {/* Realistic village trees */}
                {TREES.map((position, index) => (
                    <Tree
                        key={`tree-${index}`}
                        position={position}
                        rotation={index * 0.7}
                        size={7 + (index % 4)}
                    />
                ))}

            </Suspense>

        </group>
    );
}

// ==========================================
// PRELOAD ALL 3D MODELS
// ==========================================

useGLTF.preload(MODELS.house);
useGLTF.preload(MODELS.tree);
useGLTF.preload(MODELS.container);
