<?php

declare(strict_types=1);

require_once __DIR__ . '/ApiSecurity.php';
require_once __DIR__ . '/GameManager.php';

class WeaponManager
{
    private PDO $db;

    private GameManager $gameManager;

    /* =========================================
       WEAPON CONFIGURATION

       Provisional configuration.
       Must match frontend WeaponConfig.js
       before production deployment.
    ========================================= */

    private const WEAPONS = [

        'triple_rocket' => [
            'name' => 'Triple Rocket',
            'ammo' => 1,
            'damage' => 35,
            'type' => 'projectile',
            'projectile_type' => 'rocket',
            'projectileSpeed' => 160,
            'projectileSize' => 1.65,
            'projectileCount' => 3,
            'burstCount' => 1,
            'burstInterval' => 0,
            'spread' => 0,
            'projectileSpacing' => 1.15
        ],

        'mega_nuke' => [
            'name' => 'Mega Nuke',
            'ammo' => 1,
            'damage' => 100,
            'type' => 'projectile',
            'projectile_type' => 'nuke',
            'projectileSpeed' => 135,
            'projectileSize' => 2.1,
            'projectileCount' => 1,
            'burstCount' => 1,
            'burstInterval' => 0,
            'spread' => 0,
            'projectileSpacing' => 0
        ],

        'cannon' => [
            'name' => 'Cannon',
            'ammo' => 1,
            'damage' => 45,
            'type' => 'projectile',
            'projectile_type' => 'cannonball',
            'projectileSpeed' => 155,
            'projectileSize' => 1.8,
            'projectileCount' => 3,
            'burstCount' => 1,
            'burstInterval' => 0,
            'spread' => 0,
            'projectileSpacing' => 1.15
        ],

        'machine_gun' => [
            'name' => 'Machine Gun',
            'ammo' => 1,
            'damage' => 8,
            'type' => 'projectile',
            'projectile_type' => 'bullet',
            'projectileSpeed' => 380,
            'projectileSize' => 1.6,
            'projectileCount' => 1,
            'burstCount' => 13,
            'burstInterval' => 80,
            'spread' => 0,
            'projectileSpacing' => 0
        ],

        'plasma_gun' => [
            'name' => 'Plasma Blaster',
            'ammo' => 1,
            'damage' => 20,
            'type' => 'projectile',
            'projectile_type' => 'plasma',
            'projectileSpeed' => 210,
            'projectileSize' => 1.7,
            'projectileCount' => 1,
            'burstCount' => 5,
            'burstInterval' => 130,
            'spread' => 0,
            'projectileSpacing' => 0
        ],

        'snowball' => [
            'name' => 'Snowball Launcher',
            'ammo' => 1,
            'damage' => 15,
            'type' => 'projectile',
            'projectile_type' => 'snowball',
            'projectileSpeed' => 150,
            'projectileSize' => 1.8,
            'projectileCount' => 1,
            'burstCount' => 3,
            'burstInterval' => 150,
            'spread' => 0,
            'projectileSpacing' => 0
        ],

        'grenade_launcher' => [
            'name' => 'Grenade Launcher',
            'ammo' => 1,
            'damage' => 35,
            'type' => 'projectile',
            'projectile_type' => 'grenade',
            'projectileSpeed' => 95,
            'projectileSize' => 1.7,
            'projectileCount' => 1,
            'burstCount' => 3,
            'burstInterval' => 180,
            'spread' => 0,
            'projectileSpacing' => 0
        ],

        'shotgun' => [
            'name' => 'Shotgun',
            'ammo' => 1,
            'damage' => 18,
            'type' => 'projectile',
            'projectile_type' => 'pellet',
            'projectileSpeed' => 260,
            'projectileSize' => 0.65,
            'projectileCount' => 7,
            'burstCount' => 1,
            'burstInterval' => 0,
            'spread' => 0.30,
            'projectileSpacing' => 0,
            'maxRange' => 28
        ],

        'mini_gun' => [
            'name' => 'Mini Gun',
            'ammo' => 1,
            'damage' => 5,
            'type' => 'projectile',
            'projectile_type' => 'minigun_bullet',
            'projectileSpeed' => 400,
            'projectileSize' => 0.85,
            'projectileCount' => 1,
            'burstCount' => 30,
            'burstInterval' => 45,
            'spread' => 0.025,
            'projectileSpacing' => 0
        ],

        'laser_blaster' => [
            'name' => 'Laser Blaster',
            'ammo' => 1,
            'damage' => 34,
            'type' => 'projectile',
            'projectile_type' => 'laser',
            'projectileSpeed' => 500,
            'projectileSize' => 1.2,
            'projectileCount' => 1,
            'burstCount' => 3,
            'burstInterval' => 180,
            'spread' => 0,
            'projectileSpacing' => 0
        ],

        'homing_missile' => [
            'name' => 'Homing Missile',
            'ammo' => 1,
            'damage' => 65,
            'type' => 'projectile',
            'projectile_type' => 'homing',
            'projectileSpeed' => 95,
            'projectileSize' => 1.9,
            'projectileCount' => 1,
            'burstCount' => 1,
            'burstInterval' => 0,
            'spread' => 0,
            'projectileSpacing' => 0,
            'homing' => true,
            'homingRange' => 100,
            'homingTurnSpeed' => 2.8,
            'maxLifetime' => 5000
        ],

        'fireball' => [
            'name' => 'Fireball Launcher',
            'ammo' => 1,
            'damage' => 30,
            'type' => 'projectile',
            'projectile_type' => 'fireball',
            'projectileSpeed' => 145,
            'projectileSize' => 1.8,
            'projectileCount' => 1,
            'burstCount' => 3,
            'burstInterval' => 180,
            'spread' => 0,
            'projectileSpacing' => 0,
            'burnDamage' => 5,
            'burnDuration' => 3000,
            'burnInterval' => 1000
        ],

        'ice_rocket' => [
            'name' => 'Ice Rocket',
            'ammo' => 1,
            'damage' => 35,
            'type' => 'projectile',
            'projectile_type' => 'ice_rocket',
            'projectileSpeed' => 145,
            'projectileSize' => 1.75,
            'projectileCount' => 2,
            'burstCount' => 1,
            'burstInterval' => 0,
            'spread' => 0,
            'projectileSpacing' => 1.15,
            'slowMultiplier' => 0.45,
            'slowDuration' => 3000
        ],

        'electric_blaster' => [
            'name' => 'Electric Blaster',
            'ammo' => 1,
            'damage' => 30,
            'type' => 'projectile',
            'projectile_type' => 'electric',
            'projectileSpeed' => 280,
            'projectileSize' => 1.4,
            'projectileCount' => 1,
            'burstCount' => 3,
            'burstInterval' => 150,
            'spread' => 0,
            'projectileSpacing' => 0,
            'stunDuration' => 1000
        ],

        'land_mines' => [
            'name' => 'Land Mines',
            'ammo' => 3,
            'damage' => 65,
            'type' => 'trap',
            'projectile_type' => 'mine',
            'projectileSpeed' => 0,
            'projectileSize' => 1.2,
            'projectileCount' => 1,
            'burstCount' => 1,
            'burstInterval' => 0,
            'spread' => 0,
            'projectileSpacing' => 0,
            'deployable' => true,
            'deployDistance' => 3,
            'triggerRadius' => 2.5,
            'explosionRadius' => 5,
            'armDelay' => 800,
            'lifetime' => 30000
        ],

        'fake_box' => [
            'name' => 'Fake Mystery Box',
            'ammo' => 2,
            'damage' => 75,
            'type' => 'trap',
            'projectile_type' => 'fake_box',
            'projectileSpeed' => 0,
            'projectileSize' => 1.5,
            'projectileCount' => 1,
            'burstCount' => 1,
            'burstInterval' => 0,
            'spread' => 0,
            'projectileSpacing' => 0,
            'deployable' => true,
            'deployDistance' => 3,
            'triggerRadius' => 2.5,
            'explosionRadius' => 5,
            'armDelay' => 1000,
            'lifetime' => 40000
        ],

        'spinning_mace' => [
            'name' => 'Spinning Mace',
            'ammo' => 1,
            'damage' => 40,
            'type' => 'special',
            'projectile_type' => 'mace',
            'projectileSpeed' => 0,
            'projectileSize' => 1.4,
            'projectileCount' => 1,
            'burstCount' => 1,
            'burstInterval' => 0,
            'spread' => 0,
            'projectileSpacing' => 0,
            'melee' => true,
            'orbitRadius' => 3.2,
            'orbitSpeed' => 6,
            'hitRadius' => 1.1,
            'activeDuration' => 6000,
            'hitCooldown' => 800
        ],

        'emp_blaster' => [
            'name' => 'EMP Blaster',
            'ammo' => 1,
            'damage' => 20,
            'type' => 'projectile',
            'projectile_type' => 'emp',
            'projectileSpeed' => 180,
            'projectileSize' => 1.8,
            'projectileCount' => 1,
            'burstCount' => 1,
            'burstInterval' => 0,
            'spread' => 0,
            'projectileSpacing' => 0,
            'empRadius' => 7,
            'disableDuration' => 3000
        ],

        'poison_bomb' => [
            'name' => 'Poison Bomb',
            'ammo' => 1,
            'damage' => 15,
            'type' => 'projectile',
            'projectile_type' => 'poison',
            'projectileSpeed' => 90,
            'projectileSize' => 1.8,
            'projectileCount' => 1,
            'burstCount' => 1,
            'burstInterval' => 0,
            'spread' => 0,
            'projectileSpacing' => 0,
            'poisonRadius' => 6,
            'poisonDamage' => 8,
            'poisonDuration' => 5000,
            'poisonInterval' => 1000
        ],

        'invincibility' => [
            'name' => 'Invincibility Star',
            'ammo' => 1,
            'damage' => 0,
            'type' => 'special',
            'projectile_type' => 'invincibility',
            'projectileSpeed' => 0,
            'projectileSize' => 1.5,
            'projectileCount' => 1,
            'burstCount' => 1,
            'burstInterval' => 0,
            'spread' => 0,
            'projectileSpacing' => 0,
            'powerUp' => true,
            'protectionDuration' => 8000
        ]
    ];

