<?php

declare(strict_types=1);

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../includes/ApiSecurity.php';
require_once __DIR__ . '/../includes/RoomManager.php';

ApiSecurity::init('POST');

$db = null;

/* =========================================
   MAP CONFIGURATION
========================================= */

function getMapConfig(string $mapId): array
{
    $configs = [
        'village' => [
            'spawn_limit' => 225,
            'minimum_spawn_distance' => 35,
            'pickup_count' => 40,
            'pickup_spawn_limit' => 228,
            'pickup_minimum_distance' => 18
        ],

        'desert' => [
            'spawn_limit' => 60,
            'minimum_spawn_distance' => 12,
            'pickup_count' => 15,
            'pickup_spawn_limit' => 62,
            'pickup_minimum_distance' => 10
        ],

        'snow' => [
            'spawn_limit' => 125,
            'minimum_spawn_distance' => 22,
            'pickup_count' => 25,
            'pickup_spawn_limit' => 128,
            'pickup_minimum_distance' => 14
        ]
    ];

    if (!isset($configs[$mapId])) {
        throw new InvalidArgumentException(
            'Invalid map configuration.'
        );
    }

    return $configs[$mapId];
}

/* =========================================
   GENERATE SPAWN POSITION
========================================= */

function generatePosition(
    int $limit,
    float $minimumDistance,
    array $existingPositions
): array {

    for ($attempt = 0; $attempt < 500; $attempt++) {

        $x = random_int(
            -$limit * 100,
            $limit * 100
        ) / 100;

        $z = random_int(
            -$limit * 100,
            $limit * 100
        ) / 100;

        $valid = true;

        foreach ($existingPositions as $position) {

            $distance = hypot(
                $x - $position['x'],
                $z - $position['z']
            );

            if ($distance < $minimumDistance) {

                $valid = false;

                break;
            }
        }

        if ($valid) {

            return [
                'x' => $x,
                'y' => 0,
                'z' => $z
            ];
        }
    }

    throw new RuntimeException(
        'Unable to generate a valid spawn position.'
    );
}

/* =========================================
   HANDLE START GAME REQUEST
========================================= */

