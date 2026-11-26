import GameScene from "../game/GameScene";

import MiniMap from "../game/ui/MiniMap";

import WeaponHUD from "../game/ui/WeaponHUD";

import MatchHUD from "../game/ui/MatchHUD";

import { useGame } from "../context/GameContext";

import "../App.css";

// ==========================================
// GAME PAGE
// ==========================================

export default function GamePage() {

    const { exitGame } = useGame();

    return (

        <div className="game-container">

            {/* 3D GAME WORLD */}

            <div className="game-canvas-wrapper">

                <GameScene />

            </div>

            {/* GAME TITLE */}

            <div className="game-title">

                BATTLE WHEELS

            </div>

            {/* MINI MAP */}

            <MiniMap />

            {/* WEAPON INFORMATION */}

            <WeaponHUD />

            {/* HEALTH, SCORE, TIMER, DEATH AND RESULTS */}

            <MatchHUD />

            {/* EXIT GAME BUTTON */}

            <button
                className="bw-exit-game"
                onClick={exitGame}
            >

                EXIT GAME

            </button>

        </div>
    );
}