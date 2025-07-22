<?php

include_once '../../controllers/Pickup.php';

header('Content-Type: application/json; charset=utf-8');

if (isset($_SERVER['HTTP_ORIGIN'])) {
    header("Access-Control-Allow-Origin: {$_SERVER['HTTP_ORIGIN']}");
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Max-Age: 86400');
}

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_METHOD']))
        header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
    if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS']))
        header("Access-Control-Allow-Headers: {$_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS']}");
    exit(0);
}

$input = file_get_contents("php://input");
$data = json_decode($input, TRUE);

if ($data && isset($data['kind']) && $data['kind'] == 'event.delivery_status' && $data['data']['courier_imminent'] !== true) {
    
    // Guardar en un archivo de log
    $logPath = __DIR__ . '\..\..\logs\events.log';
    file_put_contents($logPath, json_encode($data) . PHP_EOL, FILE_APPEND);

    echo json_encode(['status' => 'succes', 'message' => 'Data saved in log']);
    
} else {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Invalid data or event type']);
}
?>
