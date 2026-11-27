<?php

declare(strict_types=1);

require_once __DIR__ . '/ApiSecurity.php';

class RoomManager
{
    private PDO $db;

    private const ALLOWED_MAPS = [
        'village',
        'desert',
        'snow'
    ];

    private const ALLOWED_MATCH_TYPES = [
        'points',
        'time'
    ];

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    /* =========================================
       VALIDATE ROOM SETTINGS
    ========================================= */

    private function validateSettings(array $input): array
    {
        $mapId = $input['map_id'] ?? 'village';

        $matchType = $input['match_type'] ?? 'points';

        $targetPoints = filter_var(
            $input['target_points'] ?? 10,
            FILTER_VALIDATE_INT
        );

        $duration = filter_var(
            $input['duration'] ?? 3,
            FILTER_VALIDATE_INT
        );

        $maxPlayers = filter_var(
            $input['max_players'] ?? 6,
            FILTER_VALIDATE_INT
        );

        $selectedWeapons = $input['selected_weapons'] ?? [];

        if (!in_array($mapId, self::ALLOWED_MAPS, true)) {
            throw new InvalidArgumentException('Invalid map.');
        }

        if (
            !in_array(
                $matchType,
                self::ALLOWED_MATCH_TYPES,
                true
            )
        ) {
            throw new InvalidArgumentException(
                'Invalid match type.'
            );
        }

        if (
            $targetPoints === false ||
            $targetPoints < 1 ||
            $targetPoints > 100
        ) {
            throw new InvalidArgumentException(
                'Target points must be between 1 and 100.'
            );
        }

        if (
            $duration === false ||
            $duration < 1 ||
            $duration > 30
        ) {
            throw new InvalidArgumentException(
                'Match duration must be between 1 and 30 minutes.'
            );
        }

        if (
            $maxPlayers === false ||
            $maxPlayers < 2 ||
            $maxPlayers > 6
        ) {
            throw new InvalidArgumentException(
                'Maximum players must be between 2 and 6.'
            );
        }

        if (
            !is_array($selectedWeapons) ||
            count($selectedWeapons) < 1 ||
            count($selectedWeapons) > 20
        ) {
            throw new InvalidArgumentException(
                'Select between 1 and 20 weapons.'
            );
        }

        foreach ($selectedWeapons as $weapon) {

            if (
                !is_string($weapon) ||
                !preg_match(
                    '/^[a-zA-Z0-9_-]{1,50}$/D',
                    $weapon
                )
            ) {
                throw new InvalidArgumentException(
                    'Invalid weapon ID.'
                );
            }
        }

        $selectedWeapons = array_values(
            array_unique($selectedWeapons)
        );

        return [
            'map_id' => $mapId,
            'match_type' => $matchType,
            'target_points' => $targetPoints,
            'duration' => $duration,
            'max_players' => $maxPlayers,
            'selected_weapons' => $selectedWeapons
        ];
    }

    /* =========================================
       VALIDATE KART / DRIVER ID
    ========================================= */

    private function validateAssetId(
        mixed $value,
        string $default
    ): string {

        if ($value === null) {
            return $default;
        }

        if (
            !is_string($value) ||
            !preg_match(
                '/^[a-zA-Z0-9_-]{1,50}$/D',
                $value
            )
        ) {
            throw new InvalidArgumentException(
                'Invalid kart or driver ID.'
            );
        }

        return $value;
    }

    /* =========================================
       CREATE ROOM
    ========================================= */

