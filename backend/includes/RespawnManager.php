<?php

declare(strict_types=1);

require_once __DIR__ . '/ApiSecurity.php';
require_once __DIR__ . '/GameManager.php';

class RespawnManager
{
    private PDO $db;

    private GameManager $gameManager;

    /* =========================================
       RESPAWN CONFIGURATION
    ========================================= */

    private const PROTECTION_DURATION = 5000;

    private const MAX_SPAWN_ATTEMPTS = 300;

    private const MINIMUM_PICKUP_DISTANCE = 3.0;

    public function __construct(PDO $db)
    {
        $this->db = $db;

        $this->gameManager = new GameManager($db);
    }

    /* =========================================
       VALIDATE SPAWN POSITION
    ========================================= */

    private function isValidPosition(
        float $x,
        float $z,
        int $playerId,
        array $mapConfig,
        array $players,
        array $pickups
    ): bool {

        $limit = (float)
            $mapConfig['spawn_limit'];

        if (
            abs($x) > $limit ||
            abs($z) > $limit
        ) {
            return false;
        }

        /* =========================================
           CHECK OTHER ALIVE PLAYERS
        ========================================= */

        $minimumDistance = (float)
            $mapConfig['minimum_spawn_distance'];

        foreach ($players as $player) {

            if (
                (int) $player['player_id']
                    === $playerId
            ) {
                continue;
            }

            if (!(bool) $player['is_alive']) {
                continue;
            }

            $distance = hypot(
                $x - (float) $player['position_x'],
                $z - (float) $player['position_z']
            );

            if ($distance < $minimumDistance) {

                return false;
            }
        }

        /* =========================================
           CHECK ACTIVE MYSTERY BOXES
        ========================================= */

        foreach ($pickups as $pickup) {

            if (!(bool) $pickup['is_active']) {
                continue;
            }

            $distance = hypot(
                $x - (float) $pickup['position_x'],
                $z - (float) $pickup['position_z']
            );

            if (
                $distance <
                self::MINIMUM_PICKUP_DISTANCE
            ) {

                return false;
            }
        }

        return true;
    }

    /* =========================================
       GENERATE RESPAWN POSITION

       Map obstacle and hazard validation
       will be integrated separately.
    ========================================= */

    private function generateSpawnPosition(
        int $playerId,
        array $mapConfig,
        array $players,
        array $pickups
    ): ?array {

        $limit = (int)
            $mapConfig['spawn_limit'];

        /* RANDOM POSITION ATTEMPTS */

        for (
            $attempt = 0;
            $attempt < self::MAX_SPAWN_ATTEMPTS;
            $attempt++
        ) {

            $x = random_int(
                -$limit * 100,
                $limit * 100
            ) / 100;

            $z = random_int(
                -$limit * 100,
                $limit * 100
            ) / 100;

            if (
                $this->isValidPosition(
                    $x,
                    $z,
                    $playerId,
                    $mapConfig,
                    $players,
                    $pickups
                )
            ) {

                return [
                    'position_x' => $x,
                    'position_y' => 0,
                    'position_z' => $z,
                    'rotation' =>
                        random_int(0, 6283) / 1000
                ];
            }
        }

        /* =========================================
           GRID FALLBACK
        ========================================= */

        $gridStep = max(
            5.0,
            min(
                15.0,
                $mapConfig[
                    'minimum_spawn_distance'
                ] / 2
            )
        );

        for (
            $x = -$limit;
            $x <= $limit;
            $x += $gridStep
        ) {

            for (
                $z = -$limit;
                $z <= $limit;
                $z += $gridStep
            ) {

                if (
                    $this->isValidPosition(
                        (float) $x,
                        (float) $z,
                        $playerId,
                        $mapConfig,
                        $players,
                        $pickups
                    )
                ) {

                    return [
                        'position_x' => $x,
                        'position_y' => 0,
                        'position_z' => $z,
                        'rotation' =>
                            random_int(0, 6283) / 1000
                    ];
                }
            }
        }

        return null;
    }

