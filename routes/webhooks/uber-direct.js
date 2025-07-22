const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

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

// Ruta POST para el webhook
router.post('/', (req, res) => {
    const data = req.body;

    if (
        data &&
        data.kind === 'event.delivery_status' &&
        data.data?.courier_imminent !== true
    ) {
        const logDir = path.join(__dirname, '../../logs');
        const logPath = path.join(logDir, 'deliveries.log');

        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }

        const logContent = JSON.stringify(data) + '\n';
        fs.appendFile(logPath, logContent, (err) => {
            if (err) {
                console.error('Error writing log:', err);
                return res.status(500).json({ status: 'error', message: 'Log failed' });
            }

            return res.json({ status: 'success', message: 'Data saved in log' });
        });
    } else {
        return res.status(500).json({ status: 'error', message: 'Invalid data or event type' });
    }
});

module.exports = router;
