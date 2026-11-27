<?php

declare(strict_types=1);

require_once __DIR__ . '/ApiSecurity.php';
require_once __DIR__ . '/GameManager.php';
require_once __DIR__ . '/WeaponManager.php';
require_once __DIR__ . '/DamageManager.php';

class CombatManager
{
    private PDO $db;
    private GameManager $gameManager;
    private WeaponManager $weaponManager;
    private DamageManager $damageManager;

    /* =========================================
       COMBAT CONFIGURATION
    ========================================= */

    private const DEFAULT_FIRE_COOLDOWN = 500;

    private const FIRE_COOLDOWNS = [
        'triple_rocket'     => 1000,
        'mega_nuke'         => 2000,
        'cannon'            => 1000,
        'machine_gun'      => 1100,
        'plasma_gun'       => 700,
        'snowball'         => 500,
        'grenade_launcher' => 1200,
        'shotgun'          => 800,
        'mini_gun'         => 1500,
        'laser_blaster'    => 600,
        'homing_missile'   => 1000,
        'fireball'         => 800,
        'ice_rocket'       => 1000,
        'electric_blaster' => 600,
        'land_mines'       => 1000,
        'fake_box'         => 1000,
        'spinning_mace'    => 6000,
        'emp_blaster'      => 1200,
        'poison_bomb'      => 1000,
        'invincibility'    => 1000
    ];

    private const SHIELD_DURATION = 8000;
    private const MACE_DURATION = 6000;

    private const KART_HIT_RADIUS = 1.3;
    private const MAX_ACTIVE_PROJECTILES = 180;
    private const MAX_SIMULATION_INTERVAL = 500;
    private const SIMULATION_STEP = 50;

    /* =========================================
       CONSTRUCTOR
    ========================================= */

    public function __construct(PDO $db)
    {
        $this->db = $db;

        $this->gameManager = new GameManager($db);

        $this->weaponManager = new WeaponManager($db);

        $this->damageManager = new DamageManager($db);
    }

    /* =========================================
       GET WEAPON COOLDOWN
    ========================================= */

    public function getFireCooldown(
        string $weaponId
    ): int {

        return self::FIRE_COOLDOWNS[$weaponId]
            ?? self::DEFAULT_FIRE_COOLDOWN;
    }

    /* =========================================
       LOCK ROOM AND VALIDATE MATCH
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
       GET LAST FIRE EVENT
    ========================================= */

    private function getLastFireEvent(
        int $matchId,
        int $playerId
    ): ?array {

        $stmt = $this->db->prepare(
            "SELECT
                id,
                weapon_id,
                event_time,
                event_data
             FROM game_events
             WHERE match_id = :match_id
               AND source_player_id = :player_id
               AND event_type = 'weapon_fire'
             ORDER BY id DESC
             LIMIT 1"
        );

        $stmt->execute([
            'match_id' => $matchId,
            'player_id' => $playerId
        ]);

        $event = $stmt->fetch();

        return $event ?: null;
    }

    /* =========================================
       VALIDATE FIRE SEQUENCE
    ========================================= */

    private function validateFireSequence(
        ?array $lastEvent,
        int $fireSequence
    ): void {

        if ($lastEvent === null) {
            return;
        }

        $eventData = json_decode(
            $lastEvent['event_data'] ?? '{}',
            true
        ) ?? [];

        $lastSequence = (int) (
            $eventData['fire_sequence'] ?? 0
        );

        if ($fireSequence <= $lastSequence) {

            throw new DomainException(
                'Duplicate or outdated firing request.'
            );
        }
    }

    /* =========================================
       VALIDATE FIRE COOLDOWN
    ========================================= */

    private function validateFireCooldown(
        ?array $lastEvent,
        string $weaponId,
        int $now
    ): void {

        if ($lastEvent === null) {
            return;
        }

        $previousWeaponId =
            $lastEvent['weapon_id'] ?? $weaponId;

        $cooldown = max(
            $this->getFireCooldown($weaponId),
            $this->getFireCooldown($previousWeaponId)
        );

        $lastFireTime = (int) $lastEvent['event_time'];

        if (($now - $lastFireTime) < $cooldown) {

            throw new DomainException(
                'Weapon is cooling down.'
            );
        }
    }

