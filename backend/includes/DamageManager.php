<?php

declare(strict_types=1);

require_once __DIR__ . '/ApiSecurity.php';
require_once __DIR__ . '/GameManager.php';
require_once __DIR__ . '/WeaponManager.php';

class DamageManager
{
    private PDO $db;

    private GameManager $gameManager;

    private const RESPAWN_DELAY = 3000;

    public function __construct(PDO $db)
    {
        $this->db = $db;

        $this->gameManager = new GameManager($db);
    }

    /* =========================================
       CHECK PLAYER PROTECTION
    ========================================= */

    public function isProtected(
        array $state
    ): bool {

        return
            (bool) $state['is_alive'] &&
            (int) $state['protected_until']
                > ApiSecurity::now();
    }

    /* =========================================
       APPLY SERVER-SIDE DAMAGE

       Internal method only.

       Caller must lock the room and active match
       before calling this method.
    ========================================= */

    public function applyDamage(
        int $matchId,
        int $attackerId,
        int $targetId,
        string $weaponId,
        int $damage
    ): array {

        if (!$this->db->inTransaction()) {

            throw new LogicException(
                'Damage requires an active transaction.'
            );
        }

        if ($damage <= 0 || $damage > 1000) {

            throw new InvalidArgumentException(
                'Invalid damage amount.'
            );
        }

        WeaponManager::getWeaponConfig($weaponId);

        /* PREVENT SELF DAMAGE */

        if ($attackerId === $targetId) {

            return [
                'applied' => false,
                'reason' => 'self_damage'
            ];
        }

        /* VERIFY MATCH */

        $stmt = $this->db->prepare(
            "SELECT *
             FROM matches
             WHERE id = :match_id
             LIMIT 1
             FOR UPDATE"
        );

        $stmt->execute([
            'match_id' => $matchId
        ]);

        $match = $stmt->fetch();

        if (!$match) {

            throw new DomainException(
                'Match not found.'
            );
        }

        $this->gameManager->requirePlayingMatch(
            $match
        );

        /* GET ATTACKER */

        $attacker = $this->gameManager->getPlayerState(
            $matchId,
            $attackerId,
            true
        );

        /* GET TARGET */

        $target = $this->gameManager->getPlayerState(
            $matchId,
            $targetId,
            true
        );

        /* CHECK TARGET CONNECTION */

        $stmt = $this->db->prepare(
            "SELECT status
             FROM room_players
             WHERE id = :player_id
               AND room_id = :room_id
             LIMIT 1"
        );

        $stmt->execute([
            'player_id' => $targetId,
            'room_id' => $match['room_id']
        ]);

        if ($stmt->fetchColumn() !== 'connected') {

            return [
                'applied' => false,
                'reason' => 'target_not_connected'
            ];
        }

        /* CHECK TARGET HEALTH */

        if (
            !(bool) $target['is_alive'] ||
            (int) $target['health'] <= 0
        ) {

            return [
                'applied' => false,
                'reason' => 'target_already_dead'
            ];
        }

        /* CHECK SPAWN PROTECTION */

        if ($this->isProtected($target)) {

            return [
                'applied' => false,
                'reason' => 'target_protected'
            ];
        }

        /* CALCULATE HEALTH */

        $oldHealth = (int) $target['health'];

        $newHealth = max(
            0,
            $oldHealth - $damage
        );

        $actualDamage = $oldHealth - $newHealth;

        /* UPDATE TARGET HEALTH */

        $stmt = $this->db->prepare(
            "UPDATE player_states
             SET
                health = :health,
                state_version = state_version + 1
             WHERE match_id = :match_id
               AND player_id = :player_id"
        );

        $stmt->execute([
            'health' => $newHealth,
            'match_id' => $matchId,
            'player_id' => $targetId
        ]);

        /* CREATE DAMAGE EVENT */

        $damageEventId =
            $this->gameManager->createEvent(
                $matchId,
                'player_damage',
                $attackerId,
                $targetId,
                $weaponId,
                [
                    'old_health' => $oldHealth,
                    'new_health' => $newHealth,
                    'damage' => $actualDamage,
                    'position_x' =>
                        (float) $target['position_x'],
                    'position_y' =>
                        (float) $target['position_y'],
                    'position_z' =>
                        (float) $target['position_z']
                ],
                $actualDamage
            );

        /* CHECK ELIMINATION */

        $elimination = null;

        if ($newHealth <= 0) {

            $elimination = $this->eliminatePlayer(
                $match,
                $attacker,
                $target,
                $weaponId
            );
        }

        return [
            'applied' => true,
            'damage' => $actualDamage,
            'target_id' => $targetId,
            'health' => $newHealth,
            'eliminated' => $newHealth <= 0,
            'damage_event_id' => $damageEventId,
            'elimination' => $elimination
        ];
    }

