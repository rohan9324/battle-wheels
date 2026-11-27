<?php

declare(strict_types=1);

require_once __DIR__ . '/ApiSecurity.php';

class GameManager
{
    private PDO $db;

    private const MAP_CONFIGS = [
        'village' => [
            'movement_limit' => 237,
            'spawn_limit' => 225,
            'minimum_spawn_distance' => 35,
            'pickup_count' => 40,
            'pickup_spawn_limit' => 228,
            'pickup_minimum_distance' => 18
        ],

        'desert' => [
            'movement_limit' => 67,
            'spawn_limit' => 60,
            'minimum_spawn_distance' => 12,
            'pickup_count' => 15,
            'pickup_spawn_limit' => 62,
            'pickup_minimum_distance' => 10
        ],

        'snow' => [
            'movement_limit' => 137,
            'spawn_limit' => 125,
            'minimum_spawn_distance' => 22,
            'pickup_count' => 25,
            'pickup_spawn_limit' => 128,
            'pickup_minimum_distance' => 14
        ]
    ];

    private const MAX_SPEED = 24.0;

    private const REVERSE_SPEED = 8.0;

    private const MAX_STEERING_SPEED = 3.4;

    private const MOVEMENT_TOLERANCE = 1.0;

    private const MAX_MOVEMENT_INTERVAL = 2.0;

    private const MAX_EVENTS_PER_REQUEST = 100;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    /* =========================================
       GET MAP CONFIGURATION
    ========================================= */

    public static function getMapConfig(
        string $mapId
    ): array {

        if (!isset(self::MAP_CONFIGS[$mapId])) {

            throw new InvalidArgumentException(
                'Invalid map configuration.'
            );
        }

        return self::MAP_CONFIGS[$mapId];
    }

    /* =========================================
       CONVERT DATABASE TIME TO MILLISECONDS
    ========================================= */

    private function timestampMs(
        ?string $value
    ): ?int {

        if ($value === null) {
            return null;
        }

        $date = new DateTimeImmutable(
            $value,
            new DateTimeZone('UTC')
        );

        return
            ((int) $date->format('U') * 1000) +
            (int) $date->format('v');
    }

    /* =========================================
       GET ACTIVE MATCH
    ========================================= */

    public function getActiveMatch(
        int $roomId,
        bool $lock = false
    ): array {

        $sql = "
            SELECT *
            FROM matches
            WHERE room_id = :room_id
              AND status = 'playing'
            ORDER BY id DESC
            LIMIT 1
        ";

        if ($lock) {
            $sql .= " FOR UPDATE";
        }

        $stmt = $this->db->prepare($sql);

        $stmt->execute([
            'room_id' => $roomId
        ]);

        $match = $stmt->fetch();

        if (!$match) {

            throw new DomainException(
                'No active match found.'
            );
        }

        return $match;
    }

    /* =========================================
       GET LATEST MATCH
    ========================================= */

    public function getLatestMatch(
        int $roomId
    ): array {

        $stmt = $this->db->prepare(
            "SELECT *
             FROM matches
             WHERE room_id = :room_id
             ORDER BY id DESC
             LIMIT 1"
        );

        $stmt->execute([
            'room_id' => $roomId
        ]);

        $match = $stmt->fetch();

        if (!$match) {

            throw new DomainException(
                'No match found.'
            );
        }

        return $match;
    }

    /* =========================================
       GET PLAYER STATE
    ========================================= */

    public function getPlayerState(
        int $matchId,
        int $playerId,
        bool $lock = false
    ): array {

        $sql = "
            SELECT *
            FROM player_states
            WHERE match_id = :match_id
              AND player_id = :player_id
            LIMIT 1
        ";

        if ($lock) {
            $sql .= " FOR UPDATE";
        }

        $stmt = $this->db->prepare($sql);

        $stmt->execute([
            'match_id' => $matchId,
            'player_id' => $playerId
        ]);

        $state = $stmt->fetch();

        if (!$state) {

            throw new DomainException(
                'Player state not found.'
            );
        }

        return $state;
    }

    /* =========================================
       VERIFY MATCH HAS STARTED
    ========================================= */