    public function createRoom(array $input): array
    {
        $playerName = ApiSecurity::validatePlayerName(
            $input['player_name'] ?? ''
        );

        $settings = $this->validateSettings($input);

        $kartId = $this->validateAssetId(
            $input['kart_id'] ?? null,
            'red_racer'
        );

        $driverId = $this->validateAssetId(
            $input['driver_id'] ?? null,
            'blue_racer'
        );

        $sessionToken = ApiSecurity::generateToken();

        $tokenHash = ApiSecurity::hashToken(
            $sessionToken
        );

        try {

            $this->db->beginTransaction();

            $roomId = null;
            $roomCode = '';

            $stmt = $this->db->prepare(
                "INSERT INTO rooms (
                    room_code,
                    map_id,
                    match_type,
                    target_points,
                    duration,
                    max_players,
                    selected_weapons,
                    status
                ) VALUES (
                    :room_code,
                    :map_id,
                    :match_type,
                    :target_points,
                    :duration,
                    :max_players,
                    :selected_weapons,
                    'waiting'
                )"
            );

            for ($attempt = 0; $attempt < 10; $attempt++) {

                $roomCode = ApiSecurity::generateRoomCode();

                try {

                    $stmt->execute([
                        'room_code' => $roomCode,
                        'map_id' => $settings['map_id'],
                        'match_type' => $settings['match_type'],
                        'target_points' => $settings['target_points'],
                        'duration' => $settings['duration'],
                        'max_players' => $settings['max_players'],
                        'selected_weapons' => json_encode(
                            $settings['selected_weapons'],
                            JSON_THROW_ON_ERROR
                        )
                    ]);

                    $roomId = (int) $this->db->lastInsertId();

                    break;

                } catch (PDOException $e) {

                    if (
                        (int) ($e->errorInfo[1] ?? 0) !== 1062
                    ) {
                        throw $e;
                    }
                }
            }

            if ($roomId === null) {

                throw new RuntimeException(
                    'Unable to generate a unique room code.'
                );
            }

            $stmt = $this->db->prepare(
                "INSERT INTO room_players (
                    room_id,
                    player_name,
                    session_token_hash,
                    kart_id,
                    driver_id,
                    is_ready,
                    status
                ) VALUES (
                    :room_id,
                    :player_name,
                    :session_token_hash,
                    :kart_id,
                    :driver_id,
                    1,
                    'connected'
                )"
            );

            $stmt->execute([
                'room_id' => $roomId,
                'player_name' => $playerName,
                'session_token_hash' => $tokenHash,
                'kart_id' => $kartId,
                'driver_id' => $driverId
            ]);

            $playerId = (int) $this->db->lastInsertId();

            $stmt = $this->db->prepare(
                "UPDATE rooms
                 SET host_player_id = :player_id
                 WHERE id = :room_id"
            );

            $stmt->execute([
                'player_id' => $playerId,
                'room_id' => $roomId
            ]);

            $room = $this->getRoomDetails($roomId);

            $this->db->commit();

