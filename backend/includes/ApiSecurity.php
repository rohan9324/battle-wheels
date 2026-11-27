<?php

declare(strict_types=1);

class ApiSecurity
{
    private const MAX_BODY_SIZE = 16384;

    public static function init(
        string $allowedMethod = 'POST'
    ): void {

        header('Content-Type: application/json; charset=UTF-8');

        header(
            'Cache-Control: no-store, no-cache, must-revalidate'
        );

        header('Pragma: no-cache');
        header('X-Content-Type-Options: nosniff');
        header('X-Frame-Options: DENY');
        header('Referrer-Policy: no-referrer');

        $method = $_SERVER['REQUEST_METHOD'] ?? '';

        if ($method !== $allowedMethod) {

            header('Allow: ' . $allowedMethod);

            self::error(
                'Method not allowed.',
                405
            );
        }

        if ($method === 'POST') {

            $contentType = strtolower(
                trim(
                    explode(
                        ';',
                        $_SERVER['CONTENT_TYPE'] ?? ''
                    )[0]
                )
            );

            if ($contentType !== 'application/json') {

                self::error(
                    'Content-Type must be application/json.',
                    415
                );
            }
        }
    }

    public static function getJsonInput(): array
    {
        $contentLength = (int) (
            $_SERVER['CONTENT_LENGTH'] ?? 0
        );

        if ($contentLength > self::MAX_BODY_SIZE) {

            self::error(
                'Request body is too large.',
                413
            );
        }

        $raw = file_get_contents(
            'php://input',
            false,
            null,
            0,
            self::MAX_BODY_SIZE + 1
        );

        if ($raw === false || trim($raw) === '') {

            self::error(
                'Request body is required.',
                400
            );
        }

        if (strlen($raw) > self::MAX_BODY_SIZE) {

            self::error(
                'Request body is too large.',
                413
            );
        }

        try {

            $decoded = json_decode(
                $raw,
                false,
                32,
                JSON_THROW_ON_ERROR
            );

        } catch (JsonException $e) {

            self::error(
                'Invalid JSON request.',
                400
            );
        }

        if (!is_object($decoded)) {

            self::error(
                'JSON object is required.',
                400
            );
        }

        return json_decode(
            $raw,
            true,
            32,
            JSON_THROW_ON_ERROR
        );
    }

    public static function generateToken(): string
    {
        return bin2hex(random_bytes(32));
    }

    public static function hashToken(
        string $token
    ): string {

        return hash('sha256', $token);
    }

    public static function generateRoomCode(): string
    {
        $characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

        $code = '';

        for ($i = 0; $i < 6; $i++) {

            $code .= $characters[
                random_int(
                    0,
                    strlen($characters) - 1
                )
            ];
        }

        return $code;
    }

    public static function normalizeRoomCode(
        mixed $value
    ): string {

        if (!is_string($value)) {

            self::error(
                'Invalid room code.',
                400
            );
        }

        $code = strtoupper(trim($value));

        if (!preg_match('/^[A-Z2-9]{6}$/D', $code)) {

            self::error(
                'Invalid room code.',
                400
            );
        }

        return $code;
    }

    public static function validatePlayerName(
        mixed $value
    ): string {

        if (!is_string($value)) {

            self::error(
                'Player name is required.',
                400
            );
        }

        $name = trim($value);

        if (
            !preg_match(
                '/^[\p{L}\p{N} _-]{2,30}$/uD',
                $name
            )
        ) {

            self::error(
                'Player name must contain 2 to 30 valid characters.',
                400
            );
        }

        return $name;
    }

    public static function requireToken(
        array $input
    ): string {

        $token = $input['session_token'] ?? '';

        if (
            !is_string($token) ||
            !preg_match('/^[a-f0-9]{64}$/D', $token)
        ) {

            self::error(
                'Invalid or missing session token.',
                401
            );
        }

        return $token;
    }

    public static function authenticate(
        PDO $db,
        string $token
    ): array {

        $tokenHash = self::hashToken($token);

        $stmt = $db->prepare(
            "SELECT
                rp.*,
                r.room_code,
                r.host_player_id,
                r.status AS room_status
             FROM room_players rp
             INNER JOIN rooms r
                ON r.id = rp.room_id
             WHERE rp.session_token_hash = :token
               AND rp.status = 'connected'
               AND r.status != 'closed'
             LIMIT 1"
        );

        $stmt->execute([
            'token' => $tokenHash
        ]);

        $player = $stmt->fetch();

        if (!$player) {

            self::error(
                'Invalid or expired player session.',
                401
            );
        }

        unset($player['session_token_hash']);

        return $player;
    }

    public static function requireHost(
        array $player
    ): void {

        if (
            (int) $player['id'] !==
            (int) $player['host_player_id']
        ) {

            self::error(
                'Only the room host can perform this action.',
                403
            );
        }
    }

    public static function now(): int
    {
        return (int) floor(
            microtime(true) * 1000
        );
    }

    public static function success(
        array $data = [],
        string $message = 'Success.',
        int $status = 200
    ): never {

        http_response_code($status);

        echo json_encode([
            'success' => true,
            'message' => $message,
            'data' => $data,
            'error' => null
        ], JSON_UNESCAPED_UNICODE);

        exit;
    }

    public static function error(
        string $message,
        int $status = 400
    ): never {

        http_response_code($status);

        echo json_encode([
            'success' => false,
            'message' => $message,
            'data' => null,
            'error' => $message
        ], JSON_UNESCAPED_UNICODE);

        exit;
    }
}