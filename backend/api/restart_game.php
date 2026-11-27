<?php

declare(strict_types=1);

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../includes/ApiSecurity.php';
require_once __DIR__ . '/../includes/RoomManager.php';
require_once __DIR__ . '/../includes/GameManager.php';
require_once __DIR__ . '/../includes/MatchManager.php';

/* =========================================
   INITIALIZE API SECURITY
========================================= */

ApiSecurity::init('POST');

/* =========================================
   HANDLE RESTART GAME REQUEST
========================================= */

try {

    /* GET REQUEST DATA */

    $input = ApiSecurity::getJsonInput();

    /* VALIDATE SESSION TOKEN */

    $sessionToken = ApiSecurity::requireToken(
        $input
    );

    /* CONNECT TO DATABASE */

    $db = getDB();

    /* INITIALIZE MATCH MANAGER */

    $matchManager = new MatchManager($db);

    /* RESTART GAME */

    $result = $matchManager->restartGame(
        $sessionToken,
        $input
    );

    /* RETURN SUCCESS RESPONSE */

    ApiSecurity::success(
        $result,
        $result['restarted']
            ? 'Room restarted successfully.'
            : $result['reason'],
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
        'Battle Wheels Restart Game Error: ' .
        $e->getMessage()
    );

    ApiSecurity::error(
        'Unable to restart the game.',
        500
    );
}