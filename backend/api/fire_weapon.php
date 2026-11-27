<?php

declare(strict_types=1);

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../includes/ApiSecurity.php';
require_once __DIR__ . '/../includes/GameManager.php';
require_once __DIR__ . '/../includes/WeaponManager.php';
require_once __DIR__ . '/../includes/CombatManager.php';

ApiSecurity::init('POST');

/* =========================================
   HANDLE FIRE WEAPON REQUEST
========================================= */

try {

    $input = ApiSecurity::getJsonInput();

    $sessionToken = ApiSecurity::requireToken(
        $input
    );

    $db = getDB();

    $combatManager = new CombatManager(
        $db
    );

    $result = $combatManager->fireWeapon(
        $sessionToken,
        $input
    );

    ApiSecurity::success(
        $result,
        'Weapon fired successfully.',
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
        'Battle Wheels Fire Weapon Error: ' .
        $e->getMessage()
    );

    ApiSecurity::error(
        'Unable to fire weapon.',
        500
    );
}