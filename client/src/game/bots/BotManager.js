import { useGame } from "../../context/GameContext";

import BotKart from "./BotKart";

import BOT_CONFIG from "./BotConfig";

export default function BotManager() {

    const { settings } = useGame();

    if (settings.mode !== "solo") {
        return null;
    }

    const count =
        Number(settings.botCount) === 3
            ? 3
            : 4;

    return (
        <group name="enemyBots">

            {BOT_CONFIG.slice(0, count).map(
                (config) => (

                    <BotKart
                        key={config.id}
                        config={config}
                    />

                )
            )}

        </group>
    );
}