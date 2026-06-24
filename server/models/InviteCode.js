import mongoose from 'mongoose';

const InviteCodeSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true
    },
    type: {
        type: String,
        enum: ['CLAN', 'INVITED', 'OFFICIAL'],
        required: true
    },
    createdBy: {
        type: String,
        default: 'admin'
    },
    usedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    usedByUsername: {
        type: String,
        default: null
    },
    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

export default mongoose.model('InviteCode', InviteCodeSchema);
