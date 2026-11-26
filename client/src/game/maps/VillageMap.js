import {
    useMemo,
    useEffect,
    useRef,
    Suspense
} from "react";

import {
    useTexture,
    useGLTF
} from "@react-three/drei";

import * as THREE from "three";

import MapDetails from "./MapDetails";

import {
    ARENA_CONFIG,
    HOUSES,
    TREES,
    CONTAINERS
} from "./ArenaConfig";

import {
    registerKartCollider,
    unregisterKartCollider
} from "../physics/KartCollision";

// ==========================================
// MODEL PATHS
// ==========================================

const MODELS = {

    house: "/models/house.glb",

    tree: "/models/tree.glb",

    container: "/models/container.glb",

};

// ==========================================
// REPEATED TEXTURE
// ==========================================

function useRepeatedTexture(
    path,
    repeatX,
    repeatY
) {

    const source = useTexture(path);

    const texture = useMemo(() => {

        const map = source.clone();

        map.wrapS = THREE.RepeatWrapping;

        map.wrapT = THREE.RepeatWrapping;

        map.repeat.set(
            repeatX,
            repeatY
        );

        map.colorSpace =
            THREE.SRGBColorSpace;

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
// REUSABLE 3D MODEL
// ==========================================

function Model({

    path,

    position = [0, 0, 0],

    rotation = 0,

    targetSize = 8,

    sizeAxis = "max",

    colliderType = "building",

}) {

    const { scene } = useGLTF(path);

    const colliderRef = useRef(null);

    const model = useMemo(() => {

        const clonedScene = scene.clone(true);

        clonedScene.traverse((child) => {

            if (child.isMesh) {

                child.castShadow = true;

                child.receiveShadow = true;
            }
        });

        clonedScene.updateMatrixWorld(true);

        const box = new THREE.Box3()
            .setFromObject(clonedScene);

        const size = new THREE.Vector3();

        box.getSize(size);

        const originalSize =

            sizeAxis === "height"

                ? size.y

                : Math.max(
                    size.x,
                    size.y,
                    size.z
                );

        const scale =

            originalSize > 0

                ? targetSize / originalSize

                : 1;

        const wrapper = new THREE.Group();

        wrapper.add(clonedScene);

        wrapper.scale.setScalar(scale);

        wrapper.updateMatrixWorld(true);

        const scaledBox = new THREE.Box3()
            .setFromObject(wrapper);

        const center = new THREE.Vector3();

        scaledBox.getCenter(center);

        wrapper.position.set(

            -center.x,

            -scaledBox.min.y,

            -center.z

        );

        return wrapper;

    }, [scene, targetSize, sizeAxis]);

    // ======================================
    // REGISTER COLLISION
    // ======================================

    useEffect(() => {

        const object = colliderRef.current;

        if (!object) return;

        registerKartCollider(object, {

            type: colliderType,

            trunkRadius:
                targetSize * 0.045,

        });

        return () => {

            unregisterKartCollider(object);

        };

    }, [
        model,
        position,
        rotation,
        colliderType,
        targetSize
    ]);

    return (

        <group

            ref={colliderRef}

            position={position}

            rotation={[0, rotation, 0]}

            dispose={null}

        >

            <primitive object={model} />

        </group>
    );
}

// ==========================================
// LARGE GRASS GROUND
// ==========================================

function Ground() {

    const texture = useRepeatedTexture(

        "/textures/grass.jpg",

        ARENA_CONFIG.grassRepeat,

        ARENA_CONFIG.grassRepeat

    );

    return (

        <mesh

            rotation={[-Math.PI / 2, 0, 0]}

            receiveShadow

        >

            <planeGeometry

                args={[

                    ARENA_CONFIG.worldSize,

                    ARENA_CONFIG.worldSize

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
// DIRT ROAD
// ==========================================

function Road({

    position,

    size

}) {

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
// HOUSE
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

            colliderType="building"

        />
    );
}

// ==========================================
// TREE
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

            colliderType="tree"

        />
    );
}

// ==========================================
// SHIPPING CONTAINER
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

            colliderType="container"

        />
    );
}

// ==========================================
// COMPLETE LARGE VILLAGE MAP
// ==========================================

export default function VillageMap() {

    return (

        <group name="villageCollisionMap">

            {/* LARGE OPEN GRASS GROUND */}

            <Ground />

            {/* MAIN VERTICAL ROAD */}

            <Road

                position={[0, 0.02, 0]}

                size={[

                    ARENA_CONFIG.roadWidth,

                    ARENA_CONFIG.roadLength

                ]}

            />

            {/* MAIN HORIZONTAL ROAD */}

            <Road

                position={[0, 0.03, 0]}

                size={[

                    ARENA_CONFIG.roadLength,

                    ARENA_CONFIG.roadWidth

                ]}

            />

            {/* BOUNDARIES AND MAP DECORATIONS */}

            <MapDetails />

            <Suspense fallback={null}>

                {/* VILLAGE HOUSES */}

                {HOUSES.map((house, index) => (

                    <House

                        key={`house-${index}`}

                        position={house.position}

                        rotation={house.rotation}

                        size={house.size}

                    />

                ))}

                {/* SHIPPING CONTAINERS */}

                {CONTAINERS.map((container, index) => (

                    <Container

                        key={`container-${index}`}

                        position={container.position}

                        rotation={container.rotation}

                        size={container.size}

                    />

                ))}

                {/* SPREAD OUT TREES */}

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
// PRELOAD 3D MODELS
// ==========================================

useGLTF.preload(MODELS.house);

useGLTF.preload(MODELS.tree);

useGLTF.preload(MODELS.container);