try {

    $input = ApiSecurity::getJsonInput();

    $sessionToken = ApiSecurity::requireToken(
        $input
    );

    $db = getDB();

    $player = ApiSecurity::authenticate(
        $db,
        $sessionToken
    );

    ApiSecurity::requireHost($player);

    $roomId = (int) $player['room_id'];
    $hostId = (int) $player['id'];

    $db->beginTransaction();

    /* =========================================
       LOCK ROOM
    ========================================= */

    $stmt = $db->prepare(
        "SELECT *
         FROM rooms
         WHERE id = :room_id
         LIMIT 1
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

    if ((int) $room['host_player_id'] !== $hostId) {

        $db->rollBack();

        ApiSecurity::error(
            'Only the host can start the match.',
            403
        );
    }

    if ($room['status'] !== 'waiting') {

        throw new DomainException(
            'Room is not in waiting status.'
        );
    }

    /* =========================================
       CHECK ACTIVE MATCH
    ========================================= */

    $stmt = $db->prepare(
        "SELECT id
         FROM matches
         WHERE room_id = :room_id
           AND status IN ('waiting', 'playing')
         LIMIT 1"
    );

    $stmt->execute([
        'room_id' => $roomId
    ]);

    if ($stmt->fetch()) {

        throw new DomainException(
            'A match is already active in this room.'
        );
    }

    /* =========================================
       GET ROOM PLAYERS
    ========================================= */

    $stmt = $db->prepare(
        "SELECT
            id,
            player_name,
            kart_id,
            driver_id,
            is_ready,
            status
         FROM room_players
         WHERE room_id = :room_id
           AND status != 'left'
         ORDER BY id ASC
         FOR UPDATE"
    );

    $stmt->execute([
        'room_id' => $roomId
    ]);

    $players = $stmt->fetchAll();

    $playerCount = count($players);

    if ($playerCount < 2) {

        throw new DomainException(
            'At least 2 players are required.'
        );
    }

    if ($playerCount > (int) $room['max_players']) {

        throw new DomainException(
            'Room player limit exceeded.'
        );
    }

    $hostConnected = false;

    foreach ($players as $roomPlayer) {

        if ($roomPlayer['status'] !== 'connected') {

            throw new DomainException(
                'All players must be connected.'
            );
        }

        if (!(bool) $roomPlayer['is_ready']) {

            throw new DomainException(
                'All players must be ready.'
            );
        }

        if ((int) $roomPlayer['id'] === $hostId) {
            $hostConnected = true;
        }
    }

    if (!$hostConnected) {

        throw new DomainException(
            'Room host is not connected.'
        );
    }

    /* =========================================
       VALIDATE MATCH SETTINGS
    ========================================= */

    $mapId = $room['map_id'];

    $mapConfig = getMapConfig($mapId);

    $selectedWeapons = json_decode(
        $room['selected_weapons'],
        true,
        32,
        JSON_THROW_ON_ERROR
    );

    if (
        !is_array($selectedWeapons) ||
        count($selectedWeapons) === 0
    ) {

        throw new DomainException(
            'At least one weapon must be selected.'
        );
    }

    /* =========================================
       GENERATE MATCH NUMBER
    ========================================= */

    $stmt = $db->prepare(
        "SELECT COALESCE(MAX(match_number), 0) + 1
         FROM matches
         WHERE room_id = :room_id"
    );

    $stmt->execute([
        'room_id' => $roomId
    ]);

    $matchNumber = (int) $stmt->fetchColumn();

    /* =========================================
       MATCH TIMING
    ========================================= */

    $now = ApiSecurity::now();

    // Allow clients time to load the match.
    $startDelay = 15000;

    $startAt = $now + $startDelay;

    $startedAt = gmdate(
        'Y-m-d H:i:s',
        intdiv($startAt, 1000)
    );

    $endsAt = null;

    if ($room['match_type'] === 'time') {

        $durationSeconds =
            (int) $room['duration'] * 60;

        $endsAt = gmdate(
            'Y-m-d H:i:s',
            intdiv($startAt, 1000) + $durationSeconds
        );
    }

    /* =========================================
       CREATE MATCH
    ========================================= */

    $stmt = $db->prepare(
        "INSERT INTO matches (
            room_id,
            match_number,
            map_id,
            match_type,
            target_points,
            duration,
            selected_weapons,
            status,
            started_at,
            ends_at
         ) VALUES (
            :room_id,
            :match_number,
            :map_id,
            :match_type,
            :target_points,
            :duration,
            :selected_weapons,
            'playing',
            :started_at,
            :ends_at
         )"
    );

    $stmt->execute([
        'room_id' => $roomId,
        'match_number' => $matchNumber,
        'map_id' => $mapId,
        'match_type' => $room['match_type'],
        'target_points' => $room['target_points'],
        'duration' => $room['duration'],
        'selected_weapons' => json_encode(
            $selectedWeapons,
            JSON_THROW_ON_ERROR
        ),
        'started_at' => $startedAt,
        'ends_at' => $endsAt
    ]);

    $matchId = (int) $db->lastInsertId();

    /* =========================================
       INITIALIZE PLAYER STATES
    ========================================= */

    $playerPositions = [];

    $initialPlayers = [];

    $spawnProtectionUntil = $startAt + 5000;

    $stmt = $db->prepare(
        "INSERT INTO player_states (
            match_id,
            player_id,
            position_x,
            position_y,
            position_z,
            rotation,
            speed,
            health,
            max_health,
            is_alive,
            weapon_id,
            ammo,
            max_ammo,
            is_firing,
            score,
            kills,
            deaths,
            life_id,
            protected_until,
            respawn_at,
            state_version
         ) VALUES (
            :match_id,
            :player_id,
            :position_x,
            :position_y,
            :position_z,
            :rotation,
            0,
            100,
            100,
            1,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            1,
            :protected_until,
            0,
            1
         )"
    );

    foreach ($players as $roomPlayer) {

        $position = generatePosition(
            $mapConfig['spawn_limit'],
            $mapConfig['minimum_spawn_distance'],
            $playerPositions
        );

        $playerPositions[] = $position;

        $rotation = random_int(
            0,
            6283
        ) / 1000;

        $stmt->execute([
            'match_id' => $matchId,
            'player_id' => $roomPlayer['id'],
            'position_x' => $position['x'],
            'position_y' => $position['y'],
            'position_z' => $position['z'],
            'rotation' => $rotation,
            'protected_until' => $spawnProtectionUntil
        ]);

        $initialPlayers[] = [
            'player_id' => (int) $roomPlayer['id'],
            'player_name' => $roomPlayer['player_name'],
            'kart_id' => $roomPlayer['kart_id'],
            'driver_id' => $roomPlayer['driver_id'],
            'position_x' => $position['x'],
            'position_y' => $position['y'],
            'position_z' => $position['z'],
            'rotation' => $rotation,
            'health' => 100,
            'max_health' => 100,
            'score' => 0,
            'kills' => 0,
            'deaths' => 0,
            'weapon_id' => null,
            'ammo' => 0,
            'is_alive' => true,
            'protected_until' => $spawnProtectionUntil
        ];
    }

    /* =========================================
       INITIALIZE MYSTERY BOXES
    ========================================= */

    $pickupPositions = [];

    $initialPickups = [];

    $stmt = $db->prepare(
        "INSERT INTO weapon_pickups (
            match_id,
            pickup_number,
            position_x,
            position_y,
            position_z,
            weapon_id,
            is_active,
            respawn_at,
            state_version
         ) VALUES (
            :match_id,
            :pickup_number,
            :position_x,
            :position_y,
            :position_z,
            NULL,
            1,
            0,
            1
         )"
    );

    for (
        $i = 1;
        $i <= $mapConfig['pickup_count'];
        $i++
    ) {

        $position = generatePosition(
            $mapConfig['pickup_spawn_limit'],
            $mapConfig['pickup_minimum_distance'],
            array_merge(
                $pickupPositions,
                $playerPositions
            )
        );

        $pickupPositions[] = $position;

        $stmt->execute([
            'match_id' => $matchId,
            'pickup_number' => $i,
            'position_x' => $position['x'],
            'position_y' => $position['y'],
            'position_z' => $position['z']
        ]);

        $pickupId = (int) $db->lastInsertId();

        $initialPickups[] = [
            'id' => $pickupId,
            'pickup_number' => $i,
            'position_x' => $position['x'],
            'position_y' => $position['y'],
            'position_z' => $position['z'],
            'is_active' => true
        ];
    }

    /* =========================================
       UPDATE ROOM STATUS
    ========================================= */

    $stmt = $db->prepare(
        "UPDATE rooms
         SET
            status = 'playing',
            updated_at = CURRENT_TIMESTAMP
         WHERE id = :room_id"
    );

    $stmt->execute([
        'room_id' => $roomId
    ]);

    /* =========================================
       UPDATE HOST ACTIVITY
    ========================================= */

    $stmt = $db->prepare(
        "UPDATE room_players
         SET last_seen_at = CURRENT_TIMESTAMP
         WHERE id = :player_id
           AND room_id = :room_id"
    );

    $stmt->execute([
        'player_id' => $hostId,
        'room_id' => $roomId
    ]);

    /* =========================================
       CREATE MATCH START EVENT
    ========================================= */

    $stmt = $db->prepare(
        "INSERT INTO game_events (
            match_id,
            event_type,
            source_player_id,
            event_data,
            event_time
         ) VALUES (
            :match_id,
            'match_started',
            :source_player_id,
            :event_data,
            :event_time
         )"
    );

    $stmt->execute([
        'match_id' => $matchId,
        'source_player_id' => $hostId,
        'event_data' => json_encode([
            'match_number' => $matchNumber,
            'map_id' => $mapId,
            'player_count' => $playerCount,
            'start_at' => $startAt
        ], JSON_THROW_ON_ERROR),
        'event_time' => $now
    ]);

    $eventId = (int) $db->lastInsertId();

    /* =========================================
       GET UPDATED ROOM DETAILS
    ========================================= */

    $roomManager = new RoomManager($db);

    $roomDetails = $roomManager->getRoomDetails(
        $roomId
    );

    $db->commit();

    /* =========================================
       RETURN MATCH DETAILS
    ========================================= */

    ApiSecurity::success(
        [
            'match_id' => $matchId,
            'match_number' => $matchNumber,
            'room_id' => $roomId,
            'map_id' => $mapId,
            'match_type' => $room['match_type'],
            'target_points' => (int) $room['target_points'],
            'duration' => (int) $room['duration'],
            'selected_weapons' => $selectedWeapons,
            'server_time' => ApiSecurity::now(),
            'start_at' => $startAt,
            'started_at' => $startedAt,
            'ends_at' => $endsAt,
            'players' => $initialPlayers,
            'weapon_pickups' => $initialPickups,
            'last_event_id' => $eventId,
            'room' => $roomDetails
        ],
        'Match started successfully.',
        201
    );

} catch (InvalidArgumentException $e) {

    if ($db instanceof PDO && $db->inTransaction()) {
        $db->rollBack();
    }

    ApiSecurity::error(
        $e->getMessage(),
        400
    );

} catch (DomainException $e) {

    if ($db instanceof PDO && $db->inTransaction()) {
        $db->rollBack();
    }

    ApiSecurity::error(
        $e->getMessage(),
        409
    );

} catch (Throwable $e) {

    if ($db instanceof PDO && $db->inTransaction()) {
        $db->rollBack();
    }

    error_log(
        'Battle Wheels Start Game Error: ' .
        $e->getMessage()
    );

    ApiSecurity::error(
        'Unable to start match. Please try again.',
        500
    );
}