    /* =========================================
       PICKUP CONFIGURATION
    ========================================= */

    private const PICKUP_DISTANCE = 2.3;

    private const PICKUP_RESPAWN_DELAY = 5000;

    private const MAX_SPAWN_ATTEMPTS = 500;

    private const MINIMUM_PLAYER_DISTANCE = 10.0;

    public function __construct(PDO $db)
    {
        $this->db = $db;

        $this->gameManager = new GameManager(
            $db
        );
    }

    /* =========================================
       GET WEAPON CONFIGURATION
    ========================================= */

    public static function getWeaponConfig(
        string $weaponId
    ): array {

        if (!isset(self::WEAPONS[$weaponId])) {

            throw new InvalidArgumentException(
                'Unsupported weapon ID.'
            );
        }

        return array_merge(
            ['id' => $weaponId],
            self::WEAPONS[$weaponId]
        );
    }

    /* =========================================
       GET AVAILABLE WEAPON IDS
    ========================================= */

    public static function getAvailableWeapons(): array
    {
        return array_keys(self::WEAPONS);
    }

    /* =========================================
       VALIDATE SELECTED WEAPONS
    ========================================= */

    public static function validateSelectedWeapons(
        array $selectedWeapons
    ): array {

        if (
            count($selectedWeapons) < 1 ||
            count($selectedWeapons) > 20
        ) {

            throw new InvalidArgumentException(
                'Invalid selected weapons.'
            );
        }

        foreach ($selectedWeapons as $weaponId) {

            if (
                !is_string($weaponId) ||
                !isset(self::WEAPONS[$weaponId])
            ) {

                throw new InvalidArgumentException(
                    'Unsupported weapon selected.'
                );
            }
        }

        return array_values(
            array_unique($selectedWeapons)
        );
    }