    /* =========================================
       GET PROJECTILE SPAWN POSITION
    ========================================= */

    private function getFirePosition(
        array $state
    ): array {

        $rotation = (float) $state['rotation'];

        $directionX = -sin($rotation);
        $directionZ = -cos($rotation);

        $spawnDistance = 1.8;

        return [
            'position_x' =>
            (float) $state['position_x'] +
                ($directionX * $spawnDistance),

            'position_y' =>
            (float) $state['position_y'] + 1.15,

            'position_z' =>
            (float) $state['position_z'] +
                ($directionZ * $spawnDistance),

            'direction_x' => $directionX,
            'direction_y' => 0.0,
            'direction_z' => $directionZ,

            'rotation' => $rotation
        ];
    }

    /* =========================================
       CHECK PROJECTILE LIMIT
    ========================================= */

    private function validateProjectileLimit(
        int $matchId,
        int $requiredCount
    ): void {

        $stmt = $this->db->prepare(
            "SELECT COUNT(*)
             FROM combat_objects
             WHERE match_id = :match_id
               AND object_type = 'projectile'
               AND is_active = 1"
        );

        $stmt->execute([
            'match_id' => $matchId
        ]);

        $activeCount = (int) $stmt->fetchColumn();

        if (
            ($activeCount + $requiredCount) >
            self::MAX_ACTIVE_PROJECTILES
        ) {

            throw new DomainException(
                'Projectile limit reached. Please try again.'
            );
        }
    }

    /* =========================================
       CREATE PROJECTILES
    ========================================= */

    private function createProjectiles(
        int $matchId,
        int $playerId,
        int $lifeId,
        array $weapon,
        array $firePosition,
        int $now
    ): array {

        if (!$this->db->inTransaction()) {

            throw new LogicException(
                'Projectile creation requires a transaction.'
            );
        }

        $projectileCount = (int) (
            $weapon['projectileCount'] ?? 1
        );

        $burstCount = (int) (
            $weapon['burstCount'] ?? 1
        );

        $burstInterval = (int) (
            $weapon['burstInterval'] ?? 0
        );

        $speed = (float) (
            $weapon['projectileSpeed'] ?? 0
        );

        $spacing = (float) (
            $weapon['projectileSpacing'] ?? 0
        );

        $spread = (float) (
            $weapon['spread'] ?? 0
        );

        $rotation = (float) $firePosition['rotation'];

        $lifetime = (int) (
            $weapon['maxLifetime'] ?? 5000
        );

        if (
            $projectileCount < 1 ||
            $burstCount < 1 ||
            $speed <= 0 ||
            $lifetime <= 0
        ) {

            throw new LogicException(
                'Invalid projectile configuration.'
            );
        }

        $this->validateProjectileLimit(
            $matchId,
            $projectileCount * $burstCount
        );

        $stmt = $this->db->prepare(
            "INSERT INTO combat_objects (
                match_id,
                owner_player_id,
                owner_life_id,
                weapon_id,
                object_type,
                position_x,
                position_y,
                position_z,
                direction_x,
                direction_y,
                direction_z,
                speed,
                damage,
                radius,
                distance_travelled,
                is_active,
                activate_at,
                expires_at,
                last_tick_at,
                object_data,
                state_version
            ) VALUES (
                :match_id,
                :owner_player_id,
                :owner_life_id,
                :weapon_id,
                'projectile',
                :position_x,
                :position_y,
                :position_z,
                :direction_x,
                :direction_y,
                :direction_z,
                :speed,
                :damage,
                :radius,
                0,
                1,
                :activate_at,
                :expires_at,
                :last_tick_at,
                :object_data,
                1
            )"
        );

        $projectiles = [];

