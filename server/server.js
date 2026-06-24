import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import scrimRoutes from './routes/scrims.js';
import userRoutes from './routes/users.js';
import teamRoutes from './routes/teams.js';
import inviteRoutes from './routes/invites.js';
import User from './models/User.js';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow Vite local dev requests
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());

// Make io accessible in routes
app.set('io', io);

app.use('/api/auth', authRoutes);
app.use('/api/scrims', scrimRoutes);
app.use('/api/users', userRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/invites', inviteRoutes);

// In-Memory map to track WebSocket connections
const connectedClients = new Map();

// Actual MongoDB Connection
mongoose.connect('mongodb://localhost:27017/esports-nexus', { serverSelectionTimeoutMS: 5000 })
    .then(() => console.log('[\u2713] MongoDB Connected to esports-nexus (Ready for Players)'))
    .catch(err => {
        console.error('\n==== CRITICAL DATABASE ERROR ====');
        console.error('The Node.js server could not connect to MongoDB on port 27017.');
        console.error('If you are trying to register new player devices, IT WILL FAIL.');
        console.error('Please ensure the MongoDB service is running automatically.\n=================================\n');
    });

io.on('connection', (socket) => {
    console.log(`[+] Client Connected: ${socket.id}`);

    // Authenticate the socket and check session validity
    socket.on('authenticate', async (data) => {
        const { hardwareId, role, username, sessionId } = data;
        
        try {
            // Validate the session exists and matches
            if (username && sessionId) {
                const user = await User.findOne({ username });
                if (user && user.activeSessionId !== sessionId) {
                    socket.emit('auth_error', { message: 'Session expired. Account accessed from another device.' });
                    return socket.disconnect();
                }
            }
            
            connectedClients.set(socket.id, { hardwareId, role, username });
            console.log(`[Auth] HardwareID: ${hardwareId} identified as ${role || 'UNKNOWN'}`);

            socket.emit('auth_success', { message: 'Secure WebSocket channel established.' });
        } catch (error) {
            console.error('[Auth Error]', error);
        }
    });

    // Handle the continuous diagnostics heartbeat
    socket.on('integrity_heartbeat', async (diagnostics) => {
        const clientInfo = connectedClients.get(socket.id);
        if (!clientInfo || !clientInfo.hardwareId) return;

        console.log(`[Heartbeat] ${clientInfo.hardwareId}:`, diagnostics);
        
        try {
            // Find user by hardwareId (for current active session)
            const user = await User.findOne({ hardwareId: clientInfo.hardwareId });
            if (user) {
                user.securityDiagnostics = {
                    ...user.securityDiagnostics,
                    ...diagnostics,
                    lastHeartbeat: new Date()
                };

                // Calculate Trust Score based on 12-layer research
                let score = 100;
                if (diagnostics.isBgmiModified || diagnostics.hasCheatTools) score = 0; // Instant ban
                else {
                    if (diagnostics.isRooted) score -= 50;
                    if (diagnostics.hasVirtualSpace) score -= 80;
                    if (diagnostics.isEmulator) score -= 60;
                    if (diagnostics.isSideloaded) score -= 40;
                    if (diagnostics.hasAccessibilityAbuse) score -= 40;
                    if (diagnostics.isClockTampered) score -= 30;
                    if (diagnostics.hasOverlayApps) score -= 30;
                    if (diagnostics.hasScreenCapture) score -= 25;
                    if (diagnostics.isDevModeActive) score -= 20;
                    if (diagnostics.isVpnActive) score -= 15;
                }
                
                user.trustScore = Math.max(0, score);
                await user.save();
            }
        } catch (error) {
            console.error('[Heartbeat Error]', error);
        }
    });

    socket.on('disconnect', () => {
        console.log(`[-] Client Disconnected: ${socket.id}`);
        connectedClients.delete(socket.id);
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Nexus Command Server running on http://localhost:${PORT}`);
});
