<?php

declare(strict_types=1);

require_once __DIR__ . '/ApiSecurity.php';
require_once __DIR__ . '/RoomManager.php';
require_once __DIR__ . '/GameManager.php';

class MatchManager
{
    private PDO $db;

    private RoomManager $roomManager;

    private GameManager $gameManager;

    public function __construct(PDO $db)
    {
        $this->db = $db;

        $this->roomManager = new RoomManager($db);

        $this->gameManager = new GameManager($db);
    }

    /* =========================================
       RESTART MATCH / RETURN TO WAITING LOBBY
    ========================================= */

    public function restartGame(
        string $token,
        array $input
    ): array {

        /* =========================================
           VALIDATE MATCH ID
        ========================================= */

        $matchId = $input['match_id'] ?? null;

        if (!is_int($matchId) || $matchId < 1) {

            throw new InvalidArgumentException(
                'Invalid match ID.'
            );
        }

        /* =========================================
           AUTHENTICATE HOST
        ========================================= */

        $player = ApiSecurity::authenticate(
            $this->db,
            $token
        );

        ApiSecurity::requireHost($player);

        $roomId = (int) $player['room_id'];

        $hostId = (int) $player['id'];

        try {

            $this->db->beginTransaction();

            /* =========================================
               LOCK ROOM
            ========================================= */

            $stmt = $this->db->prepare(
                "SELECT *
                 FROM rooms
                 WHERE id = :room_id
                 LIMIT 1
                 FOR UPDATE"
            );

            $stmt->execute([
                'room_id' => $roomId
            ]);

            $room = $stmt->fetch();

            if (!$room) {

                throw new DomainException(
                    'Room not found.'
                );
            }

            /* =========================================
               VERIFY HOST PERMISSION
            ========================================= */

            if (
                (int) $room['host_player_id']
                    !== $hostId
            ) {

                throw new DomainException(
                    'Only the host can restart the match.'
                );
            }

            /* =========================================
               VERIFY HOST CONNECTION
            ========================================= */

            $stmt = $this->db->prepare(
                "SELECT status
                 FROM room_players
                 WHERE id = :player_id
                   AND room_id = :room_id
                 LIMIT 1
                 FOR UPDATE"
            );

            $stmt->execute([
                'player_id' => $hostId,
                'room_id' => $roomId
            ]);

            if ($stmt->fetchColumn() !== 'connected') {

                throw new DomainException(
                    'Host is not connected.'
                );
            }

            /* =========================================
               GET LATEST MATCH
            ========================================= */

            $stmt = $this->db->prepare(
                "SELECT *
                 FROM matches
                 WHERE room_id = :room_id
                 ORDER BY id DESC
                 LIMIT 1
                 FOR UPDATE"
            );

            $stmt->execute([
                'room_id' => $roomId
            ]);

            $match = $stmt->fetch();

            if (!$match) {

                throw new DomainException(
                    'No previous match found.'
                );
            }

            if ((int) $match['id'] !== $matchId) {

                throw new DomainException(
                    'Invalid or outdated match.'
                );
            }

            /* =========================================
               HANDLE DUPLICATE RESTART REQUEST
            ========================================= */

            if (
                $room['status'] === 'waiting' &&
                $match['status'] === 'finished'
            ) {

                $roomDetails =
                    $this->roomManager->getRoomDetails(
                        $roomId
                    );

                $this->db->commit();

                return [
                    'restarted' => false,
                    'reason' => 'Room is already in the waiting lobby.',
                    'previous_match_id' => $matchId,
                    'room' => $roomDetails,
                    'server_time' => ApiSecurity::now()
                ];
            }

            /* =========================================
               VERIFY MATCH IS FINISHED
            ========================================= */

            if (
                $room['status'] !== 'finished' ||
                $match['status'] !== 'finished'
            ) {

                throw new DomainException(
                    'Only a finished match can be restarted.'
                );
            }

            /* =========================================
               CHECK FOR ANOTHER ACTIVE MATCH
            ========================================= */

            $stmt = $this->db->prepare(
                "SELECT COUNT(*)
                 FROM matches
                 WHERE room_id = :room_id
                   AND status IN ('waiting', 'playing')"
            );

            $stmt->execute([
                'room_id' => $roomId
            ]);

            if ((int) $stmt->fetchColumn() > 0) {

                throw new DomainException(
                    'Another match is already active.'
                );
            }

            /* =========================================
               GET PREVIOUS MATCH LEADERBOARD
            ========================================= */

            $previousLeaderboard =
                $this->gameManager->getLeaderboard(
                    $matchId
                );

            /* =========================================
               RESET ROOM TO WAITING STATUS
            ========================================= */

            $stmt = $this->db->prepare(
                "UPDATE rooms
                 SET
                    status = 'waiting',
                    updated_at = CURRENT_TIMESTAMP
                 WHERE id = :room_id
                   AND status = 'finished'"
            );

            $stmt->execute([
                'room_id' => $roomId
            ]);

            if ($stmt->rowCount() !== 1) {

                throw new DomainException(
                    'Room status has changed.'
                );
            }

            /* =========================================
               RESET PLAYER READY STATUS

               Host remains ready.
               Other players must confirm readiness.
            ========================================= */

            $stmt = $this->db->prepare(
                "UPDATE room_players
                 SET
                    is_ready = CASE
                        WHEN id = :host_id
                         AND status = 'connected'
                        THEN 1
                        ELSE 0
                    END,
                    updated_at = CURRENT_TIMESTAMP
                 WHERE room_id = :room_id
                   AND status != 'left'"
            );

            $stmt->execute([
                'host_id' => $hostId,
                'room_id' => $roomId
            ]);

            /* =========================================
               UPDATE HOST ACTIVITY
            ========================================= */

            $stmt = $this->db->prepare(
                "UPDATE room_players
                 SET last_seen_at = CURRENT_TIMESTAMP
                 WHERE id = :player_id
                   AND room_id = :room_id"
            );

            $stmt->execute([
                'player_id' => $hostId,
                'room_id' => $roomId
            ]);

            /* =========================================
               CREATE ROOM RESTART EVENT
            ========================================= */

            $eventId = $this->gameManager->createEvent(
                $matchId,
                'room_restarted',
                $hostId,
                null,
                null,
                [
                    'room_id' => $roomId,
                    'room_code' => $room['room_code'],
                    'previous_match_id' => $matchId,
                    'previous_match_number' =>
                        (int) $match['match_number'],
                    'next_match_number' =>
                        (int) $match['match_number'] + 1,
                    'room_status' => 'waiting'
                ]
            );

            /* =========================================
               GET UPDATED ROOM DETAILS
            ========================================= */

            $roomDetails =
                $this->roomManager->getRoomDetails(
                    $roomId
                );

            $this->db->commit();

            /* =========================================
               RETURN RESPONSE
            ========================================= */

            return [
                'restarted' => true,
                'room_id' => $roomId,
                'room_code' => $room['room_code'],
                'previous_match_id' => $matchId,
                'previous_match_number' =>
                    (int) $match['match_number'],
                'next_match_number' =>
                    (int) $match['match_number'] + 1,
                'previous_winner_id' =>
                    $match['winner_player_id'] !== null
                        ? (int) $match['winner_player_id']
                        : null,
                'previous_leaderboard' =>
                    $previousLeaderboard,
                'event_id' => $eventId,
                'room' => $roomDetails,
                'server_time' => ApiSecurity::now()
            ];

        } catch (Throwable $e) {

            if ($this->db->inTransaction()) {

                $this->db->rollBack();
            }

            throw $e;
        }
    }
}