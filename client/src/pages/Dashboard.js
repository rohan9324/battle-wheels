import {
    Suspense,
    useState,
    useEffect,
    useRef,
} from "react";

import { Canvas } from "@react-three/fiber";

import {
    OrbitControls,
    ContactShadows,
} from "@react-three/drei";

import Kart from "../game/vehicles/Kart";
import MultiplayerGame from "../game/MultiplayerGame";

import { useGame } from "../context/GameContext";

import { KARTS } from "../config/KartConfig";
import { DRIVERS } from "../config/DriverConfig";
import { MAPS } from "../config/MapConfig";

import {
    POINT_OPTIONS,
    TIME_OPTIONS,
    BOT_OPTIONS,
    PLAYER_OPTIONS,
    GAME_MODES,
} from "../config/MatchConfig";

import {
    WEAPON_CATALOG,
} from "../config/WeaponCatalog";

import "./Dashboard.css";

// ==========================================
// MULTIPLAYER CONFIGURATION
// ==========================================

const API_BASE_URL = "/backend/api";

const MULTIPLAYER_WEAPONS = [
    "triple_rocket",
    "mega_nuke",
    "cannon",
    "machine_gun",
    "plasma_gun",
    "snowball",
    "shotgun",
    "mini_gun",
    "laser_blaster",
    "invincibility",
];

const ROOM_REFRESH_INTERVAL = 3000;

// ==========================================
// MULTIPLAYER API REQUEST
// ==========================================

async function multiplayerApi(endpoint, payload) {

    const controller = new AbortController();

    const timeout = setTimeout(() => {
        controller.abort();
    }, 15000);

    try {

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

                signal: controller.signal,
            }
        );

        const responseText = await response.text();

        let result;

        try {

            result = JSON.parse(responseText);

        } catch {

            throw new Error(
                `Invalid server response (HTTP ${response.status}). ` +
                "Please check the backend API."
            );
        }

        if (!response.ok || !result.success) {

            throw new Error(
                result.error ||
                result.message ||
                "Unable to complete the request."
            );
        }

        return result.data;

    } catch (error) {

        if (error.name === "AbortError") {

            throw new Error(
                "Server request timed out. Please try again."
            );
        }

        throw error;

    } finally {

        clearTimeout(timeout);
    }
}

// ==========================================
// KART PREVIEW
// ==========================================

function KartPreview({ kart, driver }) {

    return (

        <Canvas
            camera={{
                position: [5, 3.5, -6],
                fov: 40,
            }}
            dpr={[1, 1.5]}
        >

            <ambientLight intensity={1.5} />

            <directionalLight
                position={[5, 8, -5]}
                intensity={3}
            />

            <directionalLight
                position={[-4, 3, 5]}
                intensity={1.5}
                color="#8abaff"
            />

            <Suspense fallback={null}>

                <Kart
                    color={kart.color}
                    helmetColor={driver.helmetColor}
                    suitColor={driver.suitColor}
                    showWeapon={false}
                    showShield={false}
                />

                <ContactShadows
                    position={[0, -0.02, 0]}
                    opacity={0.5}
                    scale={10}
                    blur={2}
                    far={5}
                />

            </Suspense>

            <OrbitControls
                target={[0, 1, 0]}
                autoRotate
                autoRotateSpeed={1.5}
                enablePan={false}
                enableZoom={false}
                minPolarAngle={0.7}
                maxPolarAngle={1.5}
            />

        </Canvas>
    );
}

// ==========================================
// MAIN DASHBOARD
// ==========================================

