const matchState = {

    status: "waiting",

    mode: "solo",

    matchType: "points",

    targetPoints: 10,

    duration: 180,

    remainingTime: 180,

    startedAt: 0,

    finishedAt: 0,

    elapsedTime: 0,

    winner: null,

    isDraw: false,

    leaderboard: [],

    killFeed: [],
};

// ==========================================
// INITIALIZE MATCH
// ==========================================

export function initializeMatch(settings) {

    matchState.mode =
        settings.mode || "solo";

    matchState.matchType =
        settings.matchType || "points";

    const points = Number(settings.targetPoints);

    matchState.targetPoints =
        [10, 15, 20].includes(points)
            ? points
            : 10;

    const minutes = Number(settings.duration);

    matchState.duration =
        (
            [3, 5, 7, 10].includes(minutes)
                ? minutes
                : 3
        ) * 60;

    matchState.remainingTime =
        matchState.duration;

    matchState.startedAt =
        performance.now();

    matchState.finishedAt = 0;

    matchState.elapsedTime = 0;

    matchState.winner = null;

    matchState.isDraw = false;

    matchState.leaderboard = [];

    matchState.killFeed = [];

    matchState.status = "playing";
}

// ==========================================
// UPDATE LEADERBOARD
// ==========================================

export function updateLeaderboard(entities) {

    matchState.leaderboard = entities

        .map((entity) => ({

            id: entity.id,

            name: entity.name,

            isBot: entity.isBot,

            score: entity.score || 0,

            deaths: entity.deaths || 0,

            health: entity.health,

            maxHealth: entity.maxHealth,

            alive: entity.alive,

        }))

        .sort((a, b) => {

            if (b.score !== a.score) {

                return b.score - a.score;
            }

            return a.deaths - b.deaths;
        });

    return matchState.leaderboard;
}

// ==========================================
// ADD KILL FEED
// ==========================================

let nextKillId = 0;

export function addKillFeed(
    attacker,
    target,
    weaponName = "Weapon"
) {

    const entry = {

        id: ++nextKillId,

        attackerId: attacker?.id || null,

        attackerName:
            attacker?.name || "Unknown",

        targetId: target?.id || null,

        targetName:
            target?.name || "Unknown",

        weaponName,

        time: performance.now(),
    };

    matchState.killFeed = [

        entry,

        ...matchState.killFeed

    ].slice(0, 8);

    return entry;
}

// ==========================================
// FINISH MATCH
// ==========================================

export function finishMatch(winner = null) {

    if (matchState.status !== "playing") {

        return;
    }

    matchState.finishedAt =
        performance.now();

    matchState.elapsedTime = Math.floor(

        (
            matchState.finishedAt -
            matchState.startedAt
        ) / 1000
    );

    matchState.winner = winner

        ? {

            id: winner.id,

            name: winner.name,

            score: winner.score || 0,

            deaths: winner.deaths || 0,

            isBot: winner.isBot,

        }

        : null;

    matchState.isDraw = !winner;

    matchState.status = "finished";
}

// ==========================================
// RESET MATCH
// ==========================================

export function resetMatch() {

    matchState.status = "waiting";

    matchState.startedAt = 0;

    matchState.finishedAt = 0;

    matchState.elapsedTime = 0;

    matchState.remainingTime =
        matchState.duration;

    matchState.winner = null;

    matchState.isDraw = false;

    matchState.leaderboard = [];

    matchState.killFeed = [];
}

export default matchState;