            return [
                'room_id' => $roomId,
                'room_code' => $roomCode,
                'player_id' => $playerId,
                'player_name' => $playerName,
                'session_token' => $sessionToken,
                'is_host' => true,
                'room' => $room
            ];

        } catch (Throwable $e) {

            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }

            throw $e;
        }
    }

    /* =========================================
       JOIN ROOM
    ========================================= */

    public function joinRoom(array $input): array
    {
        $roomCode = ApiSecurity::normalizeRoomCode(
            $input['room_code'] ?? ''
        );

        $playerName = ApiSecurity::validatePlayerName(
            $input['player_name'] ?? ''
        );

        $kartId = $this->validateAssetId(
            $input['kart_id'] ?? null,
            'red_racer'
        );

        $driverId = $this->validateAssetId(
            $input['driver_id'] ?? null,
            'blue_racer'
        );

        $sessionToken = ApiSecurity::generateToken();

        $tokenHash = ApiSecurity::hashToken(
            $sessionToken
        );

        try {

            $this->db->beginTransaction();

            $stmt = $this->db->prepare(
                "SELECT *
                 FROM rooms
                 WHERE room_code = :room_code
                 LIMIT 1
                 FOR UPDATE"
            );

            $stmt->execute([
                'room_code' => $roomCode
            ]);

            $room = $stmt->fetch();

            if (!$room) {

                throw new DomainException(
                    'Room not found.'
                );
            }

            if ($room['status'] !== 'waiting') {

                throw new DomainException(
                    'This room is not accepting new players.'
                );
            }

            $roomId = (int) $room['id'];

            $stmt = $this->db->prepare(
                "SELECT COUNT(*)
                 FROM room_players
                 WHERE room_id = :room_id
                   AND status IN (
                       'connected',
                       'disconnected'
                   )"
            );

            $stmt->execute([
                'room_id' => $roomId
            ]);

            $playerCount = (int) $stmt->fetchColumn();

            if (
                $playerCount >= (int) $room['max_players']
            ) {

                throw new DomainException(
                    'Room is full.'
                );
            }

            $stmt = $this->db->prepare(
                "SELECT id
                 FROM room_players
                 WHERE room_id = :room_id
                   AND player_name = :player_name
                   AND status != 'left'
                 LIMIT 1"
            );

            $stmt->execute([
                'room_id' => $roomId,
                'player_name' => $playerName
            ]);

            if ($stmt->fetch()) {

                throw new DomainException(
                    'This player name is already in use.'
                );
            }

            $stmt = $this->db->prepare(
                "INSERT INTO room_players (
                    room_id,
                    player_name,
                    session_token_hash,
                    kart_id,
                    driver_id,
                    is_ready,
                    status
                ) VALUES (
                    :room_id,
                    :player_name,
                    :session_token_hash,
                    :kart_id,
                    :driver_id,
                    0,
                    'connected'
                )"
            );

            $stmt->execute([
                'room_id' => $roomId,
                'player_name' => $playerName,
                'session_token_hash' => $tokenHash,
                'kart_id' => $kartId,
                'driver_id' => $driverId
            ]);

            $playerId = (int) $this->db->lastInsertId();

            $this->touchRoom($roomId);

            $roomDetails = $this->getRoomDetails($roomId);

            $this->db->commit();

            return [
                'room_id' => $roomId,
                'room_code' => $roomCode,
                'player_id' => $playerId,
                'player_name' => $playerName,
                'session_token' => $sessionToken,
                'is_host' => false,
                'room' => $roomDetails
            ];

        } catch (Throwable $e) {

            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }

            throw $e;
        }
    }

    /* =========================================
       GET ROOM DETAILS
    ========================================= */

    public function getRoomDetails(int $roomId): array
    {
        $stmt = $this->db->prepare(
            "SELECT *
             FROM rooms
             WHERE id = :room_id
             LIMIT 1"
        );

        $stmt->execute([
            'room_id' => $roomId
        ]);

        $room = $stmt->fetch();

        if (!$room) {

            throw new DomainException(
                'Room not found.'
            );
        }

        $stmt = $this->db->prepare(
            "SELECT
                id,
                player_name,
                kart_id,
                driver_id,
                is_ready,
                status,
                joined_at,
                last_seen_at
             FROM room_players
             WHERE room_id = :room_id
               AND status != 'left'
             ORDER BY joined_at ASC, id ASC"
        );

        $stmt->execute([
            'room_id' => $roomId
        ]);

        $players = $stmt->fetchAll();

        $connectedCount = 0;
        $allReady = true;

        foreach ($players as &$player) {

            $player['id'] = (int) $player['id'];

            $player['is_ready'] = (bool) $player['is_ready'];

            $player['is_host'] = (
                $player['id'] ===
                (int) $room['host_player_id']
            );

            if ($player['status'] === 'connected') {

                $connectedCount++;

                if (!$player['is_ready']) {
                    $allReady = false;
                }

            } else {

                $allReady = false;
            }
        }

        unset($player);

        $room['id'] = (int) $room['id'];

        $room['host_player_id'] =
            $room['host_player_id'] !== null
                ? (int) $room['host_player_id']
                : null;

        $room['target_points'] =
            (int) $room['target_points'];

        $room['duration'] =
            (int) $room['duration'];

        $room['max_players'] =
            (int) $room['max_players'];

        $room['selected_weapons'] = json_decode(
            $room['selected_weapons'],
            true
        ) ?? [];

        $room['players'] = $players;

        $room['player_count'] = count($players);

        $room['connected_count'] = $connectedCount;

        $room['can_start'] = (
            $room['status'] === 'waiting' &&
            $connectedCount >= 2 &&
            $allReady
        );

        return $room;
    }

    /* =========================================
       GET AUTHENTICATED PLAYER ROOM
    ========================================= */

    public function getPlayerRoom(string $token): array
    {
        $player = ApiSecurity::authenticate(
            $this->db,
            $token
        );

        $stmt = $this->db->prepare(
            "UPDATE room_players
             SET last_seen_at = CURRENT_TIMESTAMP
             WHERE id = :player_id
               AND status = 'connected'"
        );

        $stmt->execute([
            'player_id' => $player['id']
        ]);

        return $this->getRoomDetails(
            (int) $player['room_id']
        );
    }

    /* =========================================
       LEAVE ROOM
    ========================================= */

    public function leaveRoom(string $token): array
    {
        $player = ApiSecurity::authenticate(
            $this->db,
            $token
        );

        $roomId = (int) $player['room_id'];
        $playerId = (int) $player['id'];

        try {

            $this->db->beginTransaction();

            $stmt = $this->db->prepare(
                "SELECT *
                 FROM rooms
                 WHERE id = :room_id
                 FOR UPDATE"
            );

            $stmt->execute([
                'room_id' => $roomId
            ]);

            $room = $stmt->fetch();

            if (!$room) {

                throw new DomainException(
                    'Room not found.'
                );
            }

            $stmt = $this->db->prepare(
                "UPDATE room_players
                 SET
                    status = 'left',
                    is_ready = 0
                 WHERE id = :player_id
                   AND room_id = :room_id
                   AND status = 'connected'"
            );

            $stmt->execute([
                'player_id' => $playerId,
                'room_id' => $roomId
            ]);

            if ($stmt->rowCount() !== 1) {

                throw new DomainException(
                    'Player has already left the room.'
                );
            }

            $stmt = $this->db->prepare(
                "UPDATE player_states ps
                 INNER JOIN matches m
                    ON m.id = ps.match_id
                 SET
                    ps.is_alive = 0,
                    ps.health = 0,
                    ps.speed = 0,
                    ps.weapon_id = NULL,
                    ps.ammo = 0,
                    ps.max_ammo = 0,
                    ps.is_firing = 0,
                    ps.respawn_at = 0,
                    ps.state_version = ps.state_version + 1
                 WHERE ps.player_id = :player_id
                   AND m.room_id = :room_id
                   AND m.status = 'playing'"
            );

            $stmt->execute([
                'player_id' => $playerId,
                'room_id' => $roomId
            ]);

            $stmt = $this->db->prepare(
                "SELECT id
                 FROM room_players
                 WHERE room_id = :room_id
                   AND status = 'connected'
                 ORDER BY joined_at ASC, id ASC
                 LIMIT 1"
            );

            $stmt->execute([
                'room_id' => $roomId
            ]);

            $nextPlayer = $stmt->fetch();

            $newHostId = null;
            $roomClosed = false;

            if (!$nextPlayer) {

                $stmt = $this->db->prepare(
                    "UPDATE rooms
                     SET
                        status = 'closed',
                        host_player_id = NULL
                     WHERE id = :room_id"
                );

                $stmt->execute([
                    'room_id' => $roomId
                ]);

                $stmt = $this->db->prepare(
                    "UPDATE matches
                     SET
                        status = 'cancelled',
                        finished_at = CURRENT_TIMESTAMP
                     WHERE room_id = :room_id
                       AND status IN ('waiting', 'playing')"
                );

                $stmt->execute([
                    'room_id' => $roomId
                ]);

                $roomClosed = true;

            } elseif (
                (int) $room['host_player_id'] === $playerId
            ) {

                $newHostId = (int) $nextPlayer['id'];

                $stmt = $this->db->prepare(
                    "UPDATE rooms
                     SET host_player_id = :host_player_id
                     WHERE id = :room_id"
                );

                $stmt->execute([
                    'host_player_id' => $newHostId,
                    'room_id' => $roomId
                ]);
            }

            $this->touchRoom($roomId);

            $this->db->commit();

            return [
                'room_id' => $roomId,
                'player_id' => $playerId,
                'room_closed' => $roomClosed,
                'new_host_id' => $newHostId
            ];

        } catch (Throwable $e) {

            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }

            throw $e;
        }
    }

    /* =========================================
       UPDATE ROOM ACTIVITY
    ========================================= */

    private function touchRoom(int $roomId): void
    {
        $stmt = $this->db->prepare(
            "UPDATE rooms
             SET updated_at = CURRENT_TIMESTAMP
             WHERE id = :room_id"
        );

        $stmt->execute([
            'room_id' => $roomId
        ]);
    }
}