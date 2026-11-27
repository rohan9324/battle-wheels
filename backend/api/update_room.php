<?php

declare(strict_types=1);

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../includes/ApiSecurity.php';
require_once __DIR__ . '/../includes/RoomManager.php';

/* =========================================
   INITIALIZE API SECURITY
========================================= */

ApiSecurity::init('POST');

$db = null;

/* =========================================
   HANDLE UPDATE ROOM REQUEST
========================================= */

try {

    $input = ApiSecurity::getJsonInput();

    $sessionToken = ApiSecurity::requireToken($input);

    $db = getDB();

    $player = ApiSecurity::authenticate(
        $db,
        $sessionToken
    );

    ApiSecurity::requireHost($player);

    $roomId = (int) $player['room_id'];
    $playerId = (int) $player['id'];

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

    /* =========================================
       VERIFY HOST
    ========================================= */

    if ((int) $room['host_player_id'] !== $playerId) {

        $db->rollBack();

        ApiSecurity::error(
            'Only the room host can update settings.',
            403
        );
    }

    if ($room['status'] !== 'waiting') {

        throw new DomainException(
            'Room settings can only be changed in the waiting lobby.'
        );
    }

    $stmt = $db->prepare(
        "SELECT status
         FROM room_players
         WHERE id = :player_id
           AND room_id = :room_id
         LIMIT 1
         FOR UPDATE"
    );

    $stmt->execute([
        'player_id' => $playerId,
        'room_id' => $roomId
    ]);

    if ($stmt->fetchColumn() !== 'connected') {

        throw new DomainException(
            'Host is no longer connected.'
        );
    }

    /* =========================================
       READ ROOM SETTINGS
    ========================================= */

    $mapId = $input['map_id']
        ?? $room['map_id'];

    $matchType = $input['match_type']
        ?? $room['match_type'];

    $targetPoints = filter_var(
        $input['target_points']
            ?? $room['target_points'],
        FILTER_VALIDATE_INT
    );

    $duration = filter_var(
        $input['duration']
            ?? $room['duration'],
        FILTER_VALIDATE_INT
    );

    $maxPlayers = filter_var(
        $input['max_players']
            ?? $room['max_players'],
        FILTER_VALIDATE_INT
    );

    $selectedWeapons = $input['selected_weapons']
        ?? json_decode(
            $room['selected_weapons'],
            true
        );

    /* =========================================
       VALIDATE MAP
    ========================================= */

    $allowedMaps = [
        'village',
        'desert',
        'snow'
    ];

    if (!in_array($mapId, $allowedMaps, true)) {

        throw new InvalidArgumentException(
            'Invalid map selected.'
        );
    }

    /* =========================================
       VALIDATE MATCH TYPE
    ========================================= */

    if (
        !in_array(
            $matchType,
            ['points', 'time'],
            true
        )
    ) {

        throw new InvalidArgumentException(
            'Invalid match type.'
        );
    }

    /* =========================================
       VALIDATE TARGET POINTS
    ========================================= */

    if (
        $targetPoints === false ||
        $targetPoints < 1 ||
        $targetPoints > 100
    ) {

        throw new InvalidArgumentException(
            'Target points must be between 1 and 100.'
        );
    }

    /* =========================================
       VALIDATE MATCH DURATION
    ========================================= */

    if (
        $duration === false ||
        $duration < 1 ||
        $duration > 30
    ) {

        throw new InvalidArgumentException(
            'Match duration must be between 1 and 30 minutes.'
        );
    }

    /* =========================================
       VALIDATE MAXIMUM PLAYERS
    ========================================= */

    if (
        $maxPlayers === false ||
        $maxPlayers < 2 ||
        $maxPlayers > 6
    ) {

        throw new InvalidArgumentException(
            'Maximum players must be between 2 and 6.'
        );
    }

    /* =========================================
       VALIDATE SELECTED WEAPONS
    ========================================= */

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

    /* =========================================
       CHECK EXISTING PLAYER COUNT
    ========================================= */

    $stmt = $db->prepare(
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

    $currentPlayerCount = (int) $stmt->fetchColumn();

    if ($maxPlayers < $currentPlayerCount) {

        throw new DomainException(
            'Maximum players cannot be less than the current player count.'
        );
    }

    /* =========================================
       CHECK WHETHER SETTINGS CHANGED
    ========================================= */

    $oldWeapons = json_decode(
        $room['selected_weapons'],
        true
    ) ?? [];

    $oldWeaponList = $oldWeapons;
    $newWeaponList = $selectedWeapons;

    sort($oldWeaponList);
    sort($newWeaponList);

    $settingsChanged = (
        $mapId !== $room['map_id'] ||
        $matchType !== $room['match_type'] ||
        $targetPoints !== (int) $room['target_points'] ||
        $duration !== (int) $room['duration'] ||
        $maxPlayers !== (int) $room['max_players'] ||
        $oldWeaponList !== $newWeaponList
    );

    /* =========================================
       UPDATE ROOM SETTINGS
    ========================================= */

    if ($settingsChanged) {

        $stmt = $db->prepare(
            "UPDATE rooms
             SET
                map_id = :map_id,
                match_type = :match_type,
                target_points = :target_points,
                duration = :duration,
                max_players = :max_players,
                selected_weapons = :selected_weapons,
                updated_at = CURRENT_TIMESTAMP
             WHERE id = :room_id"
        );

        $stmt->execute([
            'map_id' => $mapId,
            'match_type' => $matchType,
            'target_points' => $targetPoints,
            'duration' => $duration,
            'max_players' => $maxPlayers,
            'selected_weapons' => json_encode(
                $selectedWeapons,
                JSON_THROW_ON_ERROR
            ),
            'room_id' => $roomId
        ]);

        /* =========================================
           RESET OTHER PLAYERS READY STATUS
        ========================================= */

        $stmt = $db->prepare(
            "UPDATE room_players
             SET
                is_ready = 0,
                updated_at = CURRENT_TIMESTAMP
             WHERE room_id = :room_id
               AND id != :host_id
               AND status != 'left'"
        );

        $stmt->execute([
            'room_id' => $roomId,
            'host_id' => $playerId
        ]);
    }

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
        'player_id' => $playerId,
        'room_id' => $roomId
    ]);

    /* =========================================
       FETCH UPDATED ROOM DETAILS
    ========================================= */

    $roomManager = new RoomManager($db);

    $roomDetails = $roomManager->getRoomDetails(
        $roomId
    );

    $db->commit();

    /* =========================================
       RETURN SUCCESS RESPONSE
    ========================================= */

    ApiSecurity::success(
        [
            'settings_changed' => $settingsChanged,
            'room' => $roomDetails
        ],
        $settingsChanged
            ? 'Room settings updated successfully.'
            : 'Room settings are unchanged.',
        200
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
        'Battle Wheels Update Room Error: ' .
        $e->getMessage()
    );

    ApiSecurity::error(
        'Unable to update room settings. Please try again.',
        500
    );
}