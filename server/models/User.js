import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['MANAGER', 'OFFICIAL', 'RECRUIT', 'INVITED'],
        default: 'RECRUIT'
    },
    trustScore: {
        type: Number,
        default: 100,
        min: 0,
        max: 100
    },
    hardwareId: {
        type: String,
        required: true
    },
    inviteCode: {
        type: String
    },
    activeSessionId: {
        type: String,
        default: null
    },
    deviceHistory: [{
        hardwareId: String,
        deviceModel: String,
        platform: String,
        loginAt: Date,
        logoutAt: { type: Date, default: null },
        ipAddress: String,
        isCurrentDevice: Boolean
    }],
    squadAssignment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team',
        default: null
    },
    duoAssignment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team',
        default: null
    },
    // Server-trusted device verification state (set by the attestation/MDM flow,
    // never written directly by the client). Drives credential access tiers.
    deviceVerification: {
        attestationVerified: { type: Boolean, default: false },
        attestKeyId: { type: String, default: null },
        // App Store receipt classification of OUR app: app_store | testflight | sandbox | sideloaded | unknown
        installSource: { type: String, default: 'unknown' },
        jailbroken: { type: Boolean, default: false },
        mdmSupervised: { type: Boolean, default: false },
        // Reported by MDM managed-app inventory: verified_appstore | unverified | flagged
        gameIntegrity: { type: String, default: 'unverified' },
        // Cached computed tier: UNVERIFIED | ATTESTED | MANAGED
        tier: { type: String, default: 'UNVERIFIED' },
        enforcementOn: { type: Boolean, default: false },
        lastVerifiedAt: { type: Date, default: null }
    },
    securityDiagnostics: {
        isRooted: { type: Boolean, default: false },
        isSideloaded: { type: Boolean, default: false },
        isVpnActive: { type: Boolean, default: false },
        isDevModeActive: { type: Boolean, default: false },
        hasCheatTools: { type: Boolean, default: false },
        hasVirtualSpace: { type: Boolean, default: false },
        hasAccessibilityAbuse: { type: Boolean, default: false },
        hasScreenCapture: { type: Boolean, default: false },
        isEmulator: { type: Boolean, default: false },
        isClockTampered: { type: Boolean, default: false },
        isBgmiModified: { type: Boolean, default: false },
        hasOverlayApps: { type: Boolean, default: false },
        lastHeartbeat: { type: Date, default: null },
        diagnosticDetails: { type: mongoose.Schema.Types.Mixed }
    }
}, { timestamps: true });

UserSchema.pre('save', async function() {
    if (!this.isModified('password')) return;
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

export default mongoose.model('User', UserSchema);