        for (
            $burst = 0;
            $burst < $burstCount;
            $burst++
        ) {

            $activateAt = $now +
                ($burst * $burstInterval);

            for (
                $index = 0;
                $index < $projectileCount;
                $index++
            ) {

                $centeredIndex = $index -
                    (($projectileCount - 1) / 2);

                $angleOffset = 0.0;

                if ($projectileCount > 1) {

                    $angleOffset =
                        (
                            $centeredIndex /
                            ($projectileCount - 1)
                        ) * $spread;
                } elseif ($spread > 0) {

                    $angleOffset =
                        (random_int(-1000, 1000) / 1000)
                        * ($spread / 2);
                }

                $angle = $rotation + $angleOffset;

                $directionX = -sin($angle);
                $directionZ = -cos($angle);

                $sideOffset = $centeredIndex * $spacing;

                $positionX =
                    (float) $firePosition['position_x'] +
                    cos($rotation) * $sideOffset;

                $positionY =
                    (float) $firePosition['position_y'];

                $positionZ =
                    (float) $firePosition['position_z'] -
                    sin($rotation) * $sideOffset;

                $objectData = [
                    'projectile_type' =>
                    $weapon['projectile_type'],

                    'burst_index' => $burst,

                    'projectile_index' => $index,

                    'max_range' =>
                    $weapon['maxRange'] ?? null,

                    'homing' =>
                    $weapon['homing'] ?? false,

                    'homing_range' =>
                    $weapon['homingRange'] ?? 0,

                    'homing_turn_speed' =>
                    $weapon['homingTurnSpeed'] ?? 0
                ];

                $stmt->execute([
                    'match_id' => $matchId,

                    'owner_player_id' => $playerId,

                    'owner_life_id' => $lifeId,

                    'weapon_id' => $weapon['id'],

                    'position_x' => $positionX,

                    'position_y' => $positionY,

                    'position_z' => $positionZ,

                    'direction_x' => $directionX,

                    'direction_y' => 0,

                    'direction_z' => $directionZ,

                    'speed' => $speed,

                    'damage' => $weapon['damage'],

                    'radius' =>
                    (float) $weapon['projectileSize'] / 2,

                    'activate_at' => $activateAt,

                    'expires_at' =>
                    $activateAt + $lifetime,

                    'last_tick_at' => $activateAt,

                    'object_data' => json_encode(
                        $objectData,
                        JSON_THROW_ON_ERROR
                    )
                ]);

                $projectiles[] = [
                    'id' =>
                    (int) $this->db->lastInsertId(),

                    'weapon_id' => $weapon['id'],

                    'owner_player_id' => $playerId,

                    'owner_life_id' => $lifeId,

                    'position_x' => $positionX,

                    'position_y' => $positionY,

                    'position_z' => $positionZ,

                    'direction_x' => $directionX,

                    'direction_y' => 0,

                    'direction_z' => $directionZ,

                    'speed' => $speed,

                    'activate_at' => $activateAt,

                    'expires_at' =>
                    $activateAt + $lifetime,

                    'projectile_type' =>
                    $weapon['projectile_type']
                ];
            }
        }

