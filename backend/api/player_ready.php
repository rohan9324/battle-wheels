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
   HANDLE PLAYER READY REQUEST
========================================= */

try {

    // Read JSON request
    $input = ApiSecurity::getJsonInput();

    // Validate session token
    $sessionToken = ApiSecurity::requireToken($input);

    // Validate ready status
    if (
        !array_key_exists('is_ready', $input) ||
        !is_bool($input['is_ready'])
    ) {
        ApiSecurity::error(
            'Ready status must be true or false.',
            400
        );
    }

    $isReady = $input['is_ready'] ? 1 : 0;

    // Connect to live database
    $db = getDB();

    // Authenticate player
    $player = ApiSecurity::authenticate(
        $db,
        $sessionToken
    );

    $roomId = (int) $player['room_id'];
    $playerId = (int) $player['id'];

    // Start transaction
    $db->beginTransaction();

    /* =========================================
       LOCK ROOM
    ========================================= */

    $stmt = $db->prepare(
        "SELECT id, status, host_player_id
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

    if ($room['status'] !== 'waiting') {
        throw new DomainException(
            'Ready status can only be changed in the waiting lobby.'
        );
    }

    /* =========================================
       VERIFY PLAYER STATUS
    ========================================= */

    $stmt = $db->prepare(
        "SELECT id, status
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

    $currentPlayer = $stmt->fetch();

    if (
        !$currentPlayer ||
        $currentPlayer['status'] !== 'connected'
    ) {
        throw new DomainException(
            'Player is no longer connected to this room.'
        );
    }

    /* =========================================
       UPDATE PLAYER READY STATUS
    ========================================= */

    $stmt = $db->prepare(
        "UPDATE room_players
         SET
            is_ready = :is_ready,
            last_seen_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
         WHERE id = :player_id
           AND room_id = :room_id
           AND status = 'connected'"
    );

    $stmt->execute([
        'is_ready' => $isReady,
        'player_id' => $playerId,
        'room_id' => $roomId
    ]);

    /* =========================================
       UPDATE ROOM ACTIVITY
    ========================================= */

    $stmt = $db->prepare(
        "UPDATE rooms
         SET updated_at = CURRENT_TIMESTAMP
         WHERE id = :room_id"
    );

    $stmt->execute([
        'room_id' => $roomId
    ]);

    /* =========================================
       GET UPDATED ROOM DETAILS
    ========================================= */

    $roomManager = new RoomManager($db);

    $roomDetails = $roomManager->getRoomDetails(
        $roomId
    );

    // Commit transaction
    $db->commit();

    /* =========================================
       RETURN SUCCESS RESPONSE
    ========================================= */

    ApiSecurity::success(
        [
            'player_id' => $playerId,
            'is_ready' => (bool) $isReady,
            'room' => $roomDetails
        ],
        $isReady
            ? 'Player is ready.'
            : 'Player is not ready.',
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
        'Battle Wheels Player Ready Error: ' .
        $e->getMessage()
    );

    ApiSecurity::error(
        'Unable to update ready status. Please try again.',
        500
    );
}