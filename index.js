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
const enviaWebhook = require('./routes/webhooks/envia');
app.use('/webhooks/uber-direct', uberDirectWebhook);
app.use('/webhooks/envia', enviaWebhook);

const PORT = 5002;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});
