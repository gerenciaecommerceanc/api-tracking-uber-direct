const express = require('express');
const bodyParser = require('body-parser');
const app = express();

app.use(express.json());
app.use(bodyParser.json());

// Rutas de api
const pickup = require('./routes/api/pickup');
app.use('/api', pickup);

// Rutas de webhook
const uberDirectWebhook = require('./routes/webhooks/uber-direct');
app.use('/webhooks/uber-direct', uberDirectWebhook);

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});