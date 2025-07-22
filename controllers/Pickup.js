const fs = require('fs');
const path = require('path');
const pool = require('../db/connection');

function analyzeDeliveryEvents() {
    try {
        const logPath = path.join(__dirname, '..', 'logs', 'deliveries.log');

        if (!fs.existsSync(logPath)) {
            throw new Error(`El archivo de log no existe: ${logPath}`);
        }

        const content = fs.readFileSync(logPath, 'utf8');
        if (!content) {
            throw new Error('No se pudo leer el archivo de log');
        }

        const lines = content.split(/\r?\n/);
        const logData = [];

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            try {
                const data = JSON.parse(trimmed);
                if (data.delivery_id) {
                    logData.push(data);
                }
            } catch (err) {
                // línea inválida, se ignora
            }
        }

        return processDeliveryData(logData);

    } catch (err) {
        console.error('Error en saveDelivery:', err);
        return {
            error: true,
            data: []
        };
    }
}

function processDeliveryData(logData) {
    const deliveryTimelines = {};
    const results = {};

    // Agrupar eventos por delivery_id
    for (const entry of logData) {
        const deliveryId = entry.delivery_id;
        const timestamp = entry.created;
        const status = entry.status || 'unknown';

        if (!deliveryTimelines[deliveryId]) {
            deliveryTimelines[deliveryId] = {
                events: []
            };
        }

        deliveryTimelines[deliveryId].events.push({
            datetime: new Date(timestamp),
            status
        });
    }

    // Procesar cada delivery
    for (const deliveryId in deliveryTimelines) {
        const timeline = deliveryTimelines[deliveryId];

        // Ordenar eventos por timestamp
        timeline.events.sort((a, b) => a.datetime - b.datetime);

        // Mapear eventos por status
        const eventMap = {};
        for (const event of timeline.events) {
            eventMap[event.status] = event.datetime;
        }

        let minutos_para_asignar = null;
        let minutos_para_pickup = null;
        let minutos_para_entregar = null;

        if (eventMap.pending && eventMap.pickup) {
            const diffMs = eventMap.pickup - eventMap.pending;
            minutos_para_asignar = Math.floor(diffMs / 60000);
        }

        if (eventMap.pickup && eventMap.pickup_complete) {
            const diffMs = eventMap.pickup_complete - eventMap.pickup;
            minutos_para_pickup = Math.floor(diffMs / 60000);
        }

        // if (eventMap.pickup_complete && eventMap.dropoff) {
        //   const diffMs = eventMap.dropoff - eventMap.pickup_complete;
        //   minutos_para_dropoff = Math.floor(diffMs / 60000);
        // }

        if (eventMap.dropoff && eventMap.delivered) {
            const diffMs = eventMap.delivered - eventMap.dropoff;
            minutos_para_entregar = Math.floor(diffMs / 60000);
        }

        results[deliveryId] = {
            delivery_id: deliveryId,
            minutos_para_asignar,
            minutos_para_pickup,
            // minutos_para_dropoff,
            minutos_para_entregar
        };
    }

    saveDelivery(results);

    return {
        data: results
    };
}

async function saveDelivery(data) {
    const client = await pool.connect();

    try {
        const sql = `
        INSERT INTO delivery_tiempos
            (id_delivery, minutos_para_asignar, minutos_para_pickup, minutos_para_entregar)
        VALUES ($1, $2, $3, $4)`;

        for (const [deliveryId, deliveryData] of Object.entries(data)) {
            const minutosAsignar = deliveryData.minutos_para_asignar ?? null;
            const minutosPickup = deliveryData.minutos_para_pickup ?? null;
            const minutosEntregar = deliveryData.minutos_para_entregar ?? null;

            await client.query(sql, [
                deliveryId,
                minutosAsignar,
                minutosPickup,
                minutosEntregar,
            ]);
        }
    } catch (err) {
        console.error('Error al guardar evento:', err.message);
    } finally {
        client.release();
    }
}

module.exports = {
  analyzeDeliveryEvents
};