    /* =========================================
       GET RANDOM WEAPON
    ========================================= */

    public function getRandomWeapon(
        array $selectedWeapons
    ): array {

        $weapons = self::validateSelectedWeapons(
            $selectedWeapons
        );

        $index = random_int(
            0,
            count($weapons) - 1
        );

        return self::getWeaponConfig(
            $weapons[$index]
        );
    }

    /* =========================================
       CHECK PLAYER CAN COLLECT WEAPON
    ========================================= */

    public function canCollectWeapon(
        array $state
    ): bool {

        $now = ApiSecurity::now();

        if (!(bool) $state['is_alive']) {
            return false;
        }

        if ((bool) $state['is_firing']) {
            return false;
        }

        if ((int) $state['ammo'] > 0) {
            return false;
        }

        if ((int) $state['mace_until'] > $now) {
            return false;
        }

        return true;
    }

    /* =========================================
       LOCK ACTIVE MATCH

       Caller must already have a transaction.
    ========================================= */

    private function lockActiveMatch(
        int $roomId,
        int $playerId,
        int $matchId
    ): array {

        $stmt = $this->db->prepare(
            "SELECT status
             FROM rooms
             WHERE id = :room_id
             FOR UPDATE"
        );

        $stmt->execute([
            'room_id' => $roomId
        ]);

        if ($stmt->fetchColumn() !== 'playing') {

            throw new DomainException(
                'Room is not playing.'
            );
        }

        $stmt = $this->db->prepare(
            "SELECT status
             FROM room_players
             WHERE id = :player_id
               AND room_id = :room_id
             FOR UPDATE"
        );

        $stmt->execute([
            'player_id' => $playerId,
            'room_id' => $roomId
        ]);

        if ($stmt->fetchColumn() !== 'connected') {

            throw new DomainException(
                'Player is not connected.'
            );
        }

        $match = $this->gameManager->getActiveMatch(
            $roomId,
            true
        );

        if ((int) $match['id'] !== $matchId) {

            throw new DomainException(
                'Invalid or outdated match.'
            );
        }

        $this->gameManager->requirePlayingMatch(
            $match
        );

        return $match;
    }

