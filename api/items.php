<?php
// ========================================================
// Items API Endpoint (CRUD for Lost & Found Notices)
// ========================================================
require_once __DIR__ . '/db.php';

$pdo = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// Read JSON input body if present
$inputRaw = file_get_contents('php://input');
$inputData = json_decode($inputRaw, true) ?? [];
if (empty($inputData)) {
    $inputData = $_POST;
}

// --------------------------------------------------------
// GET: Fetch notices with optional filtering & search
// --------------------------------------------------------
if ($method === 'GET') {
    $search = trim($_GET['search'] ?? '');
    $status = trim($_GET['status'] ?? 'all');
    $category = trim($_GET['category'] ?? 'All');

    $whereClauses = [];
    $params = [];

    // Filter by type / status
    if ($status === 'lost') {
        $whereClauses[] = "`type` = 'lost'";
    } elseif ($status === 'found') {
        $whereClauses[] = "`type` = 'found'";
    } elseif ($status === 'claimed') {
        $whereClauses[] = "`status` = 'claimed'";
    }

    // Filter by category
    if (!empty($category) && strcasecmp($category, 'All') !== 0) {
        $whereClauses[] = "`category` = :category";
        $params[':category'] = $category;
    }

    // Search query
    if (!empty($search)) {
        $whereClauses[] = "(`name` LIKE :search OR `description` LIKE :search OR `location` LIKE :search OR `item_code` LIKE :search OR `contact` LIKE :search)";
        $params[':search'] = '%' . $search . '%';
    }

    $sql = "SELECT * FROM `items`";
    if (!empty($whereClauses)) {
        $sql .= " WHERE " . implode(" AND ", $whereClauses);
    }
    $sql .= " ORDER BY `id` DESC";

    try {
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $items = $stmt->fetchAll();

        // Format items to match frontend schema
        $formatted = array_map(function($row) {
            return [
                'id'          => $row['item_code'],
                'db_id'       => (int)$row['id'],
                'status'      => $row['type'],
                'claim_status'=> $row['status'] ?? 'open',
                'name'        => $row['name'],
                'category'    => $row['category'],
                'location'    => $row['location'],
                'date'        => $row['item_date'],
                'description' => $row['description'] ?? '',
                'contact'     => $row['contact'],
                'created_at'  => $row['created_at']
            ];
        }, $items);

        echo json_encode([
            "success" => true,
            "count"   => count($formatted),
            "items"   => $formatted
        ]);
        exit;
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["success" => false, "error" => $e->getMessage()]);
        exit;
    }
}

// --------------------------------------------------------
// POST: Create a new notice
// --------------------------------------------------------
if ($method === 'POST') {
    // Check if this is an action override (e.g. claim or delete via POST)
    $action = $_GET['action'] ?? ($inputData['action'] ?? '');
    if ($action === 'claim') {
        handleClaimItem($pdo, $inputData);
        exit;
    }

    $type        = strtolower(trim($inputData['type'] ?? ($inputData['status'] ?? 'lost')));
    $name        = trim($inputData['name'] ?? '');
    $category    = trim($inputData['category'] ?? '');
    $location    = trim($inputData['location'] ?? '');
    $item_date   = trim($inputData['date'] ?? ($inputData['item_date'] ?? date('Y-m-d')));
    $description = trim($inputData['description'] ?? '');
    $contact     = trim($inputData['contact'] ?? '');

    if ($type !== 'lost' && $type !== 'found') {
        $type = 'lost';
    }

    if (empty($name) || empty($category) || empty($location) || empty($contact)) {
        http_response_code(400);
        echo json_encode([
            "success" => false,
            "error"   => "Item name, category, location, and contact information are required."
        ]);
        exit;
    }

    // Generate unique item code (e.g., L-0129 or F-0130)
    $prefix = ($type === 'lost') ? 'L' : 'F';
    $randomSuffix = rand(100, 999);
    $item_code = $prefix . '-' . date('md') . $randomSuffix;

    // Check if already exists; if so, regenerate
    $checkStmt = $pdo->prepare("SELECT COUNT(*) FROM `items` WHERE `item_code` = :code");
    $checkStmt->execute([':code' => $item_code]);
    if ($checkStmt->fetchColumn() > 0) {
        $item_code = $prefix . '-' . (time() % 10000);
    }

    $insertSql = "INSERT INTO `items` (`item_code`, `type`, `name`, `category`, `location`, `item_date`, `description`, `contact`, `status`)
                  VALUES (:item_code, :type, :name, :category, :location, :item_date, :description, :contact, 'open')";
    try {
        $stmt = $pdo->prepare($insertSql);
        $stmt->execute([
            ':item_code'   => $item_code,
            ':type'        => $type,
            ':name'        => $name,
            ':category'    => $category,
            ':location'    => $location,
            ':item_date'   => $item_date,
            ':description' => $description,
            ':contact'     => $contact
        ]);

        $newId = $pdo->lastInsertId();

        $newItem = [
            'id'          => $item_code,
            'db_id'       => (int)$newId,
            'status'      => $type,
            'claim_status'=> 'open',
            'name'        => $name,
            'category'    => $category,
            'location'    => $location,
            'date'        => $item_date,
            'description' => $description,
            'contact'     => $contact,
            'created_at'  => date('Y-m-d H:i:s')
        ];

        http_response_code(201);
        echo json_encode([
            "success" => true,
            "message" => "Notice posted successfully!",
            "item"    => $newItem
        ]);
        exit;
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["success" => false, "error" => $e->getMessage()]);
        exit;
    }
}

