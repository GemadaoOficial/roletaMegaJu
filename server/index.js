import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 5001;

// Middleware
app.use(cors());
app.use(express.json());

// Data file path
const dataFilePath = path.join(__dirname, 'data.json');
const spinFilePath = path.join(__dirname, 'spin_command.json');

// Default data
const DEFAULT_DATA = {
    prizes: [
        { id: '1', text: '5% OFF', color: '#FF5733', probability: 10 },
        { id: '2', text: 'Frete Grátis', color: '#33FF57', probability: 10 },
        { id: '3', text: 'Brinde Surpresa', color: '#3357FF', probability: 5 },
        { id: '4', text: '10% OFF', color: '#FF33A1', probability: 10 },
        { id: '5', text: 'Tente Novamente', color: '#A133FF', probability: 60 },
        { id: '6', text: 'R$ 10,00', color: '#33FFF5', probability: 5 }
    ],
    config: {
        spinDuration: 5,
        winnerMessage: 'Parabéns! Você ganhou:',
        theme: 'cyberpunk',
        blockedIds: ['1', '5'],
        vipMode: false
    },
    isVisible: false,
    lastUpdated: Date.now()
};

// Initialize data file if it doesn't exist
if (!fs.existsSync(dataFilePath)) {
    fs.writeFileSync(dataFilePath, JSON.stringify(DEFAULT_DATA, null, 2));
}

// GET: Return current state
app.get('/api/sync', (req, res) => {
    try {
        const data = JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));
        res.json(data);
    } catch (error) {
        console.error('Error reading data:', error);
        res.status(500).json({ error: 'Failed to read data' });
    }
});

// POST: Update state
app.post('/api/sync', (req, res) => {
    try {
        const updates = req.body;
        const currentData = JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));

        // Update fields if provided
        if (updates.prizes) currentData.prizes = updates.prizes;
        if (updates.config) currentData.config = updates.config;
        if (updates.isVisible !== undefined) currentData.isVisible = updates.isVisible;

        // Update timestamp
        currentData.lastUpdated = Date.now();

        // Save to file
        fs.writeFileSync(dataFilePath, JSON.stringify(currentData, null, 2));
        res.json({ success: true, data: currentData });
    } catch (error) {
        console.error('Error updating data:', error);
        res.status(500).json({ error: 'Failed to update data' });
    }
});

// POST: Trigger a spin command
app.post('/api/spin', (req, res) => {
    try {
        const spinData = {
            command: 'SPIN',
            timestamp: Date.now() / 1000, // Convert to seconds for compatibility
            winnerIndex: req.body.winnerIndex || -1
        };

        fs.writeFileSync(spinFilePath, JSON.stringify(spinData, null, 2));
        res.json({ success: true, data: spinData });
    } catch (error) {
        console.error('Error triggering spin:', error);
        res.status(500).json({ error: 'Failed to trigger spin' });
    }
});

// GET: Check for spin command (polling)
app.get('/api/spin', (req, res) => {
    try {
        if (fs.existsSync(spinFilePath)) {
            const spinData = JSON.parse(fs.readFileSync(spinFilePath, 'utf8'));

            // Check if command is recent (within last 2 seconds)
            const now = Date.now() / 1000;
            if (spinData.timestamp && (now - spinData.timestamp) < 2) {
                res.json({ hasCommand: true, data: spinData });
            } else {
                res.json({ hasCommand: false });
            }
        } else {
            res.json({ hasCommand: false });
        }
    } catch (error) {
        console.error('Error checking spin command:', error);
        res.json({ hasCommand: false });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 API Server running on http://localhost:${PORT}`);
    console.log(`📡 Accepting connections from network`);
});