        return $projectiles;
    }

    /* =========================================
       SEGMENT COLLISION DETECTION
    ========================================= */

    private function getSegmentHitTime(
        float $startX,
        float $startZ,
        float $endX,
        float $endZ,
        float $targetX,
        float $targetZ,
        float $radius
    ): ?float {

        $dx = $endX - $startX;
        $dz = $endZ - $startZ;

        $fx = $startX - $targetX;
        $fz = $startZ - $targetZ;

        $a = ($dx * $dx) + ($dz * $dz);

        $c = ($fx * $fx) +
            ($fz * $fz) -
            ($radius * $radius);

        if ($c <= 0) {
            return 0.0;
        }

        if ($a <= 0.000001) {
            return null;
        }

        $b = 2 * (
            ($fx * $dx) +
            ($fz * $dz)
        );

        $discriminant =
            ($b * $b) - (4 * $a * $c);

        if ($discriminant < 0) {
            return null;
        }

        $time = (
            -$b - sqrt($discriminant)
        ) / (2 * $a);

        if ($time < 0 || $time > 1) {
            return null;
        }

        return $time;
    }

    /* =========================================
       FIND FIRST PROJECTILE TARGET
    ========================================= */

    private function findProjectileTarget(
        array $projectile,
        array $players,
        float $endX,
        float $endZ
    ): ?array {

        $closestTarget = null;
        $closestTime = INF;

        $ownerId = (int)
        $projectile['owner_player_id'];

        $radius = self::KART_HIT_RADIUS +
            (float) $projectile['radius'];

        foreach ($players as $player) {

            if (
                (int) $player['player_id'] === $ownerId
            ) {
                continue;
            }

            if (!(bool) $player['is_alive']) {
                continue;
            }

            if (
                $player['connection_status'] !==
                'connected'
            ) {
                continue;
            }

            $hitTime = $this->getSegmentHitTime(
                (float) $projectile['position_x'],
                (float) $projectile['position_z'],
                $endX,
                $endZ,
                (float) $player['position_x'],
                (float) $player['position_z'],
                $radius
            );

            if (
                $hitTime !== null &&
                $hitTime < $closestTime
            ) {

                $closestTime = $hitTime;

                $closestTarget = [
                    'player' => $player,
                    'hit_time' => $hitTime
                ];
            }
        }

        return $closestTarget;
    }

    /* =========================================
       DEACTIVATE COMBAT OBJECT
    ========================================= */

    private function deactivateCombatObject(
        int $objectId,
        int $matchId
    ): void {

        $stmt = $this->db->prepare(
            "UPDATE combat_objects
             SET
                is_active = 0,
                state_version = state_version + 1
             WHERE id = :object_id
               AND match_id = :match_id
               AND is_active = 1"
        );

        $stmt->execute([
            'object_id' => $objectId,
            'match_id' => $matchId
        ]);
    }

    /* =========================================
       UPDATE PROJECTILE POSITION
    ========================================= */

    private function updateProjectilePosition(
        array $projectile,
        float $x,
        float $z,
        float $distance,
        int $tickTime
    ): void {

        $stmt = $this->db->prepare(
            "UPDATE combat_objects
             SET
                position_x = :position_x,
                position_z = :position_z,
                distance_travelled = :distance,
                last_tick_at = :last_tick_at,
                state_version = state_version + 1
             WHERE id = :object_id
               AND match_id = :match_id
               AND is_active = 1"
        );

        $stmt->execute([
            'position_x' => $x,

            'position_z' => $z,

            'distance' =>
            (float) $projectile['distance_travelled']
                + $distance,

            'last_tick_at' => $tickTime,

            'object_id' =>
            (int) $projectile['id'],

            'match_id' =>
            (int) $projectile['match_id']
        ]);
    }

    /* =========================================
       PROCESS PROJECTILE DAMAGE
    ========================================= */

    private function processProjectileHit(
        array $projectile,
        array $target,
        float $impactX,
        float $impactZ
    ): array {

        if (!$this->db->inTransaction()) {

            throw new LogicException(
                'Projectile damage requires a transaction.'
            );
        }

        $matchId = (int) $projectile['match_id'];

        $ownerId = (int) $projectile['owner_player_id'];

        $targetId = (int) $target['player_id'];

        $weaponId = (string) $projectile['weapon_id'];

        $damage = (int) $projectile['damage'];

        $result = $this->damageManager->applyDamage(
            $matchId,
            $ownerId,
            $targetId,
            $weaponId,
            $damage
        );

        $this->deactivateCombatObject(
            (int) $projectile['id'],
            $matchId
        );

        $this->gameManager->createEvent(
            $matchId,
            'projectile_impact',
            $ownerId,
            $targetId,
            $weaponId,
            [
                'projectile_id' =>
                (int) $projectile['id'],

                'position_x' => $impactX,

                'position_y' =>
                (float) $projectile['position_y'],

                'position_z' => $impactZ,

                'damage_applied' =>
                (bool) ($result['applied'] ?? false),

                'damage' =>
                (int) ($result['damage'] ?? 0)
            ],
            (int) ($result['damage'] ?? 0)
        );

        return $result;
    }

    /* =========================================
       GET ACTIVE COMBAT OBJECTS
    ========================================= */

    public function simulateCombat(
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

            /* VERIFY MATCH */

            $match = $this->gameManager->getActiveMatch(
                $roomId,
                true
            );

            if ((int) $match['id'] !== $matchId) {

                $this->db->commit();

                return [];
            }

            $matchDetails =
                $this->gameManager->formatMatch($match);

            if (
                $matchDetails['countdown_ms'] > 0 ||
                $matchDetails['remaining_time_ms'] === 0
            ) {

                $this->db->commit();

                return [];
            }

            $now = ApiSecurity::now();

            $mapConfig = GameManager::getMapConfig(
                $match['map_id']
            );

            $mapLimit =
                (float) $mapConfig['movement_limit'] + 3;

            /* GET ACTIVE PROJECTILES */

            $stmt = $this->db->prepare(
                "SELECT *
             FROM combat_objects
             WHERE match_id = :match_id
               AND object_type = 'projectile'
               AND is_active = 1
               AND activate_at <= :current_time
             ORDER BY activate_at ASC, id ASC
             FOR UPDATE"
            );

            $stmt->execute([
                'match_id' => $matchId,
                'current_time' => $now
            ]);

            $projectiles = $stmt->fetchAll();

            if (empty($projectiles)) {

                $this->db->commit();

                return [];
            }

            /* GET CURRENT PLAYERS */

            $players = $this->gameManager->getMatchPlayers(
                $matchId
            );

            $impacts = [];

            foreach ($projectiles as $projectile) {
                $ownerId = (int) $projectile['owner_player_id'];

                $ownerLifeId = (int) $projectile['owner_life_id'];

                $isPendingShot =
                    (int) $projectile['last_tick_at'] ===
                    (int) $projectile['activate_at'];

                if ($isPendingShot) {

                    $ownerValid = false;

                    foreach ($players as $owner) {

                        if (
                            (int) $owner['player_id'] === $ownerId &&
                            (int) $owner['life_id'] === $ownerLifeId &&
                            (bool) $owner['is_alive'] &&
                            $owner['connection_status'] === 'connected'
                        ) {

                            $ownerValid = true;

                            break;
                        }
                    }

                    if (!$ownerValid) {

                        $this->deactivateCombatObject(
                            (int) $projectile['id'],
                            $matchId
                        );

                        continue;
                    }
                }
                $objectId = (int) $projectile['id'];

                $expiresAt =
                    (int) $projectile['expires_at'];

                $lastTick =
                    (int) $projectile['last_tick_at'];

                $activateAt =
                    (int) $projectile['activate_at'];

                $lastTick = max(
                    $lastTick,
                    $activateAt
                );

                /* CALCULATE ELAPSED TIME */

                $tickTime = min(
                    $now,
                    $expiresAt
                );

                $elapsed = $tickTime - $lastTick;

                if ($elapsed <= 0) {

                    if ($now >= $expiresAt) {

                        $this->deactivateCombatObject(
                            $objectId,
                            $matchId
                        );
                    }

                    continue;
                }

                /*
             * Discard stale projectiles after a long
             * synchronization interruption.
             */

                if (
                    $elapsed >
                    self::MAX_SIMULATION_INTERVAL
                ) {

                    $this->deactivateCombatObject(
                        $objectId,
                        $matchId
                    );

                    continue;
                }

                /* GET PROJECTILE CONFIGURATION */

                $objectData = json_decode(
                    $projectile['object_data'] ?? '{}',
                    true
                ) ?? [];

                $startX =
                    (float) $projectile['position_x'];

                $startZ =
                    (float) $projectile['position_z'];

                $directionX =
                    (float) $projectile['direction_x'];

                $directionZ =
                    (float) $projectile['direction_z'];

                $speed = (float) $projectile['speed'];

                $distance = $speed * ($elapsed / 1000);

                /* VALIDATE MAXIMUM RANGE */

                $rangeReached = false;

                $maxRange =
                    $objectData['max_range'] ?? null;

                if ($maxRange !== null) {

                    $remainingRange =
                        (float) $maxRange -
                        (float) $projectile['distance_travelled'];

                    if ($remainingRange <= 0) {

                        $this->deactivateCombatObject(
                            $objectId,
                            $matchId
                        );

                        continue;
                    }

                    if ($distance >= $remainingRange) {

                        $distance = $remainingRange;

                        $rangeReached = true;
                    }
                }

                /* CALCULATE MAP BOUNDARY DISTANCE */

                if (
                    abs($startX) > $mapLimit ||
                    abs($startZ) > $mapLimit
                ) {

                    $this->deactivateCombatObject(
                        $objectId,
                        $matchId
                    );

                    continue;
                }

                $boundaryDistance = INF;

                if ($directionX > 0) {

                    $boundaryDistance = min(
                        $boundaryDistance,
                        ($mapLimit - $startX) / $directionX
                    );
                } elseif ($directionX < 0) {

                    $boundaryDistance = min(
                        $boundaryDistance,
                        (-$mapLimit - $startX) / $directionX
                    );
                }

                if ($directionZ > 0) {

                    $boundaryDistance = min(
                        $boundaryDistance,
                        ($mapLimit - $startZ) / $directionZ
                    );
                } elseif ($directionZ < 0) {

                    $boundaryDistance = min(
                        $boundaryDistance,
                        (-$mapLimit - $startZ) / $directionZ
                    );
                }

                $boundaryReached = false;

                if ($distance >= $boundaryDistance) {

                    $distance = max(
                        0.0,
                        $boundaryDistance
                    );

                    $boundaryReached = true;
                }

                /* CALCULATE NEW POSITION */

                $endX = $startX +
                    ($directionX * $distance);

                $endZ = $startZ +
                    ($directionZ * $distance);

                /* CHECK PLAYER COLLISION */

                $target = $this->findProjectileTarget(
                    $projectile,
                    $players,
                    $endX,
                    $endZ
                );

                if ($target !== null) {

                    $hitTime =
                        (float) $target['hit_time'];

                    $impactX = $startX +
                        (($endX - $startX) * $hitTime);

                    $impactZ = $startZ +
                        (($endZ - $startZ) * $hitTime);

                    /* APPLY DAMAGE */

                    $result = $this->processProjectileHit(
                        $projectile,
                        $target['player'],
                        $impactX,
                        $impactZ
                    );

                    $impacts[] = [
                        'projectile_id' => $objectId,

                        'target_player_id' =>
                        (int) $target['player']['player_id'],

                        'position_x' => $impactX,

                        'position_z' => $impactZ,

                        'result' => $result
                    ];

                    /* REFRESH PLAYER STATES */

                    $players =
                        $this->gameManager->getMatchPlayers(
                            $matchId
                        );

                    /* STOP IF MATCH HAS FINISHED */

                    if (
                        !empty($result['elimination']['match_finished'])
                    ) {

                        $stmt = $this->db->prepare(
                            "UPDATE combat_objects
                         SET
                            is_active = 0,
                            state_version = state_version + 1
                         WHERE match_id = :match_id
                           AND is_active = 1"
                        );

                        $stmt->execute([
                            'match_id' => $matchId
                        ]);

                        break;
                    }

                    continue;
                }

                /* REMOVE EXPIRED PROJECTILES */

                if (
                    $rangeReached ||
                    $boundaryReached ||
                    $now >= $expiresAt
                ) {

                    $this->deactivateCombatObject(
                        $objectId,
                        $matchId
                    );

                    continue;
                }

                /* SAVE UPDATED POSITION */

                $this->updateProjectilePosition(
                    $projectile,
                    $endX,
                    $endZ,
                    $distance,
                    $tickTime
                );
            }

            $this->db->commit();

            return $impacts;
        } catch (Throwable $e) {

            if ($this->db->inTransaction()) {

                $this->db->rollBack();
            }

            throw $e;
        }
    }

    /* =========================================
       ACTIVATE INVINCIBILITY SHIELD
    ========================================= */
    public function getActiveCombatObjects(
        int $matchId
    ): array {

        $now = ApiSecurity::now();

        $stmt = $this->db->prepare(
            "SELECT *
         FROM combat_objects
         WHERE match_id = :match_id
           AND is_active = 1
           AND activate_at <= :current_time
           AND expires_at > :expiry_time
         ORDER BY id ASC"
        );

        $stmt->execute([
            'match_id' => $matchId,
            'current_time' => $now,
            'expiry_time' => $now
        ]);

        $objects = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($objects as &$object) {

            $integerFields = [
                'id',
                'match_id',
                'owner_player_id',
                'owner_life_id',
                'damage',
                'activate_at',
                'expires_at',
                'last_tick_at',
                'state_version'
            ];

            foreach ($integerFields as $field) {
                $object[$field] = (int) $object[$field];
            }

            $floatFields = [
                'position_x',
                'position_y',
                'position_z',
                'direction_x',
                'direction_y',
                'direction_z',
                'speed',
                'radius',
                'distance_travelled'
            ];

            foreach ($floatFields as $field) {
                $object[$field] = (float) $object[$field];
            }

            $object['is_active'] =
                (bool) $object['is_active'];

            $object['target_player_id'] =
                $object['target_player_id'] !== null
                ? (int) $object['target_player_id']
                : null;

            $object['object_data'] = json_decode(
                $object['object_data'] ?? '{}',
                true
            ) ?? [];
        }

        unset($object);

        return $objects;
    }
    private function activateShield(
        int $matchId,
        int $playerId,
        array $state,
        int $now
    ): int {

        $protectedUntil = max(
            (int) $state['protected_until'],
            $now + self::SHIELD_DURATION
        );

        $stmt = $this->db->prepare(
            "UPDATE player_states
             SET
                protected_until = :protected_until,
                burn_until = 0,
                slow_until = 0,
                stun_until = 0,
                emp_until = 0,
                poison_until = 0,
                slow_multiplier = 1,
                state_version = state_version + 1
             WHERE match_id = :match_id
               AND player_id = :player_id"
        );

        $stmt->execute([
            'protected_until' => $protectedUntil,
            'match_id' => $matchId,
            'player_id' => $playerId
        ]);

        $this->gameManager->createEvent(
            $matchId,
            'shield_activated',
            $playerId,
            null,
            'invincibility',
            [
                'protected_until' => $protectedUntil,
                'duration' => self::SHIELD_DURATION
            ]
        );

        return $protectedUntil;
    }

    /* =========================================
       CHECK IMPLEMENTED WEAPONS

       Keep restricted until simulation is connected.
    ========================================= */

    private function requireImplementedWeapon(
        string $weaponId
    ): void {

        $implementedWeapons = [
            'triple_rocket',
            'mega_nuke',
            'cannon',
            'machine_gun',
            'plasma_gun',
            'snowball',
            'shotgun',
            'mini_gun',
            'laser_blaster',
            'invincibility'
        ];

        if (
            !in_array(
                $weaponId,
                $implementedWeapons,
                true
            )
        ) {

            throw new DomainException(
                'Combat simulation for this weapon is not implemented yet.'
            );
        }
    }

    /* =========================================
       FIRE WEAPON
    ========================================= */

    public function fireWeapon(
        string $token,
        array $input
    ): array {

        $matchId = $input['match_id'] ?? null;

        if (!is_int($matchId) || $matchId < 1) {

            throw new InvalidArgumentException(
                'Invalid match ID.'
            );
        }

        $fireSequence =
            $input['fire_sequence'] ?? null;

        if (
            !is_int($fireSequence) ||
            $fireSequence < 1
        ) {

            throw new InvalidArgumentException(
                'Invalid fire sequence.'
            );
        }

        $lifeId = $input['life_id'] ?? null;

        if (!is_int($lifeId) || $lifeId < 1) {

            throw new InvalidArgumentException(
                'Invalid player life ID.'
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

            /* VERIFY MATCH */

            $match = $this->lockActiveMatch(
                $roomId,
                $playerId,
                $matchId
            );

            /* GET PLAYER STATE */

            $state = $this->gameManager->getPlayerState(
                $matchId,
                $playerId,
                true
            );

            if ((int) $state['life_id'] !== $lifeId) {

                throw new DomainException(
                    'Outdated player life.'
                );
            }

            /* CHECK FIRING ELIGIBILITY */

            if (
                !$this->weaponManager->canFireWeapon(
                    $state
                )
            ) {

                throw new DomainException(
                    'Player cannot fire a weapon right now.'
                );
            }

            /* GET WEAPON CONFIGURATION */

            $weaponId = (string) $state['weapon_id'];

            $weapon = WeaponManager::getWeaponConfig(
                $weaponId
            );

            $selectedWeapons = json_decode(
                $match['selected_weapons'],
                true,
                32,
                JSON_THROW_ON_ERROR
            );

            if (
                !is_array($selectedWeapons) ||
                !in_array(
                    $weaponId,
                    $selectedWeapons,
                    true
                )
            ) {

                throw new DomainException(
                    'Weapon is not allowed in this match.'
                );
            }

            /* VALIDATE FIRING REQUEST */

            $lastEvent = $this->getLastFireEvent(
                $matchId,
                $playerId
            );

            $this->validateFireSequence(
                $lastEvent,
                $fireSequence
            );

            $now = ApiSecurity::now();

            $this->validateFireCooldown(
                $lastEvent,
                $weaponId,
                $now
            );

            $this->requireImplementedWeapon(
                $weaponId
            );

            /* GET FIRE POSITION */

            $firePosition = $this->getFirePosition(
                $state
            );

            /* CREATE PROJECTILES */

            $projectiles = [];

            if ($weapon['type'] === 'projectile') {

                $projectiles = $this->createProjectiles(
                    $matchId,
                    $playerId,
                    $lifeId,
                    $weapon,
                    $firePosition,
                    $now
                );
            }

            /* CONSUME AMMUNITION */

            $remainingAmmo = max(
                0,
                (int) $state['ammo'] - 1
            );

            $remainingWeapon = $remainingAmmo > 0
                ? $weaponId
                : null;

            $remainingMaxAmmo = $remainingAmmo > 0
                ? (int) $state['max_ammo']
                : 0;

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
                'weapon_id' => $remainingWeapon,

                'ammo' => $remainingAmmo,

                'max_ammo' => $remainingMaxAmmo,

                'match_id' => $matchId,

                'player_id' => $playerId
            ]);

            /* CREATE FIRE EVENT */

            $eventData = array_merge(
                $firePosition,
                [
                    'fire_sequence' => $fireSequence,

                    'life_id' => $lifeId,

                    'weapon_type' => $weapon['type'],

                    'weapon_name' => $weapon['name'],

                    'remaining_ammo' => $remainingAmmo,

                    'projectiles' => $projectiles,

                    'fired_at' => $now
                ]
            );

            $eventId = $this->gameManager->createEvent(
                $matchId,
                'weapon_fire',
                $playerId,
                null,
                $weaponId,
                $eventData
            );

            /* HANDLE SPECIAL WEAPON */

            $specialResult = null;

            if ($weaponId === 'invincibility') {

                $protectedUntil = $this->activateShield(
                    $matchId,
                    $playerId,
                    $state,
                    $now
                );

                $specialResult = [
                    'type' => 'shield',
                    'protected_until' => $protectedUntil
                ];
            }

            /* UPDATE PLAYER ACTIVITY */

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

            /* GET UPDATED PLAYER STATE */

            $updatedState =
                $this->gameManager->getPlayerState(
                    $matchId,
                    $playerId
                );

            $this->db->commit();

            /* RETURN RESPONSE */

            return [
                'fired' => true,

                'match_id' => $matchId,

                'player_id' => $playerId,

                'weapon_id' => $weaponId,

                'weapon_type' => $weapon['type'],

                'remaining_ammo' => $remainingAmmo,

                'fire_sequence' => $fireSequence,

                'fire_position' => $firePosition,

                'projectiles' => $projectiles,

                'event_id' => $eventId,

                'special' => $specialResult,

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
       CHECK PLAYER PROTECTION
    ========================================= */

    public function isPlayerProtected(
        array $state
    ): bool {

        return
            (bool) $state['is_alive'] &&
            (int) $state['protected_until'] >
            ApiSecurity::now();
    }

    /* =========================================
       CHECK DAMAGE ELIGIBILITY
    ========================================= */

    public function canDamagePlayer(
        array $attacker,
        array $target
    ): bool {

        if (
            (int) $attacker['match_id'] !==
            (int) $target['match_id']
        ) {
            return false;
        }

        if (
            (int) $attacker['player_id'] ===
            (int) $target['player_id']
        ) {
            return false;
        }

        if (!(bool) $target['is_alive']) {
            return false;
        }

        if ((int) $target['health'] <= 0) {
            return false;
        }

        if ($this->isPlayerProtected($target)) {
            return false;
        }

        return true;
    }
}
