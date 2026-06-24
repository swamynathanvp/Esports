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
