const { Pool } = require('pg');

const pool = new Pool({
    host: '66.179.242.164',
    port: 5432,
    database: 'tiendave_api_tracking_ecommerce',
    user: 'postgres',
    password: '3D2023#Wm',
    max: 10,               // Máximo de conexiones simultáneas
    idleTimeoutMillis: 30000 // Cierra las inactivas después de 30s
});

pool.on('error', (err) => {
    console.error('Error en la conexión a PostgreSQL:', err);
});

module.exports = pool;
