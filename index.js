const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let espClient = null;
let webClients = new Set();

wss.on('connection', (ws, req) => {
    if (req.url === '/esp') {
        espClient = ws;
        console.log('ESP32 connected');

        ws.on('message', (message) => {
            webClients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(message);
                }
            });
        });

        ws.on('close', () => {
            console.log('ESP32 disconnected');
            espClient = null;
        });
    } else if (req.url === '/web') {
        webClients.add(ws);
        console.log('Web client connected');

        ws.on('message', (message) => {
            if (espClient && espClient.readyState === WebSocket.OPEN) {
                espClient.send(message);
            }
        });

        ws.on('close', () => {
            console.log('Web client disconnected');
            webClients.delete(ws);
        });
    }
});

app.get('/', (req, res) => {
    res.send('Server is running');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));