import {
    createContext,
    useContext,
    useState,
    useEffect,
} from "react";

import { KARTS } from "../config/KartConfig";

import { DRIVERS } from "../config/DriverConfig";

import { MAPS } from "../config/MapConfig";

import {
    WEAPON_CATALOG,
    AVAILABLE_WEAPON_IDS,
} from "../config/WeaponCatalog";
import {
    setActiveArena
} from "../game/maps/ArenaConfig";
// ==========================================
// GAME CONTEXT
// ==========================================

const GameContext = createContext(null);

// ==========================================
// LOCAL STORAGE SETTINGS
// ==========================================

const STORAGE_KEY = "battle_wheels_settings";

const AVAILABLE_WEAPONS_KEY =
    "battle_wheels_available_weapons";

// ==========================================
// DEFAULT GAME SETTINGS
// ==========================================

const DEFAULT_SETTINGS = {

    playerName: "Player",

    mapId: "village",

    kartId: "red_racer",

    driverId: "blue_racer",

    // ======================================
    // GAME MODE
    // ======================================

    mode: "solo",

    // ======================================
    // MATCH SETTINGS
    // ======================================

    matchType: "points",

    targetPoints: 10,

    duration: 3,

    botCount: 4,

    maxPlayers: 6,

    // ======================================
    // AVAILABLE WEAPONS
    // ======================================

    weapons: [...AVAILABLE_WEAPON_IDS],

    // ======================================
    // AUDIO SETTINGS
    // ======================================

    soundEnabled: true,

    musicEnabled: true,

};

// ==========================================
// GET DEFAULT SETTINGS
// ==========================================

function getDefaultSettings() {

    return {

        ...DEFAULT_SETTINGS,

        weapons: [...AVAILABLE_WEAPON_IDS],

    };
}

// ==========================================
// VALIDATE MAP SELECTION
// ==========================================

function getValidMapId(mapId) {

    const selectedMap = MAPS.find(

        (map) =>

            map.id === mapId &&

            map.available

    );

    if (selectedMap) {

        return selectedMap.id;
    }

    const firstAvailableMap = MAPS.find(

        (map) => map.available

    );

    return firstAvailableMap?.id || "village";
}

// ==========================================
// VALIDATE KART SELECTION
// ==========================================

function getValidKartId(kartId) {

    const kart = KARTS.find(

        (item) => item.id === kartId

    );

    return kart?.id || KARTS[0]?.id || "red_racer";
}

// ==========================================
// VALIDATE DRIVER SELECTION
// ==========================================

function getValidDriverId(driverId) {

    const driver = DRIVERS.find(

        (item) => item.id === driverId

    );

    return driver?.id ||

        DRIVERS[0]?.id ||

        "blue_racer";
}

// ==========================================
// VALIDATE SELECTED WEAPONS
// ==========================================

function getValidWeaponIds(weaponIds) {

    if (!Array.isArray(weaponIds)) {

        return [...AVAILABLE_WEAPON_IDS];
    }

    return [

        ...new Set(

            weaponIds.filter(

                (id) =>

                    AVAILABLE_WEAPON_IDS.includes(id)

            )

        ),

    ];
}

// ==========================================
// LOAD SAVED SETTINGS
// ==========================================