    /* =========================================
       ELIMINATE PLAYER
    ========================================= */

    private function eliminatePlayer(
        array $match,
        array $attacker,
        array $target,
        string $weaponId
    ): array {

        $matchId = (int) $match['id'];

        $attackerId = (int) $attacker['player_id'];

        $targetId = (int) $target['player_id'];

        $now = ApiSecurity::now();

        $respawnAt = $now + self::RESPAWN_DELAY;

        /* =========================================
           RESET ELIMINATED PLAYER STATE
        ========================================= */

        $stmt = $this->db->prepare(
            "UPDATE player_states
             SET
                health = 0,
                is_alive = 0,
                speed = 0,
                weapon_id = NULL,
                ammo = 0,
                max_ammo = 0,
                is_firing = 0,
                deaths = deaths + 1,
                life_id = life_id + 1,
                protected_until = 0,
                respawn_at = :respawn_at,
                burn_until = 0,
                slow_until = 0,
                stun_until = 0,
                emp_until = 0,
                poison_until = 0,
                mace_until = 0,
                slow_multiplier = 1,
                state_version = state_version + 1
             WHERE match_id = :match_id
               AND player_id = :player_id
               AND is_alive = 1"
        );

        $stmt->execute([
            'respawn_at' => $respawnAt,
            'match_id' => $matchId,
            'player_id' => $targetId
        ]);

        if ($stmt->rowCount() !== 1) {

            throw new DomainException(
                'Player has already been eliminated.'
            );
        }

        /* =========================================
           UPDATE ATTACKER SCORE
        ========================================= */

        $stmt = $this->db->prepare(
            "UPDATE player_states
             SET
                score = score + 1,
                kills = kills + 1,
                state_version = state_version + 1
             WHERE match_id = :match_id
               AND player_id = :player_id"
        );

        $stmt->execute([
            'match_id' => $matchId,
            'player_id' => $attackerId
        ]);

        /* =========================================
           GET PLAYER NAMES
        ========================================= */

        $stmt = $this->db->prepare(
            "SELECT id, player_name
             FROM room_players
             WHERE room_id = :room_id
               AND id IN (:attacker_id, :target_id)"
        );

        $stmt->execute([
            'room_id' => $match['room_id'],
            'attacker_id' => $attackerId,
            'target_id' => $targetId
        ]);

        $playerNames = [];

        foreach ($stmt->fetchAll() as $player) {

            $playerNames[(int) $player['id']] =
                $player['player_name'];
        }

        /* GET UPDATED STATES */

        $updatedAttacker =
            $this->gameManager->getPlayerState(
                $matchId,
                $attackerId
            );

        $updatedTarget =
            $this->gameManager->getPlayerState(
                $matchId,
                $targetId
            );

        /* =========================================
           CREATE PLAYER DEATH EVENT
        ========================================= */

        $eventId = $this->gameManager->createEvent(
            $matchId,
            'player_death',
            $attackerId,
            $targetId,
            $weaponId,
            [
                'attacker_name' =>
                    $playerNames[$attackerId]
                        ?? 'Player',

                'target_name' =>
                    $playerNames[$targetId]
                        ?? 'Player',

                'attacker_score' =>
                    (int) $updatedAttacker['score'],

                'attacker_kills' =>
                    (int) $updatedAttacker['kills'],

                'target_deaths' =>
                    (int) $updatedTarget['deaths'],

                'target_life_id' =>
                    (int) $updatedTarget['life_id'],

                'respawn_at' => $respawnAt,

                'position_x' =>
                    (float) $target['position_x'],

                'position_y' =>
                    (float) $target['position_y'],

                'position_z' =>
                    (float) $target['position_z']
            ]
        );

        /* =========================================
           CHECK POINTS MATCH COMPLETION
        ========================================= */

        $matchFinished = false;

        if (
            $match['match_type'] === 'points' &&
            (int) $updatedAttacker['score'] >=
                (int) $match['target_points']
        ) {

            $matchFinished = $this->finishPointsMatch(
                $match,
                $attackerId
            );
        }

        return [
            'attacker_id' => $attackerId,
            'target_id' => $targetId,
            'weapon_id' => $weaponId,
            'score' => (int) $updatedAttacker['score'],
            'kills' => (int) $updatedAttacker['kills'],
            'deaths' => (int) $updatedTarget['deaths'],
            'respawn_at' => $respawnAt,
            'event_id' => $eventId,
            'match_finished' => $matchFinished
        ];
    }

