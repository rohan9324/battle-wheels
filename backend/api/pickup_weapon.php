<?php

declare(strict_types=1);

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../includes/ApiSecurity.php';
require_once __DIR__ . '/../includes/GameManager.php';
require_once __DIR__ . '/../includes/WeaponManager.php';

ApiSecurity::init('POST');

/* =========================================
   HANDLE WEAPON PICKUP REQUEST
========================================= */

try {

    $input = ApiSecurity::getJsonInput();

    $sessionToken = ApiSecurity::requireToken(
        $input
    );

    $db = getDB();

    $weaponManager = new WeaponManager($db);

    $result = $weaponManager->pickupWeapon(
        $sessionToken,
        $input
    );

    ApiSecurity::success(
        $result,
        'Weapon collected successfully.',
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
        'Battle Wheels Pickup Weapon Error: ' .
        $e->getMessage()
    );

    ApiSecurity::error(
        'Unable to collect weapon.',
        500
    );
}