    /* =========================================
       COLLECT MYSTERY BOX
    ========================================= */

    public function pickupWeapon(
        string $token,
        array $input
    ): array {

        $matchId = $input['match_id'] ?? null;

        $pickupId = $input['pickup_id'] ?? null;

        if (
            !is_int($matchId) ||
            $matchId < 1
        ) {

            throw new InvalidArgumentException(
                'Invalid match ID.'
            );
        }

        if (
            !is_int($pickupId) ||
            $pickupId < 1
        ) {

            throw new InvalidArgumentException(
                'Invalid pickup ID.'
            );
        }

        $player = ApiSecurity::authenticate(
            $this->db,
            $token
        );

        $roomId = (int) $player['room_id'];

        $playerId = (int) $player['id'];

        try {

            $this->db->beginTransaction();

            /* =========================================
               VERIFY ACTIVE MATCH
            ========================================= */

            $match = $this->lockActiveMatch(
                $roomId,
                $playerId,
                $matchId
            );

            /* =========================================
               GET PLAYER STATE
            ========================================= */

            $state = $this->gameManager->getPlayerState(
                $matchId,
                $playerId,
                true
            );

            if (!$this->canCollectWeapon($state)) {

                throw new DomainException(
                    'Player cannot collect a weapon right now.'
                );
            }

            /* =========================================
               LOCK MYSTERY BOX
            ========================================= */

            $stmt = $this->db->prepare(
                "SELECT *
                 FROM weapon_pickups
                 WHERE id = :pickup_id
                   AND match_id = :match_id
                 LIMIT 1
                 FOR UPDATE"
            );

            $stmt->execute([
                'pickup_id' => $pickupId,
                'match_id' => $matchId
            ]);

            $pickup = $stmt->fetch();

            if (!$pickup) {

                throw new DomainException(
                    'Mystery box not found.'
                );
            }

            if (!(bool) $pickup['is_active']) {

                throw new DomainException(
                    'Mystery box has already been collected.'
                );
            }

            /* =========================================
               CHECK PLAYER DISTANCE
            ========================================= */

            $distance = hypot(
                (float) $state['position_x'] -
                    (float) $pickup['position_x'],

                (float) $state['position_z'] -
                    (float) $pickup['position_z']
            );

            if ($distance > self::PICKUP_DISTANCE) {

                throw new DomainException(
                    'Player is too far from the mystery box.'
                );
            }

            /* =========================================
               SELECT RANDOM WEAPON
            ========================================= */

            $selectedWeapons = json_decode(
                $match['selected_weapons'],
                true,
                32,
                JSON_THROW_ON_ERROR
            );

            if (!is_array($selectedWeapons)) {

                throw new RuntimeException(
                    'Invalid match weapon configuration.'
                );
            }

            $weapon = $this->getRandomWeapon(
                $selectedWeapons
            );

            $now = ApiSecurity::now();

            $respawnAt =
                $now + self::PICKUP_RESPAWN_DELAY;

            /* =========================================
               GIVE WEAPON TO PLAYER
            ========================================= */

            $stmt = $this->db->prepare(
                "UPDATE player_states
                 SET
                    weapon_id = :weapon_id,
                    ammo = :ammo,
                    max_ammo = :max_ammo,
                    is_firing = 0,
                    state_version = state_version + 1
                 WHERE match_id = :match_id
                   AND player_id = :player_id"
            );

            $stmt->execute([
                'weapon_id' => $weapon['id'],
                'ammo' => $weapon['ammo'],
                'max_ammo' => $weapon['ammo'],
                'match_id' => $matchId,
                'player_id' => $playerId
            ]);

            /* =========================================
               DEACTIVATE MYSTERY BOX
            ========================================= */

            $stmt = $this->db->prepare(
                "UPDATE weapon_pickups
                 SET
                    weapon_id = :weapon_id,
                    is_active = 0,
                    collected_by = :player_id,
                    collected_at = :collected_at,
                    respawn_at = :respawn_at,
                    state_version = state_version + 1
                 WHERE id = :pickup_id
                   AND match_id = :match_id
                   AND is_active = 1"
            );

            $stmt->execute([
                'weapon_id' => $weapon['id'],
                'player_id' => $playerId,
                'collected_at' => $now,
                'respawn_at' => $respawnAt,
                'pickup_id' => $pickupId,
                'match_id' => $matchId
            ]);

            if ($stmt->rowCount() !== 1) {

                throw new DomainException(
                    'Mystery box is no longer available.'
                );
            }

            /* =========================================
               CREATE WEAPON PICKUP EVENT
            ========================================= */

            $eventId = $this->gameManager->createEvent(
                $matchId,
                'weapon_pickup',
                $playerId,
                null,
                $weapon['id'],
                [
                    'pickup_id' => $pickupId,
                    'weapon_name' => $weapon['name'],
                    'ammo' => $weapon['ammo'],
                    'position_x' =>
                    (float) $pickup['position_x'],
                    'position_y' =>
                    (float) $pickup['position_y'],
                    'position_z' =>
                    (float) $pickup['position_z'],
                    'respawn_at' => $respawnAt
                ]
            );

            /* =========================================
               UPDATE PLAYER ACTIVITY
            ========================================= */

            $stmt = $this->db->prepare(
                "UPDATE room_players
                 SET last_seen_at = CURRENT_TIMESTAMP
                 WHERE id = :player_id
                   AND room_id = :room_id"
            );

            $stmt->execute([
                'player_id' => $playerId,
                'room_id' => $roomId
            ]);

            /* =========================================
               GET UPDATED PLAYER STATE
            ========================================= */

            $updatedState =
                $this->gameManager->getPlayerState(
                    $matchId,
                    $playerId
                );

            $this->db->commit();

            return [
                'collected' => true,
                'match_id' => $matchId,
                'player_id' => $playerId,
                'pickup_id' => $pickupId,
                'weapon' => $weapon,
                'respawn_at' => $respawnAt,
                'event_id' => $eventId,
                'player' =>
                $this->gameManager->formatPlayerState(
                    $updatedState
                ),
                'server_time' => ApiSecurity::now()
            ];
        } catch (Throwable $e) {

            if ($this->db->inTransaction()) {

                $this->db->rollBack();
            }

            throw $e;
        }
    }

