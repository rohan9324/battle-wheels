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
   HANDLE GET ROOM REQUEST
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

    // Get authenticated player's room details
    $result = $roomManager->getPlayerRoom(
        $sessionToken
    );

    // Return success response
    ApiSecurity::success(
        $result,
        'Room details fetched successfully.',
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
        404
    );

} catch (Throwable $e) {

    error_log(
        'Battle Wheels Get Room Error: ' .
        $e->getMessage()
    );

    ApiSecurity::error(
        'Unable to fetch room details. Please try again.',
        500
    );
}