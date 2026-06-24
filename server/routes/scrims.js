import express from 'express';
import Scrim from '../models/Scrim.js';
import { auth, managerOnly } from '../middleware/auth.js';

const router = express.Router();

router.post('/create', auth, managerOnly, async (req, res) => {
    try {
        const { title, game, releaseSchedule, participants, teams } = req.body;

        const scrim = new Scrim({
            title,
            game,
            roomCredentials: { roomId: '', password: '' },
            releaseSchedule,
            participants: participants || [],
            teams: teams || []
        });

        await scrim.save();

        const io = req.app.get('io');
        if (io) {
            io.emit('scrim_created', scrim);
        }

        res.status(201).json({ message: 'Scrim created', scrim });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/update/:id', auth, managerOnly, async (req, res) => {
    try {
        const { id } = req.params;
        const { title, participants, teams } = req.body;

        const scrim = await Scrim.findByIdAndUpdate(
            id,
            { title, participants, teams },
            { new: true }
        );

        if (!scrim) return res.status(404).json({ error: 'Scrim not found' });

        const io = req.app.get('io');
        if (io) {
            // Re-emit created to refresh client lists
            io.emit('scrim_created', scrim);
        }

        res.status(200).json(scrim);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/push/:id', auth, managerOnly, async (req, res) => {
    try {
        const { id } = req.params;
        const { roomId, password } = req.body;

        const scrim = await Scrim.findById(id);
        
        if (!scrim) return res.status(404).json({ error: 'Scrim not found' });

        scrim.roomCredentials = { roomId, password };
        await scrim.save();

        const io = req.app.get('io');
        if (io) {
            // Emitting the event that clients are listening for to fetch updated info/credentials
            io.emit('scrim_created', scrim);
        }

        res.status(200).json({ message: 'Credentials pushed manually' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/upcoming', auth, async (req, res) => {
    try {
        let query = { isActive: true };

        if (req.user.role !== 'MANAGER') {
            const userTeams = [];
            if (req.user.squadAssignment) userTeams.push(req.user.squadAssignment);
            if (req.user.duoAssignment) userTeams.push(req.user.duoAssignment);

            query.$or = [
                { participants: req.user._id },
                { teams: { $in: userTeams } }
            ];
        }

        const scrims = await Scrim.find(query)
            .select('-roomCredentials.roomId -roomCredentials.password');

        res.status(200).json(scrims);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/end/:id', auth, managerOnly, async (req, res) => {
    try {
        const { id } = req.params;
        await Scrim.findByIdAndDelete(id);
        res.status(200).json({ message: 'Scrim ended and deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
