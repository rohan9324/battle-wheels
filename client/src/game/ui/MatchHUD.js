import { useEffect, useState, useRef } from "react";

import playerState from "../PlayerState";
import matchState from "../match/MatchState";

import { getEntities } from "../combat/EntityManager";
import { useGame } from "../../context/GameContext";

import "./MatchHUD.css";

// ==========================================
// SPECIAL WEAPON STATUS CONFIGURATION
// ==========================================

const STATUS_CONFIG = [
    {
        id: "burning",
        field: "burnUntil",
        name: "BURNING",
        description: "Taking fire damage",
        color: "#ff7138",
        duration: 3000,
    },
    {
        id: "frozen",
        field: "slowUntil",
        name: "FROZEN",
        description: "Movement speed reduced",
        color: "#7bddff",
        duration: 3000,
    },
    {
        id: "stunned",
        field: "stunUntil",
        name: "STUNNED",
        description: "Movement and firing disabled",
        color: "#c084fc",
        duration: 1000,
    },
    {
        id: "emp",
        field: "empUntil",
        name: "EMP DISABLED",
        description: "Weapon firing disabled",
        color: "#818cf8",
        duration: 3000,
    },
    {
        id: "mace",
        field: "maceUntil",
        name: "MACE ACTIVE",
        description: "Spinning mace activated",
        color: "#cbd5e1",
        duration: 6000,
    },
];

// ==========================================
// FORMAT MATCH TIME
// ==========================================

function formatTime(seconds) {

    const total = Math.max(
        0,
        Math.floor(Number(seconds) || 0)
    );

    const minutes = Math.floor(total / 60);

    const remainingSeconds = total % 60;

    return (
        String(minutes).padStart(2, "0") +
        ":" +
        String(remainingSeconds).padStart(2, "0")
    );
}

// ==========================================
// CALCULATE PERCENTAGE
// ==========================================

function getPercentage(value, maximum) {

    if (maximum <= 0) {

        return 0;
    }

    return Math.max(
        0,
        Math.min(100, (value / maximum) * 100)
    );
}

// ==========================================
// GET ACTIVE SPECIAL WEAPON EFFECTS
// ==========================================

function getActiveStatusEffects(now) {

    if (
        !playerState.alive ||
        matchState.status !== "playing"
    ) {

        return [];
    }

    return STATUS_CONFIG.map((status) => {

        const remaining = Math.max(
            0,
            (Number(playerState[status.field]) || 0) - now
        );

        return {
            ...status,

            remaining,

            seconds: Math.ceil(remaining / 1000),

            percentage: getPercentage(
                remaining,
                status.duration
            ),
        };

    }).filter((status) => status.remaining > 0);
}

// ==========================================
// GET LIVE GAME DATA
// ==========================================

function getSnapshot() {

    const now = performance.now();

    const entities = getEntities();

    const leaderboard = entities

        .map((entity) => ({
            id: entity.id,
            name: entity.name,
            score: entity.score || 0,
            deaths: entity.deaths || 0,
            alive: entity.alive,
            isBot: entity.isBot,
        }))

        .sort((a, b) => {

            if (b.score !== a.score) {

                return b.score - a.score;
            }

            return a.deaths - b.deaths;
        });

    const deathEntry = matchState.killFeed?.find(

        (entry) => entry.targetId === playerState.id
    );

    // ======================================
    // LIVE PROTECTION COUNTDOWN
    // ======================================

    const protectedUntil =

        Number(playerState.protectedUntil) || 0;

    const protectionRemaining =

        playerState.alive &&
        matchState.status === "playing"

            ? Math.max(0, protectedUntil - now)

            : 0;

    const protectionSeconds = Math.ceil(

        protectionRemaining / 1000
    );

    return {

        health: playerState.health,

        maxHealth: playerState.maxHealth || 100,

        score: playerState.score || 0,

        deaths: playerState.deaths || 0,

        alive: playerState.alive,

        playerName: playerState.name,

        lifeId: playerState.lifeId,

        status: matchState.status,

        matchType: matchState.matchType,

        targetPoints: matchState.targetPoints,

        remainingTime: matchState.remainingTime,

        elapsedTime: matchState.elapsedTime,

        winner: matchState.winner,

        isDraw: matchState.isDraw,

        leaderboard,

        respawnSeconds: Math.max(
            0,
            Math.ceil(
                ((playerState.respawnAt || 0) - now) / 1000
            )
        ),

        // Protection information

        protected: protectionRemaining > 0,

        protectedUntil,

        protectionSeconds,

        protectionRemaining,

        // Special weapon status information

        activeStatusEffects: getActiveStatusEffects(now),

        // Killer information

        killerName:
            playerState.killedBy ||
            deathEntry?.attackerName ||
            "Opponent",

        killerWeapon:
            playerState.killedByWeapon ||
            deathEntry?.weaponName ||
            "Unknown Weapon",

        killFeed: (matchState.killFeed || [])

            .filter(
                (entry) => now - entry.time < 6000
            )

            .slice(0, 4),
    };
}