    /* =========================================
       GENERATE NEW PICKUP POSITION
    ========================================= */

    private function generatePickupPosition(
        array $mapConfig,
        array $existingPickups,
        array $players,
        array $previousPosition
    ): ?array {

        $limit = (int)
        $mapConfig['pickup_spawn_limit'];

        $minimumDistance = (float)
        $mapConfig['pickup_minimum_distance'];

        $minimumPreviousDistance = min(
            25.0,
            $minimumDistance * 1.5
        );

        for (
            $attempt = 0;
            $attempt < self::MAX_SPAWN_ATTEMPTS;
            $attempt++
        ) {

            $x = random_int(
                -$limit * 100,
                $limit * 100
            ) / 100;

            $z = random_int(
                -$limit * 100,
                $limit * 100
            ) / 100;

            $valid = true;

            /* CHECK PREVIOUS POSITION */

            $previousDistance = hypot(
                $x - (float)
                $previousPosition['position_x'],
                $z - (float)
                $previousPosition['position_z']
            );

            if (
                $previousDistance <
                $minimumPreviousDistance
            ) {

                continue;
            }

            /* CHECK OTHER MYSTERY BOXES */

            foreach ($existingPickups as $pickup) {

                $distance = hypot(
                    $x - (float)
                    $pickup['position_x'],
                    $z - (float)
                    $pickup['position_z']
                );

                if ($distance < $minimumDistance) {

                    $valid = false;

                    break;
                }
            }

            if (!$valid) {
                continue;
            }

            /* CHECK ALIVE PLAYERS */

            foreach ($players as $player) {

                if (!(bool) $player['is_alive']) {
                    continue;
                }

                $distance = hypot(
                    $x - (float)
                    $player['position_x'],
                    $z - (float)
                    $player['position_z']
                );

                if (
                    $distance <
                    self::MINIMUM_PLAYER_DISTANCE
                ) {

                    $valid = false;

                    break;
                }
            }

            if (!$valid) {
                continue;
            }

            return [
                'position_x' => $x,
                'position_y' => 0,
                'position_z' => $z
            ];
        }

        return null;
    }

