import express from 'express';
import Scrim from '../models/Scrim.js';
import { auth, managerOnly } from '../middleware/auth.js';
import { tierAtLeast } from '../deviceVerification.js';

const router = express.Router();

// Emit a NON-SECRET refresh signal. Clients re-fetch through authenticated,
// access-controlled endpoints — credentials are never pushed in the broadcast.
function notifyScrimsChanged(req, scrimId) {
    const io = req.app.get('io');
    if (io) io.emit('scrims_updated', { id: scrimId ? String(scrimId) : null });
}

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
        notifyScrimsChanged(req, scrim._id);

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

        notifyScrimsChanged(req, scrim._id);
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

        scrim.roomCredentials = { roomId: String(roomId ?? ''), password: String(password ?? '') };
        await scrim.save();

        // Signal clients to re-check; the credentials themselves are fetched via
        // the access-controlled /credentials endpoint, not broadcast here.
        notifyScrimsChanged(req, scrim._id);
        res.status(200).json({ message: 'Credentials pushed' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Determine whether the requesting (non-manager) user is allowed to see this scrim.
function userCanAccessScrim(user, scrim) {
    const userTeams = [user.squadAssignment, user.duoAssignment]
        .filter(Boolean)
        .map(String);

    const isParticipant = scrim.participants.some(p => String(p) === String(user._id));
    const isTeamMember = scrim.teams.some(t => userTeams.includes(String(t)));
    return isParticipant || isTeamMember;
}

function earliestReleaseTime(scrim) {
    const times = (scrim.releaseSchedule || [])
        .map(r => r.releaseTime)
        .filter(Boolean)
        .map(t => new Date(t).getTime());
    return times.length ? Math.min(...times) : Infinity;
}

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

// Server-authoritative credential release. Credentials are returned ONLY when:
//   1. the requester is a participant / team member of the scrim, AND
//   2. the scheduled release time has passed, AND
//   3. (for players) the device trust score is 100.
// This replaces the previous client-side-only gate, which could be bypassed by
// editing the React state.
router.get('/credentials/:id', auth, async (req, res) => {
    try {
        const scrim = await Scrim.findById(req.params.id);
        if (!scrim || !scrim.isActive) return res.status(404).json({ error: 'Scrim not found' });

        if (req.user.role !== 'MANAGER') {
            if (!userCanAccessScrim(req.user, scrim)) {
                return res.status(403).json({ error: 'You are not assigned to this scrim' });
            }
            if (Date.now() < earliestReleaseTime(scrim)) {
                return res.status(403).json({ error: 'LOCKED', message: 'Credentials are not released yet.' });
            }
            if ((req.user.trustScore ?? 0) < 100) {
                return res.status(403).json({ error: 'INTEGRITY_BLOCK', message: 'Resolve device integrity flags to unlock credentials.' });
            }

            // Device-verification tier gate. This is the enforceable defense against
            // TestFlight/sideloaded cheat builds: a prize scrim can require a
            // MANAGED (MDM-supervised) device whose game is verified App Store.
            const required = scrim.minVerificationTier || 'ATTESTED';
            const actual = req.user.deviceVerification?.tier || 'UNVERIFIED';
            if (!tierAtLeast(actual, required)) {
                return res.status(403).json({
                    error: 'VERIFICATION_TIER_TOO_LOW',
                    message: required === 'MANAGED'
                        ? 'This match requires an MDM-managed device with a verified App Store game install.'
                        : 'Verify your device (App Attest) from the official App Store build to unlock credentials.',
                    requiredTier: required,
                    actualTier: actual,
                });
            }
        }

        const { roomId, password } = scrim.roomCredentials || {};
        if (!roomId && !password) {
            return res.status(409).json({ error: 'PENDING', message: 'Credentials have not been pushed yet.' });
        }

        res.status(200).json({ roomId, password });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/end/:id', auth, managerOnly, async (req, res) => {
    try {
        const { id } = req.params;
        await Scrim.findByIdAndDelete(id);
        notifyScrimsChanged(req, id);
        res.status(200).json({ message: 'Scrim ended and deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