// ==========================================
// SHIELD ICON
// ==========================================

function ShieldIcon() {

    return (

        <svg
            width="14"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >

            <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11z" />

            <path d="m9 12 2 2 4-4" />

        </svg>
    );
}

// ==========================================
// SPECIAL WEAPON STATUS ICONS
// ==========================================

function StatusIcon({ type }) {

    const common = {

        width: 13,
        height: 13,
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: 2,
        strokeLinecap: "round",
        strokeLinejoin: "round",
        "aria-hidden": true,
    };

    switch (type) {

        case "burning":

            return (

                <svg {...common}>

                    <path d="M12 22c-4 0-7-3-7-7 0-3 2-5 4-7 0 3 2 4 2 4 3-4 2-7 2-10 4 4 6 8 6 13 0 4-3 7-7 7z" />

                </svg>
            );

        case "frozen":

            return (

                <svg {...common}>

                    <path d="M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7" />

                    <path d="m9 4 3 3 3-3M9 20l3-3 3 3" />

                    <path d="m4 10 4-1-1-4M17 19l-1-4 4-1" />

                    <path d="m4 14 4 1-1 4M17 5l-1 4 4 1" />

                </svg>
            );

        case "stunned":

            return (

                <svg {...common}>

                    <path d="m13 2-9 12h7l-1 8 10-12h-7l1-8z" />

                </svg>
            );

        case "emp":

            return (

                <svg {...common}>

                    <circle cx="12" cy="12" r="3" />

                    <path d="M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14" />

                    <path d="M8 8a6 6 0 0 0 0 8M16 8a6 6 0 0 1 0 8" />

                    <path d="m3 3 18 18" />

                </svg>
            );

        case "mace":

            return (

                <svg {...common}>

                    <circle cx="15" cy="8" r="5" />

                    <path d="M15 1v2M22 8h-2M15 13v2M8 8h2M10 3l2 2M20 3l-2 2" />

                    <path d="m11 12-8 8 2 2 8-8" />

                </svg>
            );

        default:

            return (

                <span className="bw-status-dot" />
            );
    }
}

// ==========================================
// PROTECTION INDICATOR
// ==========================================

