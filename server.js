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

console.log('Server starting...');

wss.on('connection', (ws, req) => {
    console.log(`New WebSocket connection from ${req.socket.remoteAddress}`);
    
    if (req.url === '/esp') {
        espClient = ws;
        console.log('ESP32-CAM connected');

        ws.on('message', (message) => {
            console.log(`Received message from ESP32-CAM: ${message.length} bytes`);
            
            webClients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(message);
                    console.log('Sent message to web client');
                }
            });
        });

        ws.on('close', () => {
            console.log('ESP32-CAM disconnected');
            espClient = null;
        });

        ws.on('error', (error) => {
            console.error('Error with ESP32-CAM connection:', error);
        });

    } else if (req.url === '/web') {
        webClients.add(ws);
        console.log('Web client connected');

        ws.on('message', (message) => {
            console.log(`Received message from web client: ${message}`);
            
            if (espClient && espClient.readyState === WebSocket.OPEN) {
                espClient.send(message);
                console.log('Sent message to ESP32-CAM');
            } else {
                console.log('ESP32-CAM not connected, message not sent');
            }
        });

        ws.on('close', () => {
            console.log('Web client disconnected');
            webClients.delete(ws);
        });

        ws.on('error', (error) => {
            console.error('Error with web client connection:', error);
        });
    }
});

app.get('/', (req, res) => {
    res.send('Server is running');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`WebSocket server is ready`);
});

// Log active connections every 5 minutes
setInterval(() => {
    console.log(`Active connections - ESP32-CAM: ${espClient ? 'Connected' : 'Disconnected'}, Web Clients: ${webClients.size}`);
}, 300000);

// Handle server errors
server.on('error', (error) => {
    console.error('Server error:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});