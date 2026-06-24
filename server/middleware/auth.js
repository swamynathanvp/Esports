import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'nexus_super_secret_key_2024';

export const auth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        
        if (decoded.role === 'MANAGER') {
            req.user = decoded;
            return next();
        }

        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        if (user.activeSessionId !== decoded.sessionId) {
            return res.status(401).json({ 
                error: 'SESSION_EXPIRED', 
                message: 'Your session was terminated because your account was accessed from another device.' 
            });
        }

        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'SESSION_EXPIRED', message: 'Session expired. Please log in again.' });
        }
        res.status(401).json({ error: 'Invalid token' });
    }
};

export const managerOnly = (req, res, next) => {
    if (req.user && req.user.role === 'MANAGER') {
        next();
    } else {
        res.status(403).json({ error: 'Manager access required' });
    }
};
