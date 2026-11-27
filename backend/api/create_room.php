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
   HANDLE CREATE ROOM REQUEST
========================================= */

try {

    // Read JSON request
    $input = ApiSecurity::getJsonInput();

    // Connect to live MySQL database
    $db = getDB();

    // Initialize room manager
    $roomManager = new RoomManager($db);

    // Create multiplayer room
    $result = $roomManager->createRoom($input);

    // Return success response
    ApiSecurity::success(
        $result,
        'Room created successfully.',
        201
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
        'Battle Wheels Create Room Error: ' .
        $e->getMessage()
    );

    ApiSecurity::error(
        'Unable to create room. Please try again.',
        500
    );
}