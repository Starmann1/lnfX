<?php
// ========================================================
// Reset API Endpoint (Reseed initial sample notices in MySQL)
// ========================================================
require_once __DIR__ . '/db.php';

try {
    $pdo = getDbConnection();

    // Clear items table and reseed
    $pdo->exec("TRUNCATE TABLE `items`");
    seedInitialData($pdo);

    $count = $pdo->query("SELECT COUNT(*) FROM `items`")->fetchColumn();

    echo json_encode([
        "success" => true,
        "message" => "Database successfully reset to default sample notices.",
        "count"   => (int)$count
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => $e->getMessage()]);
}
