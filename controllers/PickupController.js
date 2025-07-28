const fs = require('fs');
const path = require('path');
const pool = require('../db/connection');

function readLines(filePath, source) {
    if (!fs.existsSync(filePath)) {
        console.warn(`Archivo de log no encontrado: ${filePath}`);
        return [];
    }

    const content = fs.readFileSync(filePath, 'utf8');
    if (!content || content.trim().length === 0) {
        console.warn(`El archivo ${filePath} está vacío.`);
        return [];
    }

    const lines = content.split(/\r?\n/).filter(Boolean);
    const results = [];

    for (const line of lines) {
        try {
            const parsed = JSON.parse(line.trim());

            // Para eventos de Uber, validar que tenga delivery_id
            if (source === 'uber') {
                const delivery_id = parsed?.data?.id;
                if (!delivery_id) continue;
                parsed.delivery_id = delivery_id;
            }

            parsed.source = source;
            results.push(parsed);
        } catch (err) {
            // línea inválida, se ignora
        }
    }

    return results;
}

function analyzeDeliveryEvents() {
    try {
        const enviaPath = path.join(__dirname, '..', 'logs', 'envia.log');
        const deliveriesPath = path.join(__dirname, '..', 'logs', 'deliveries.log');

        const enviaEvents = readLines(enviaPath, 'envia');
        const uberEvents = readLines(deliveriesPath, 'uber');

        const allEvents = [...enviaEvents, ...uberEvents];

        return processDeliveryData(allEvents);

    } catch (err) {
        console.error('Error en saveDelivery:', err);
        return {
            error: true,
            data: []
        };
    }
}

function processDeliveryData(logData) {
    const deliveryTimelinesUber = {};
    const deliveryTimelinesEnvia = {};
    const results = {};

    // Agrupar eventos por delivery_id
    for (const entry of logData) {
        
        if (entry.source == "uber") {
            const deliveryId = entry.delivery_id;
            const timestamp = entry.created;
            const status = entry.status || 'unknown';

            if (!deliveryTimelinesUber[deliveryId]) {
                deliveryTimelinesUber[deliveryId] = {
                    events: []
                };
            }

            deliveryTimelinesUber[deliveryId].events.push({
                datetime: new Date(timestamp),
                status
            });

        } else if ( entry.source == "envia") {
            const deliveryId = entry.data.trackingNumber;
            const timestamp = entry.timestamp;
            const status = entry.data.status.toLowerCase() || 'unknown';

            if (!deliveryTimelinesEnvia[deliveryId]) {
                deliveryTimelinesEnvia[deliveryId] = {
                    events: []
                };
            }

            deliveryTimelinesEnvia[deliveryId].events.push({
                datetime: new Date(timestamp),
                status
            });
        }
        
    }

    // Procesar tiempos de uber
    for (const deliveryId in deliveryTimelinesUber) {
        const timeline = deliveryTimelinesUber[deliveryId];

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

        if (eventMap.dropoff && eventMap.delivered) {
            const diffMs = eventMap.delivered - eventMap.dropoff;
            minutos_para_entregar = Math.floor(diffMs / 60000);
        }

        results[deliveryId] = {
            delivery_id: deliveryId,
            minutos_para_asignar,
            minutos_para_pickup,
            minutos_para_entregar,
            fecha_hora_creacion: eventMap.pending ?? null
        };
    }

    // Procesar tiempos de envia
    for (const deliveryId in deliveryTimelinesEnvia) {
        const timeline = deliveryTimelinesEnvia[deliveryId];

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

        if (eventMap.created && eventMap.shipped) {
            const diffMs = eventMap.shipped - eventMap.created;
            minutos_para_pickup = Math.floor(diffMs / 60000);
        }

        if (eventMap.shipped && eventMap.delivered) {
            const diffMs = eventMap.delivered - eventMap.shipped;
            minutos_para_entregar = Math.floor(diffMs / 60000);
        }

        results[deliveryId] = {
            delivery_id: deliveryId,
            minutos_para_asignar,
            minutos_para_pickup,
            minutos_para_entregar,
            fecha_hora_creacion: eventMap.created ?? null
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
            (id_delivery, minutos_para_asignar, minutos_para_pickup, minutos_para_entregar, fecha_hora_creacion)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id_delivery) DO UPDATE
        SET minutos_para_asignar = EXCLUDED.minutos_para_asignar,
            minutos_para_pickup = EXCLUDED.minutos_para_pickup,
            minutos_para_entregar = EXCLUDED.minutos_para_entregar,
            fecha_hora_creacion = EXCLUDED.fecha_hora_creacion
        `;

        for (const [deliveryId, deliveryData] of Object.entries(data)) {
            const minutosAsignar = deliveryData.minutos_para_asignar ?? null;
            const minutosPickup = deliveryData.minutos_para_pickup ?? null;
            const minutosEntregar = deliveryData.minutos_para_entregar ?? null;
            const fecha_hora_creacion = deliveryData.fecha_hora_creacion ?? null;

            await client.query(sql, [
                deliveryId,
                minutosAsignar,
                minutosPickup,
                minutosEntregar,
                fecha_hora_creacion,
            ]);
        }
    } catch (err) {
        console.error('Error al guardar evento:', err.message);
    } finally {
        client.release();
    }
}

async function getAllDeliveryTimes() {
    const client = await pool.connect();
    try {
        const sql = `
            SELECT id_delivery, minutos_para_asignar, minutos_para_pickup, minutos_para_entregar, fecha_hora_creacion
            FROM delivery_tiempos
        `;

        const res = await client.query(sql);

        // Crear un mapa indexado por id_delivery
        const map = {};

        for (const row of res.rows) {
            map[row.id_delivery] = {
                minutos_para_asignar: row.minutos_para_asignar,
                minutos_para_pickup: row.minutos_para_pickup,
                minutos_para_entregar: row.minutos_para_entregar,
            };
        }

        return map;

    } catch (err) {
        console.error('Error al obtener datos de delivery_tiempos:', err.message);
        return {
            error: true,
            data: []
        };
    } finally {
        client.release();
    }
}

module.exports = {
  analyzeDeliveryEvents,
  getAllDeliveryTimes
};