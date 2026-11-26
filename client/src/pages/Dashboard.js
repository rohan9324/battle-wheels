import { Suspense, useState } from "react";

import { Canvas } from "@react-three/fiber";

import {
    OrbitControls,
    ContactShadows,
} from "@react-three/drei";

import Kart from "../game/vehicles/Kart";

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
    WEAPON_CATALOG
} from "../config/WeaponCatalog";

import "./Dashboard.css";

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

    const [settingsOpen, setSettingsOpen] =
        useState(false);

    const [message, setMessage] = useState("");

    const availableMapCount = MAPS.filter(

        (map) => map.available

    ).length;

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

        toggleWeapon(weapon.id);

        setMessage("");
    }

    // ======================================
    // SELECT ALL WEAPONS
    // ======================================

    function handleSelectAllWeapons() {

        selectAllWeapons();

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
    // START GAME
    // ======================================

    function handlePlay() {

        setMessage("");

        if (!settings.playerName.trim()) {

            setMessage(
                "Please enter your player name."
            );

            return;
        }

        // ==================================
        // JOIN ROOM — FUTURE INTEGRATION
        // ==================================

        if (settings.mode === "join") {

            if (!/^[A-Z0-9]{6}$/.test(roomCode)) {

                setMessage(
                    "Enter a valid 6-character room code."
                );

                return;
            }

            setMessage(
                "Multiplayer server integration is coming soon."
            );

            return;
        }

        // ==================================
        // VALIDATE SELECTED MAP
        // ==================================

        if (!selectedMap?.available) {

            setMessage(
                "Please select an available arena."
            );

            return;
        }

        // ==================================
        // VALIDATE SELECTED WEAPONS
        // ==================================

        if (selectedWeaponCount === 0) {

            setMessage(
                "Select at least one available weapon."
            );

            return;
        }

        // ==================================
        // CREATE ROOM — FUTURE INTEGRATION
        // ==================================

        if (settings.mode === "create") {

            setMessage(
                "Room creation will be enabled after server integration."
            );

            return;
        }

        // ==================================
        // VALIDATE GAME SETTINGS
        // ==================================

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
    // DASHBOARD UI
    // ======================================

    return (

        <main className="bw-dashboard">

            {/* ==================================
                HEADER
            ================================== */}

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

            {/* ==================================
                SETTINGS PANEL
            ================================== */}

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

            {/* ==================================
                MAIN DASHBOARD LAYOUT
            ================================== */}

            <div className="bw-layout">

                {/* ==================================
                    LEFT COLUMN
                ================================== */}

                <div className="bw-column">

                    {/* PLAYER PROFILE */}

                    <section className="bw-panel">

                        <h2>Player Profile</h2>

                        <input
                            className="bw-input"
                            placeholder="Enter player name"
                            maxLength={20}
                            value={settings.playerName}
                            onChange={(event) =>
                                handleSettingsChange(
                                    "playerName",
                                    event.target.value
                                )
                            }
                        />

                    </section>

                    {/* ==================================
                        KART PREVIEW
                    ================================== */}

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

                    {/* ==================================
                        DRIVER SELECTION
                    ================================== */}

                    <section className="bw-panel">

                        <h2>Select Driver</h2>

                        <div className="bw-option-grid">

                            {DRIVERS.map((driver) => (

                                <button

                                    key={driver.id}

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

                {/* ==================================
                    RIGHT COLUMN
                ================================== */}

                <div className="bw-column">

                    {/* ==================================
                        MAP SELECTION
                    ================================== */}

                    <section className="bw-panel">

                        <div className="bw-section-heading">

                            <h2>Select Arena</h2>

                            <span className="bw-weapon-count">

                                {availableMapCount} / {MAPS.length} AVAILABLE

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

                                        disabled={!map.available}

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

                    </section>

                    {/* ==================================
                        GAME MODE
                    ================================== */}

                    <section className="bw-panel">

                        <h2>Game Mode</h2>

                        <div className="bw-mode-grid">

                            {GAME_MODES.map((mode) => (

                                <button

                                    key={mode.id}

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

                                value={roomCode}

                                onChange={(event) => {

                                    setRoomCode(

                                        event.target.value

                                            .toUpperCase()

                                            .replace(/[^A-Z0-9]/g, "")

                                    );

                                    setMessage("");
                                }}

                            />

                        )}

                    </section>

                    {/* ==================================
                        MATCH RULES
                    ================================== */}

                    {settings.mode !== "join" && (

                        <section className="bw-panel">

                            <h2>Match Rules</h2>

                            <div className="bw-option-grid">

                                {["points", "timer"].map(

                                    (type) => (

                                        <button

                                            key={type}

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

            {/* ==================================
                WEAPON ARSENAL
            ================================== */}

            <section className="bw-panel bw-weapons-panel">

                <div className="bw-section-heading">

                    <div>

                        <h2>Weapon Arsenal</h2>

                        <p>
                            Choose weapons available in mystery boxes.
                        </p>

                        <p style={{
                            marginTop: "6px",
                        }}>

                            {availableWeaponCount} of {totalWeaponCount}
                            {" weapons available"}

                        </p>

                    </div>

                    <span className="bw-weapon-count">

                        {selectedWeaponCount} / {availableWeaponCount} SELECTED

                    </span>

                </div>

                {/* ==================================
                    WEAPON SELECTION ACTIONS
                ================================== */}

                <div className="bw-weapon-actions">

                    <button

                        className="bw-secondary-btn"

                        onClick={handleSelectAllWeapons}

                        disabled={
                            availableWeaponCount === 0 ||
                            selectedWeaponCount === availableWeaponCount
                        }

                    >

                        SELECT ALL

                    </button>

                    <button

                        className="bw-secondary-btn"

                        onClick={handleClearAllWeapons}

                        disabled={selectedWeaponCount === 0}

                    >

                        CLEAR ALL

                    </button>

                </div>

                {/* ==================================
                    ALL WEAPON CARDS
                ================================== */}

                <div className="bw-weapon-grid">

                    {WEAPON_CATALOG.map((weapon) => {

                        const isSelected =

                            weapon.available &&

                            settings.weapons.includes(weapon.id);

                        return (

                            <button

                                key={weapon.id}

                                disabled={!weapon.available}

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

                                        : isSelected

                                            ? "ENABLED"

                                            : "DISABLED"}

                                </small>

                            </button>
                        );
                    })}

                </div>

                {/* ==================================
                    EMPTY WEAPON SELECTION WARNING
                ================================== */}

                {selectedWeaponCount === 0 && (

                    <div
                        className="bw-message"
                        role="status"
                    >

                        Select at least one weapon to start a match.

                    </div>

                )}

            </section>

            {/* ==================================
                MATCH SUMMARY AND START BUTTON
            ================================== */}

            <section className="bw-play-section">

                <div>

                    <strong>

                        {selectedMap?.name || "Select Arena"}

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

                                {selectedWeaponCount} Weapons

                            </small>

                            {selectedWeapons.length > 0 && (

                                <small>

                                    Weapons:{" "}

                                    {selectedWeapons

                                        .map((weapon) => weapon.name)

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

                    {settings.mode !== "solo" && (

                        <small>

                            Private multiplayer is coming soon.

                        </small>

                    )}

                </div>

                <button

                    className="bw-play-btn"

                    onClick={handlePlay}

                >

                    {settings.mode === "join"

                        ? "JOIN ROOM"

                        : settings.mode === "create"

                            ? "CREATE ROOM"

                            : "START PRACTICE"}

                </button>

            </section>

            {/* ==================================
                VALIDATION MESSAGE
            ================================== */}

            {message && (

                <div
                    className="bw-message"
                    role="status"
                >

                    {message}

                </div>

            )}

            {/* ==================================
                FOOTER
            ================================== */}

            <footer className="bw-footer">

                BATTLE WHEELS — V1.0 DEVELOPMENT BUILD

            </footer>

        </main>
    );
}