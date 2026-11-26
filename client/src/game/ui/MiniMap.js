import { useEffect, useRef } from "react";

import { useGame } from "../../context/GameContext";

import playerState from "../PlayerState";

import {
    getArenaConfig,
    HOUSES,
    TREES,
    CONTAINERS,
    CRATES,
    BARRICADES,
} from "../maps/ArenaConfig";

import "./MiniMap.css";

// ==========================================
// MINI MAP SETTINGS
// ==========================================

const MAP_SIZE = 300;

const MAP_CENTER = MAP_SIZE / 2;

// ==========================================
// MAP THEMES
// ==========================================

const MAP_THEMES = {

    village: {
        name: "VILLAGE ARENA",
        background: "#66864b",
        road: "#b4a18a",
        boundary: "#d2d6cc",
        grid: "rgba(255,255,255,0.06)",
        gridSize: 50,
    },

    desert: {
        name: "DESERT OUTPOST",
        background: "#c5a16a",
        road: "#92754e",
        boundary: "#f5dfb5",
        grid: "rgba(255,255,255,0.10)",
        gridSize: 20,
    },

    snow: {
        name: "SNOW VALLEY",
        background: "#dce8ef",
        road: "#8da9bb",
        boundary: "#ffffff",
        grid: "rgba(70,100,130,0.12)",
        gridSize: 30,
    },

};

// ==========================================
// DRAW MAP BACKGROUND
// ==========================================

function drawMapBackground(
    ctx,
    arena,
    theme,
    mapId
) {

    const scale = MAP_SIZE / arena.worldSize;

    const worldToMap = (value) =>
        value * scale + MAP_CENTER;

    const worldToSize = (value) =>
        value * scale;

    ctx.clearRect(
        0,
        0,
        MAP_SIZE,
        MAP_SIZE
    );

    // ======================================
    // MAP BACKGROUND
    // ======================================

    ctx.fillStyle = theme.background;

    ctx.fillRect(
        0,
        0,
        MAP_SIZE,
        MAP_SIZE
    );

    // ======================================
    // MAP GRID
    // ======================================

    ctx.strokeStyle = theme.grid;

    ctx.lineWidth = 0.5;

    const gridSize = worldToSize(
        theme.gridSize
    );

    for (
        let x = 0;
        x <= MAP_SIZE;
        x += gridSize
    ) {

        ctx.beginPath();

        ctx.moveTo(x, 0);

        ctx.lineTo(x, MAP_SIZE);

        ctx.stroke();
    }

    for (
        let y = 0;
        y <= MAP_SIZE;
        y += gridSize
    ) {

        ctx.beginPath();

        ctx.moveTo(0, y);

        ctx.lineTo(MAP_SIZE, y);

        ctx.stroke();
    }

    // ======================================
    // MAP ROADS
    // ======================================

    const roadWidth = worldToSize(
        arena.roadWidth
    );

    const roadLength = worldToSize(
        arena.roadLength
    );

    ctx.fillStyle = theme.road;

    ctx.fillRect(
        MAP_CENTER - roadWidth / 2,
        MAP_CENTER - roadLength / 2,
        roadWidth,
        roadLength
    );

    ctx.fillRect(
        MAP_CENTER - roadLength / 2,
        MAP_CENTER - roadWidth / 2,
        roadLength,
        roadWidth
    );

    // ======================================
    // ARENA BOUNDARY
    // ======================================

    const boundaryStart = worldToMap(
        -arena.halfSize
    );

    const boundarySize = worldToSize(
        arena.playableSize
    );

    ctx.strokeStyle = theme.boundary;

    ctx.lineWidth = 2;

    ctx.strokeRect(
        boundaryStart,
        boundaryStart,
        boundarySize,
        boundarySize
    );

    // ======================================
    // DRAW RECTANGULAR OBSTACLE
    // ======================================

    function drawObstacle(
        x,
        z,
        width,
        height,
        rotation,
        color,
        borderColor
    ) {

        const w = worldToSize(width);

        const h = worldToSize(height);

        ctx.save();

        ctx.translate(
            worldToMap(x),
            worldToMap(z)
        );

        ctx.rotate(-(rotation || 0));

        ctx.fillStyle = color;

        ctx.fillRect(
            -w / 2,
            -h / 2,
            w,
            h
        );

        if (borderColor) {

            ctx.strokeStyle = borderColor;

            ctx.lineWidth = 0.8;

            ctx.strokeRect(
                -w / 2,
                -h / 2,
                w,
                h
            );
        }

        ctx.restore();
    }

    // ======================================
    // DRAW ROUND OBSTACLE
    // ======================================

    function drawRoundObstacle(
        x,
        z,
        radius,
        color
    ) {

        ctx.beginPath();

        ctx.arc(
            worldToMap(x),
            worldToMap(z),
            Math.max(2, worldToSize(radius)),
            0,
            Math.PI * 2
        );

        ctx.fillStyle = color;

        ctx.fill();
    }

    // ======================================
    // VILLAGE ARENA OBSTACLES
    // ======================================

    if (mapId === "village") {

        HOUSES.forEach((house) => {

            const [x, , z] = house.position;

            drawObstacle(
                x,
                z,
                house.size,
                house.size,
                house.rotation,
                "#a64e35",
                "#e2c1a1"
            );
        });

        CONTAINERS.forEach((container) => {

            const [x, , z] = container.position;

            drawObstacle(
                x,
                z,
                container.size,
                container.size * 0.45,
                container.rotation,
                "#35483a",
                "#91a895"
            );
        });

        TREES.forEach(([x, , z]) => {

            drawRoundObstacle(
                x,
                z,
                4.5,
                "#294c25"
            );
        });

        CRATES.forEach((crate) => {

            const [x, , z] = crate.position;

            drawObstacle(
                x,
                z,
                crate.size,
                crate.size,
                crate.rotation,
                "#916039"
            );
        });

        BARRICADES.forEach((barricade) => {

            const [x, , z] = barricade.position;

            drawObstacle(
                x,
                z,
                10,
                3,
                barricade.rotation,
                "#d5b47c"
            );
        });
    }

    // ======================================
    // DESERT OUTPOST OBSTACLES
    // ======================================

    if (mapId === "desert") {

        const bunkers = [
            [-28, -28],
            [28, 28],
            [40, -40],
            [-40, 40],
        ];

        bunkers.forEach(([x, z]) => {

            drawObstacle(
                x,
                z,
                10,
                8,
                0,
                "#746b5e",
                "#d8c8ad"
            );
        });

        const tents = [
            [-48, -42],
            [-48, -28],
            [48, 42],
            [48, 28],
        ];

        tents.forEach(([x, z]) => {

            drawObstacle(
                x,
                z,
                8,
                6,
                0,
                "#77784b",
                "#d4ca9a"
            );
        });

        const containers = [
            [-20, 20],
            [-30, 18],
            [20, -20],
            [30, -18],
        ];

        containers.forEach(([x, z]) => {

            drawObstacle(
                x,
                z,
                8,
                3.5,
                0,
                "#80523d",
                "#b98a68"
            );
        });
    }

    // Snow uses its own background, roads
    // and boundaries. Village obstacles
    // are never drawn on the snow map.
}