    /* =========================================
       RESPAWN PLAYER
    ========================================= */

    public function respawnPlayer(
        string $token,
        array $input
    ): array {

        /* VALIDATE MATCH ID */

        $matchId = $input['match_id'] ?? null;

        if (!is_int($matchId) || $matchId < 1) {

            throw new InvalidArgumentException(
                'Invalid match ID.'
            );
        }

        /* VALIDATE LIFE ID */

        $lifeId = $input['life_id'] ?? null;

        if (!is_int($lifeId) || $lifeId < 1) {

            throw new InvalidArgumentException(
                'Invalid player life ID.'
            );
        }

        /* AUTHENTICATE PLAYER */

        $player = ApiSecurity::authenticate(
            $this->db,
            $token
        );

        $roomId = (int) $player['room_id'];

        $playerId = (int) $player['id'];

        try {

            $this->db->beginTransaction();

            /* =========================================
               LOCK ROOM
            ========================================= */

            $stmt = $this->db->prepare(
                "SELECT status
                 FROM rooms
                 WHERE id = :room_id
                 FOR UPDATE"
            );

            $stmt->execute([
                'room_id' => $roomId
            ]);

            if ($stmt->fetchColumn() !== 'playing') {

                throw new DomainException(
                    'Room is not playing.'
                );
            }

            /* =========================================
               VERIFY PLAYER CONNECTION
            ========================================= */

            $stmt = $this->db->prepare(
                "SELECT status
                 FROM room_players
                 WHERE id = :player_id
                   AND room_id = :room_id
                 FOR UPDATE"
            );

            $stmt->execute([
                'player_id' => $playerId,
                'room_id' => $roomId
            ]);

            if (
                $stmt->fetchColumn() !== 'connected'
            ) {

                throw new DomainException(
                    'Player is not connected.'
                );
            }

            /* =========================================
               GET ACTIVE MATCH
            ========================================= */

            $match = $this->gameManager->getActiveMatch(
                $roomId,
                true
            );

            if ((int) $match['id'] !== $matchId) {

                throw new DomainException(
                    'Invalid or outdated match.'
                );
            }

            $this->gameManager->requirePlayingMatch(
                $match
            );

            /* =========================================
               LOCK PLAYER STATE
            ========================================= */

            $state = $this->gameManager->getPlayerState(
                $matchId,
                $playerId,
                true
            );

            /* CHECK PLAYER LIFE */

            if ((int) $state['life_id'] !== $lifeId) {

                throw new DomainException(
                    'Outdated player life.'
                );
            }

            /* CHECK IF PLAYER IS ALREADY ALIVE */

            if ((bool) $state['is_alive']) {

                $this->db->commit();

                return [
                    'respawned' => false,
                    'reason' => 'Player is already alive.',
                    'player' =>
                        $this->gameManager->formatPlayerState(
                            $state
                        ),
                    'server_time' => ApiSecurity::now()
                ];
            }

            /* =========================================
               CHECK RESPAWN COUNTDOWN
            ========================================= */

            $now = ApiSecurity::now();

            $respawnAt = (int) $state['respawn_at'];

            if ($respawnAt <= 0) {

                throw new DomainException(
                    'Player is not eligible for respawn.'
                );
            }

            if ($now < $respawnAt) {

                $this->db->commit();

                return [
                    'respawned' => false,
                    'reason' => 'Respawn countdown is running.',
                    'remaining_time_ms' =>
                        $respawnAt - $now,
                    'respawn_at' => $respawnAt,
                    'server_time' => $now
                ];
            }

            /* =========================================
               GET MAP CONFIGURATION
            ========================================= */

            $mapConfig = GameManager::getMapConfig(
                $match['map_id']
            );

            /* GET PLAYER POSITIONS */

            $players =
                $this->gameManager->getMatchPlayers(
                    $matchId
                );

            /* GET MYSTERY BOX POSITIONS */

            $pickups =
                $this->gameManager->getWeaponPickups(
                    $matchId
                );

            /* =========================================
               GENERATE RESPAWN POSITION
            ========================================= */

            $position = $this->generateSpawnPosition(
                $playerId,
                $mapConfig,
                $players,
                $pickups
            );

            if ($position === null) {

                $this->db->commit();

                return [
                    'respawned' => false,
                    'reason' => 'No available spawn position.',
                    'retry_after_ms' => 1000,
                    'server_time' => ApiSecurity::now()
                ];
            }

            /* =========================================
               CALCULATE SPAWN PROTECTION
            ========================================= */

            $now = ApiSecurity::now();

            $protectedUntil =
                $now + self::PROTECTION_DURATION;

            /* =========================================
               RESTORE PLAYER STATE
            ========================================= */

            $stmt = $this->db->prepare(
                "UPDATE player_states
                 SET
                    position_x = :position_x,
                    position_y = :position_y,
                    position_z = :position_z,
                    rotation = :rotation,
                    speed = 0,
                    health = max_health,
                    is_alive = 1,
                    weapon_id = NULL,
                    ammo = 0,
                    max_ammo = 0,
                    is_firing = 0,
                    protected_until = :protected_until,
                    respawn_at = 0,
                    burn_until = 0,
                    slow_until = 0,
                    stun_until = 0,
                    emp_until = 0,
                    poison_until = 0,
                    mace_until = 0,
                    slow_multiplier = 1,
                    state_version = state_version + 1,
                    updated_at = CURRENT_TIMESTAMP(3)
                 WHERE match_id = :match_id
                   AND player_id = :player_id
                   AND life_id = :life_id
                   AND is_alive = 0"
            );

            $stmt->execute([
                'position_x' =>
                    $position['position_x'],

                'position_y' =>
                    $position['position_y'],

                'position_z' =>
                    $position['position_z'],

                'rotation' =>
                    $position['rotation'],

                'protected_until' =>
                    $protectedUntil,

                'match_id' => $matchId,

                'player_id' => $playerId,

                'life_id' => $lifeId
            ]);

            if ($stmt->rowCount() !== 1) {

                throw new DomainException(
                    'Player state has changed.'
                );
            }

            /* =========================================
               UPDATE PLAYER ACTIVITY
            ========================================= */

            $stmt = $this->db->prepare(
                "UPDATE room_players
                 SET last_seen_at = CURRENT_TIMESTAMP
                 WHERE id = :player_id
                   AND room_id = :room_id"
            );

            $stmt->execute([
                'player_id' => $playerId,
                'room_id' => $roomId
            ]);

            /* =========================================
               CREATE RESPAWN EVENT
            ========================================= */

            $eventId = $this->gameManager->createEvent(
                $matchId,
                'player_respawn',
                $playerId,
                null,
                null,
                [
                    'position_x' =>
                        $position['position_x'],

                    'position_y' =>
                        $position['position_y'],

                    'position_z' =>
                        $position['position_z'],

                    'rotation' =>
                        $position['rotation'],

                    'health' =>
                        (int) $state['max_health'],

                    'life_id' => $lifeId,

                    'protected_until' =>
                        $protectedUntil
                ]
            );

            /* =========================================
               GET UPDATED PLAYER STATE
            ========================================= */

            $updatedState =
                $this->gameManager->getPlayerState(
                    $matchId,
                    $playerId
                );

            $this->db->commit();

            /* =========================================
               RETURN RESPAWN RESPONSE
            ========================================= */

            return [
                'respawned' => true,
                'match_id' => $matchId,
                'player_id' => $playerId,
                'life_id' => $lifeId,
                'position' => $position,
                'protected_until' => $protectedUntil,
                'protection_duration_ms' =>
                    self::PROTECTION_DURATION,
                'event_id' => $eventId,
                'player' =>
                    $this->gameManager->formatPlayerState(
                        $updatedState
                    ),
                'server_time' => ApiSecurity::now()
            ];

        } catch (Throwable $e) {

            if ($this->db->inTransaction()) {

                $this->db->rollBack();
            }

            throw $e;
        }
    }
}