    /* =========================================
       RESPAWN EXPIRED MYSTERY BOXES

       Internal server method.
       Not directly accessible by clients.
    ========================================= */

    public function respawnPickups(
        int $roomId,
        int $matchId
    ): array {

        try {

            $this->db->beginTransaction();

            /* LOCK ROOM */

            $stmt = $this->db->prepare(
                "SELECT status
                 FROM rooms
                 WHERE id = :room_id
                 FOR UPDATE"
            );

            $stmt->execute([
                'room_id' => $roomId
            ]);

            if ($stmt->fetchColumn() !== 'playing') {

                $this->db->commit();

                return [];
            }

            /* GET ACTIVE MATCH */

            $match = $this->gameManager->getActiveMatch(
                $roomId,
                true
            );

            if ((int) $match['id'] !== $matchId) {

                $this->db->commit();

                return [];
            }

            $this->gameManager->requirePlayingMatch(
                $match
            );

            $now = ApiSecurity::now();

            /* GET EXPIRED MYSTERY BOXES */

            $stmt = $this->db->prepare(
                "SELECT *
                 FROM weapon_pickups
                 WHERE match_id = :match_id
                   AND is_active = 0
                   AND respawn_at > 0
                   AND respawn_at <= :current_time
                 ORDER BY id ASC
                 LIMIT 10
                 FOR UPDATE"
            );

            $stmt->execute([
                'match_id' => $matchId,
                'current_time' => $now
            ]);

            $expiredPickups = $stmt->fetchAll();

            if (count($expiredPickups) === 0) {

                $this->db->commit();

                return [];
            }

            /* GET MAP CONFIGURATION */

            $mapConfig = GameManager::getMapConfig(
                $match['map_id']
            );

            /* GET PLAYER POSITIONS */

            $players = $this->gameManager->getMatchPlayers(
                $matchId
            );

            /* GET EXISTING PICKUP POSITIONS */

            $existingPickups =
                $this->gameManager->getWeaponPickups(
                    $matchId
                );

            $respawnedPickups = [];

            foreach ($expiredPickups as $pickup) {

                $pickupId = (int) $pickup['id'];

                $otherPickups = array_values(
                    array_filter(
                        $existingPickups,
                        fn(array $item) =>
                        (int) $item['id'] !== $pickupId
                    )
                );

                $position = $this->generatePickupPosition(
                    $mapConfig,
                    $otherPickups,
                    $players,
                    $pickup
                );

                if ($position === null) {

                    /* RETRY AFTER ONE SECOND */

                    $stmt = $this->db->prepare(
                        "UPDATE weapon_pickups
                         SET
                            respawn_at = :respawn_at,
                            state_version = state_version + 1
                         WHERE id = :pickup_id
                           AND match_id = :match_id"
                    );

                    $stmt->execute([
                        'respawn_at' => $now + 1000,
                        'pickup_id' => $pickupId,
                        'match_id' => $matchId
                    ]);

                    continue;
                }

                /* RESPAWN MYSTERY BOX */

                $stmt = $this->db->prepare(
                    "UPDATE weapon_pickups
                     SET
                        position_x = :position_x,
                        position_y = :position_y,
                        position_z = :position_z,
                        weapon_id = NULL,
                        is_active = 1,
                        collected_by = NULL,
                        collected_at = 0,
                        respawn_at = 0,
                        state_version = state_version + 1
                     WHERE id = :pickup_id
                       AND match_id = :match_id"
                );

                $stmt->execute([
                    'position_x' =>
                    $position['position_x'],
                    'position_y' =>
                    $position['position_y'],
                    'position_z' =>
                    $position['position_z'],
                    'pickup_id' => $pickupId,
                    'match_id' => $matchId
                ]);

                $newPickup = [
                    'id' => $pickupId,
                    'pickup_number' =>
                    (int) $pickup['pickup_number'],
                    'position_x' =>
                    $position['position_x'],
                    'position_y' =>
                    $position['position_y'],
                    'position_z' =>
                    $position['position_z'],
                    'is_active' => true,
                    'respawn_at' => 0
                ];

                /* UPDATE LOCAL POSITION LIST */

                foreach (
                    $existingPickups as &$existingPickup
                ) {

                    if (
                        (int) $existingPickup['id']
                        === $pickupId
                    ) {

                        $existingPickup = array_merge(
                            $existingPickup,
                            $newPickup
                        );

                        break;
                    }
                }

                unset($existingPickup);

                /* CREATE RESPAWN EVENT */

                $this->gameManager->createEvent(
                    $matchId,
                    'pickup_respawn',
                    null,
                    null,
                    null,
                    $newPickup
                );

                $respawnedPickups[] = $newPickup;
            }

            $this->db->commit();

            return $respawnedPickups;
        } catch (Throwable $e) {

            if ($this->db->inTransaction()) {

                $this->db->rollBack();
            }

            throw $e;
        }
    }

    /* =========================================
       CHECK PLAYER CAN FIRE WEAPON
    ========================================= */

    public function canFireWeapon(
        array $state
    ): bool {

        $now = ApiSecurity::now();

        if (!(bool) $state['is_alive']) {
            return false;
        }

        if (empty($state['weapon_id'])) {
            return false;
        }

        if (
            !isset(
                self::WEAPONS[$state['weapon_id']]
            )
        ) {
            return false;
        }

        if ((int) $state['ammo'] <= 0) {
            return false;
        }

        if ((bool) $state['is_firing']) {
            return false;
        }

        if ((int) $state['emp_until'] > $now) {
            return false;
        }

        if ((int) $state['stun_until'] > $now) {
            return false;
        }

        return true;
    }
}