    public function requirePlayingMatch(
        array $match
    ): void {

        if ($match['status'] !== 'playing') {

            throw new DomainException(
                'Match is not active.'
            );
        }

        $now = ApiSecurity::now();

        $startAt = $this->timestampMs(
            $match['started_at']
        );

        if ($startAt === null || $now < $startAt) {

            throw new DomainException(
                'Match countdown is still running.'
            );
        }

        $endsAt = $this->timestampMs(
            $match['ends_at']
        );

        if ($endsAt !== null && $now >= $endsAt) {

            throw new DomainException(
                'Match time has ended.'
            );
        }
    }

    /* =========================================
       VALIDATE NUMERIC INPUT
    ========================================= */

    private function validateNumber(
        mixed $value,
        string $field
    ): float {

        if (
            !is_int($value) &&
            !is_float($value)
        ) {

            throw new InvalidArgumentException(
                'Invalid ' . $field . '.'
            );
        }

        $number = (float) $value;

        if (!is_finite($number)) {

            throw new InvalidArgumentException(
                'Invalid ' . $field . '.'
            );
        }

        return $number;
    }

    /* =========================================
       NORMALIZE ROTATION
    ========================================= */

    private function normalizeRotation(
        float $rotation
    ): float {

        $rotation = fmod(
            $rotation,
            2 * M_PI
        );

        if ($rotation < 0) {

            $rotation += 2 * M_PI;
        }

        return $rotation;
    }

    /* =========================================
       ROTATION DIFFERENCE
    ========================================= */

    private function rotationDifference(
        float $first,
        float $second
    ): float {

        return abs(
            atan2(
                sin($first - $second),
                cos($first - $second)
            )
        );
    }

    /* =========================================
       GET MOVEMENT MULTIPLIER
    ========================================= */

    public function getMovementMultiplier(
        array $state
    ): float {

        $now = ApiSecurity::now();

        if (!(bool) $state['is_alive']) {
            return 0.0;
        }

        if ((int) $state['stun_until'] > $now) {
            return 0.0;
        }

        if ((int) $state['slow_until'] > $now) {

            return max(
                0.0,
                min(
                    1.0,
                    (float) $state['slow_multiplier']
                )
            );
        }

        return 1.0;
    }

    /* =========================================
       UPDATE PLAYER MOVEMENT
    ========================================= */

