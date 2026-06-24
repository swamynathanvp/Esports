import express from 'express';
import Team from '../models/Team.js';
import User from '../models/User.js';
import { auth, managerOnly } from '../middleware/auth.js';

const router = express.Router();
router.use(auth, managerOnly);

router.get('/all', async (req, res) => {
    try {
        const teams = await Team.find().populate('members', 'username role trustScore hardwareId');
        res.json(teams);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/create', async (req, res) => {
    try {
        const { name, type, teamStatus } = req.body;
        const newTeam = new Team({ name, type, teamStatus });
        await newTeam.save();
        res.status(201).json(newTeam);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/add-member', async (req, res) => {
    try {
        const { teamId, userId } = req.body;
        const team = await Team.findById(teamId);
        if (!team) return res.status(404).json({ error: 'Team not found' });

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        if (!team.members.some(id => id.toString() === userId)) {
            team.members.push(userId);
            await team.save();
        }

        if (team.type === 'SQUAD') {
            user.squadAssignment = team._id;
        } else {
            user.duoAssignment = team._id;
        }
        await user.save();

        const updatedTeam = await Team.findById(teamId).populate('members', 'username role trustScore hardwareId');
        res.json(updatedTeam);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/remove-member', async (req, res) => {
    try {
        const { teamId, userId } = req.body;
        const team = await Team.findById(teamId);
        if (!team) return res.status(404).json({ error: 'Team not found' });

        team.members = team.members.filter(id => id.toString() !== userId);
        await team.save();

        const user = await User.findById(userId);
        if (user) {
            if (team.type === 'SQUAD' && user.squadAssignment?.toString() === teamId) {
                user.squadAssignment = null;
            } else if (team.type === 'DUO' && user.duoAssignment?.toString() === teamId) {
                user.duoAssignment = null;
            }
            await user.save();
        }

        const updatedTeam = await Team.findById(teamId).populate('members', 'username role trustScore hardwareId');
        res.json(updatedTeam);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
