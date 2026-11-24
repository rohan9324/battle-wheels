import GameScene from "./game/GameScene";
import "./App.css";

export default function App() {
    return (
        <div className="game-container">
            <GameScene />

            <div className="game-title">
                BATTLE WHEELS
            </div>
        </div>
    );
}