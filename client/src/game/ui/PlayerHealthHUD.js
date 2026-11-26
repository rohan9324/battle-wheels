import { useEffect, useState } from "react";
import playerState from "../PlayerState";

import "./PlayerHealthHUD.css";

export default function PlayerHealthHUD() {

    const [health, setHealth] = useState(100);

    useEffect(() => {

        let frameId;

        function updateHealth() {

            const currentHealth = Math.max(
                0,
                Math.min(
                    100,
                    Number(playerState.health ?? 100)
                )
            );

            setHealth(currentHealth);

            frameId = requestAnimationFrame(
                updateHealth
            );
        }

        updateHealth();

        return () => {
            cancelAnimationFrame(frameId);
        };

    }, []);

    const healthColor =
        health <= 25
            ? "#ff3535"
            : health <= 50
            ? "#ffc340"
            : "#35e76b";

    return (
        <div className="bw-player-health">

            <div className="bw-health-icon">

                <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                >
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54z" />
                </svg>

            </div>

            <div className="bw-health-content">

                <div className="bw-health-header">

                    <span>PLAYER HEALTH</span>

                    <strong>
                        {Math.ceil(health)} / 100
                    </strong>

                </div>

                <div className="bw-health-track">

                    <div
                        className="bw-health-fill"
                        style={{
                            width: `${health}%`,
                            background: healthColor,
                            boxShadow:
                                `0 0 12px ${healthColor}`,
                        }}
                    />

                </div>

            </div>

        </div>
    );
}