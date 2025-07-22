<?php

include_once '../../connection.php';

//beautify json
header('Content-Type: application/json');

class Pickup
{
    function saveDelivery($data) {
        $db = new Conection();
        $con = $db->start();
        
        try {

            $sql = "INSERT INTO delivery_tiempos (id_delivery, minutos_para_asignar, minutos_para_pickup, minutos_para_entregar)
                    VALUES (:id_delivery, :minutos_para_asignar, :minutos_para_pickup, :minutos_para_entregar)";

            $stmt = $con->prepare($sql);

            foreach ($data as $deliveryId => $data) {
                $minutosAsignar = $data['minutos_para_asignar'] ?? null;
                $minutosPickup = $data['minutos_para_pickup'] ?? null;
                $minutosEntregar = $data['minutos_para_entregar'] ?? null;

                $stmt->bindParam(':id_delivery', $deliveryId);
                $stmt->bindParam(':minutos_para_asignar', $minutosAsignar, PDO::PARAM_INT);
                $stmt->bindParam(':minutos_para_pickup', $minutosPickup, PDO::PARAM_INT);
                $stmt->bindParam(':minutos_para_entregar', $minutosEntregar, PDO::PARAM_INT);

                $stmt->execute();
            }

            
        } catch (PDOException $e) {
            error_log("Error al guardar evento: " . $e->getMessage());
        }

    }

    function analyzeDeliveryEvents() {
        try {

            $logPath = __DIR__ . '\..\logs\events.log';

            if (!file_exists($logPath)) {
                throw new Exception("El archivo de log no existe: " . $logPath);
            }
            
            $content = file_get_contents($logPath);
            if ($content === false) {
                throw new Exception("No se pudo leer el archivo de log");
            }
            
            $lines = preg_split('/\r\n|\r|\n/', $content);
            $logData = [];
            
            // Parsear cada línea del log
            foreach ($lines as $line) {
                $line = trim($line);
                if (empty($line)) continue;
                
                $data = json_decode($line, true);
                
                // Solo procesar si tiene delivery_id
                if (isset($data['delivery_id'])) {
                    $logData[] = $data;
                }
            }
            
            // Agrupar y analizar por delivery_id
            return $this->processDeliveryData($logData);
            
        } catch (Exception $e) {
            return [
                'error' => true,
                'data' => []
            ];
        }
    }

    private function processDeliveryData($logData) {
        $deliveryTimelines = [];
        $results = [];
        
        // Agrupar eventos por delivery_id
        foreach ($logData as $entry) {
            $deliveryId = $entry['delivery_id'];
            $timestamp = $entry['created'];
            $status = $entry['status'] ?? 'unknown';
            
            if (!isset($deliveryTimelines[$deliveryId])) {
                $deliveryTimelines[$deliveryId] = [
                    'events' => []
                ];
            }
            
            $deliveryTimelines[$deliveryId]['events'][] = [
                'datetime' => date_create($timestamp),
                'status' => $status
            ];
        }
        
        // Procesar cada delivery
        foreach ($deliveryTimelines as $deliveryId => $timeline) {
            // Ordenar eventos por timestamp
            usort($timeline['events'], function($a, $b) {
                return $a['datetime'] <=> $b['datetime'];
            });
            
            // Mapear eventos por status
            $eventMap = [];
            foreach ($timeline['events'] as $event) {
                $eventMap[$event['status']] = $event['datetime'];
            }

            // Inicializar resultados
            $minutos_para_asignar = null;
            $minutos_para_pickup = null;
            $minutos_para_entregar = null;

            if (!empty($eventMap['pending']) && !empty($eventMap['pickup'])) {
                $diff = $eventMap['pending']->diff($eventMap['pickup']);
                $minutos_para_asignar = $diff->i + $diff->h * 60;
            }

            if (!empty($eventMap['pickup']) && !empty($eventMap['pickup_complete'])) {
                $diff = $eventMap['pickup']->diff($eventMap['pickup_complete']);
                $minutos_para_pickup = $diff->i + $diff->h * 60;
            }

            // if (!empty($eventMap['pickup_complete']) && !empty($eventMap['dropoff'])) {
            //     $diff = $eventMap['pickup_complete']->diff($eventMap['dropoff']);
            //     $minutos_para_dropoff = $diff->i + $diff->h * 60;
            // }

            if (!empty($eventMap['dropoff']) && !empty($eventMap['delivered'])) {
                $diff = $eventMap['dropoff']->diff($eventMap['delivered']);
                $minutos_para_entregar = $diff->i + $diff->h * 60;
            }

            // Asignar al array final
            $results[$deliveryId] = [
                'delivery_id'             => $deliveryId,
                'minutos_para_asignar'    => $minutos_para_asignar,
                'minutos_para_pickup'     => $minutos_para_pickup,
                // 'minutos_para_dropoff' => $minutos_para_dropoff, // si lo usas, descomenta también arriba
                'minutos_para_entregar'   => $minutos_para_entregar,
            ];
        }

        $this->saveDelivery($results);
        
        // Agregar estadísticas generales
        return [
            'data' => $results
        ];
    }
}