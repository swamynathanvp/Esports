import express from 'express';
import crypto from 'crypto';
import User from '../models/User.js';
import { auth } from '../middleware/auth.js';
import { asString, rateLimit } from '../securityKit.js';
import {
    issueChallenge,
    consumeChallenge,
    verifyAppAttestAssertion,
    computeVerificationTier,
    isUntrustedInstallSource,
} from '../deviceVerification.js';

const router = express.Router();
const attestLimiter = rateLimit({ windowMs: 5 * 60_000, max: 30, bucket: 'attest' });

// 1. Client asks for a fresh nonce to bind into the App Attest assertion.
router.post('/challenge', auth, attestLimiter, (req, res) => {
    if (req.user.role === 'MANAGER') {
        return res.status(400).json({ error: 'Managers do not attest devices' });
    }
    const challenge = issueChallenge(req.user._id, crypto.randomBytes(32).toString('hex'));
    res.json({ challenge });
});

// 2. Client submits the App Attest result + the install-source classification of
//    OUR app. The server verifies and records the trusted device state + tier.
router.post('/verify', auth, attestLimiter, async (req, res) => {
    try {
        if (req.user.role === 'MANAGER') {
            return res.status(400).json({ error: 'Managers do not attest devices' });
        }

        const keyId = asString(req.body?.keyId, { max: 256 });
        const assertion = asString(req.body?.assertion, { max: 8192 });
        const challenge = asString(req.body?.challenge, { max: 128 });
        const installSource = asString(req.body?.installSource, { max: 32 }) || 'unknown';
        const jailbroken = req.body?.jailbroken === true;

        const challengeOk = challenge ? consumeChallenge(req.user._id, challenge) : false;
        const enforcementOn = process.env.APP_ATTEST_ENFORCE === 'true';

        // Hard rejection: a TestFlight / sideloaded / sandbox copy of our own client
        // is never trusted, regardless of anything else it claims.
        if (isUntrustedInstallSource(installSource)) {
            await persist(req.user, {
                attestationVerified: false,
                attestKeyId: keyId,
                installSource,
                jailbroken,
                enforcementOn,
            });
            return res.status(403).json({
                error: 'UNTRUSTED_INSTALL_SOURCE',
                message: 'This build of the app is not from the App Store (TestFlight/sideloaded). Install the official App Store version to compete.',
                tier: 'UNVERIFIED',
            });
        }

        const attestationVerified = verifyAppAttestAssertion({ keyId, assertion, challengeOk });

        const user = await persist(req.user, {
            attestationVerified,
            attestKeyId: keyId,
            installSource,
            jailbroken,
            enforcementOn,
        });

        if (!attestationVerified) {
            return res.status(403).json({
                error: 'ATTESTATION_FAILED',
                message: challengeOk ? 'Device attestation could not be verified.' : 'Attestation challenge expired — retry.',
                tier: user.deviceVerification.tier,
            });
        }

        res.json({ tier: user.deviceVerification.tier, attestationVerified: true });
    } catch (error) {
        console.error('[attest/verify]', error);
        res.status(500).json({ error: 'Attestation failed' });
    }
});

// 3. MDM managed-app-inventory webhook (server-to-server). The MDM reports whether
//    the device is supervised and whether the installed game is the unmodified App
//    Store build. Protected by a shared secret header, not a user token.
router.post('/mdm-report', async (req, res) => {
    try {
        const secret = req.headers['x-mdm-secret'];
        if (!process.env.MDM_WEBHOOK_SECRET || secret !== process.env.MDM_WEBHOOK_SECRET) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const username = asString(req.body?.username, { max: 64 });
        const mdmSupervised = req.body?.mdmSupervised === true;
        const gameIntegrity = asString(req.body?.gameIntegrity, { max: 32 }) || 'unverified';

        if (!username) return res.status(400).json({ error: 'username required' });

        const user = await User.findOne({ username });
        if (!user) return res.status(404).json({ error: 'User not found' });

        await persist(user, { mdmSupervised, gameIntegrity });
        res.json({ tier: user.deviceVerification.tier });
    } catch (error) {
        console.error('[attest/mdm-report]', error);
        res.status(500).json({ error: 'Report failed' });
    }
});

// Merge new verification facts, recompute the tier, persist, and return the user.
async function persist(userOrDoc, patch) {
    const user = userOrDoc.deviceVerification ? userOrDoc : await User.findById(userOrDoc._id);
    const current = user.deviceVerification?.toObject?.() ?? user.deviceVerification ?? {};

    const merged = { ...current, ...patch, lastVerifiedAt: new Date() };
    merged.tier = computeVerificationTier(merged);

    user.deviceVerification = merged;
    await user.save();
    return user;
}

export default router;
