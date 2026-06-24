import mongoose from 'mongoose';

const ScrimSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    game: {
        type: String,
        default: 'BGMI'
    },
    // The exact Room ID and Password payload
    roomCredentials: {
        roomId: { type: String, default: '' },
        password: { type: String, default: '' }
    },
    // Tier-based release schedules
    releaseSchedule: [{
        targetTier: { type: String }, // e.g. "OFFICIAL", "Tier 1", "Tier 2"
        releaseTime: { type: Date, required: true } // Exact time the Socket.io server fires the credentials
    }],
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    teams: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team'
    }],
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

export default mongoose.model('Scrim', ScrimSchema);
