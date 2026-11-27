<?php

declare(strict_types=1);

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../includes/ApiSecurity.php';
require_once __DIR__ . '/../includes/RoomManager.php';
require_once __DIR__ . '/../includes/GameManager.php';
require_once __DIR__ . '/../includes/WeaponManager.php';
require_once __DIR__ . '/../includes/CombatManager.php';

/* =========================================
   INITIALIZE API SECURITY
========================================= */

ApiSecurity::init('POST');

/* =========================================
   HANDLE GAME SYNCHRONIZATION
========================================= */

try {

    /* GET REQUEST DATA */

    $input = ApiSecurity::getJsonInput();

    $sessionToken = ApiSecurity::requireToken(
        $input
    );

    /* VALIDATE MATCH ID */

    $matchId = $input['match_id'] ?? null;

    if (
        $matchId !== null &&
        (
            !is_int($matchId) ||
            $matchId < 1
        )
    ) {

        throw new InvalidArgumentException(
            'Invalid match ID.'
        );
    }

    /* VALIDATE EVENT CURSOR */

    $lastEventId = $input['last_event_id'] ?? 0;

    if (
        !is_int($lastEventId) ||
        $lastEventId < 0
    ) {

        throw new InvalidArgumentException(
            'Invalid last event ID.'
        );
    }

    if (
        $matchId === null &&
        $lastEventId !== 0
    ) {

        throw new InvalidArgumentException(
            'Match ID is required when using an event cursor.'
        );
    }

    /* CONNECT TO DATABASE */

    $db = getDB();

    /* AUTHENTICATE PLAYER */

    $player = ApiSecurity::authenticate(
        $db,
        $sessionToken
    );

    $roomId = (int) $player['room_id'];

    $playerId = (int) $player['id'];

    /* INITIALIZE MANAGERS */

    $roomManager = new RoomManager($db);

    $gameManager = new GameManager($db);

    $weaponManager = new WeaponManager($db);

    $combatManager = new CombatManager($db);

    /* =========================================
       GET CURRENT ROOM STATUS
    ========================================= */

    $roomStatusStmt = $db->prepare(
        "SELECT status
         FROM rooms
         WHERE id = :room_id
         LIMIT 1"
    );

    $roomStatusStmt->execute([
        'room_id' => $roomId
    ]);

    $roomStatus = $roomStatusStmt->fetchColumn();

    $roomStatusStmt->closeCursor();

    if ($roomStatus === false) {

        throw new DomainException(
            'Room not found.'
        );
    }

    /* =========================================
       HANDLE WAITING LOBBY
    ========================================= */

    if ($roomStatus === 'waiting') {

        $roomDetails =
            $roomManager->getPlayerRoom(
                $sessionToken
            );

        ApiSecurity::success(
            [
                'player_id' => $playerId,

                'room_id' => $roomId,

                'room_status' =>
                $roomDetails['status'],

                'return_to_lobby' =>
                $roomDetails['status'] === 'waiting',

                'room' => $roomDetails,

                'combat_objects' => [],

                'server_time' => ApiSecurity::now()
            ],
            'Room state synchronized.',
            200
        );
    }

    /* VALIDATE ROOM STATUS */

    if (
        !in_array(
            $roomStatus,
            ['playing', 'finished'],
            true
        )
    ) {

        throw new DomainException(
            'Room is no longer available.'
        );
    }

    /* =========================================
       GET LATEST MATCH
    ========================================= */

    $match = $gameManager->getLatestMatch(
        $roomId
    );

    $activeMatchId = (int) $match['id'];

    /* VERIFY PLAYER MATCH MEMBERSHIP */

    $gameManager->getPlayerState(
        $activeMatchId,
        $playerId
    );

    /* =========================================
       HANDLE MATCH CHANGE
    ========================================= */

    $matchChanged = false;

    if (
        $matchId !== null &&
        $matchId !== $activeMatchId
    ) {

        $matchChanged = true;

        $lastEventId = 0;
    }

    /* =========================================
       VALIDATE EVENT CURSOR AGAINST MATCH
    ========================================= */

    if ($lastEventId > 0) {

        $stmt = $db->prepare(
            "SELECT COALESCE(MAX(id), 0)
             FROM game_events
             WHERE match_id = :match_id"
        );

        $stmt->execute([
            'match_id' => $activeMatchId
        ]);

        $maximumEventId =
            (int) $stmt->fetchColumn();

        if ($lastEventId > $maximumEventId) {

            $lastEventId = 0;
        }
    }

    /* =========================================
       CHECK MATCH COMPLETION
    ========================================= */

    if ($roomStatus === 'playing') {

        $gameManager->checkMatchWinner(
            $roomId
        );

        $match = $gameManager->getLatestMatch(
            $roomId
        );

        if ((int) $match['id'] !== $activeMatchId) {

            throw new DomainException(
                'Match has changed. Synchronize again.'
            );
        }
    }

    /* =========================================
       AUTOMATIC COMBAT SIMULATION
    ========================================= */

    if ($match['status'] === 'playing') {

        $formattedMatch =
            $gameManager->formatMatch($match);

        $countdownFinished =
            $formattedMatch['countdown_ms'] <= 0;

        $matchTimeAvailable =
            $formattedMatch['remaining_time_ms'] === null ||
            $formattedMatch['remaining_time_ms'] > 0;

        if (
            $countdownFinished &&
            $matchTimeAvailable
        ) {

            /*
             * Avoid opening a combat transaction
             * when no projectile is ready.
             */

            $stmt = $db->prepare(
                "SELECT id
                 FROM combat_objects
                 WHERE match_id = :match_id
                   AND object_type = 'projectile'
                   AND is_active = 1
                   AND activate_at <= :current_time
                 LIMIT 1"
            );

            $stmt->execute([
                'match_id' => $activeMatchId,

                'current_time' => ApiSecurity::now()
            ]);

            $hasActiveProjectiles =
                $stmt->fetchColumn() !== false;

            $stmt->closeCursor();

            if ($hasActiveProjectiles) {

                try {

                    $combatManager->simulateCombat(
                        $roomId,
                        $activeMatchId
                    );
                } catch (DomainException $e) {

                    $currentMatch =
                        $gameManager->getLatestMatch(
                            $roomId
                        );

                    $currentFormattedMatch =
                        $gameManager->formatMatch(
                            $currentMatch
                        );

                    $matchStillPlayable =
                        (int) $currentMatch['id']
                        === $activeMatchId &&
                        $currentMatch['status']
                        === 'playing' &&
                        $currentFormattedMatch['countdown_ms'] <= 0 &&
                        (
                            $currentFormattedMatch['remaining_time_ms'] === null ||
                            $currentFormattedMatch['remaining_time_ms'] > 0
                        );

                    if ($matchStillPlayable) {

                        throw $e;
                    }
                }

                /*
                 * Combat damage may have finished
                 * the match.
                 */

                $match =
                    $gameManager->getLatestMatch(
                        $roomId
                    );

                if (
                    (int) $match['id'] !==
                    $activeMatchId
                ) {

                    throw new DomainException(
                        'Match has changed. Synchronize again.'
                    );
                }
            }
        }
    }

    /* =========================================
       AUTOMATIC MYSTERY BOX RESPAWN
    ========================================= */

    if ($match['status'] === 'playing') {

        $formattedMatch =
            $gameManager->formatMatch($match);

        $countdownFinished =
            $formattedMatch['countdown_ms'] <= 0;

        $matchTimeAvailable =
            $formattedMatch['remaining_time_ms'] === null ||
            $formattedMatch['remaining_time_ms'] > 0;

        if (
            $countdownFinished &&
            $matchTimeAvailable
        ) {

            $stmt = $db->prepare(
                "SELECT id
                 FROM weapon_pickups
                 WHERE match_id = :match_id
                   AND is_active = 0
                   AND respawn_at > 0
                   AND respawn_at <= :current_time
                 LIMIT 1"
            );

            $stmt->execute([
                'match_id' => $activeMatchId,

                'current_time' => ApiSecurity::now()
            ]);

            $hasExpiredPickups =
                $stmt->fetchColumn() !== false;

            $stmt->closeCursor();

            if ($hasExpiredPickups) {

                try {

                    $weaponManager->respawnPickups(
                        $roomId,
                        $activeMatchId
                    );
                } catch (DomainException $e) {

                    $currentMatch =
                        $gameManager->getLatestMatch(
                            $roomId
                        );

                    $currentFormattedMatch =
                        $gameManager->formatMatch(
                            $currentMatch
                        );

                    $matchStillPlayable =
                        (int) $currentMatch['id']
                        === $activeMatchId &&
                        $currentMatch['status']
                        === 'playing' &&
                        $currentFormattedMatch['countdown_ms'] <= 0 &&
                        (
                            $currentFormattedMatch['remaining_time_ms'] === null ||
                            $currentFormattedMatch['remaining_time_ms'] > 0
                        );

                    if ($matchStillPlayable) {

                        throw $e;
                    }
                }
            }
        }
    }

    /* =========================================
       FETCH SYNCHRONIZED GAME STATE
    ========================================= */

    $result = $gameManager->syncGame(
        $sessionToken,
        $lastEventId,
        $activeMatchId
    );

    /* =========================================
       RECHECK CURRENT ROOM STATUS
    ========================================= */

    $roomStatusStmt->execute([
        'room_id' => $roomId
    ]);

    $currentRoomStatus =
        $roomStatusStmt->fetchColumn();

    $roomStatusStmt->closeCursor();

    /* =========================================
       HANDLE HOST RESTART
    ========================================= */

    if ($currentRoomStatus === 'waiting') {

        $roomDetails =
            $roomManager->getPlayerRoom(
                $sessionToken
            );

        ApiSecurity::success(
            [
                'player_id' => $playerId,

                'room_id' => $roomId,

                'room_status' =>
                $roomDetails['status'],

                'return_to_lobby' =>
                $roomDetails['status'] === 'waiting',

                'room' => $roomDetails,

                'combat_objects' => [],

                'server_time' => ApiSecurity::now()
            ],
            'Room state synchronized.',
            200
        );
    }

    /* VALIDATE CURRENT ROOM STATUS */

    if (
        !in_array(
            $currentRoomStatus,
            ['playing', 'finished'],
            true
        )
    ) {

        throw new DomainException(
            'Room is no longer available.'
        );
    }

    /* =========================================
       VERIFY MATCH HAS NOT CHANGED
    ========================================= */

    $latestMatch =
        $gameManager->getLatestMatch(
            $roomId
        );

    if (
        (int) $latestMatch['id'] !==
        $activeMatchId
    ) {

        throw new DomainException(
            'Match has changed. Synchronize again.'
        );
    }

    if (
        $latestMatch['status'] !==
        $result['match']['status']
    ) {

        throw new DomainException(
            'Match status has changed. Synchronize again.'
        );
    }

    /* =========================================
       FETCH ACTIVE COMBAT OBJECTS
    ========================================= */

    $combatObjects = [];

    if (
        $currentRoomStatus === 'playing' &&
        $latestMatch['status'] === 'playing'
    ) {

        $combatObjects =
            $combatManager->getActiveCombatObjects(
                $activeMatchId
            );
    }

    /* =========================================
       ADD COMBAT SYNCHRONIZATION DATA
    ========================================= */

    $result['combat_objects'] = $combatObjects;

    $result['combat_object_count'] =
        count($combatObjects);

    $result['room_status'] = $currentRoomStatus;

    $result['return_to_lobby'] = false;

    $result['match_changed'] = $matchChanged;

    $result['server_time'] = ApiSecurity::now();

    /* =========================================
       RETURN SUCCESS RESPONSE
    ========================================= */

    ApiSecurity::success(
        $result,
        'Game state synchronized successfully.',
        200
    );
} catch (InvalidArgumentException $e) {

    ApiSecurity::error(
        $e->getMessage(),
        400
    );
} catch (DomainException $e) {

    ApiSecurity::error(
        $e->getMessage(),
        409
    );
} catch (Throwable $e) {
    error_log(
        date('Y-m-d H:i:s') . PHP_EOL .
            'Error: ' . $e->getMessage() . PHP_EOL .
            'File: ' . $e->getFile() . PHP_EOL .
            'Line: ' . $e->getLine() . PHP_EOL .
            '------------------------' . PHP_EOL,
        3,
        __DIR__ . '/../config/game_sync_debug.log'
    );
    error_log(
        'Battle Wheels Game Sync Error: ' .
            $e->getMessage()
    );

    ApiSecurity::error(
        'Unable to synchronize game state.',
        500
    );
}