// --------------------------------------------------------
// PUT: Update / Claim item
// --------------------------------------------------------
if ($method === 'PUT') {
    handleClaimItem($pdo, $inputData);
    exit;
}

// --------------------------------------------------------
// DELETE: Remove a notice by item code or db_id
// --------------------------------------------------------
if ($method === 'DELETE') {
    $id = $_GET['id'] ?? ($inputData['id'] ?? '');
    if (empty($id)) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Item ID is required."]);
        exit;
    }

    try {
        $stmt = $pdo->prepare("DELETE FROM `items` WHERE `item_code` = :id OR `id` = :id_num");
        $stmt->execute([
            ':id'     => $id,
            ':id_num' => is_numeric($id) ? (int)$id : 0
        ]);

        if ($stmt->rowCount() > 0) {
            echo json_encode(["success" => true, "message" => "Item deleted successfully."]);
        } else {
            http_response_code(404);
            echo json_encode(["success" => false, "error" => "Item not found."]);
        }
        exit;
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["success" => false, "error" => $e->getMessage()]);
        exit;
    }
}

function handleClaimItem($pdo, $data) {
    $id = $_GET['id'] ?? ($data['id'] ?? '');
    $targetStatus = $data['status'] ?? 'claimed';

    if (empty($id)) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Item ID is required."]);
        return;
    }

    try {
        // Toggle or set claim status
        $fetchStmt = $pdo->prepare("SELECT `status` FROM `items` WHERE `item_code` = :id OR `id` = :id_num LIMIT 1");
        $fetchStmt->execute([
            ':id'     => $id,
            ':id_num' => is_numeric($id) ? (int)$id : 0
        ]);
        $current = $fetchStmt->fetchColumn();

        if ($current === false) {
            http_response_code(404);
            echo json_encode(["success" => false, "error" => "Item not found."]);
            return;
        }

        $newStatus = ($current === 'claimed') ? 'open' : 'claimed';
        if (isset($data['status'])) {
            $newStatus = ($data['status'] === 'open') ? 'open' : 'claimed';
        }

        $updateStmt = $pdo->prepare("UPDATE `items` SET `status` = :new_status WHERE `item_code` = :id OR `id` = :id_num");
        $updateStmt->execute([
            ':new_status' => $newStatus,
            ':id'         => $id,
            ':id_num'     => is_numeric($id) ? (int)$id : 0
        ]);

        echo json_encode([
            "success"      => true,
            "message"      => ($newStatus === 'claimed') ? "Item marked as Claimed / Resolved!" : "Item status reopened.",
            "claim_status" => $newStatus
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["success" => false, "error" => $e->getMessage()]);
    }
}
