<?php
// ========================================================
// Database Connection & Initialization (MySQL via PDO)
// ========================================================

// Set headers for JSON REST API and CORS
if (php_sapi_name() !== 'cli') {
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
}

if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Database Credentials (override locally via config.local.php or environment variables)
$DB_HOST = getenv('DB_HOST') ?: '127.0.0.1';
$DB_PORT = getenv('DB_PORT') ?: '3306';
$DB_USER = getenv('DB_USER') ?: 'root';
$DB_PASS = getenv('DB_PASS') ?: '';
$DB_NAME = getenv('DB_NAME') ?: 'hostel_lnf';

// Check for local configuration override if present
if (file_exists(__DIR__ . '/config.local.php')) {
    include __DIR__ . '/config.local.php';
}

function getDbConnection() {
    global $DB_HOST, $DB_PORT, $DB_USER, $DB_PASS, $DB_NAME;

    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];

    try {
        // Try connecting directly to the database
        $dsn = "mysql:host={$DB_HOST};port={$DB_PORT};dbname={$DB_NAME};charset=utf8mb4";
        $pdo = new PDO($dsn, $DB_USER, $DB_PASS, $options);
        ensureTablesExist($pdo);
        return $pdo;
    } catch (PDOException $e) {
        // If database does not exist (error 1049), connect without dbname and create it
        if ($e->getCode() == 1049 || strpos($e->getMessage(), 'Unknown database') !== false) {
            try {
                $dsnWithoutDb = "mysql:host={$DB_HOST};port={$DB_PORT};charset=utf8mb4";
                $serverPdo = new PDO($dsnWithoutDb, $DB_USER, $DB_PASS, $options);
                $serverPdo->exec("CREATE DATABASE IF NOT EXISTS `{$DB_NAME}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
                
                // Reconnect to newly created database
                $pdo = new PDO("mysql:host={$DB_HOST};port={$DB_PORT};dbname={$DB_NAME};charset=utf8mb4", $DB_USER, $DB_PASS, $options);
                ensureTablesExist($pdo);
                return $pdo;
            } catch (PDOException $ex) {
                if (php_sapi_name() !== 'cli') {
                    http_response_code(500);
                }
                echo json_encode([
                    "success" => false,
                    "error"   => "Failed to initialize database: " . $ex->getMessage()
                ]);
                exit;
            }
        }

        if (php_sapi_name() !== 'cli') {
            http_response_code(500);
        }
        echo json_encode([
            "success" => false,
            "error"   => "Database connection failed: " . $e->getMessage()
        ]);
        exit;
    }
}

function ensureTablesExist($pdo) {
    $createTableSql = "
        CREATE TABLE IF NOT EXISTS `items` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `item_code` VARCHAR(20) NOT NULL UNIQUE,
            `type` ENUM('lost', 'found') NOT NULL,
            `name` VARCHAR(255) NOT NULL,
            `category` VARCHAR(100) NOT NULL,
            `location` VARCHAR(255) NOT NULL,
            `item_date` DATE NOT NULL,
            `description` TEXT,
            `contact` VARCHAR(255) NOT NULL,
            `status` ENUM('open', 'claimed') DEFAULT 'open',
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ";
    $pdo->exec($createTableSql);

    // If table is empty, seed initial records
    $stmt = $pdo->query("SELECT COUNT(*) AS total FROM `items`");
    $count = $stmt->fetchColumn();
    if ($count == 0) {
        seedInitialData($pdo);
    }
}

function seedInitialData($pdo) {
    $initialData = [
        [
            'item_code'   => 'L-0128',
            'type'        => 'lost',
            'name'        => 'Matte black wired earphones',
            'category'    => 'Electronics',
            'location'    => 'Mess Hall, Block C',
            'item_date'   => '2026-10-13',
            'description' => 'Left near the tray return counter around dinner time. Has a small red thread tied on one earbud.',
            'contact'     => 'Room 302, Block C',
            'status'      => 'open'
        ],
        [
            'item_code'   => 'F-0127',
            'type'        => 'found',
            'name'        => 'College ID card — S. Ramesh',
            'category'    => 'ID & Documents',
            'location'    => 'Warden\'s Office, Ground Floor',
            'item_date'   => '2026-10-12',
            'description' => 'Handed in at the warden\'s office. Owner can collect after verifying room number.',
            'contact'     => 'Warden Office (Ext 204)',
            'status'      => 'open'
        ],
        [
            'item_code'   => 'L-0126',
            'type'        => 'lost',
            'name'        => 'Grey hoodie, size M',
            'category'    => 'Clothing',
            'location'    => 'Common Room, Block A',
            'item_date'   => '2026-10-11',
            'description' => 'Left on the back of a chair during movie night. University logo on the left chest.',
            'contact'     => 'rahul.a@hostel.edu',
            'status'      => 'open'
        ],
        [
            'item_code'   => 'F-0125',
            'type'        => 'found',
            'name'        => 'Steel water bottle, dented cap',
            'category'    => 'Other',
            'location'    => 'Reading Room, 2nd Floor',
            'item_date'   => '2026-10-10',
            'description' => 'Sitting by the window seat closest to the noticeboard. Name scratched off the label.',
            'contact'     => 'Room 114, Block B',
            'status'      => 'open'
        ],
        [
            'item_code'   => 'L-0124',
            'type'        => 'lost',
            'name'        => 'USB-C charging cable',
            'category'    => 'Electronics',
            'location'    => 'Study Hall, Block B',
            'item_date'   => '2026-10-09',
            'description' => 'Was plugged into socket near desk 12. White cable, slightly frayed near connector.',
            'contact'     => 'Room 214, Block B',
            'status'      => 'open'
        ],
        [
            'item_code'   => 'F-0123',
            'type'        => 'found',
            'name'        => 'Set of two room keys',
            'category'    => 'Other',
            'location'    => 'Laundry Room, Block C',
            'item_date'   => '2026-10-08',
            'description' => 'Found on top of a washing machine. Keychain has a small yellow tag, no name.',
            'contact'     => 'Caretaker Office',
            'status'      => 'open'
        ]
    ];

    $sql = "INSERT IGNORE INTO `items` (`item_code`, `type`, `name`, `category`, `location`, `item_date`, `description`, `contact`, `status`)
            VALUES (:item_code, :type, :name, :category, :location, :item_date, :description, :contact, :status)";
    $stmt = $pdo->prepare($sql);

    foreach ($initialData as $item) {
        $stmt->execute([
            ':item_code'   => $item['item_code'],
            ':type'        => $item['type'],
            ':name'        => $item['name'],
            ':category'    => $item['category'],
            ':location'    => $item['location'],
            ':item_date'   => $item['item_date'],
            ':description' => $item['description'],
            ':contact'     => $item['contact'],
            ':status'      => $item['status']
        ]);
    }
}
