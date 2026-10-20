<?php
// ========================================================
// Stats API Endpoint (Live MySQL counts)
// ========================================================
require_once __DIR__ . '/db.php';

try {
    $pdo = getDbConnection();

    $totalStmt   = $pdo->query("SELECT COUNT(*) FROM `items`");
    $total       = (int)$totalStmt->fetchColumn();

    $lostStmt    = $pdo->query("SELECT COUNT(*) FROM `items` WHERE `type` = 'lost'");
    $lost        = (int)$lostStmt->fetchColumn();

    $foundStmt   = $pdo->query("SELECT COUNT(*) FROM `items` WHERE `type` = 'found'");
    $found       = (int)$foundStmt->fetchColumn();

    $claimedStmt = $pdo->query("SELECT COUNT(*) FROM `items` WHERE `status` = 'claimed'");
    $claimed     = (int)$claimedStmt->fetchColumn();

    echo json_encode([
        "success" => true,
        "total"   => $total,
        "lost"    => $lost,
        "found"   => $found,
        "claimed" => $claimed,
        "database"=> "MySQL 8.0 (Connected)"
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => $e->getMessage()]);
}
