import {
    Suspense,
    useEffect,
    useRef,
    useState,
} from "react";

import { Canvas } from "@react-three/fiber";
import { Sky } from "@react-three/drei";

import MultiplayerKart from "./vehicles/MultiplayerKart";

import VillageMap from "./maps/VillageMap";
import DesertMap from "./maps/DesertMap";
import SnowMap from "./maps/SnowMap";

import {
    getArenaConfig,
    setActiveArena,
} from "./maps/ArenaConfig";

// ==========================================
// MULTIPLAYER CONFIGURATION
// ==========================================

const API_BASE_URL = "/backend/api";

const SYNC_INTERVAL = 1000;

const MAP_COMPONENTS = {
    village: VillageMap,
    desert: DesertMap,
    snow: SnowMap,
};

const MAP_LIMITS = {
    village: 237,
    desert: 67,
    snow: 137,
};

// ==========================================
// BACKEND API
// ==========================================

async function gameApi(endpoint, payload, signal) {

    const response = await fetch(
        `${API_BASE_URL}/${endpoint}.php`,
        {
            method: "POST",

            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },

            body: JSON.stringify(payload),

            cache: "no-store",

            signal,
        }
    );

    const text = await response.text();

    let result;

    try {
        result = JSON.parse(text);
    } catch {
        throw new Error(
            `Invalid server response (${response.status}).`
        );
    }

    if (!response.ok || !result.success) {

        throw new Error(
            result.error ||
            result.message ||
            "Server request failed."
        );
    }

    return result.data;
}

// ==========================================
// MULTIPLAYER GAME WORLD
// ==========================================

function MultiplayerWorld({
    snapshot,
    movementRef,
    canDrive,
}) {

    const mapId = snapshot.match.map_id;

    const MapComponent =
        MAP_COMPONENTS[mapId] || VillageMap;

    const movementLimit =
        MAP_LIMITS[mapId] || 237;

    return (

        <Suspense fallback={null}>

            <MapComponent />

            {snapshot.players
                .filter(
                    player =>
                        player.connection_status === "connected"
                )
                .map(player => (

                    <MultiplayerKart

                        key={
                            `${player.player_id}-${player.life_id}`
                        }

                        player={player}

                        isLocal={
                            Number(player.player_id) ===
                            Number(snapshot.player_id)
                        }

                        movementRef={movementRef}

                        canDrive={canDrive}

                        movementLimit={movementLimit}

                    />

                ))}

            {/* SERVER WEAPON BOXES */}

            {snapshot.weapon_pickups
                ?.filter(box => box.is_active)
                .map(box => (

                    <mesh
                        key={box.id}
                        position={[
                            Number(box.position_x),
                            0.8,
                            Number(box.position_z),
                        ]}
                    >

                        <boxGeometry
                            args={[1.4, 1.4, 1.4]}
                        />

                        <meshStandardMaterial
                            color="#ffc340"
                            emissive="#ff9900"
                            emissiveIntensity={1.2}
                        />

                    </mesh>

                ))}

        </Suspense>
    );
}

// ==========================================
// MULTIPLAYER GAME
// ==========================================

