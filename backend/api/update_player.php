<?php

declare(strict_types=1);

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../includes/ApiSecurity.php';
require_once __DIR__ . '/../includes/GameManager.php';

/* =========================================
   INITIALIZE API SECURITY
========================================= */

ApiSecurity::init('POST');

/* =========================================
   HANDLE PLAYER MOVEMENT
========================================= */

try {

    $input = ApiSecurity::getJsonInput();

    $sessionToken = ApiSecurity::requireToken(
        $input
    );

    $db = getDB();

    $gameManager = new GameManager($db);

    $result = $gameManager->updatePlayer(
        $sessionToken,
        $input
    );

    ApiSecurity::success(
        $result,
        $result['accepted']
            ? 'Player movement updated.'
            : 'Player movement ignored.',
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
        'Battle Wheels Update Player Error: ' .
        $e->getMessage()
    );

    ApiSecurity::error(
        'Unable to update player movement.',
        500
    );
}