    public function updatePlayer(
        string $token,
        array $input
    ): array {

        $player = ApiSecurity::authenticate(
            $this->db,
            $token
        );

        $roomId = (int) $player['room_id'];

        $playerId = (int) $player['id'];

        $matchId = $input['match_id'] ?? null;

        $sequence = $input['input_sequence'] ?? null;

        if (!is_int($matchId) || $matchId < 1) {

            throw new InvalidArgumentException(
                'Invalid match ID.'
            );
        }

        if (!is_int($sequence) || $sequence < 1) {

            throw new InvalidArgumentException(
                'Invalid input sequence.'
            );
        }

        $x = $this->validateNumber(
            $input['position_x'] ?? null,
            'position_x'
        );

        $z = $this->validateNumber(
            $input['position_z'] ?? null,
            'position_z'
        );

        $rotation = $this->normalizeRotation(
            $this->validateNumber(
                $input['rotation'] ?? null,
                'rotation'
            )
        );

        $speed = $this->validateNumber(
            $input['speed'] ?? null,
            'speed'
        );

        try {

            $this->db->beginTransaction();

            /* LOCK ROOM */

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

            /* VERIFY PLAYER CONNECTION */

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

            /* GET ACTIVE MATCH */

            $match = $this->getActiveMatch(
                $roomId,
                true
            );

            if ((int) $match['id'] !== $matchId) {

                throw new DomainException(
                    'Invalid or outdated match.'
                );
            }

            $this->requirePlayingMatch($match);

            /* GET CURRENT PLAYER STATE */

            $state = $this->getPlayerState(
                $matchId,
                $playerId,
                true
            );

            if (!(bool) $state['is_alive']) {

                throw new DomainException(
                    'Dead players cannot move.'
                );
            }

            /* REJECT OLD OR DUPLICATE INPUT */

            if (
                $sequence <=
                (int) $state['last_input_sequence']
            ) {

                $this->db->commit();

                return [
                    'accepted' => false,
                    'reason' => 'Outdated input.',
                    'player' => $this->formatPlayerState(
                        $state
                    )
                ];
            }

            /* VALIDATE MAP BOUNDARIES */

            $mapConfig = self::getMapConfig(
                $match['map_id']
            );

            $limit = $mapConfig['movement_limit'];

            if (
                abs($x) > $limit ||
                abs($z) > $limit
            ) {

                throw new DomainException(
                    'Movement outside the map is not allowed.'
                );
            }

            /* VALIDATE SPEED */

            $multiplier = $this->getMovementMultiplier(
                $state
            );

            $maxSpeed = self::MAX_SPEED * $multiplier;

            $reverseSpeed =
                self::REVERSE_SPEED * $multiplier;

            if (
                $speed > $maxSpeed + 0.01 ||
                $speed < -$reverseSpeed - 0.01
            ) {

                throw new DomainException(
                    'Invalid movement speed.'
                );
            }

            /* CALCULATE SERVER-SIDE ELAPSED TIME */

            $now = ApiSecurity::now();

            $updatedAt = $this->timestampMs(
                $state['updated_at']
            ) ?? $now;

            $startAt = $this->timestampMs(
                $match['started_at']
            ) ?? $now;

            $previousTime = max(
                $updatedAt,
                $startAt
            );

            $elapsed = max(
                0.0,
                ($now - $previousTime) / 1000
            );

            $elapsed = min(
                self::MAX_MOVEMENT_INTERVAL,
                $elapsed
            );

            /* VALIDATE MOVEMENT DISTANCE */

            $distance = hypot(
                $x - (float) $state['position_x'],
                $z - (float) $state['position_z']
            );

            $allowedDistance =
                ($maxSpeed * $elapsed) +
                self::MOVEMENT_TOLERANCE;

            if (
                $multiplier <= 0 &&
                $distance > 0.01
            ) {

                throw new DomainException(
                    'Player movement is currently disabled.'
                );
            }

            if ($distance > $allowedDistance) {

                throw new DomainException(
                    'Movement distance exceeds allowed limit.'
                );
            }

            /* VALIDATE STEERING */

            $rotationDifference =
                $this->rotationDifference(
                    $rotation,
                    (float) $state['rotation']
                );

            $allowedRotation =
                (self::MAX_STEERING_SPEED * $elapsed)
                + 0.15;

            if (
                $rotationDifference > $allowedRotation ||
                (
                    $multiplier <= 0 &&
                    $rotationDifference > 0.01
                )
            ) {

                throw new DomainException(
                    'Invalid kart rotation.'
                );
            }

            /* UPDATE PLAYER POSITION */

            $stmt = $this->db->prepare(
                "UPDATE player_states
                 SET
                    position_x = :position_x,
                    position_y = 0,
                    position_z = :position_z,
                    rotation = :rotation,
                    speed = :speed,
                    last_input_sequence = :sequence,
                    state_version = state_version + 1,
                    updated_at = CURRENT_TIMESTAMP(3)
                 WHERE match_id = :match_id
                   AND player_id = :player_id"
            );

            $stmt->execute([
                'position_x' => $x,
                'position_z' => $z,
                'rotation' => $rotation,
                'speed' => $speed,
                'sequence' => $sequence,
                'match_id' => $matchId,
                'player_id' => $playerId
            ]);

            /* UPDATE PLAYER ACTIVITY */

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

            $updatedState = $this->getPlayerState(
                $matchId,
                $playerId
            );

            $this->db->commit();

            return [
                'accepted' => true,
                'server_time' => ApiSecurity::now(),
                'player' => $this->formatPlayerState(
                    $updatedState
                )
            ];

        } catch (Throwable $e) {

            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }

            throw $e;
        }
    }

    /* =========================================
       FORMAT PLAYER STATE
    ========================================= */

    public function formatPlayerState(
        array $state
    ): array {

        $integerFields = [
            'id',
            'match_id',
            'player_id',
            'health',
            'max_health',
            'ammo',
            'max_ammo',
            'score',
            'kills',
            'deaths',
            'life_id',
            'protected_until',
            'respawn_at',
            'burn_until',
            'slow_until',
            'stun_until',
            'emp_until',
            'poison_until',
            'mace_until',
            'last_input_sequence',
            'state_version'
        ];

        $floatFields = [
            'position_x',
            'position_y',
            'position_z',
            'rotation',
            'speed',
            'slow_multiplier'
        ];

        foreach ($integerFields as $field) {

            if (isset($state[$field])) {

                $state[$field] = (int) $state[$field];
            }
        }

        foreach ($floatFields as $field) {

            if (isset($state[$field])) {

                $state[$field] = (float) $state[$field];
            }
        }

        $state['is_alive'] =
            (bool) $state['is_alive'];

        $state['is_firing'] =
            (bool) $state['is_firing'];

        return $state;
    }

    /* =========================================
       GET ALL MATCH PLAYERS
    ========================================= */

    public function getMatchPlayers(
        int $matchId
    ): array {

        $stmt = $this->db->prepare(
            "SELECT
                ps.*,
                rp.player_name,
                rp.kart_id,
                rp.driver_id,
                rp.status AS connection_status
             FROM player_states ps
             INNER JOIN room_players rp
                ON rp.id = ps.player_id
             WHERE ps.match_id = :match_id
             ORDER BY ps.player_id ASC"
        );

        $stmt->execute([
            'match_id' => $matchId
        ]);

        $players = $stmt->fetchAll();

        return array_map(
            fn(array $state) =>
                $this->formatPlayerState($state),
            $players
        );
    }

    /* =========================================
       GET MYSTERY BOXES
    ========================================= */

    public function getWeaponPickups(
        int $matchId
    ): array {

        $stmt = $this->db->prepare(
            "SELECT
                id,
                pickup_number,
                position_x,
                position_y,
                position_z,
                is_active,
                collected_by,
                respawn_at,
                state_version
             FROM weapon_pickups
             WHERE match_id = :match_id
             ORDER BY pickup_number ASC"
        );

        $stmt->execute([
            'match_id' => $matchId
        ]);

        $pickups = $stmt->fetchAll();

        foreach ($pickups as &$pickup) {

            $pickup['id'] =
                (int) $pickup['id'];

            $pickup['pickup_number'] =
                (int) $pickup['pickup_number'];

            $pickup['position_x'] =
                (float) $pickup['position_x'];

            $pickup['position_y'] =
                (float) $pickup['position_y'];

            $pickup['position_z'] =
                (float) $pickup['position_z'];

            $pickup['is_active'] =
                (bool) $pickup['is_active'];

            $pickup['respawn_at'] =
                (int) $pickup['respawn_at'];

            $pickup['state_version'] =
                (int) $pickup['state_version'];

            $pickup['collected_by'] =
                $pickup['collected_by'] !== null
                    ? (int) $pickup['collected_by']
                    : null;
        }

        unset($pickup);

        return $pickups;
    }

    /* =========================================
       CREATE GAME EVENT
    ========================================= */

    public function createEvent(
        int $matchId,
        string $eventType,
        ?int $sourcePlayerId = null,
        ?int $targetPlayerId = null,
        ?string $weaponId = null,
        array $eventData = [],
        int $damage = 0
    ): int {

        $stmt = $this->db->prepare(
            "INSERT INTO game_events (
                match_id,
                event_type,
                source_player_id,
                target_player_id,
                weapon_id,
                damage,
                event_data,
                event_time
             ) VALUES (
                :match_id,
                :event_type,
                :source_player_id,
                :target_player_id,
                :weapon_id,
                :damage,
                :event_data,
                :event_time
             )"
        );

        $stmt->execute([
            'match_id' => $matchId,
            'event_type' => $eventType,
            'source_player_id' => $sourcePlayerId,
            'target_player_id' => $targetPlayerId,
            'weapon_id' => $weaponId,
            'damage' => $damage,
            'event_data' => json_encode(
                $eventData,
                JSON_THROW_ON_ERROR
            ),
            'event_time' => ApiSecurity::now()
        ]);

        return (int) $this->db->lastInsertId();
    }

    /* =========================================
       GET NEW GAME EVENTS
    ========================================= */

    public function getGameEvents(
        int $matchId,
        int $lastEventId = 0
    ): array {

        $stmt = $this->db->prepare(
            "SELECT *
             FROM game_events
             WHERE match_id = :match_id
               AND id > :last_event_id
             ORDER BY id ASC
             LIMIT " . self::MAX_EVENTS_PER_REQUEST
        );

        $stmt->execute([
            'match_id' => $matchId,
            'last_event_id' => $lastEventId
        ]);

        $events = $stmt->fetchAll();

        foreach ($events as &$event) {

            $event['id'] = (int) $event['id'];

            $event['match_id'] =
                (int) $event['match_id'];

            $event['damage'] =
                (int) $event['damage'];

            $event['event_time'] =
                (int) $event['event_time'];

            $event['source_player_id'] =
                $event['source_player_id'] !== null
                    ? (int) $event['source_player_id']
                    : null;

            $event['target_player_id'] =
                $event['target_player_id'] !== null
                    ? (int) $event['target_player_id']
                    : null;

            $event['event_data'] = json_decode(
                $event['event_data'] ?? '{}',
                true
            ) ?? [];
        }

        unset($event);

        return $events;
    }

    /* =========================================
       GET LEADERBOARD
    ========================================= */

    public function getLeaderboard(
        int $matchId
    ): array {

        $stmt = $this->db->prepare(
            "SELECT
                ps.player_id,
                rp.player_name,
                ps.score,
                ps.kills,
                ps.deaths,
                ps.is_alive,
                rp.status AS connection_status
             FROM player_states ps
             INNER JOIN room_players rp
                ON rp.id = ps.player_id
             WHERE ps.match_id = :match_id
             ORDER BY
                ps.score DESC,
                ps.kills DESC,
                ps.deaths ASC,
                ps.player_id ASC"
        );

        $stmt->execute([
            'match_id' => $matchId
        ]);

        $leaderboard = $stmt->fetchAll();

        foreach ($leaderboard as $index => &$player) {

            $player['rank'] = $index + 1;

            $player['player_id'] =
                (int) $player['player_id'];

            $player['score'] =
                (int) $player['score'];

            $player['kills'] =
                (int) $player['kills'];

            $player['deaths'] =
                (int) $player['deaths'];

            $player['is_alive'] =
                (bool) $player['is_alive'];
        }

        unset($player);

        return $leaderboard;
    }

    /* =========================================
       CHECK MATCH WINNER
    ========================================= */

    public function checkMatchWinner(
        int $roomId
    ): ?array {

        try {

            $this->db->beginTransaction();

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

                $this->db->commit();

                return null;
            }

            $match = $this->getActiveMatch(
                $roomId,
                true
            );

            $matchId = (int) $match['id'];

            $leaderboard = $this->getLeaderboard(
                $matchId
            );

            $eligiblePlayers = array_values(
                array_filter(
                    $leaderboard,
                    fn(array $player) =>
                        $player['connection_status']
                            !== 'left'
                )
            );

            $winner = $eligiblePlayers[0] ?? null;

            $shouldFinish = false;

            $reason = null;

            if (
                $match['match_type'] === 'points' &&
                $winner !== null &&
                $winner['score'] >=
                    (int) $match['target_points']
            ) {

                $shouldFinish = true;

                $reason = 'target_points_reached';
            }

            if ($match['match_type'] === 'time') {

                $endsAt = $this->timestampMs(
                    $match['ends_at']
                );

                if (
                    $endsAt !== null &&
                    ApiSecurity::now() >= $endsAt
                ) {

                    $shouldFinish = true;

                    $reason = 'time_completed';
                }
            }

            if (!$shouldFinish) {

                $this->db->commit();

                return null;
            }

            $winnerId = $winner['player_id'] ?? null;

            /* FINISH MATCH */

            $stmt = $this->db->prepare(
                "UPDATE matches
                 SET
                    status = 'finished',
                    winner_player_id = :winner_id,
                    finished_at = CURRENT_TIMESTAMP
                 WHERE id = :match_id
                   AND status = 'playing'"
            );

            $stmt->execute([
                'winner_id' => $winnerId,
                'match_id' => $matchId
            ]);

            /* FINISH ROOM */

            $stmt = $this->db->prepare(
                "UPDATE rooms
                 SET
                    status = 'finished',
                    updated_at = CURRENT_TIMESTAMP
                 WHERE id = :room_id"
            );

            $stmt->execute([
                'room_id' => $roomId
            ]);

            /* STOP ALL PLAYER MOVEMENT */

            $stmt = $this->db->prepare(
                "UPDATE player_states
                 SET
                    speed = 0,
                    is_firing = 0,
                    state_version = state_version + 1
                 WHERE match_id = :match_id"
            );

            $stmt->execute([
                'match_id' => $matchId
            ]);

            /* CREATE MATCH FINISHED EVENT */

            $this->createEvent(
                $matchId,
                'match_finished',
                $winnerId,
                null,
                null,
                [
                    'reason' => $reason,
                    'winner' => $winner,
                    'leaderboard' => $leaderboard
                ]
            );

            $this->db->commit();

            return [
                'match_id' => $matchId,
                'status' => 'finished',
                'reason' => $reason,
                'winner' => $winner,
                'leaderboard' => $leaderboard
            ];

        } catch (Throwable $e) {

            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }

            throw $e;
        }
    }

    /* =========================================
       FORMAT MATCH DETAILS
    ========================================= */

    public function formatMatch(
        array $match
    ): array {

        $now = ApiSecurity::now();

        $startAt = $this->timestampMs(
            $match['started_at']
        );

        $endsAt = $this->timestampMs(
            $match['ends_at']
        );

        $countdown = $startAt !== null
            ? max(0, $startAt - $now)
            : 0;

        $remainingTime = $endsAt !== null
            ? max(0, $endsAt - $now)
            : null;

        if ($match['status'] === 'finished') {

            $countdown = 0;

            if ($remainingTime !== null) {
                $remainingTime = 0;
            }
        }

        return [
            'id' => (int) $match['id'],
            'room_id' => (int) $match['room_id'],
            'match_number' => (int) $match['match_number'],
            'map_id' => $match['map_id'],
            'match_type' => $match['match_type'],
            'target_points' => (int) $match['target_points'],
            'duration' => (int) $match['duration'],
            'selected_weapons' => json_decode(
                $match['selected_weapons'],
                true
            ) ?? [],
            'status' => $match['status'],
            'winner_player_id' =>
                $match['winner_player_id'] !== null
                    ? (int) $match['winner_player_id']
                    : null,
            'start_at' => $startAt,
            'ends_at' => $endsAt,
            'countdown_ms' => $countdown,
            'remaining_time_ms' => $remainingTime,
            'server_time' => $now
        ];
    }

    /* =========================================
       SYNCHRONIZE GAME STATE
    ========================================= */

    public function syncGame(
        string $token,
        int $lastEventId = 0,
        ?int $requestedMatchId = null
    ): array {

        $player = ApiSecurity::authenticate(
            $this->db,
            $token
        );

        $roomId = (int) $player['room_id'];

        $playerId = (int) $player['id'];

        /* CHECK MATCH COMPLETION */

        $this->checkMatchWinner($roomId);

        /* GET LATEST MATCH */

        $match = $this->getLatestMatch($roomId);

        $matchId = (int) $match['id'];

        if (
            $requestedMatchId !== null &&
            $requestedMatchId !== $matchId
        ) {

            throw new DomainException(
                'Match has changed. Refresh the game state.'
            );
        }

        /* VERIFY MATCH MEMBERSHIP */

        $this->getPlayerState(
            $matchId,
            $playerId
        );

        /* UPDATE PLAYER ACTIVITY */

        $stmt = $this->db->prepare(
            "UPDATE room_players
             SET last_seen_at = CURRENT_TIMESTAMP
             WHERE id = :player_id
               AND room_id = :room_id
               AND status = 'connected'"
        );

        $stmt->execute([
            'player_id' => $playerId,
            'room_id' => $roomId
        ]);

        /* FETCH GAME STATE */

        $players = $this->getMatchPlayers(
            $matchId
        );

        $pickups = $this->getWeaponPickups(
            $matchId
        );

        $events = $this->getGameEvents(
            $matchId,
            $lastEventId
        );

        $leaderboard = $this->getLeaderboard(
            $matchId
        );

        $latestEventId = $lastEventId;

        foreach ($events as $event) {

            $latestEventId = max(
                $latestEventId,
                (int) $event['id']
            );
        }

        return [
            'player_id' => $playerId,
            'room_id' => $roomId,
            'match' => $this->formatMatch($match),
            'players' => $players,
            'weapon_pickups' => $pickups,
            'events' => $events,
            'leaderboard' => $leaderboard,
            'last_event_id' => $latestEventId,
            'has_more_events' =>
                count($events) ===
                self::MAX_EVENTS_PER_REQUEST,
            'server_time' => ApiSecurity::now()
        ];
    }
}