import { createEntity } from "./combat/EntityManager";

const playerState = createEntity({
    id: "player",
    name: "Player",
    isBot: false,
});

export default playerState;