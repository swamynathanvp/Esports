import express from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import User from '../models/User.js';
import InviteCode from '../models/InviteCode.js';
import { signToken, asString, rateLimit } from '../securityKit.js';

const router = express.Router();

// Brute-force / credential-stuffing protection on every credential-accepting route.
const authLimiter = rateLimit({ windowMs: 15 * 60_000, max: 20, bucket: 'auth' });

const MIN_PASSWORD_LENGTH = 8;

// [Player Client] 1. Device Registration / Sign Up
router.post('/register-device', authLimiter, async (req, res) => {
    try {
        const username = asString(req.body?.username, { max: 64 });
        const password = asString(req.body?.password, { max: 200 });
        const inviteCode = asString(req.body?.inviteCode, { max: 64 });
        const deviceInfo = req.body?.deviceInfo;

        if (!username || !password || !inviteCode) {
            return res.status(400).json({ error: 'Username, password, and invite code are required' });
        }
        if (password.length < MIN_PASSWORD_LENGTH) {
            return res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` });
        }

        const codeDoc = await InviteCode.findOne({ code: inviteCode, isActive: true });
        if (!codeDoc) {
            return res.status(400).json({ error: 'Invalid or expired invite code' });
        }
        if (codeDoc.expiresAt < new Date()) {
            return res.status(400).json({ error: 'Invite code has expired' });
        }

        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ error: 'Username already taken' });
        }

        let role = 'INVITED';
        if (codeDoc.type === 'CLAN') role = 'RECRUIT';
        if (codeDoc.type === 'OFFICIAL') role = 'OFFICIAL';

        const sessionId = crypto.randomUUID();
        const hwId = asString(deviceInfo?.hardwareId, { max: 128 }) || 'unknown_hwid';

        const user = new User({
            username,
            password, // Will be hashed by pre-save hook
            role,
            trustScore: 100,
            hardwareId: hwId,
            inviteCode: codeDoc.code,
            activeSessionId: sessionId,
            deviceHistory: [{
                hardwareId: hwId,
                deviceModel: asString(deviceInfo?.deviceModel, { max: 128 }) || 'Unknown',
                platform: asString(deviceInfo?.platform, { max: 32 }) || 'web',
                loginAt: new Date(),
                ipAddress: req.ip,
                isCurrentDevice: true
            }]
        });

        await user.save();

        codeDoc.usedBy = user._id;
        codeDoc.usedByUsername = user.username;
        codeDoc.isActive = false;
        await codeDoc.save();

        const token = signToken({ id: user._id, username: user.username, role: user.role, sessionId }, { expiresIn: '30d' });

        res.status(201).json({
            message: 'Registration successful',
            token,
            user: { id: user._id, username: user.username, role: user.role, trustScore: user.trustScore, sessionId }
        });
    } catch (error) {
        console.error('[register-device]', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// [Player Client] 2. Player Login
router.post('/player-login', authLimiter, async (req, res) => {
    try {
        const username = asString(req.body?.username, { max: 64 });
        const password = asString(req.body?.password, { max: 200 });
        const deviceInfo = req.body?.deviceInfo;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const sessionId = crypto.randomUUID();
        const hwId = asString(deviceInfo?.hardwareId, { max: 128 }) || 'unknown_hwid';

        // Mark previous devices as not current
        user.deviceHistory.forEach(d => {
            d.isCurrentDevice = false;
            if (!d.logoutAt) d.logoutAt = new Date();
        });

        user.deviceHistory.push({
            hardwareId: hwId,
            deviceModel: asString(deviceInfo?.deviceModel, { max: 128 }) || 'Unknown',
            platform: asString(deviceInfo?.platform, { max: 32 }) || 'web',
            loginAt: new Date(),
            ipAddress: req.ip,
            isCurrentDevice: true
        });

        user.hardwareId = hwId; // Update current hardware ID
        user.activeSessionId = sessionId;
        await user.save();

        const token = signToken({ id: user._id, username: user.username, role: user.role, sessionId }, { expiresIn: '30d' });

        res.status(200).json({
            message: 'Login successful',
            token,
            user: { id: user._id, username: user.username, role: user.role, trustScore: user.trustScore, sessionId }
        });
    } catch (error) {
        console.error('[player-login]', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// [Manager Client] 3. Manager Login — credentials come from the environment.
// Set MANAGER_USERNAME and MANAGER_PASSWORD_HASH (a bcrypt hash) in server/.env.
const MANAGER_USERNAME = process.env.MANAGER_USERNAME || 'admin';
const MANAGER_PASSWORD_HASH = process.env.MANAGER_PASSWORD_HASH || '';

if (!MANAGER_PASSWORD_HASH && process.env.NODE_ENV !== 'production') {
    console.warn('[SECURITY WARNING] MANAGER_PASSWORD_HASH not set — falling back to dev password "admin". Set a bcrypt hash in server/.env.');
}

router.post('/manager-login', authLimiter, async (req, res) => {
    try {
        const username = asString(req.body?.username, { max: 64 });
        const password = asString(req.body?.password, { max: 200 });

        if (!username || !password) {
            return res.status(401).json({ error: 'Invalid Manager Credentials' });
        }

        const userMatches = username === MANAGER_USERNAME;
        const passwordMatches = MANAGER_PASSWORD_HASH
            ? await bcrypt.compare(password, MANAGER_PASSWORD_HASH)
            : (process.env.NODE_ENV !== 'production' && password === 'admin'); // dev-only fallback

        if (userMatches && passwordMatches) {
            const sessionId = crypto.randomUUID();
            const token = signToken({ role: 'MANAGER', sessionId }, { expiresIn: '1d' });
            return res.status(200).json({ message: 'Manager verified', token });
        }

        res.status(401).json({ error: 'Invalid Manager Credentials' });
    } catch (error) {
        console.error('[manager-login]', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

export default router;