// ==========================================
// DRAW LIVE PLAYER
// ==========================================

function drawPlayer(ctx, arena) {

    if (!playerState.alive) {
        return;
    }

    const scale =
        MAP_SIZE / arena.worldSize;

    const playerX =
        playerState.x * scale + MAP_CENTER;

    const playerY =
        playerState.z * scale + MAP_CENTER;

    if (
        !Number.isFinite(playerX) ||
        !Number.isFinite(playerY)
    ) {
        return;
    }

    ctx.save();

    ctx.translate(
        playerX,
        playerY
    );

    ctx.rotate(
        -(playerState.rotation || 0)
    );

    // ======================================
    // PLAYER DIRECTION ARROW
    // ======================================

    ctx.beginPath();

    ctx.moveTo(0, -10);

    ctx.lineTo(-6, 7);

    ctx.lineTo(0, 4);

    ctx.lineTo(6, 7);

    ctx.closePath();

    ctx.fillStyle = "#00eaff";

    ctx.shadowColor = "#00eaff";

    ctx.shadowBlur = 8;

    ctx.fill();

    ctx.shadowBlur = 0;

    ctx.strokeStyle = "#ffffff";

    ctx.lineWidth = 1.5;

    ctx.stroke();

    ctx.restore();
}

// ==========================================
// MAIN MINI MAP COMPONENT
// ==========================================

export default function MiniMap() {

    const { settings } = useGame();

    const canvasRef = useRef(null);

    const mapId =
        Object.prototype.hasOwnProperty.call(
            MAP_THEMES,
            settings.mapId
        )
            ? settings.mapId
            : "village";

    const theme = MAP_THEMES[mapId];

    useEffect(() => {

        const canvas = canvasRef.current;

        if (!canvas) return;

        const ctx = canvas.getContext("2d");

        if (!ctx) return;

        const arena = getArenaConfig(mapId);

        const currentTheme = MAP_THEMES[mapId];

        let animationId = null;

        // ==================================
        // STATIC MAP BACKGROUND CACHE
        // ==================================

        const backgroundCanvas =
            document.createElement("canvas");

        backgroundCanvas.width = MAP_SIZE;

        backgroundCanvas.height = MAP_SIZE;

        const backgroundContext =
            backgroundCanvas.getContext("2d");

        if (!backgroundContext) return;

        drawMapBackground(
            backgroundContext,
            arena,
            currentTheme,
            mapId
        );

        // ==================================
        // LIVE MINI MAP UPDATE
        // ==================================

        const draw = () => {

            ctx.clearRect(
                0,
                0,
                MAP_SIZE,
                MAP_SIZE
            );

            ctx.drawImage(
                backgroundCanvas,
                0,
                0
            );

            drawPlayer(ctx, arena);

            animationId =
                requestAnimationFrame(draw);
        };

        draw();

        // ==================================
        // CLEANUP
        // ==================================

        return () => {

            if (animationId !== null) {

                cancelAnimationFrame(
                    animationId
                );
            }
        };

    }, [mapId]);

    // ======================================
    // MINI MAP UI
    // ======================================

    return (

        <div className="minimap-container">

            <div className="minimap-compass">

                N

            </div>

            <div className="minimap-circle">

                <canvas

                    ref={canvasRef}

                    width={MAP_SIZE}

                    height={MAP_SIZE}

                />

            </div>

            <div className="minimap-label">

                {theme.name}

            </div>

        </div>
    );
}