    /* =========================================
       FINISH POINTS MATCH

       Runs inside the existing transaction.
    ========================================= */

    private function finishPointsMatch(
        array $match,
        int $winnerId
    ): bool {

        $matchId = (int) $match['id'];

        $roomId = (int) $match['room_id'];

        /* CHECK WINNER HAS NOT LEFT */

        $stmt = $this->db->prepare(
            "SELECT status
             FROM room_players
             WHERE id = :player_id
               AND room_id = :room_id"
        );

        $stmt->execute([
            'player_id' => $winnerId,
            'room_id' => $roomId
        ]);

        $status = $stmt->fetchColumn();

        if (
            $status === false ||
            $status === 'left'
        ) {
            return false;
        }

        /* FINISH MATCH */

        $stmt = $this->db->prepare(
            "UPDATE matches
             SET
                status = 'finished',
                winner_player_id = :winner_id,
                finished_at = CURRENT_TIMESTAMP
             WHERE id = :match_id
               AND status = 'playing'"
        );

        $stmt->execute([
            'winner_id' => $winnerId,
            'match_id' => $matchId
        ]);

        if ($stmt->rowCount() !== 1) {
            return false;
        }

        /* FINISH ROOM */

        $stmt = $this->db->prepare(
            "UPDATE rooms
             SET
                status = 'finished',
                updated_at = CURRENT_TIMESTAMP
             WHERE id = :room_id"
        );

        $stmt->execute([
            'room_id' => $roomId
        ]);

        /* STOP ALL PLAYERS */

        $stmt = $this->db->prepare(
            "UPDATE player_states
             SET
                speed = 0,
                is_firing = 0,
                respawn_at = 0,
                state_version = state_version + 1
             WHERE match_id = :match_id"
        );

        $stmt->execute([
            'match_id' => $matchId
        ]);

        /* GET FINAL LEADERBOARD */

        $leaderboard =
            $this->gameManager->getLeaderboard(
                $matchId
            );

        $winner = null;

        foreach ($leaderboard as $player) {

            if (
                (int) $player['player_id']
                    === $winnerId
            ) {

                $winner = $player;

                break;
            }
        }

        /* CREATE MATCH FINISHED EVENT */

        $this->gameManager->createEvent(
            $matchId,
            'match_finished',
            $winnerId,
            null,
            null,
            [
                'reason' => 'target_points_reached',
                'winner' => $winner,
                'leaderboard' => $leaderboard
            ]
        );

        return true;
    }
}