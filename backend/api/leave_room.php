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
   HANDLE LEAVE ROOM REQUEST
========================================= */

try {

    // Read JSON request
    $input = ApiSecurity::getJsonInput();

    // Validate player session token
    $sessionToken = ApiSecurity::requireToken($input);

    // Connect to live MySQL database
    $db = getDB();

    // Initialize room manager
    $roomManager = new RoomManager($db);

    // Leave multiplayer room
    $result = $roomManager->leaveRoom(
        $sessionToken
    );

    // Return success response
    ApiSecurity::success(
        $result,
        'Room left successfully.',
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
        'Battle Wheels Leave Room Error: ' .
        $e->getMessage()
    );

    ApiSecurity::error(
        'Unable to leave room. Please try again.',
        500
    );
}