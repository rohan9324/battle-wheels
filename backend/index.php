<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('X-Content-Type-Options: nosniff');

require_once __DIR__ . '/config/config.php';

try {

    $db = getDB();

    $db->query('SELECT 1');

    http_response_code(200);

    echo json_encode([
        'success' => true,
        'application' => 'Battle Wheels',
        'backend' => 'Core PHP',
        'database' => 'Connected',
        'status' => 'Online',
        'message' => 'Battle Wheels API is running.'
    ], JSON_PRETTY_PRINT);

} catch (Throwable $e) {

    http_response_code(500);

    echo json_encode([
        'success' => false,
        'application' => 'Battle Wheels',
        'database' => 'Disconnected',
        'status' => 'Offline',
        'message' => 'Database connection failed.'
    ], JSON_PRETTY_PRINT);
}