function loadSettings() {

    try {

        const saved = localStorage.getItem(

            STORAGE_KEY

        );

        if (!saved) {

            return getDefaultSettings();
        }

        const parsed = JSON.parse(saved);

        if (

            !parsed ||

            typeof parsed !== "object" ||

            Array.isArray(parsed)

        ) {

            return getDefaultSettings();
        }

        const settings = {

            ...getDefaultSettings(),

            ...parsed,

        };

        // ==================================
        // VALIDATE SAVED MAP
        // ==================================

        settings.mapId = getValidMapId(

            settings.mapId

        );

        // ==================================
        // VALIDATE SAVED KART
        // ==================================

        settings.kartId = getValidKartId(

            settings.kartId

        );

        // ==================================
        // VALIDATE SAVED DRIVER
        // ==================================

        settings.driverId = getValidDriverId(

            settings.driverId

        );

        // ==================================
        // VALIDATE SAVED WEAPONS
        // ==================================

        settings.weapons = getValidWeaponIds(

            settings.weapons

        );

        // ==================================
        // CHECK PREVIOUS AVAILABLE WEAPONS
        // ==================================

        const previousAvailable =

            localStorage.getItem(

                AVAILABLE_WEAPONS_KEY

            );

        if (previousAvailable) {

            const previousIds = JSON.parse(

                previousAvailable

            );

            if (Array.isArray(previousIds)) {

                // ==========================
                // FIND NEWLY UNLOCKED WEAPONS
                // ==========================

                const newlyAvailable =

                    AVAILABLE_WEAPON_IDS.filter(

                        (id) =>

                            !previousIds.includes(id)

                    );

                // ==========================
                // AUTO SELECT NEW WEAPONS
                // ==========================

                settings.weapons = getValidWeaponIds([

                    ...settings.weapons,

                    ...newlyAvailable,

                ]);
            }
        }

        // ==================================
        // VALIDATE PLAYER NAME
        // ==================================

        if (typeof settings.playerName !== "string") {

            settings.playerName = "Player";
        }

        // ==================================
        // VALIDATE GAME MODE
        // ==================================

        if (

            !["solo", "create", "join"].includes(

                settings.mode

            )

        ) {

            settings.mode = "solo";
        }

        // ==================================
        // VALIDATE MATCH TYPE
        // ==================================

        if (

            !["points", "timer"].includes(

                settings.matchType

            )

        ) {

            settings.matchType = "points";
        }

        return settings;

    } catch (error) {

        console.warn(

            "Unable to load game settings:",

            error

        );

        return getDefaultSettings();
    }
}

// ==========================================
// MAIN GAME PROVIDER
// ==========================================