function SpawnProtection({ data }) {

    const protectionRef = useRef({

        until: 0,

        lifeId: null,

        duration: 5000,

        isPowerUp: false,
    });

    // Remember the duration of the current shield.
    // Normal spawn protection = 5 seconds.
    // Invincibility Star = 8 seconds.

    useEffect(() => {

        if (!data.protected) {

            protectionRef.current = {

                until: 0,

                lifeId: data.lifeId,

                duration: 5000,

                isPowerUp: false,
            };

            return;
        }

        const previous = protectionRef.current;

        if (
            previous.until !== data.protectedUntil ||
            previous.lifeId !== data.lifeId
        ) {

            const isPowerUp =

                data.protectionRemaining > 5000;

            protectionRef.current = {

                until: data.protectedUntil,

                lifeId: data.lifeId,

                duration: isPowerUp ? 8000 : 5000,

                isPowerUp,
            };
        }

    }, [
        data.protected,
        data.protectedUntil,
        data.lifeId,
        data.protectionRemaining,
    ]);

    if (
        !data.protected ||
        data.protectionSeconds <= 0
    ) {

        return null;
    }

    const isPowerUp =

        protectionRef.current.until === data.protectedUntil

            ? protectionRef.current.isPowerUp

            : data.protectionRemaining > 5000;

    const duration = isPowerUp ? 8000 : 5000;

    const percentage = getPercentage(

        data.protectionRemaining,

        duration
    );

    const isExpiring =

        data.protectionSeconds === 1;

    const shieldColor = isExpiring

        ? "#ffc340"

        : isPowerUp

            ? "#ffd700"

            : "#38bdf8";

    return (

        <div
            className={
                "bw-protection-card" +
                (isExpiring ? " bw-status-expiring" : "")
            }
            style={{
                "--status-color": shieldColor,
            }}
        >

            <div className="bw-protection-header">

                <div className="bw-protection-title">

                    <ShieldIcon />

                    <span>

                        {isPowerUp

                            ? "INVINCIBILITY"

                            : "SPAWN PROTECTION"}

                    </span>

                </div>

                <strong className="bw-status-timer">

                    {data.protectionSeconds}s

                </strong>

            </div>

            <div className="bw-status-track">

                <div
                    className="bw-status-fill"
                    style={{
                        width: `${percentage}%`,
                    }}
                />

            </div>

            <div className="bw-protection-description">

                {isExpiring

                    ? "PROTECTION ENDING"

                    : "IMMUNE TO DAMAGE"}

            </div>

        </div>
    );
}

// ==========================================
// SPECIAL WEAPON STATUS INDICATORS
// ==========================================

function SpecialWeaponStatus({ data }) {

    const effects = data.activeStatusEffects || [];

    if (
        !data.alive ||
        data.status !== "playing" ||
        effects.length === 0
    ) {

        return null;
    }

    return (

        <div className="bw-special-status">

            <div className="bw-special-status-heading">

                ACTIVE EFFECTS

            </div>

            {effects.map((effect) => (

                <div
                    key={effect.id}
                    className={
                        "bw-status-card" +
                        (
                            effect.seconds === 1
                                ? " bw-status-expiring"
                                : ""
                        )
                    }
                    style={{
                        "--status-color": effect.color,
                    }}
                >

                    <div className="bw-status-header">

                        <div className="bw-status-name">

                            <StatusIcon type={effect.id} />

                            <span>{effect.name}</span>

                        </div>

                        <strong className="bw-status-timer">

                            {effect.seconds}s

                        </strong>

                    </div>

                    <div className="bw-status-track">

                        <div
                            className="bw-status-fill"
                            style={{
                                width: `${effect.percentage}%`,
                            }}
                        />

                    </div>

                    <div className="bw-status-description">

                        {effect.description}

                    </div>

                </div>

            ))}

        </div>
    );
}

// ==========================================
// PLAYER HEALTH BAR
// ==========================================

function PlayerHealth({ data }) {

    const percentage = getPercentage(

        data.health,

        data.maxHealth
    );

    const healthColor =

        percentage > 50

            ? "#35e66c"

            : percentage > 25

                ? "#ffbf32"

                : "#ff4141";

    return (

        <div className="bw-player-health">

            <div className="bw-health-header">

                <span className="bw-health-label">

                    HEALTH

                </span>

                <span className="bw-health-value">

                    {Math.ceil(data.health)}

                    <small>

                        / {data.maxHealth} HP

                    </small>

                </span>

            </div>

            <div className="bw-health-track">

                <div
                    className="bw-health-fill"
                    style={{
                        width: `${percentage}%`,
                        background: healthColor,
                    }}
                />

            </div>

            <div className="bw-player-stats">

                <div>

                    <span>KILLS</span>

                    <strong>{data.score}</strong>

                </div>

                <div>

                    <span>DEATHS</span>

                    <strong>{data.deaths}</strong>

                </div>

            </div>

            {/* Live protection countdown */}

            <SpawnProtection data={data} />

            {/* Special weapon effects */}

            <SpecialWeaponStatus data={data} />

        </div>
    );
}

