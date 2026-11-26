export const MATCH_CONFIG = {
    maxHealth: 100,

    pointsPerKill: 1,

    respawnDelay: 3000,

    spawnProtection: 2000,

    countdownSeconds: 3,

    pointOptions: [10, 15, 20],

    timeOptions: [3, 5, 7, 10],

    botOptions: [3, 4],
};

export const MATCH_STATUS = {
    WAITING: "waiting",
    COUNTDOWN: "countdown",
    PLAYING: "playing",
    FINISHED: "finished",
};

export const MATCH_TYPE = {
    POINTS: "points",
    TIMER: "timer",
};

export default MATCH_CONFIG;