export function GameProvider({ children }) {

    // ======================================
    // GAME SETTINGS
    // ======================================

    const [settings, setSettings] = useState(

        loadSettings

    );

    // ======================================
    // ACTIVE SCREEN
    // ======================================

    const [screen, setScreen] = useState(

        "dashboard"

    );

    // ======================================
    // ROOM CODE
    // ======================================

    const [roomCode, setRoomCode] = useState("");

    // ======================================
    // SAVE SETTINGS AUTOMATICALLY
    // ======================================

    useEffect(() => {

        try {

            localStorage.setItem(

                STORAGE_KEY,

                JSON.stringify(settings)

            );

            localStorage.setItem(

                AVAILABLE_WEAPONS_KEY,

                JSON.stringify(

                    AVAILABLE_WEAPON_IDS

                )

            );

        } catch (error) {

            console.warn(

                "Unable to save game settings:",

                error

            );
        }

    }, [settings]);

    // ======================================
    // UPDATE GAME SETTINGS
    // ======================================

    function updateSettings(key, value) {

        setSettings((previous) => {

            let nextValue = value;

            // ==============================
            // VALIDATE MAP
            // ==============================

            if (key === "mapId") {

                nextValue = getValidMapId(value);
            }

            // ==============================
            // VALIDATE KART
            // ==============================

            if (key === "kartId") {

                nextValue = getValidKartId(value);
            }

            // ==============================
            // VALIDATE DRIVER
            // ==============================

            if (key === "driverId") {

                nextValue = getValidDriverId(value);
            }

            // ==============================
            // VALIDATE WEAPONS
            // ==============================

            if (key === "weapons") {

                nextValue = getValidWeaponIds(value);
            }

            return {

                ...previous,

                [key]: nextValue,

            };
        });
    }

    // ======================================
    // SELECT OR DESELECT SINGLE WEAPON
    // ======================================

    function toggleWeapon(id) {

        const weapon = WEAPON_CATALOG.find(

            (item) => item.id === id

        );

        if (!weapon?.available) {

            return;
        }

        setSettings((previous) => {

            const currentWeapons =

                getValidWeaponIds(

                    previous.weapons

                );

            const exists =

                currentWeapons.includes(id);

            const nextWeapons = exists

                ? currentWeapons.filter(

                    (weaponId) => weaponId !== id

                )

                : [...currentWeapons, id];

            return {

                ...previous,

                weapons: nextWeapons,

            };
        });
    }

    // ======================================
    // SELECT ALL AVAILABLE WEAPONS
    // ======================================

    function selectAllWeapons() {

        setSettings((previous) => ({

            ...previous,

            weapons: [...AVAILABLE_WEAPON_IDS],

        }));
    }

    // ======================================
    // CLEAR ALL SELECTED WEAPONS
    // ======================================

    function clearAllWeapons() {

        setSettings((previous) => ({

            ...previous,

            weapons: [],

        }));
    }

    // ======================================
    // RESET ALL GAME SETTINGS
    // ======================================

    function resetSettings() {

        setSettings(

            getDefaultSettings()

        );
    }

    // ======================================
    // CURRENT SELECTED KART
    // ======================================

    const selectedKart =

        KARTS.find(

            (kart) =>

                kart.id === settings.kartId

        ) || KARTS[0];

    // ======================================
    // CURRENT SELECTED DRIVER
    // ======================================

    const selectedDriver =

        DRIVERS.find(

            (driver) =>

                driver.id === settings.driverId

        ) || DRIVERS[0];

    // ======================================
    // CURRENT SELECTED MAP
    // ======================================

    const selectedMap =

        MAPS.find(

            (map) =>

                map.id === settings.mapId &&

                map.available

        ) ||

        MAPS.find(

            (map) => map.available

        ) ||

        MAPS[0];

    // ======================================
    // CURRENT SELECTED WEAPONS
    // ======================================

    const selectedWeapons =

        WEAPON_CATALOG.filter(

            (weapon) =>

                weapon.available &&

                settings.weapons.includes(

                    weapon.id

                )

        );

    // ======================================
    // WEAPON COUNTS
    // ======================================

    const selectedWeaponCount =

        selectedWeapons.length;

    const availableWeaponCount =

        AVAILABLE_WEAPON_IDS.length;

    const totalWeaponCount =

        WEAPON_CATALOG.length;

    // ======================================
    // CHECK GAME START REQUIREMENTS
    // ======================================

    const canStartGame = Boolean(

        settings.playerName.trim() &&

        selectedMap?.available &&

        selectedWeaponCount > 0

    );

    // ======================================
    // START GAME
    // ======================================

    function startGame() {

        if (!canStartGame) {

            return false;
        }

        // Multiplayer integration is pending.

        if (settings.mode !== "solo") {

            return false;
        }

        // Activate selected arena before loading game.

        setActiveArena(settings.mapId);

        setScreen("game");

        return true;
    }

    // ======================================
    // EXIT GAME
    // ======================================

    function exitGame() {

        setScreen("dashboard");
    }

    // ======================================
    // PROVIDE GAME DATA
    // ======================================

    return (

        <GameContext.Provider

            value={{

                // Game settings

                settings,

                updateSettings,

                resetSettings,

                // Weapon selection

                toggleWeapon,

                selectAllWeapons,

                clearAllWeapons,

                selectedWeapons,

                selectedWeaponCount,

                availableWeaponCount,

                totalWeaponCount,

                // Screen management

                screen,

                setScreen,

                // Room management

                roomCode,

                setRoomCode,

                // Game management

                startGame,

                exitGame,

                canStartGame,

                // Selected game assets

                selectedKart,

                selectedDriver,

                selectedMap,

            }}

        >

            {children}

        </GameContext.Provider>
    );
}

// ==========================================
// CUSTOM GAME CONTEXT HOOK
// ==========================================

export function useGame() {

    const context = useContext(GameContext);

    if (!context) {

        throw new Error(

            "useGame must be used inside GameProvider"

        );
    }

    return context;
}