export default function MultiplayerGame({
    session,
    onExit,
}) {

    const [snapshot, setSnapshot] =
        useState(null);

    const [connectionError, setConnectionError] =
        useState("");

    const [countdown, setCountdown] =
        useState(0);

    const [remainingTime, setRemainingTime] =
        useState(null);

    const [leaving, setLeaving] =
        useState(false);

    const movementRef = useRef(null);

    const snapshotRef = useRef(null);

    const sequenceRef = useRef(0);

    const eventCursorRef = useRef(0);

    const matchIdRef = useRef(null);

    const serverOffsetRef = useRef(0);

    const exitRef = useRef(false);

    const leavingRef = useRef(false);

    const onExitRef = useRef(onExit);

    useEffect(() => {

        onExitRef.current = onExit;

    }, [onExit]);

    // ======================================
    // LIVE GAME SYNCHRONIZATION
    // ======================================

    useEffect(() => {

        if (!session?.session_token) {
            return;
        }

        let cancelled = false;

        let timer = null;

        let controller = null;

        exitRef.current = false;

        async function synchronizeGame() {

            if (cancelled || exitRef.current) {
                return;
            }

            controller = new AbortController();

            const timeout = setTimeout(() => {
                controller.abort();
            }, 15000);

            try {

                const previous =
                    snapshotRef.current;

                const movement =
                    movementRef.current;

                const serverNow =
                    Date.now() +
                    serverOffsetRef.current;

                const currentPlayer =
                    previous?.players?.find(
                        player =>
                            Number(player.player_id) ===
                            Number(previous.player_id)
                    );

                // ==========================
                // UPDATE LOCAL KART POSITION
                // ==========================

                if (
                    previous?.match?.status === "playing" &&
                    currentPlayer?.is_alive &&
                    movement &&
                    !movement.correction &&
                    serverNow >=
                        Number(previous.match.start_at) &&
                    (
                        previous.match.ends_at == null ||
                        serverNow <
                            Number(previous.match.ends_at)
                    )
                ) {

                    sequenceRef.current += 1;

                    try {

                        const updated = await gameApi(
                            "update_player",
                            {
                                session_token:
                                    session.session_token,

                                match_id:
                                    Number(previous.match.id),

                                input_sequence:
                                    sequenceRef.current,

                                position_x:
                                    Number(movement.position_x),

                                position_z:
                                    Number(movement.position_z),

                                rotation:
                                    Number(movement.rotation),

                                speed:
                                    Number(movement.speed),
                            },
                            controller.signal
                        );

                        if (
                            !updated.accepted &&
                            updated.player
                        ) {

                            movementRef.current = {
                                correction: updated.player,
                            };
                        }

                    } catch (error) {

                        if (cancelled || exitRef.current) {
                            return;
                        }

                        setConnectionError(error.message);

                        // Restore last known server position.

                        if (currentPlayer) {

                            movementRef.current = {
                                correction: currentPlayer,
                            };
                        }
                    }
                }

                // ==========================
                // FETCH ALL PLAYERS
                // ==========================

                const payload = {
                    session_token:
                        session.session_token,

                    last_event_id:
                        eventCursorRef.current,
                };

                if (matchIdRef.current !== null) {

                    payload.match_id =
                        matchIdRef.current;
                }

                const data = await gameApi(
                    "game_sync",
                    payload,
                    controller.signal
                );

                if (cancelled || exitRef.current) {
                    return;
                }

                // ==========================
                // RETURN TO LOBBY
                // ==========================

                if (data.return_to_lobby) {

                    exitRef.current = true;

                    onExitRef.current(data.room);

                    return;
                }

                if (
                    !data.match ||
                    !Array.isArray(data.players)
                ) {

                    throw new Error(
                        "Invalid game state received."
                    );
                }

                // ==========================
                // HANDLE NEW MATCH
                // ==========================

                const receivedMatchId =
                    Number(data.match.id);

                if (
                    matchIdRef.current !==
                    receivedMatchId
                ) {

                    setActiveArena(
                        data.match.map_id
                    );

                    movementRef.current = null;

                    const localPlayer =
                        data.players.find(
                            player =>
                                Number(player.player_id) ===
                                Number(data.player_id)
                        );

                    sequenceRef.current =
                        Number(
                            localPlayer?.last_input_sequence
                        ) || 0;
                }

                matchIdRef.current =
                    receivedMatchId;

                eventCursorRef.current =
                    Number(data.last_event_id) || 0;

                // ==========================
                // SERVER TIME SYNCHRONIZATION
                // ==========================

                serverOffsetRef.current =
                    Number(data.server_time) -
                    Date.now();

                snapshotRef.current = data;

                setSnapshot(data);

                setConnectionError("");

            } catch (error) {

                if (!cancelled && !exitRef.current) {

                    setConnectionError(
                        error.message ||
                        "Unable to synchronize game."
                    );
                }

            } finally {

                clearTimeout(timeout);

                if (!cancelled && !exitRef.current) {

                    timer = setTimeout(
                        synchronizeGame,
                        SYNC_INTERVAL
                    );
                }
            }
        }

        synchronizeGame();

        return () => {

            cancelled = true;

            clearTimeout(timer);

            controller?.abort();
        };

    }, [session?.session_token]);

    // ======================================
    // COUNTDOWN AND MATCH TIMER
    // ======================================

    useEffect(() => {

        function updateTimer() {

            const current =
                snapshotRef.current;

            if (!current?.match) {
                return;
            }

            const now =
                Date.now() +
                serverOffsetRef.current;

            setCountdown(
                Math.max(
                    0,
                    Math.ceil(
                        (
                            Number(current.match.start_at) -
                            now
                        ) / 1000
                    )
                )
            );

            if (current.match.ends_at != null) {

                setRemainingTime(
                    Math.max(
                        0,
                        Math.ceil(
                            (
                                Number(current.match.ends_at) -
                                now
                            ) / 1000
                        )
                    )
                );

            } else {

                setRemainingTime(null);
            }
        }

        updateTimer();

        const timer = setInterval(
            updateTimer,
            200
        );

        return () => clearInterval(timer);

    }, []);

    // ======================================
    // EXIT MULTIPLAYER MATCH
    // ======================================

    async function leaveGame() {

        if (leavingRef.current) {
            return;
        }

        leavingRef.current = true;

        setLeaving(true);

        exitRef.current = true;

        movementRef.current = null;

        const controller = new AbortController();

        const timeout = setTimeout(
            () => controller.abort(),
            15000
        );

        try {

            await gameApi(
                "leave_room",
                {
                    session_token:
                        session.session_token,
                },
                controller.signal
            );

            onExitRef.current(null);

        } catch (error) {

            setConnectionError(
                error.message ||
                "Unable to leave the match."
            );

            // Exit locally if the server is unavailable.

            onExitRef.current(null);

        } finally {

            clearTimeout(timeout);

            leavingRef.current = false;

            setLeaving(false);
        }
    }

    // ======================================
    // LOADING SCREEN
    // ======================================

    if (!snapshot?.match) {

        return (

            <div
                style={{
                    position: "fixed",
                    inset: 0,
                    background: "#09090f",
                    color: "#ffffff",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 20,
                    zIndex: 9999,
                }}
            >

                <h1>BATTLE WHEELS</h1>

                <h2>Connecting to multiplayer arena...</h2>

                {connectionError && (

                    <p style={{ color: "#ff6464" }}>
                        {connectionError}
                    </p>

                )}

                <button
                    className="bw-secondary-btn"
                    onClick={leaveGame}
                    disabled={leaving}
                >
                    EXIT GAME
                </button>

            </div>
        );
    }

    // ======================================
    // GAME INFORMATION
    // ======================================

    const match = snapshot.match;

    const arenaConfig =
        getArenaConfig(match.map_id);

    const localPlayer =
        snapshot.players.find(
            player =>
                Number(player.player_id) ===
                Number(snapshot.player_id)
        );

    const canDrive =
        match.status === "playing" &&
        countdown === 0 &&
        (
            remainingTime === null ||
            remainingTime > 0
        ) &&
        !connectionError &&
        !leaving;

    const formattedTime =
        remainingTime === null
            ? null
            : `${Math.floor(
                remainingTime / 60
            )}:${String(
                remainingTime % 60
            ).padStart(2, "0")}`;

    const fogColor =
        match.map_id === "desert"
            ? "#dfc9a5"
            : match.map_id === "snow"
                ? "#dce8f2"
                : "#c5d5df";

    // ======================================
    // RENDER MULTIPLAYER ARENA
    // ======================================

    return (

        <div
            className="game-container"
            style={{
                position: "fixed",
                inset: 0,
                overflow: "hidden",
                background: "#09090f",
                zIndex: 9999,
            }}
        >

            <Canvas
                key={match.id}

                shadows

                dpr={[1, 1.5]}

                camera={{
                    position: [0, 4.5, 9],
                    fov: 65,
                    near: 0.1,
                    far: arenaConfig.cameraFar,
                }}

                gl={{
                    antialias: true,
                    powerPreference: "high-performance",
                }}

                style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                }}
            >

                <Sky
                    sunPosition={[100, 60, 100]}
                    turbidity={3}
                    rayleigh={2}
                />

                <ambientLight intensity={0.9} />

                <hemisphereLight
                    args={[
                        "#cce5ff",
                        "#6c7048",
                        1.2,
                    ]}
                />

                <directionalLight
                    position={[100, 150, 100]}
                    intensity={2.5}
                    castShadow
                />

                <fog
                    attach="fog"
                    args={[
                        fogColor,
                        arenaConfig.fogNear,
                        arenaConfig.fogFar,
                    ]}
                />

                <MultiplayerWorld
                    snapshot={snapshot}
                    movementRef={movementRef}
                    canDrive={canDrive}
                />

            </Canvas>

            {/* GAME TITLE */}

            <div
                style={{
                    position: "absolute",
                    top: 20,
                    left: 20,
                    color: "#ffffff",
                    background: "#09090fdd",
                    padding: "15px 20px",
                    borderRadius: 12,
                    pointerEvents: "none",
                }}
            >

                <h2>BATTLE WHEELS</h2>

                <p>PRIVATE MULTIPLAYER</p>

                <p>
                    Room: {session.room_code}
                </p>

                <p
                    style={{
                        color: connectionError
                            ? "#ff6464"
                            : "#65df55",
                    }}
                >

                    {connectionError
                        ? "CONNECTION ISSUE"
                        : "SERVER CONNECTED"}

                </p>

            </div>

            {/* MATCH TIMER */}

            <div
                style={{
                    position: "absolute",
                    top: 20,
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: "#09090fdd",
                    color: "#ffc340",
                    padding: "12px 25px",
                    borderRadius: 12,
                    fontSize: 24,
                    fontWeight: 800,
                }}
            >

                {formattedTime !== null
                    ? formattedTime
                    : `TARGET: ${match.target_points} PTS`}

            </div>

            {/* PLAYER INFORMATION */}

            <div
                style={{
                    position: "absolute",
                    bottom: 25,
                    left: 25,
                    background: "#09090fdd",
                    color: "#ffffff",
                    padding: 20,
                    borderRadius: 12,
                    minWidth: 200,
                }}
            >

                <h3>
                    {localPlayer?.player_name}
                </h3>

                <p>
                    Health: {localPlayer?.health ?? 100}
                </p>

                <div
                    style={{
                        height: 10,
                        background: "#343448",
                        borderRadius: 10,
                        overflow: "hidden",
                        margin: "10px 0",
                    }}
                >

                    <div
                        style={{
                            height: "100%",
                            width: `${Math.max(
                                0,
                                Math.min(
                                    100,
                                    Number(
                                        localPlayer?.health ?? 100
                                    )
                                )
                            )}%`,
                            background: "#22c55e",
                        }}
                    />

                </div>

                <p>
                    Score: {localPlayer?.score ?? 0}
                </p>

                <small>
                    WASD / Arrow Keys — Drive
                </small>

            </div>

            {/* LIVE PLAYER LIST */}

            <div
                style={{
                    position: "absolute",
                    top: 80,
                    right: 20,
                    minWidth: 200,
                    background: "#09090fdd",
                    color: "#ffffff",
                    padding: 20,
                    borderRadius: 12,
                }}
            >

                <h3>PLAYERS</h3>

                {snapshot.players.map(player => (

                    <div
                        key={player.player_id}
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 20,
                            marginTop: 12,
                        }}
                    >

                        <span>

                            {player.player_name}

                            {Number(player.player_id) ===
                                Number(snapshot.player_id)
                                ? " (You)"
                                : ""}

                        </span>

                        <strong
                            style={{
                                color: "#ffc340",
                            }}
                        >
                            {player.score}
                        </strong>

                    </div>

                ))}

            </div>

            {/* MATCH COUNTDOWN */}

            {countdown > 0 &&
                match.status === "playing" && (

                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        background: "#00000055",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#ffffff",
                        pointerEvents: "none",
                    }}
                >

                    <h2>GET READY</h2>

                    <h1
                        style={{
                            fontSize: 100,
                            color: "#ffc340",
                        }}
                    >
                        {countdown}
                    </h1>

                </div>

            )}

            {/* MATCH FINISHED */}

            {match.status === "finished" && (

                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        background: "#000000bb",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#ffffff",
                        gap: 20,
                    }}
                >

                    <h1>MATCH FINISHED</h1>

                    <h2>

                        Winner: {
                            snapshot.players.find(
                                player =>
                                    Number(player.player_id) ===
                                    Number(match.winner_player_id)
                            )?.player_name || "No winner"
                        }

                    </h2>

                    <button
                        className="bw-play-btn"
                        onClick={leaveGame}
                        disabled={leaving}
                    >
                        EXIT MATCH
                    </button>

                </div>

            )}

            {/* CONNECTION ERROR */}

            {connectionError && (

                <div
                    style={{
                        position: "absolute",
                        bottom: 25,
                        left: "50%",
                        transform: "translateX(-50%)",
                        padding: 15,
                        background: "#401515",
                        color: "#ffffff",
                        borderRadius: 10,
                    }}
                >
                    {connectionError}
                </div>

            )}

            {/* EXIT GAME */}

            <button
                className="bw-exit-game"
                onClick={leaveGame}
                disabled={leaving}
                style={{
                    position: "absolute",
                    top: 20,
                    right: 20,
                }}
            >

                {leaving
                    ? "PLEASE WAIT..."
                    : "EXIT GAME"}

            </button>

        </div>
    );
}