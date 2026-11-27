<?php

declare(strict_types=1);

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../includes/ApiSecurity.php';
require_once __DIR__ . '/../includes/RoomManager.php';

/* =========================================
   INITIALIZE API SECURITY
========================================= */

ApiSecurity::init('POST');

/* =========================================
   HANDLE JOIN ROOM REQUEST
========================================= */

try {

    // Read JSON request
    $input = ApiSecurity::getJsonInput();

    // Connect to live MySQL database
    $db = getDB();

    // Initialize room manager
    $roomManager = new RoomManager($db);

    // Join multiplayer room
    $result = $roomManager->joinRoom($input);

    // Return success response
    ApiSecurity::success(
        $result,
        'Room joined successfully.',
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
        $e->getMessage() === 'Room not found.'
            ? 404
            : 409
    );

} catch (Throwable $e) {

    error_log(
        'Battle Wheels Join Room Error: ' .
        $e->getMessage()
    );

    ApiSecurity::error(
        'Unable to join room. Please try again.',
        500
    );
}