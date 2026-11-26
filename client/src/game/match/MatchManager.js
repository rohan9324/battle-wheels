import {
    useEffect,
    useRef
} from "react";

import { useFrame } from "@react-three/fiber";

import { useGame } from "../../context/GameContext";

import {
    getEntities
} from "../combat/EntityManager";

import matchState, {

    initializeMatch,

    updateLeaderboard,

    finishMatch,

    resetMatch

} from "./MatchState";

// ==========================================
// MATCH MANAGER
// ==========================================

export default function MatchManager() {

    const { settings } = useGame();

    const settingsRef = useRef(settings);

    const nextLeaderboardUpdate = useRef(0);

    // ==========================================
    // INITIALIZE MATCH
    // ==========================================

    useEffect(() => {

        initializeMatch(
            settingsRef.current
        );

        nextLeaderboardUpdate.current = 0;

        return () => {

            resetMatch();
        };

    }, []);

    // ==========================================
    // MATCH GAME LOOP
    // ==========================================

    useFrame(() => {

        const now = performance.now();

        // ==================================
        // MATCH FINISHED
        // ==================================

        if (matchState.status === "finished") {

            updateLeaderboard(
                getEntities()
            );

            return;
        }

        // ==================================
        // MATCH NOT STARTED
        // ==================================

        if (matchState.status !== "playing") {

            return;
        }

        const entities = getEntities();

        // ==================================
        // UPDATE ELAPSED TIME
        // ==================================

        const elapsed = Math.max(

            0,

            Math.floor(

                (
                    now -
                    matchState.startedAt
                ) / 1000
            )
        );

        matchState.elapsedTime = elapsed;

        // ==================================
        // UPDATE LIVE LEADERBOARD
        // ==================================

        if (
            now >=
            nextLeaderboardUpdate.current
        ) {

            updateLeaderboard(entities);

            nextLeaderboardUpdate.current =
                now + 100;
        }

        // ==================================
        // POINTS MATCH
        // ==================================

        if (matchState.matchType === "points") {

            const winner = entities.find(

                (entity) =>

                    entity.score >=
                    matchState.targetPoints
            );

            if (winner) {

                updateLeaderboard(entities);

                finishMatch(winner);
            }

            return;
        }

        // ==================================
        // TIMER MATCH
        // ==================================

        if (matchState.matchType === "timer") {

            matchState.remainingTime = Math.max(

                0,

                matchState.duration - elapsed
            );

            // MATCH STILL RUNNING

            if (matchState.remainingTime > 0) {

                return;
            }

            // ==================================
            // TIMER COMPLETED
            // ==================================

            const leaderboard =
                updateLeaderboard(entities);

            if (leaderboard.length === 0) {

                finishMatch(null);

                return;
            }

            const highestScore =
                leaderboard[0].score;

            const winners = leaderboard.filter(

                (entity) =>

                    entity.score === highestScore
            );

            // ==================================
            // SINGLE WINNER
            // ==================================

            if (winners.length === 1) {

                finishMatch(winners[0]);

                return;
            }

            // ==================================
            // DRAW MATCH
            // ==================================

            finishMatch(null);
        }
    });

    return null;
}