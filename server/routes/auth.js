import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import InviteCode from '../models/InviteCode.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'nexus_super_secret_key_2024';

// [Player Client] 1. Device Registration / Sign Up
router.post('/register-device', async (req, res) => {
    try {
        const { username, password, inviteCode, deviceInfo } = req.body;
        
        if (!username || !password || !inviteCode) {
            return res.status(400).json({ error: 'Username, password, and invite code are required' });
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
        const hwId = deviceInfo?.hardwareId || 'unknown_hwid';

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
                deviceModel: deviceInfo?.deviceModel || 'Unknown',
                platform: deviceInfo?.platform || 'web',
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

        const token = jwt.sign({ id: user._id, username: user.username, role: user.role, sessionId }, JWT_SECRET, { expiresIn: '30d' });

        res.status(201).json({ 
            message: 'Registration successful', 
            token, 
            user: { id: user._id, username: user.username, role: user.role, trustScore: user.trustScore, sessionId } 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// [Player Client] 2. Player Login
router.post('/player-login', async (req, res) => {
    try {
        const { username, password, deviceInfo } = req.body;
        
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
        const hwId = deviceInfo?.hardwareId || 'unknown_hwid';

        // Mark previous devices as not current
        user.deviceHistory.forEach(d => {
            d.isCurrentDevice = false;
            if (!d.logoutAt) d.logoutAt = new Date();
        });

        user.deviceHistory.push({
            hardwareId: hwId,
            deviceModel: deviceInfo?.deviceModel || 'Unknown',
            platform: deviceInfo?.platform || 'web',
            loginAt: new Date(),
            ipAddress: req.ip,
            isCurrentDevice: true
        });

        user.hardwareId = hwId; // Update current hardware ID
        user.activeSessionId = sessionId;
        await user.save();

        const token = jwt.sign({ id: user._id, username: user.username, role: user.role, sessionId }, JWT_SECRET, { expiresIn: '30d' });

        res.status(200).json({ 
            message: 'Login successful', 
            token, 
            user: { id: user._id, username: user.username, role: user.role, trustScore: user.trustScore, sessionId } 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// [Manager Client] 3. Manager Login
router.post('/manager-login', async (req, res) => {
    try {
        const { username, password } = req.body;
        // Mocking authentication for the prototype phase
        if (username === 'admin' && password === 'admin') {
            const sessionId = crypto.randomUUID();
            const token = jwt.sign({ role: 'MANAGER', sessionId }, JWT_SECRET, { expiresIn: '1d' });
            return res.status(200).json({ message: 'Manager verified', token });
        }
        res.status(401).json({ error: 'Invalid Manager Credentials' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
