const express = require('express');
const router = express.Router();
const { analyzeDeliveryEvents } = require('../../controllers/Pickup');

// Middleware para manejar CORS y OPTIONS
router.use((req, res, next) => {
    res.header('Content-Type', 'application/json; charset=utf-8');
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '86400');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', req.headers['access-control-request-headers'] || '*');

    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Ruta GET 
router.get('/deliveries', (req, res) => {
    const result = analyzeDeliveryEvents();
    res.status(result.error ? 500 : 200).json(result);
})

module.exports = router;