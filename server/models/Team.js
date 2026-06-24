import mongoose from 'mongoose';

const TeamSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    type: {
        type: String,
        enum: ['SQUAD', 'DUO'],
        required: true
    },
    teamStatus: {
        type: String,
        enum: ['OFFICIAL', 'EXTERNAL'], // External for INVITED players
        default: 'OFFICIAL'
    },
    members: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
}, { timestamps: true });

export default mongoose.model('Team', TeamSchema);
