<?php

declare(strict_types=1);

date_default_timezone_set('UTC');

error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');

function getDB(): PDO
{
    static $pdo = null;

    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $configFile = __DIR__ . '/config.production.php';

    if (!is_file($configFile)) {
        throw new RuntimeException(
            'Database configuration is missing.'
        );
    }

    $config = require $configFile;

    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=%s',
        $config['host'],
        $config['port'],
        $config['database'],
        $config['charset']
    );

    try {

        $pdo = new PDO(
            $dsn,
            $config['username'],
            $config['password'],
            [
                PDO::ATTR_ERRMODE =>
                    PDO::ERRMODE_EXCEPTION,

                PDO::ATTR_DEFAULT_FETCH_MODE =>
                    PDO::FETCH_ASSOC,

                PDO::ATTR_EMULATE_PREPARES =>
                    false,

                PDO::ATTR_PERSISTENT =>
                    false
            ]
        );

        $pdo->exec("SET time_zone = '+00:00'");

        return $pdo;

    } catch (PDOException $e) {

        error_log(
            'Battle Wheels DB Error: ' . $e->getMessage()
        );

        throw new RuntimeException(
            'Database connection failed.'
        );
    }
}