import 'dotenv/config';
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
import { authenticateSocketToken } from './middleware/auth.js';
import { securityHeaders, buildCorsOptions, ALLOWED_ORIGINS } from './securityKit.js';
import { computeTrustScore as scoreOf } from './trustScore.js';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: ALLOWED_ORIGINS,
        methods: ["GET", "POST"]
    }
});

app.set('trust proxy', 1); // so req.ip reflects the real client behind a proxy/load balancer
app.use(securityHeaders);
app.use(cors(buildCorsOptions()));
app.use(express.json({ limit: '64kb' })); // cap body size to blunt payload-based DoS

// Make io accessible in routes
app.set('io', io);

app.use('/api/auth', authRoutes);
app.use('/api/scrims', scrimRoutes);
app.use('/api/users', userRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/invites', inviteRoutes);

// Actual MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/esports-nexus';
mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 })
    .then(() => console.log('[✓] MongoDB Connected to esports-nexus (Ready for Players)'))
    .catch(err => {
        console.error('\n==== CRITICAL DATABASE ERROR ====');
        console.error('The Node.js server could not connect to MongoDB on port 27017.');
        console.error('If you are trying to register new player devices, IT WILL FAIL.');
        console.error('Please ensure the MongoDB service is running automatically.\n=================================\n');
    });

io.on('connection', (socket) => {
    console.log(`[+] Client Connected: ${socket.id}`);

    // The socket is untrusted until it presents a valid JWT. We never trust
    // client-supplied username/role/hardwareId — those are derived from the token.
    socket.data.authed = false;

    socket.on('authenticate', async (data) => {
        try {
            const token = data?.token;
            if (!token) {
                socket.emit('auth_error', { message: 'Authentication token required.' });
                return socket.disconnect();
            }

            const { user, decoded } = await authenticateSocketToken(token);

            socket.data.authed = true;
            socket.data.isManager = decoded.role === 'MANAGER';
            socket.data.userId = user ? user._id.toString() : null;
            socket.data.hardwareId = user ? user.hardwareId : null; // server-trusted, from DB
            socket.data.role = decoded.role;
            socket.data.username = user ? user.username : 'manager';

            // Each user joins a private room so we can target messages to exactly them.
            if (user) socket.join(`user:${user._id}`);

            console.log(`[Auth] Socket ${socket.id} authenticated as ${socket.data.username} (${socket.data.role})`);
            socket.emit('auth_success', { message: 'Secure WebSocket channel established.' });
        } catch (error) {
            const message = error.message === 'SESSION_EXPIRED'
                ? 'Session expired. Account accessed from another device.'
                : 'Authentication failed.';
            socket.emit('auth_error', { message });
            socket.disconnect();
        }
    });

    // Continuous diagnostics heartbeat — only accepted from an authenticated player
    // socket, and ALWAYS applied to that socket's own user. A client can no longer
    // target another player's record or spoof its identity.
    socket.on('integrity_heartbeat', async (diagnostics) => {
        if (!socket.data.authed || !socket.data.userId) return; // ignore unauthenticated/manager
        if (!diagnostics || typeof diagnostics !== 'object') return;

        try {
            const user = await User.findById(socket.data.userId);
            if (!user) return;

            user.securityDiagnostics = {
                ...(user.securityDiagnostics?.toObject?.() ?? user.securityDiagnostics),
                ...sanitizeDiagnostics(diagnostics),
                lastHeartbeat: new Date()
            };

            // Trust scoring is computed server-side from the (untrusted) signals.
            // NOTE: client-reported signals are HINTS only. Authoritative integrity
            // must come from Apple App Attest verification (see SECURITY.md).
            user.trustScore = scoreOf(user.securityDiagnostics);
            await user.save();
        } catch (error) {
            console.error('[Heartbeat Error]', error);
        }
    });

    socket.on('disconnect', () => {
        console.log(`[-] Client Disconnected: ${socket.id}`);
    });
});

// Only persist the known boolean diagnostic fields; never let a client write
// arbitrary keys into the document.
const DIAGNOSTIC_KEYS = [
    'isRooted', 'isSideloaded', 'isVpnActive', 'isDevModeActive', 'hasCheatTools',
    'hasVirtualSpace', 'hasAccessibilityAbuse', 'hasScreenCapture', 'isEmulator',
    'isClockTampered', 'isBgmiModified', 'hasOverlayApps'
];

function sanitizeDiagnostics(input) {
    const out = {};
    for (const key of DIAGNOSTIC_KEYS) {
        out[key] = input[key] === true; // coerce to strict boolean
    }
    return out;
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Nexus Command Server running on http://localhost:${PORT}`);
});
