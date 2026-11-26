import { Suspense } from "react";

import { Canvas } from "@react-three/fiber";

import { Sky } from "@react-three/drei";

import { useGame } from "../context/GameContext";

import WeaponPickups from "./pickups/WeaponPickups";

import VillageMap from "./maps/VillageMap";

import DesertMap from "./maps/DesertMap";

import SnowMap from "./maps/SnowMap";

import PlayerKart from "./vehicles/PlayerKart";

import WeaponSystem from "./weapons/WeaponSystem";

import BotManager from "./bots/BotManager";

import MatchManager from "./match/MatchManager";

import {
    getArenaConfig,
} from "./maps/ArenaConfig";
// ==========================================
// MAP COMPONENT REGISTRY
// ==========================================

const MAP_COMPONENTS = {

    village: VillageMap,

    desert: DesertMap,

    snow: SnowMap,

};

// ==========================================
// MAP ENVIRONMENT CONFIGURATION
// ==========================================

const MAP_ENVIRONMENTS = {

    // ======================================
    // VILLAGE ARENA
    // ======================================

    village: {

        sunPosition: [100, 60, 100],

        turbidity: 3,

        rayleigh: 2,

        ambientIntensity: 0.8,

        skyColor: "#cce5ff",

        groundColor: "#6c7048",

        hemisphereIntensity: 1.2,

        lightPosition: [120, 300, 100],

        lightColor: "#ffffff",

        lightIntensity: 2.5,

        fogColor: "#c5d5df",

    },

    // ======================================
    // DESERT OUTPOST
    // ======================================

    desert: {

        sunPosition: [100, 100, 50],

        turbidity: 5,

        rayleigh: 1.5,

        ambientIntensity: 0.95,

        skyColor: "#d9eaff",

        groundColor: "#c19a60",

        hemisphereIntensity: 1.3,

        lightPosition: [80, 150, 60],

        lightColor: "#ffe1b0",

        lightIntensity: 2.8,

        fogColor: "#dfc9a5",

    },

    // ======================================
    // SNOW VALLEY
    // ======================================

    snow: {

        sunPosition: [60, 35, 100],

        turbidity: 2,

        rayleigh: 1.2,

        ambientIntensity: 1,

        skyColor: "#d8edff",

        groundColor: "#b6c9d8",

        hemisphereIntensity: 1.4,

        lightPosition: [100, 220, 80],

        lightColor: "#e3efff",

        lightIntensity: 1.8,

        fogColor: "#dce8f2",

    },

};

// ==========================================
// MAP ENVIRONMENT
// ==========================================

function MapEnvironment({

    environment,

    arenaConfig,

}) {

    const {

        halfSize,

        fogNear,

        fogFar,

        cameraFar,

    } = arenaConfig;

    const shadowSize = halfSize * 1.5;

    return (

        <>

            {/* ==============================
                MAP SPECIFIC SKY
            ============================== */}

            <Sky

                sunPosition={
                    environment.sunPosition
                }

                turbidity={
                    environment.turbidity
                }

                rayleigh={
                    environment.rayleigh
                }

            />

            {/* ==============================
                GLOBAL AMBIENT LIGHT
            ============================== */}

            <ambientLight

                intensity={
                    environment.ambientIntensity
                }

            />

            {/* ==============================
                SKY AND GROUND LIGHT
            ============================== */}

            <hemisphereLight

                args={[

                    environment.skyColor,

                    environment.groundColor,

                    environment.hemisphereIntensity,

                ]}

            />

            {/* ==============================
                MAP SPECIFIC SUNLIGHT
            ============================== */}

            <directionalLight

                position={
                    environment.lightPosition
                }

                color={
                    environment.lightColor
                }

                intensity={
                    environment.lightIntensity
                }

                castShadow

                shadow-mapSize-width={2048}

                shadow-mapSize-height={2048}

                shadow-camera-left={-shadowSize}

                shadow-camera-right={shadowSize}

                shadow-camera-top={shadowSize}

                shadow-camera-bottom={-shadowSize}

                shadow-camera-near={0.5}

                shadow-camera-far={cameraFar}

                shadow-bias={-0.0002}

                shadow-normalBias={0.03}

            />

            {/* ==============================
                MAP SPECIFIC DISTANCE FOG
            ============================== */}

            <fog

                attach="fog"

                args={[

                    environment.fogColor,

                    fogNear,

                    fogFar,

                ]}

            />

        </>
    );
}

// ==========================================
// COMPLETE GAME WORLD
// ==========================================

function GameWorld({ MapComponent }) {

    return (

        <Suspense fallback={null}>

            {/* Selected battle arena */}

            <MapComponent />

            {/* Match score and timer */}

            <MatchManager />

            {/* Main controllable player */}

            <PlayerKart />

            {/* Solo mode opponents */}

            <BotManager />

            {/* Random weapon mystery boxes */}

            <WeaponPickups />

            {/* Common weapon firing system */}

            <WeaponSystem />

        </Suspense>
    );
}

// ==========================================
// COMPLETE GAME SCENE
// ==========================================

export default function GameScene() {

    const { settings } = useGame();

    // ======================================
    // VALIDATE SELECTED MAP
    // ======================================

    const selectedMapId = settings.mapId;

    const mapId =

        Object.prototype.hasOwnProperty.call(

            MAP_COMPONENTS,

            selectedMapId

        )

            ? selectedMapId

            : "village";

    // ======================================
    // GET SELECTED MAP COMPONENT
    // ======================================

    const MapComponent = MAP_COMPONENTS[mapId];

    // ======================================
    // ACTIVATE SELECTED ARENA CONFIGURATION
    // ======================================

    const arenaConfig = getArenaConfig(mapId);

    // ======================================
    // GET SELECTED MAP ENVIRONMENT
    // ======================================

    const environment = MAP_ENVIRONMENTS[mapId];

    // ======================================
    // RENDER COMPLETE GAME
    // ======================================

    return (

        <Canvas

            key={mapId}

            shadows

            dpr={[1, 1.5]}

            // ==================================
            // GAME CAMERA
            // ==================================

            camera={{

                position: [0, 4.5, 9],

                fov: 65,

                near: 0.1,

                far: arenaConfig.cameraFar,

            }}

            // ==================================
            // GRAPHICS SETTINGS
            // ==================================

            gl={{

                antialias: true,

                powerPreference: "high-performance",

            }}

            // ==================================
            // FULL SCREEN GAME
            // ==================================

            style={{

                position: "absolute",

                inset: 0,

                width: "100%",

                height: "100%",

                display: "block",

                touchAction: "none",

            }}

        >

            {/* ==================================
                SELECTED MAP ENVIRONMENT
            ================================== */}

            <MapEnvironment

                environment={environment}

                arenaConfig={arenaConfig}

            />

            {/* ==================================
                COMPLETE GAME WORLD
            ================================== */}

            <GameWorld

                MapComponent={MapComponent}

            />

        </Canvas>
    );
}