<?php
require_once __DIR__ . '/db.php';

try {
    $pdo = getDbConnection();
    
    // Check table and count
    $stmt = $pdo->query("SELECT COUNT(*) AS total FROM `items`");
    $total = $stmt->fetchColumn();

    $versionStmt = $pdo->query("SELECT VERSION() AS ver");
    $version = $versionStmt->fetchColumn();

    echo json_encode([
        "success"   => true,
        "message"   => "Successfully connected to MySQL database",
        "database"  => $DB_NAME,
        "host"      => $DB_HOST,
        "port"      => $DB_PORT,
        "mysql_ver" => $version,
        "items_count" => (int)$total
    ], JSON_PRETTY_PRINT);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "error"   => $e->getMessage()
    ], JSON_PRETTY_PRINT);
}
