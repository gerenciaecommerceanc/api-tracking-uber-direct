<?php

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
}

class Conection
{
    function start() {
        // Configura estos valores con los de tu servidor PostgreSQL
        $pg_host = '66.179.242.164';
        $pg_port = '5432';
        $pg_dbname = 'tiendave_api_tracking_ecommerce';
        $pg_user = 'postgres';
        $pg_pass = '3D2023#Wm';

        $dsn = "pgsql:host=$pg_host;port=$pg_port;dbname=$pg_dbname";

        try {
            $con = new PDO($dsn, $pg_user, $pg_pass, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
            ]);
            return $con;
        } catch (PDOException $e) {
            die("Error de conexi贸n a PostgreSQL: " . $e->getMessage());
        }
    }
}

?>