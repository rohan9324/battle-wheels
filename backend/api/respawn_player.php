<?php

declare(strict_types=1);

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../includes/ApiSecurity.php';
require_once __DIR__ . '/../includes/GameManager.php';
require_once __DIR__ . '/../includes/RespawnManager.php';

/* =========================================
   INITIALIZE API SECURITY
========================================= */

ApiSecurity::init('POST');

/* =========================================
   HANDLE PLAYER RESPAWN REQUEST
========================================= */

try {

    $input = ApiSecurity::getJsonInput();

    $sessionToken = ApiSecurity::requireToken(
        $input
    );

    /* CONNECT TO DATABASE */

    $db = getDB();

    /* INITIALIZE RESPAWN MANAGER */

    $respawnManager = new RespawnManager(
        $db
    );

    /* RESPAWN PLAYER */

    $result = $respawnManager->respawnPlayer(
        $sessionToken,
        $input
    );

    /* RETURN RESPONSE */

    ApiSecurity::success(
        $result,
        $result['respawned']
            ? 'Player respawned successfully.'
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
        'Battle Wheels Respawn Player Error: ' .
        $e->getMessage()
    );

    ApiSecurity::error(
        'Unable to respawn player.',
        500
    );
}