export default function Dashboard() {

    const {

        settings,
        updateSettings,

        toggleWeapon,
        selectAllWeapons,
        clearAllWeapons,
        resetSettings,

        selectedKart,
        selectedDriver,
        selectedMap,

        selectedWeapons,
        selectedWeaponCount,
        availableWeaponCount,
        totalWeaponCount,

        canStartGame,
        startGame,

        roomCode,
        setRoomCode,

    } = useGame();

    // ======================================
    // DASHBOARD STATES
    // ======================================

    const [settingsOpen, setSettingsOpen] =
        useState(false);

    const [message, setMessage] =
        useState("");

    // ======================================
    // MULTIPLAYER STATES
    // ======================================

    const [multiplayerSession, setMultiplayerSession] =
        useState(null);

    const [multiplayerRoom, setMultiplayerRoom] =
        useState(null);

    const [roomLoading, setRoomLoading] =
        useState(false);

    const [roomConnectionError, setRoomConnectionError] =
        useState("");

    const requestLock = useRef(false);

    // ======================================
    // AVAILABLE MAPS
    // ======================================

    const availableMapCount = MAPS.filter(
        (map) => map.available
    ).length;

    // ======================================
    // SUPPORTED MULTIPLAYER WEAPONS
    // ======================================

    const multiplayerSelectedWeapons =
        selectedWeapons.filter(
            (weapon) =>
                MULTIPLAYER_WEAPONS.includes(weapon.id)
        );

    const isMultiplayerCreate =
        settings.mode === "create";

    // ======================================
    // UPDATE SETTINGS
    // ======================================

    function handleSettingsChange(key, value) {

        updateSettings(key, value);

        setMessage("");
    }

    // ======================================
    // SELECT MAP
    // ======================================

    function handleMapSelection(map) {

        if (!map.available) {
            return;
        }

        handleSettingsChange("mapId", map.id);
    }

    // ======================================
    // SELECT WEAPON
    // ======================================

    function handleWeaponSelection(weapon) {

        if (!weapon.available) {
            return;
        }

        if (
            isMultiplayerCreate &&
            !MULTIPLAYER_WEAPONS.includes(weapon.id)
        ) {
            return;
        }

        toggleWeapon(weapon.id);

        setMessage("");
    }

    // ======================================
    // SELECT ALL WEAPONS
    // ======================================

    function handleSelectAllWeapons() {

        if (isMultiplayerCreate) {

            const supportedWeapons =
                WEAPON_CATALOG.filter(
                    (weapon) =>
                        weapon.available &&
                        MULTIPLAYER_WEAPONS.includes(
                            weapon.id
                        )
                ).map((weapon) => weapon.id);

            updateSettings(
                "weapons",
                supportedWeapons
            );

        } else {

            selectAllWeapons();
        }

        setMessage("");
    }

    // ======================================
    // CLEAR ALL WEAPONS
    // ======================================

    function handleClearAllWeapons() {

        clearAllWeapons();

        setMessage("");
    }

    // ======================================
    // RESET SETTINGS
    // ======================================

    function handleResetSettings() {

        resetSettings();

        setMessage("");
    }

    // ======================================
    // CREATE OR JOIN MULTIPLAYER ROOM
    // ======================================

    async function connectRoom(mode) {

        if (requestLock.current) {
            return;
        }

        requestLock.current = true;

        setRoomLoading(true);
        setMessage("");
        setRoomConnectionError("");

        try {

            const playerName =
                settings.playerName.trim();

            if (
                !/^[\p{L}\p{N} _-]{2,30}$/u.test(
                    playerName
                )
            ) {

                throw new Error(
                    "Enter a valid player name with at least 2 characters."
                );
            }

            const payload = {

                player_name: playerName,

                kart_id: settings.kartId,

                driver_id: settings.driverId,
            };

            // ==============================
            // CREATE ROOM
            // ==============================

            if (mode === "create") {

                const weaponIds =
                    multiplayerSelectedWeapons.map(
                        (weapon) => weapon.id
                    );

                if (weaponIds.length === 0) {

                    throw new Error(
                        "Select at least one supported multiplayer weapon."
                    );
                }

                Object.assign(payload, {

                    map_id: settings.mapId,

                    match_type:
                        settings.matchType === "timer"
                            ? "time"
                            : "points",

                    target_points:
                        Number(settings.targetPoints),

                    duration:
                        Number(settings.duration),

                    max_players:
                        Number(settings.maxPlayers),

                    selected_weapons: weaponIds,
                });

            } else {

                // ==========================
                // JOIN ROOM
                // ==========================

                const normalizedCode =
                    roomCode.trim().toUpperCase();

                if (
                    !/^[A-Z2-9]{6}$/.test(
                        normalizedCode
                    )
                ) {

                    throw new Error(
                        "Enter a valid 6-character room code."
                    );
                }

                payload.room_code = normalizedCode;
            }

            // ==============================
            // CALL LIVE BACKEND
            // ==============================

            const endpoint =
                mode === "create"
                    ? "create_room"
                    : "join_room";

            const data = await multiplayerApi(
                endpoint,
                payload
            );

            // ==============================
            // VALIDATE SERVER RESPONSE
            // ==============================

            if (
                !data?.session_token ||
                !data?.room_code ||
                !data?.player_id ||
                !data?.room
            ) {

                throw new Error(
                    "Invalid room data received from the server."
                );
            }

            // ==============================
            // SAVE CURRENT SESSION
            // ==============================

            setMultiplayerSession(data);

            setMultiplayerRoom(data.room);

            setRoomCode(data.room_code);

            setMessage(
                mode === "create"
                    ? "Room created successfully."
                    : "Room joined successfully."
            );

        } catch (error) {

            setMessage(
                error.message ||
                "Unable to connect to the multiplayer server."
            );

        } finally {

            requestLock.current = false;

            setRoomLoading(false);
        }
    }

    // ======================================
    // AUTOMATIC ROOM SYNCHRONIZATION
    // ======================================

    useEffect(() => {

        if (
            !multiplayerSession?.session_token ||
            multiplayerRoom?.status === "playing" ||
            multiplayerRoom?.status === "finished"
        ) {
            return;
        }

        let cancelled = false;

        let timer = null;

        async function refreshRoom() {

            if (cancelled) {
                return;
            }

            try {

                if (!requestLock.current) {

                    const room = await multiplayerApi(
                        "get_room",
                        {
                            session_token:
                                multiplayerSession.session_token,
                        }
                    );

                    if (
                        !cancelled &&
                        !requestLock.current
                    ) {

                        if (
                            !room ||
                            !Array.isArray(room.players)
                        ) {

                            throw new Error(
                                "Invalid room information."
                            );
                        }

                        setMultiplayerRoom(room);

                        setRoomConnectionError("");
                    }
                }

            } catch (error) {

                if (!cancelled) {

                    setRoomConnectionError(
                        error.message ||
                        "Unable to refresh room."
                    );
                }

            } finally {

                if (!cancelled) {

                    timer = setTimeout(
                        refreshRoom,
                        ROOM_REFRESH_INTERVAL
                    );
                }
            }
        }

        timer = setTimeout(
            refreshRoom,
            ROOM_REFRESH_INTERVAL
        );

        return () => {

            cancelled = true;

            clearTimeout(timer);
        };

    }, [
        multiplayerSession,
        multiplayerRoom?.status,
    ]);

    // ======================================
    // COPY ROOM CODE
    // ======================================

    async function copyRoomCode() {

        if (!multiplayerRoom?.room_code) {
            return;
        }

        try {

            await navigator.clipboard.writeText(
                multiplayerRoom.room_code
            );

            setMessage(
                "Room code copied. Share it with your friends."
            );

        } catch {

            setMessage(
                `Copy this room code manually: ${multiplayerRoom.room_code}`
            );
        }
    }

    // ======================================
    // COPY ROOM INVITATION LINK
    // ======================================

    async function copyInviteLink() {

        if (!multiplayerRoom?.room_code) {
            return;
        }

        const inviteUrl = new URL(
            window.location.origin
        );

        inviteUrl.searchParams.set(
            "room",
            multiplayerRoom.room_code
        );

        try {

            await navigator.clipboard.writeText(
                inviteUrl.toString()
            );

            setMessage(
                "Invitation link copied successfully."
            );

        } catch {

            setMessage(inviteUrl.toString());
        }
    }

    // ======================================
    // HANDLE INVITATION LINK
    // ======================================

    useEffect(() => {

        const params = new URLSearchParams(
            window.location.search
        );

        const inviteCode = params.get("room");

        if (!inviteCode) {
            return;
        }

        const normalizedCode =
            inviteCode.trim().toUpperCase();

        if (
            /^[A-Z2-9]{6}$/.test(normalizedCode)
        ) {

            updateSettings("mode", "join");

            setRoomCode(normalizedCode);

            setMessage(
                "Invitation received. Enter your name and join the room."
            );
        }

        // Process invitation only when dashboard loads.

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ======================================
    // LEAVE MULTIPLAYER ROOM
    // ======================================

    async function leaveMultiplayerRoom() {

        if (
            requestLock.current ||
            !multiplayerSession
        ) {
            return;
        }

        requestLock.current = true;

        setRoomLoading(true);

        setMessage("");

        try {

            await multiplayerApi(
                "leave_room",
                {
                    session_token:
                        multiplayerSession.session_token,
                }
            );

            setMultiplayerSession(null);

            setMultiplayerRoom(null);

            setRoomCode("");

            setRoomConnectionError("");

            const currentUrl = new URL(
                window.location.href
            );

            currentUrl.searchParams.delete("room");

            window.history.replaceState(
                {},
                "",
                currentUrl.toString()
            );

            setMessage(
                "Room left successfully."
            );

        } catch (error) {

            setMessage(
                error.message ||
                "Unable to leave the room."
            );

        } finally {

            requestLock.current = false;

            setRoomLoading(false);
        }
    }

    // ======================================
    // HANDLE PLAY BUTTON
    // ======================================
    async function handlePlayerReady(isReady) {
        if (
            requestLock.current ||
            !multiplayerSession ||
            multiplayerRoom?.status !== "waiting"
        ) {
            return;
        }

        requestLock.current = true;
        setRoomLoading(true);
        setMessage("");

        try {
            const data = await multiplayerApi(
                "player_ready",
                {
                    session_token:
                        multiplayerSession.session_token,
                    is_ready: Boolean(isReady),
                }
            );

            setMultiplayerRoom(data.room);
            setRoomConnectionError("");

            setMessage(
                data.is_ready
                    ? "You are ready for battle!"
                    : "You are not ready."
            );

        } catch (error) {
            setMessage(
                error.message ||
                "Unable to update ready status."
            );

        } finally {
            requestLock.current = false;
            setRoomLoading(false);
        }
    }

    async function handleStartMultiplayerGame() {
        if (
            requestLock.current ||
            !multiplayerSession ||
            multiplayerRoom?.status !== "waiting" ||
            !multiplayerRoom?.can_start
        ) {
            return;
        }

        const isHost =
            Number(multiplayerRoom.host_player_id) ===
            Number(multiplayerSession.player_id);

        if (!isHost) {
            setMessage("Only the host can start the match.");
            return;
        }

        requestLock.current = true;
        setRoomLoading(true);
        setMessage("");

        try {
            const data = await multiplayerApi(
                "start_game",
                {
                    session_token:
                        multiplayerSession.session_token,
                }
            );

            if (!data?.match_id || !data?.room) {
                throw new Error(
                    "Invalid match information received."
                );
            }

            setMultiplayerRoom(data.room);
            setRoomConnectionError("");

            setMessage(
                `Match #${data.match_number} initialized successfully!`
            );

        } catch (error) {
            setMessage(
                error.message ||
                "Unable to start the match."
            );

        } finally {
            requestLock.current = false;
            setRoomLoading(false);
        }
    }
    async function handlePlay() {

        setMessage("");

        if (
            roomLoading ||
            requestLock.current ||
            multiplayerSession
        ) {
            return;
        }

        if (!settings.playerName.trim()) {

            setMessage(
                "Please enter your player name."
            );

            return;
        }

        // ==================================
        // JOIN MULTIPLAYER ROOM
        // ==================================

        if (settings.mode === "join") {

            if (
                !/^[A-Z2-9]{6}$/.test(
                    roomCode.trim().toUpperCase()
                )
            ) {

                setMessage(
                    "Enter a valid 6-character room code."
                );

                return;
            }

            await connectRoom("join");

            return;
        }

        // ==================================
        // VALIDATE MAP
        // ==================================

        if (!selectedMap?.available) {

            setMessage(
                "Please select an available arena."
            );

            return;
        }

        // ==================================
        // CREATE MULTIPLAYER ROOM
        // ==================================

        if (settings.mode === "create") {

            if (
                multiplayerSelectedWeapons.length === 0
            ) {

                setMessage(
                    "Select at least one supported multiplayer weapon."
                );

                return;
            }

            await connectRoom("create");

            return;
        }

        // ==================================
        // VALIDATE SOLO WEAPONS
        // ==================================

        if (selectedWeaponCount === 0) {

            setMessage(
                "Select at least one available weapon."
            );

            return;
        }

        if (!canStartGame) {

            setMessage(
                "Please check your game settings."
            );

            return;
        }

        // ==================================
        // START SOLO MATCH
        // ==================================

        const started = startGame();

        if (!started) {

            setMessage(
                "Unable to start the match. Please check your settings."
            );
        }
    }
    // ======================================
    // HANDLE MULTIPLAYER GAME EXIT
    // ======================================

    function handleMultiplayerExit(room) {

        requestLock.current = false;

        setRoomLoading(false);

        setRoomConnectionError("");

        // RETURN TO WAITING LOBBY

        if (room?.status === "waiting") {

            setMultiplayerRoom(room);

            setMessage(
                "Returned to the multiplayer lobby."
            );

            return;
        }

        // RETURN TO MAIN DASHBOARD

        setMultiplayerSession(null);

        setMultiplayerRoom(null);

        setRoomCode("");

        const currentUrl = new URL(
            window.location.href
        );

        currentUrl.searchParams.delete("room");

        window.history.replaceState(
            {},
            "",
            currentUrl.toString()
        );

        setMessage(
            "Multiplayer session ended."
        );
    }

    // ======================================
    // ACTIVE MULTIPLAYER GAME
    // ======================================

    if (
        multiplayerSession &&
        multiplayerRoom &&
        (
            multiplayerRoom.status === "playing" ||
            multiplayerRoom.status === "finished"
        )
    ) {

        return (

            <MultiplayerGame

                session={multiplayerSession}

                onExit={handleMultiplayerExit}

            />

        );
    }
    // ======================================
    // MULTIPLAYER LOBBY
    // ======================================

    if (multiplayerRoom && multiplayerSession) {

        const players =
            multiplayerRoom.players || [];

        const connectedPlayers =
            players.filter(
                (player) =>
                    player.status === "connected"
            );

        const currentPlayer =
            players.find(
                (player) =>
                    Number(player.id) ===
                    Number(multiplayerSession.player_id)
            );

        const isHost =
            Boolean(currentPlayer?.is_host);

        const roomMap = MAPS.find(
            (map) =>
                map.id === multiplayerRoom.map_id
        );

        return (

            <main className="bw-dashboard">

                <header className="bw-header">

                    <div>

                        <div className="bw-eyebrow">
                            PRIVATE COMBAT ARENA
                        </div>

                        <h1>
                            BATTLE <span>WHEELS</span>
                        </h1>

                        <p>
                            PRIVATE MULTIPLAYER LOBBY
                        </p>

                    </div>

                    <button
                        className="bw-secondary-btn"
                        disabled={roomLoading}
                        onClick={leaveMultiplayerRoom}
                    >
                        LEAVE ROOM
                    </button>

                </header>

                <section
                    className="bw-panel"
                    style={{
                        maxWidth: "850px",
                        margin: "35px auto",
                        padding: "30px",
                    }}
                >

                    {/* ROOM CONNECTION STATUS */}

                    <div
                        style={{
                            textAlign: "center",
                            marginBottom: "25px",
                        }}
                    >

                        <span
                            style={{
                                color: roomConnectionError
                                    ? "#ff6464"
                                    : "#65df55",
                                fontWeight: 700,
                                fontSize: "13px",
                                letterSpacing: "2px",
                            }}
                        >

                            {roomConnectionError
                                ? "CONNECTION ISSUE"
                                : "CONNECTED TO SERVER"}

                        </span>

                        <h2
                            style={{
                                marginTop: "15px",
                            }}
                        >

                            {isHost
                                ? "Your Private Room"
                                : "Joined Private Room"}

                        </h2>

                        <p>
                            Invite your friends to join the battle.
                        </p>

                    </div>

                    {/* ROOM CODE */}

                    <div
                        style={{
                            background: "#10101a",
                            border: "1px solid #343448",
                            borderRadius: "15px",
                            padding: "25px",
                            textAlign: "center",
                        }}
                    >

                        <small
                            style={{
                                color: "#a0a0b5",
                                letterSpacing: "3px",
                            }}
                        >
                            ROOM CODE
                        </small>

                        <h1
                            style={{
                                color: "#ffc340",
                                fontSize: "clamp(30px, 6vw, 56px)",
                                letterSpacing: "8px",
                                margin: "15px 0",
                            }}
                        >
                            {multiplayerRoom.room_code}
                        </h1>

                        <div
                            style={{
                                display: "flex",
                                justifyContent: "center",
                                flexWrap: "wrap",
                                gap: "12px",
                            }}
                        >

                            <button
                                className="bw-secondary-btn"
                                onClick={copyRoomCode}
                            >
                                COPY ROOM CODE
                            </button>

                            <button
                                className="bw-secondary-btn"
                                onClick={copyInviteLink}
                            >
                                COPY INVITE LINK
                            </button>

                        </div>

                    </div>

                    {/* ROOM SETTINGS */}

                    <div
                        style={{
                            marginTop: "25px",
                            display: "grid",
                            gridTemplateColumns:
                                "repeat(auto-fit, minmax(130px, 1fr))",
                            gap: "12px",
                        }}
                    >

                        <div className="bw-panel">

                            <small>Arena</small>

                            <h3>
                                {roomMap?.name ||
                                    multiplayerRoom.map_id}
                            </h3>

                        </div>

                        <div className="bw-panel">

                            <small>Match Type</small>

                            <h3>

                                {multiplayerRoom.match_type === "time"
                                    ? "Time Match"
                                    : "Points Match"}

                            </h3>

                        </div>

                        <div className="bw-panel">

                            <small>Winning Target</small>

                            <h3>

                                {multiplayerRoom.match_type === "time"
                                    ? `${multiplayerRoom.duration} MIN`
                                    : `${multiplayerRoom.target_points} PTS`}

                            </h3>

                        </div>

                        <div className="bw-panel">

                            <small>Players</small>

                            <h3>

                                {connectedPlayers.length}
                                {" / "}
                                {multiplayerRoom.max_players}

                            </h3>

                        </div>

                    </div>

                    {/* PLAYER LIST */}

                    <div
                        style={{
                            marginTop: "30px",
                        }}
                    >

                        <div className="bw-section-heading">

                            <h2>Room Players</h2>

                            <span className="bw-weapon-count">

                                {connectedPlayers.length}
                                {" / "}
                                {multiplayerRoom.max_players}

                            </span>

                        </div>

                        <div
                            style={{
                                marginTop: "15px",
                            }}
                        >

                            {players.map((player) => {

                                const playerKart =
                                    KARTS.find(
                                        (kart) =>
                                            kart.id === player.kart_id
                                    );

                                const playerDriver =
                                    DRIVERS.find(
                                        (driver) =>
                                            driver.id === player.driver_id
                                    );

                                const isCurrentPlayer =
                                    Number(player.id) ===
                                    Number(multiplayerSession.player_id);

                                return (

                                    <div
                                        key={player.id}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            flexWrap: "wrap",
                                            gap: "12px",
                                            background: "#181825",
                                            border: "1px solid #303044",
                                            borderRadius: "12px",
                                            padding: "16px",
                                            marginBottom: "10px",
                                        }}
                                    >

                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "12px",
                                            }}
                                        >

                                            <div
                                                style={{
                                                    width: "42px",
                                                    height: "42px",
                                                    borderRadius: "10px",
                                                    background:
                                                        playerKart?.color ||
                                                        "#8b5cf6",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    color: "#ffffff",
                                                    fontWeight: 800,
                                                }}
                                            >

                                                {player.player_name
                                                    ?.charAt(0)
                                                    .toUpperCase()}

                                            </div>

                                            <div>

                                                <strong>

                                                    {player.player_name}

                                                    {isCurrentPlayer
                                                        ? " (You)"
                                                        : ""}

                                                </strong>

                                                <div
                                                    style={{
                                                        color: "#a0a0b5",
                                                        fontSize: "12px",
                                                        marginTop: "4px",
                                                    }}
                                                >

                                                    {playerKart?.name ||
                                                        player.kart_id}

                                                    {" / "}

                                                    {playerDriver?.name ||
                                                        player.driver_id}

                                                </div>

                                            </div>

                                        </div>

                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "10px",
                                            }}
                                        >
                                            <span
                                                style={{
                                                    color: player.is_ready
                                                        ? "#65df55"
                                                        : "#ff9f43",
                                                    fontSize: "12px",
                                                    fontWeight: 700,
                                                }}
                                            >
                                                {player.is_ready
                                                    ? "READY"
                                                    : "NOT READY"}
                                            </span>
                                            {player.is_host && (

                                                <span
                                                    style={{
                                                        color: "#ffc340",
                                                        fontSize: "12px",
                                                        fontWeight: 700,
                                                    }}
                                                >
                                                    HOST
                                                </span>

                                            )}

                                            <span
                                                style={{
                                                    color:
                                                        player.status === "connected"
                                                            ? "#65df55"
                                                            : "#ff6464",
                                                    fontSize: "12px",
                                                    fontWeight: 700,
                                                }}
                                            >

                                                {player.status === "connected"
                                                    ? "CONNECTED"
                                                    : "DISCONNECTED"}

                                            </span>

                                        </div>

                                    </div>
                                );
                            })}

                            {/* EMPTY PLAYER SLOTS */}

                            {Array.from({
                                length: Math.max(
                                    0,
                                    Number(
                                        multiplayerRoom.max_players
                                    ) - players.length
                                ),
                            }).map((_, index) => (

                                <div
                                    key={`empty-slot-${index}`}
                                    style={{
                                        border: "1px dashed #343448",
                                        borderRadius: "12px",
                                        padding: "18px",
                                        marginBottom: "10px",
                                        color: "#858599",
                                        textAlign: "center",
                                    }}
                                >
                                    Waiting for player...
                                </div>

                            ))}

                        </div>

                    </div>

                    {/* LOBBY STATUS */}

                    <div
                        style={{
                            marginTop: "25px",
                            textAlign: "center",
                        }}
                    >

                        <h3
                            style={{
                                color: "#ffc340",
                            }}
                        >

                            {multiplayerRoom.status === "playing"
                                ? "Match initialized successfully!"
                                : multiplayerRoom.status === "finished"
                                    ? "Match finished!"
                                    : multiplayerRoom.status === "closed"
                                        ? "Room closed."
                                        : connectedPlayers.length < 2
                                            ? "Waiting for friends to join..."
                                            : multiplayerRoom.can_start
                                                ? "All players are ready!"
                                                : "Waiting for players to get ready..."}

                        </h3>

                        <p
                            style={{
                                marginTop: "8px",
                                color: "#a0a0b5",
                            }}
                        >

                            {isHost
                                ? "Share the room code or invitation link."
                                : "You are connected to the host's room."}

                        </p>

                        <p
                            style={{
                                fontSize: "12px",
                                marginTop: "10px",
                                color: "#858599",
                            }}
                        >
                            Player list refreshes automatically.
                        </p>

                    </div>

                    {/* CONNECTION ERROR */}

                    {roomConnectionError && (

                        <div
                            className="bw-message"
                            role="alert"
                            style={{
                                marginTop: "20px",
                            }}
                        >
                            {roomConnectionError}
                        </div>

                    )}

                    {/* SERVER MESSAGE */}

                    {message && (

                        <div
                            className="bw-message"
                            role="status"
                            style={{
                                marginTop: "20px",
                            }}
                        >
                            {message}
                        </div>

                    )}
                    {/* MULTIPLAYER READY AND START BUTTONS */}

                    {multiplayerRoom.status === "waiting" && (
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "12px",
                                marginTop: "25px",
                            }}
                        >
                            {!isHost && (
                                <button
                                    className="bw-play-btn"
                                    disabled={
                                        roomLoading ||
                                        Boolean(roomConnectionError) ||
                                        !currentPlayer
                                    }
                                    onClick={() =>
                                        handlePlayerReady(
                                            !currentPlayer?.is_ready
                                        )
                                    }
                                    style={{
                                        width: "100%",
                                        background: currentPlayer?.is_ready
                                            ? "#dc2626"
                                            : "#22c55e",
                                        color: "#ffffff",
                                    }}
                                >
                                    {roomLoading
                                        ? "PLEASE WAIT..."
                                        : currentPlayer?.is_ready
                                            ? "NOT READY"
                                            : "I AM READY"}
                                </button>
                            )}

                            {isHost && (
                                <button
                                    className="bw-play-btn"
                                    disabled={
                                        roomLoading ||
                                        Boolean(roomConnectionError) ||
                                        !multiplayerRoom.can_start
                                    }
                                    onClick={handleStartMultiplayerGame}
                                    style={{
                                        width: "100%",
                                        opacity: multiplayerRoom.can_start
                                            ? 1
                                            : 0.5,
                                        cursor: multiplayerRoom.can_start
                                            ? "pointer"
                                            : "not-allowed",
                                    }}
                                >
                                    {roomLoading
                                        ? "PLEASE WAIT..."
                                        : multiplayerRoom.can_start
                                            ? "START GAME"
                                            : "WAITING FOR PLAYERS"}
                                </button>
                            )}

                            <p
                                style={{
                                    textAlign: "center",
                                    color: "#a0a0b5",
                                    fontSize: "13px",
                                }}
                            >
                                {isHost
                                    ? "At least 2 players must be ready."
                                    : currentPlayer?.is_ready
                                        ? "Waiting for the host to start."
                                        : "Press Ready when you are ready to play."}
                            </p>
                        </div>
                    )}

                    {multiplayerRoom.status === "playing" && (
                        <div
                            style={{
                                marginTop: "25px",
                                padding: "20px",
                                background: "#10251a",
                                border: "1px solid #22c55e",
                                borderRadius: "12px",
                                textAlign: "center",
                                color: "#65df55",
                            }}
                        >
                            <h3>MATCH INITIALIZED</h3>

                            <p style={{ marginTop: "10px" }}>
                                Server match initialization successful.
                                Multiplayer arena integration is pending.
                            </p>
                        </div>
                    )}
                    {/* LEAVE ROOM */}

                    <button
                        className="bw-play-btn"
                        disabled={roomLoading}
                        onClick={leaveMultiplayerRoom}
                        style={{
                            width: "100%",
                            marginTop: "25px",
                        }}
                    >

                        {roomLoading
                            ? "PLEASE WAIT..."
                            : "LEAVE ROOM"}

                    </button>

                </section>

                <footer className="bw-footer">
                    BATTLE WHEELS — PRIVATE MULTIPLAYER
                </footer>

            </main>
        );
    }

    // ======================================
    // MAIN DASHBOARD UI
    // ======================================

    return (

        <main className="bw-dashboard">

            {/* HEADER */}

            <header className="bw-header">

                <div>

                    <div className="bw-eyebrow">
                        PRIVATE COMBAT ARENA
                    </div>

                    <h1>
                        BATTLE <span>WHEELS</span>
                    </h1>

                    <p>
                        BUILD. DRIVE. BATTLE.
                    </p>

                </div>

                <button
                    className="bw-secondary-btn"
                    onClick={() =>
                        setSettingsOpen(!settingsOpen)
                    }
                >
                    SETTINGS
                </button>

            </header>

            {/* SETTINGS PANEL */}

            {settingsOpen && (

                <section className="bw-panel bw-settings">

                    <h2>Game Settings</h2>

                    <label>

                        <input
                            type="checkbox"
                            checked={settings.soundEnabled}
                            onChange={(event) =>
                                handleSettingsChange(
                                    "soundEnabled",
                                    event.target.checked
                                )
                            }
                        />

                        Sound effects

                    </label>

                    <label>

                        <input
                            type="checkbox"
                            checked={settings.musicEnabled}
                            onChange={(event) =>
                                handleSettingsChange(
                                    "musicEnabled",
                                    event.target.checked
                                )
                            }
                        />

                        Background music

                    </label>

                    <small>
                        Audio preferences are saved.
                        Audio playback is coming soon.
                    </small>

                    <p>
                        WASD / Arrow Keys — Drive
                    </p>

                    <p>
                        Space — Fire | Shift — Drift | R — Reset
                    </p>

                    <button
                        className="bw-secondary-btn"
                        onClick={handleResetSettings}
                    >
                        RESET SETTINGS
                    </button>

                </section>

            )}

            {/* MAIN DASHBOARD LAYOUT */}

            <div className="bw-layout">

                {/* LEFT COLUMN */}

                <div className="bw-column">

                    {/* PLAYER PROFILE */}

                    <section className="bw-panel">

                        <h2>Player Profile</h2>

                        <input
                            className="bw-input"
                            placeholder="Enter player name"
                            maxLength={20}
                            value={settings.playerName}
                            disabled={roomLoading}
                            onChange={(event) =>
                                handleSettingsChange(
                                    "playerName",
                                    event.target.value
                                )
                            }
                        />

                    </section>

                    {/* KART PREVIEW */}

                    <section className="bw-panel">

                        <h2>Your Battle Kart</h2>

                        <div className="bw-kart-preview">

                            <KartPreview
                                kart={selectedKart}
                                driver={selectedDriver}
                            />

                        </div>

                        <h3 className="bw-selected-name">
                            {selectedKart.name}
                        </h3>

                        <div className="bw-option-grid">

                            {KARTS.map((kart) => (

                                <button
                                    key={kart.id}

                                    disabled={roomLoading}

                                    className={
                                        settings.kartId === kart.id
                                            ? "bw-option selected"
                                            : "bw-option"
                                    }

                                    onClick={() =>
                                        handleSettingsChange(
                                            "kartId",
                                            kart.id
                                        )
                                    }

                                    aria-pressed={
                                        settings.kartId === kart.id
                                    }
                                >

                                    <span
                                        className="bw-color-dot"
                                        style={{
                                            background: kart.color,
                                        }}
                                    />

                                    {kart.name}

                                </button>

                            ))}

                        </div>

                    </section>

                    {/* DRIVER SELECTION */}

                    <section className="bw-panel">

                        <h2>Select Driver</h2>

                        <div className="bw-option-grid">

                            {DRIVERS.map((driver) => (

                                <button
                                    key={driver.id}

                                    disabled={roomLoading}

                                    className={
                                        settings.driverId === driver.id
                                            ? "bw-option selected"
                                            : "bw-option"
                                    }

                                    onClick={() =>
                                        handleSettingsChange(
                                            "driverId",
                                            driver.id
                                        )
                                    }

                                    aria-pressed={
                                        settings.driverId === driver.id
                                    }
                                >

                                    <span
                                        className="bw-color-dot"
                                        style={{
                                            background:
                                                driver.helmetColor,
                                        }}
                                    />

                                    {driver.name}

                                </button>

                            ))}

                        </div>

                    </section>

                </div>

                {/* RIGHT COLUMN */}

                <div className="bw-column">

                    {/* MAP SELECTION */}

                    <section className="bw-panel">

                        <div className="bw-section-heading">

                            <h2>Select Arena</h2>

                            <span className="bw-weapon-count">

                                {availableMapCount}
                                {" / "}
                                {MAPS.length} AVAILABLE

                            </span>

                        </div>

                        <div
                            className="bw-map-grid"
                            style={{
                                marginTop: "12px",
                            }}
                        >

                            {MAPS.map((map) => {

                                const isSelected =
                                    selectedMap?.id === map.id &&
                                    map.available;

                                return (

                                    <button
                                        key={map.id}

                                        disabled={
                                            !map.available ||
                                            roomLoading
                                        }

                                        className={
                                            isSelected
                                                ? "bw-map selected"
                                                : "bw-map"
                                        }

                                        style={{
                                            "--map-color": map.color,
                                        }}

                                        onClick={() =>
                                            handleMapSelection(map)
                                        }

                                        aria-pressed={isSelected}
                                    >

                                        <strong>
                                            {map.name}
                                        </strong>

                                        <small>
                                            {map.description}
                                        </small>

                                        {!map.available ? (

                                            <span className="bw-coming">
                                                COMING SOON
                                            </span>

                                        ) : (

                                            <span
                                                className="bw-coming"
                                                style={{
                                                    color: isSelected
                                                        ? "#ffc340"
                                                        : "#65df55",
                                                }}
                                            >

                                                {isSelected
                                                    ? "SELECTED"
                                                    : "AVAILABLE"}

                                            </span>

                                        )}

                                    </button>
                                );
                            })}

                        </div>

                        {settings.mode === "join" && (

                            <small
                                style={{
                                    display: "block",
                                    marginTop: "12px",
                                    color: "#a0a0b5",
                                }}
                            >
                                The host's arena will be used when joining.
                            </small>

                        )}

                    </section>

                    {/* GAME MODE */}

                    <section className="bw-panel">

                        <h2>Game Mode</h2>

                        <div className="bw-mode-grid">

                            {GAME_MODES.map((mode) => (

                                <button
                                    key={mode.id}

                                    disabled={roomLoading}

                                    className={
                                        settings.mode === mode.id
                                            ? "bw-mode selected"
                                            : "bw-mode"
                                    }

                                    onClick={() =>
                                        handleSettingsChange(
                                            "mode",
                                            mode.id
                                        )
                                    }

                                    aria-pressed={
                                        settings.mode === mode.id
                                    }
                                >

                                    <strong>
                                        {mode.name}
                                    </strong>

                                    <small>
                                        {mode.description}
                                    </small>

                                </button>

                            ))}

                        </div>

                        {/* JOIN ROOM INPUT */}

                        {settings.mode === "join" && (

                            <input
                                className="bw-input bw-room-code"

                                placeholder="ENTER ROOM CODE"

                                maxLength={6}

                                disabled={roomLoading}

                                value={roomCode}

                                onChange={(event) => {

                                    setRoomCode(
                                        event.target.value
                                            .toUpperCase()
                                            .replace(
                                                /[^A-Z2-9]/g,
                                                ""
                                            )
                                    );

                                    setMessage("");
                                }}

                                onKeyDown={(event) => {

                                    if (
                                        event.key === "Enter" &&
                                        !roomLoading
                                    ) {

                                        handlePlay();
                                    }
                                }}
                            />

                        )}

                    </section>

                    {/* MATCH RULES */}

                    {settings.mode !== "join" && (

                        <section className="bw-panel">

                            <h2>Match Rules</h2>

                            <div className="bw-option-grid">

                                {["points", "timer"].map(
                                    (type) => (

                                        <button
                                            key={type}

                                            disabled={roomLoading}

                                            className={
                                                settings.matchType === type
                                                    ? "bw-option selected"
                                                    : "bw-option"
                                            }

                                            onClick={() =>
                                                handleSettingsChange(
                                                    "matchType",
                                                    type
                                                )
                                            }

                                            aria-pressed={
                                                settings.matchType === type
                                            }
                                        >

                                            {type === "points"
                                                ? "Points Match"
                                                : "Time Match"}

                                        </button>

                                    )
                                )}

                            </div>

                            {/* POINTS OR TIME SETTINGS */}

                            <h4 className="bw-label">

                                {settings.matchType === "points"
                                    ? "Winning Points"
                                    : "Match Duration"}

                            </h4>

                            <div className="bw-choice-row">

                                {(settings.matchType === "points"
                                    ? POINT_OPTIONS
                                    : TIME_OPTIONS
                                ).map((value) => {

                                    const settingKey =
                                        settings.matchType === "points"
                                            ? "targetPoints"
                                            : "duration";

                                    const isSelected =
                                        settings[settingKey] === value;

                                    return (

                                        <button
                                            key={value}

                                            disabled={roomLoading}

                                            className={
                                                isSelected
                                                    ? "bw-option selected"
                                                    : "bw-option"
                                            }

                                            onClick={() =>
                                                handleSettingsChange(
                                                    settingKey,
                                                    value
                                                )
                                            }

                                            aria-pressed={isSelected}
                                        >

                                            {value}

                                            {settings.matchType === "points"
                                                ? " PTS"
                                                : " MIN"}

                                        </button>
                                    );
                                })}

                            </div>

                            {/* BOTS OR MAXIMUM PLAYERS */}

                            <h4 className="bw-label">

                                {settings.mode === "solo"
                                    ? "Computer Opponents"
                                    : "Maximum Players"}

                            </h4>

                            <div className="bw-choice-row">

                                {(settings.mode === "solo"
                                    ? BOT_OPTIONS
                                    : PLAYER_OPTIONS
                                ).map((value) => {

                                    const settingKey =
                                        settings.mode === "solo"
                                            ? "botCount"
                                            : "maxPlayers";

                                    const isSelected =
                                        settings[settingKey] === value;

                                    return (

                                        <button
                                            key={value}

                                            disabled={roomLoading}

                                            className={
                                                isSelected
                                                    ? "bw-option selected"
                                                    : "bw-option"
                                            }

                                            onClick={() =>
                                                handleSettingsChange(
                                                    settingKey,
                                                    value
                                                )
                                            }

                                            aria-pressed={isSelected}
                                        >

                                            {value}

                                            {settings.mode === "solo"
                                                ? " BOTS"
                                                : " PLAYERS"}

                                        </button>
                                    );
                                })}

                            </div>

                        </section>

                    )}

                </div>

            </div>

            {/* WEAPON ARSENAL */}

            {settings.mode !== "join" && (

                <section className="bw-panel bw-weapons-panel">

                    <div className="bw-section-heading">

                        <div>

                            <h2>Weapon Arsenal</h2>

                            <p>
                                Choose weapons available in mystery boxes.
                            </p>

                            <p
                                style={{
                                    marginTop: "6px",
                                }}
                            >

                                {isMultiplayerCreate

                                    ? `${WEAPON_CATALOG.filter(
                                        (weapon) =>
                                            weapon.available &&
                                            MULTIPLAYER_WEAPONS.includes(
                                                weapon.id
                                            )
                                    ).length} multiplayer weapons available`

                                    : `${availableWeaponCount} of ${totalWeaponCount} weapons available`
                                }

                            </p>

                        </div>

                        <span className="bw-weapon-count">

                            {isMultiplayerCreate
                                ? multiplayerSelectedWeapons.length
                                : selectedWeaponCount}

                            {" SELECTED"}

                        </span>

                    </div>

                    {/* WEAPON SELECTION ACTIONS */}

                    <div className="bw-weapon-actions">

                        <button
                            className="bw-secondary-btn"

                            onClick={handleSelectAllWeapons}

                            disabled={roomLoading}
                        >
                            SELECT ALL
                        </button>

                        <button
                            className="bw-secondary-btn"

                            onClick={handleClearAllWeapons}

                            disabled={
                                roomLoading ||
                                selectedWeaponCount === 0
                            }
                        >
                            CLEAR ALL
                        </button>

                    </div>

                    {/* ALL WEAPON CARDS */}

                    <div className="bw-weapon-grid">

                        {WEAPON_CATALOG.map((weapon) => {

                            const isSupported =
                                !isMultiplayerCreate ||
                                MULTIPLAYER_WEAPONS.includes(
                                    weapon.id
                                );

                            const isAvailable =
                                weapon.available &&
                                isSupported;

                            const isSelected =
                                isAvailable &&
                                settings.weapons.includes(
                                    weapon.id
                                );

                            return (

                                <button
                                    key={weapon.id}

                                    disabled={
                                        !isAvailable ||
                                        roomLoading
                                    }

                                    className={
                                        isSelected
                                            ? "bw-weapon selected"
                                            : "bw-weapon"
                                    }

                                    onClick={() =>
                                        handleWeaponSelection(weapon)
                                    }

                                    aria-pressed={isSelected}
                                >

                                    <span
                                        className="bw-weapon-symbol"
                                        style={{
                                            color: weapon.color,
                                        }}
                                    >
                                        +
                                    </span>

                                    <strong>
                                        {weapon.name}
                                    </strong>

                                    <small>

                                        {!weapon.available

                                            ? "COMING SOON"

                                            : !isSupported

                                                ? "SOLO ONLY"

                                                : isSelected

                                                    ? "ENABLED"

                                                    : "DISABLED"}

                                    </small>

                                </button>
                            );
                        })}

                    </div>

                    {/* EMPTY WEAPON WARNING */}

                    {(isMultiplayerCreate
                        ? multiplayerSelectedWeapons.length === 0
                        : selectedWeaponCount === 0
                    ) && (

                            <div
                                className="bw-message"
                                role="status"
                            >

                                Select at least one available weapon.

                            </div>

                        )}

                </section>

            )}

            {/* MATCH SUMMARY AND PLAY BUTTON */}

            <section className="bw-play-section">

                <div>

                    <strong>

                        {settings.mode === "join"
                            ? "Join Private Room"
                            : selectedMap?.name || "Select Arena"}

                    </strong>

                    <p>

                        {selectedKart.name}

                        {" / "}

                        {selectedDriver.name}

                    </p>

                    {settings.mode !== "join" && (

                        <>

                            <small>

                                {settings.matchType === "points"

                                    ? `${settings.targetPoints} Points Match`

                                    : `${settings.duration} Minute Match`}

                                {" | "}

                                {settings.mode === "solo"

                                    ? `${settings.botCount} Bots`

                                    : `${settings.maxPlayers} Players`}

                                {" | "}

                                {isMultiplayerCreate
                                    ? multiplayerSelectedWeapons.length
                                    : selectedWeaponCount}

                                {" Weapons"}

                            </small>

                            {(isMultiplayerCreate
                                ? multiplayerSelectedWeapons
                                : selectedWeapons
                            ).length > 0 && (

                                    <small>

                                        Weapons:{" "}

                                        {(isMultiplayerCreate
                                            ? multiplayerSelectedWeapons
                                            : selectedWeapons
                                        )
                                            .map(
                                                (weapon) => weapon.name
                                            )
                                            .join(", ")}

                                    </small>

                                )}

                        </>

                    )}

                    {settings.mode === "solo" && (

                        <small>
                            Solo battle with computer opponents.
                        </small>

                    )}

                    {settings.mode === "create" && (

                        <small>
                            Create a private room and invite your friends.
                        </small>

                    )}

                    {settings.mode === "join" && (

                        <small>

                            {roomCode
                                ? `Room Code: ${roomCode}`
                                : "Enter the room code shared by your friend."}

                        </small>

                    )}

                </div>

                <button
                    className="bw-play-btn"

                    onClick={handlePlay}

                    disabled={roomLoading}
                >

                    {roomLoading

                        ? settings.mode === "create"

                            ? "CREATING ROOM..."

                            : "JOINING ROOM..."

                        : settings.mode === "join"

                            ? "JOIN ROOM"

                            : settings.mode === "create"

                                ? "CREATE ROOM"

                                : "START PRACTICE"}

                </button>

            </section>

            {/* VALIDATION MESSAGE */}

            {message && (

                <div
                    className="bw-message"
                    role="status"
                >
                    {message}
                </div>

            )}

            {/* FOOTER */}

            <footer className="bw-footer">

                BATTLE WHEELS — V1.0 DEVELOPMENT BUILD

            </footer>

        </main>
    );
}