// ==========================================
// MATCH TIMER AND TARGET
// ==========================================

function MatchInformation({ data }) {

    const isTimer = data.matchType === "timer";

    return (

        <div className="bw-match-information">

            <div className="bw-match-mode">

                {isTimer

                    ? "TIME BATTLE"

                    : "POINTS BATTLE"}

            </div>

            <div className="bw-match-main-value">

                {isTimer

                    ? formatTime(data.remainingTime)

                    : `${data.score} / ${data.targetPoints}`}

            </div>

            <div className="bw-match-description">

                {isTimer

                    ? "TIME REMAINING"

                    : `FIRST TO ${data.targetPoints} KILLS`}

            </div>

            {!isTimer && (

                <div className="bw-elapsed-time">

                    {formatTime(data.elapsedTime)}

                </div>

            )}

        </div>
    );
}

// ==========================================
// LIVE LEADERBOARD
// ==========================================

function Leaderboard({ data }) {

    return (

        <div className="bw-leaderboard">

            <div className="bw-leaderboard-title">

                LEADERBOARD

            </div>

            <div className="bw-leaderboard-columns">

                <span>PLAYER</span>

                <span>K</span>

                <span>D</span>

            </div>

            {data.leaderboard.map((entity, index) => (

                <div
                    key={entity.id}
                    className={
                        "bw-leaderboard-row" +
                        (
                            entity.id === playerState.id
                                ? " bw-current-player"
                                : ""
                        )
                    }
                >

                    <div className="bw-ranking-player">

                        <span
                            className={
                                `bw-rank bw-rank-${index + 1}`
                            }
                        >

                            {index + 1}

                        </span>

                        <span className="bw-ranking-name">

                            {entity.name}

                            {entity.id === playerState.id && (

                                <small> YOU</small>

                            )}

                        </span>

                        <span
                            className={
                                "bw-player-status " +
                                (entity.alive ? "alive" : "dead")
                            }
                        />

                    </div>

                    <strong>{entity.score}</strong>

                    <span>{entity.deaths}</span>

                </div>

            ))}

        </div>
    );
}

// ==========================================
// KILL FEED
// ==========================================

function KillFeed({ data }) {

    return (

        <div className="bw-kill-feed">

            {data.killFeed.map((entry) => (

                <div
                    className="bw-kill-feed-row"
                    key={entry.id}
                >

                    <strong className="bw-attacker-name">

                        {entry.attackerName}

                    </strong>

                    <span className="bw-feed-weapon">

                        {entry.weaponName}

                    </span>

                    <strong className="bw-target-name">

                        {entry.targetName}

                    </strong>

                </div>

            ))}

        </div>
    );
}

// ==========================================
// DEATH AND RESPAWN POPUP
// ==========================================

function DeathPopup({ data }) {

    if (
        data.alive ||
        data.status !== "playing"
    ) {

        return null;
    }

    return (

        <div className="bw-death-overlay">

            <div className="bw-death-card">

                <div className="bw-death-icon">

                    <svg
                        viewBox="0 0 64 64"
                        fill="currentColor"
                        aria-hidden="true"
                    >

                        <path d="
                            M32 5
                            C15 5 7 17 7 30
                            C7 41 14 46 20 48
                            L20 57
                            L44 57
                            L44 48
                            C50 46 57 41 57 30
                            C57 17 49 5 32 5
                            Z
                        " />

                        <circle
                            cx="21"
                            cy="30"
                            r="7"
                            fill="#15151b"
                        />

                        <circle
                            cx="43"
                            cy="30"
                            r="7"
                            fill="#15151b"
                        />

                        <path
                            d="M32 37 L27 45 L37 45 Z"
                            fill="#15151b"
                        />

                        <path
                            d="M28 49 V57 M36 49 V57"
                            stroke="#15151b"
                            strokeWidth="3"
                        />

                    </svg>

                </div>

                <div className="bw-death-heading">

                    YOU WERE SMASHED!

                </div>

                <div className="bw-death-subtitle">

                    ELIMINATED BY

                </div>

                <div className="bw-killer-name">

                    {data.killerName}

                </div>

                <div className="bw-killer-weapon">

                    {data.killerWeapon}

                </div>

                <div className="bw-death-stats">

                    <div>

                        <span>YOUR KILLS</span>

                        <strong>{data.score}</strong>

                    </div>

                    <div>

                        <span>YOUR DEATHS</span>

                        <strong>{data.deaths}</strong>

                    </div>

                </div>

                {data.respawnSeconds > 0 ? (

                    <div className="bw-respawn-countdown">

                        <span>

                            RESPAWN AVAILABLE IN

                        </span>

                        <strong>

                            {data.respawnSeconds}

                        </strong>

                    </div>

                ) : (

                    <div className="bw-respawn-ready">

                        <span>READY TO RESPAWN</span>

                        <strong>

                            PRESS ANY KEY TO CONTINUE

                        </strong>

                    </div>

                )}

                <div className="bw-respawn-protection-note">

                    <ShieldIcon />

                    <span>

                        5 SECONDS OF PROTECTION AFTER RESPAWN

                    </span>

                </div>

            </div>

        </div>
    );
}

