import express from 'express';
import crypto from 'crypto';
import InviteCode from '../models/InviteCode.js';
import { auth, managerOnly } from '../middleware/auth.js';

const router = express.Router();
router.use(auth, managerOnly);

router.post('/generate', async (req, res) => {
    try {
        const { type } = req.body;
        if (!['CLAN', 'INVITED', 'OFFICIAL'].includes(type)) {
            return res.status(400).json({ error: 'Invalid invite code type' });
        }

        let codeStr = '';
        let isUnique = false;
        
        while (!isUnique) {
            // Generate a secure 8-character hex code: NX-A1B2C3D4
            const randomHex = crypto.randomBytes(4).toString('hex').toUpperCase();
            codeStr = `NX-${randomHex}`;
            
            // Ensure no collision in database
            const existing = await InviteCode.findOne({ code: codeStr });
            if (!existing) {
                isUnique = true;
            }
        }

        const invite = new InviteCode({
            code: codeStr,
            type: type,
            createdBy: req.user.username || 'admin'
        });

        await invite.save();
        res.status(201).json(invite);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/all', async (req, res) => {
    try {
        const invites = await InviteCode.find().sort({ createdAt: -1 });
        res.json(invites);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
