import {
    GameProvider,
    useGame
} from "./context/GameContext";

import Dashboard from "./pages/Dashboard";
import GamePage from "./pages/GamePage";

import "./App.css";

function AppContent() {

    const { screen } = useGame();

    if (screen === "game") {
        return <GamePage />;
    }

    return <Dashboard />;
}

export default function App() {

    return (
        <GameProvider>

            <AppContent />

        </GameProvider>
    );
}