// ==========================================
// MATCH RESULT SCREEN
// ==========================================

function MatchResult({ data, onExit }) {

    if (data.status !== "finished") {

        return null;
    }

    const playerWon =

        data.winner?.id === playerState.id;

    const result = data.isDraw

        ? "DRAW"

        : playerWon

            ? "VICTORY"

            : "DEFEAT";

    return (

        <div className="bw-result-overlay">

            <div className="bw-result-card">

                <div className="bw-result-label">

                    MATCH COMPLETE

                </div>

                <h1
                    className={
                        "bw-result-heading " +
                        result.toLowerCase()
                    }
                >

                    {result}

                </h1>

                <div className="bw-result-winner">

                    {data.isDraw

                        ? "Multiple players finished with the same score."

                        : `${data.winner?.name || "Unknown"} wins the battle!`}

                </div>

                <div className="bw-result-summary">

                    <div>

                        <span>YOUR KILLS</span>

                        <strong>{data.score}</strong>

                    </div>

                    <div>

                        <span>DEATHS</span>

                        <strong>{data.deaths}</strong>

                    </div>

                    <div>

                        <span>MATCH TIME</span>

                        <strong>

                            {formatTime(data.elapsedTime)}

                        </strong>

                    </div>

                </div>

                <div className="bw-final-scoreboard">

                    <h3>FINAL SCOREBOARD</h3>

                    <div className="bw-final-score-header">

                        <span>RANK</span>

                        <span>PLAYER</span>

                        <span>KILLS</span>

                        <span>DEATHS</span>

                    </div>

                    {data.leaderboard.map((entity, index) => (

                        <div
                            key={entity.id}
                            className={
                                "bw-final-score-row" +
                                (
                                    entity.id === playerState.id
                                        ? " bw-current-player"
                                        : ""
                                )
                            }
                        >

                            <span>#{index + 1}</span>

                            <strong>

                                {entity.name}

                                {entity.id === playerState.id

                                    ? " (YOU)"

                                    : ""}

                            </strong>

                            <span>{entity.score}</span>

                            <span>{entity.deaths}</span>

                        </div>

                    ))}

                </div>

                <button
                    type="button"
                    className="bw-result-button"
                    onClick={onExit}
                >

                    BACK TO DASHBOARD

                </button>

            </div>

        </div>
    );
}

// ==========================================
// MAIN MATCH HUD
// ==========================================

export default function MatchHUD() {

    const { exitGame } = useGame();

    const [data, setData] = useState(getSnapshot);

    useEffect(() => {

        const interval = window.setInterval(() => {

            setData(getSnapshot());

        }, 100);

        return () => {

            window.clearInterval(interval);
        };

    }, []);

    if (data.status === "waiting") {

        return null;
    }

    return (

        <>

            <div className="bw-match-hud">

                <PlayerHealth data={data} />

                <MatchInformation data={data} />

                <Leaderboard data={data} />

                <KillFeed data={data} />

            </div>

            <DeathPopup data={data} />

            <MatchResult
                data={data}
                onExit={exitGame}
            />

        </>
    );
}