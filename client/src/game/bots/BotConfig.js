export const BOT_CONFIG = [
    {
        id: "bot_alpha",
        name: "BOT Alpha",
        color: "#ff3535",
        helmetColor: "#ff3535",
        suitColor: "#781818",
        maxSpeed: 20,
        health: 100,
        accuracy: 0.75,
        aggression: 0.9,
        spawnPosition: [-12, 0, -12],
    },
    {
        id: "bot_bravo",
        name: "BOT Bravo",
        color: "#258dff",
        helmetColor: "#258dff",
        suitColor: "#183b78",
        maxSpeed: 18,
        health: 100,
        accuracy: 0.85,
        aggression: 0.6,
        spawnPosition: [12, 0, -12],
    },
    {
        id: "bot_ghost",
        name: "BOT Ghost",
        color: "#303038",
        helmetColor: "#303038",
        suitColor: "#141418",
        maxSpeed: 23,
        health: 100,
        accuracy: 0.7,
        aggression: 0.8,
        spawnPosition: [-12, 0, 12],
    },
    {
        id: "bot_titan",
        name: "BOT Titan",
        color: "#ffbf32",
        helmetColor: "#ffc52e",
        suitColor: "#92701c",
        maxSpeed: 21,
        health: 100,
        accuracy: 0.8,
        aggression: 0.75,
        spawnPosition: [12, 0, 12],
    },
];

export const BOT_SETTINGS = {
    maxHealth: 100,

    respawnDelay: 3000,

    detectionRange: 60,

    attackRange: 45,

    pickupDistance: 2.3,

    acceleration: 12,

    braking: 20,

    steeringSpeed: 2.5,

    obstacleDetectionRange: 6,

    decisionInterval: 250,

    fireCooldown: 1200,
};

export default BOT_CONFIG;