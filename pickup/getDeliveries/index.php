<?php

include_once '../../controllers/Pickup.php';

$data = null;

$p = new Pickup();
$data = $p->analyzeDeliveryEvents();

echo (json_encode($data));
