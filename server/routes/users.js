import express from 'express';
import User from '../models/User.js';
import Team from '../models/Team.js';
import { auth, managerOnly } from '../middleware/auth.js';

const router = express.Router();

// Apply auth and managerOnly middleware to all routes in this file
router.use(auth, managerOnly);

router.get('/all', async (req, res) => {
    try {
        const users = await User.find({ role: { $ne: 'MANAGER' } })
            .select('-password') // Don't exclude activeSessionId so we can show online status
            .populate('squadAssignment', 'name teamStatus')
            .populate('duoAssignment', 'name teamStatus');
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/device-history/:userId', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user) return res.status(404).json({ error: 'User not found' });
        
        // Sort device history descending by loginAt
        const history = [...user.deviceHistory].sort((a, b) => b.loginAt - a.loginAt);
        res.json(history);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/promote', async (req, res) => {
    try {
        const { userId, newRole } = req.body;
        const validRoles = ['OFFICIAL', 'RECRUIT', 'INVITED'];
        if (!validRoles.includes(newRole)) {
            return res.status(400).json({ error: 'Invalid role' });
        }
        
        const user = await User.findByIdAndUpdate(
            userId, 
            { role: newRole },
            { new: true }
        ).select('-password');
        
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/remove', async (req, res) => {
    try {
        const { userId } = req.body;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });
        
        // Remove from teams
        if (user.squadAssignment) {
            await Team.findByIdAndUpdate(user.squadAssignment, { $pull: { members: user._id } });
        }
        if (user.duoAssignment) {
            await Team.findByIdAndUpdate(user.duoAssignment, { $pull: { members: user._id } });
        }
        
        await User.findByIdAndDelete(userId);
        res.json({ message: 'User removed successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/integrity', async (req, res) => {
    try {
        const users = await User.find({ role: { $ne: 'MANAGER' } })
            .select('username role trustScore securityDiagnostics activeSessionId')
            .sort({ trustScore: 1 }); // Worst scores first
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
