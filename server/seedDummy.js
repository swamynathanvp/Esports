import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import User from './models/User.js';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/esports-nexus';

async function seed() {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to DB');

    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const dummyUsers = [
        { username: 'DummyOfficial1', role: 'OFFICIAL', trustScore: 100 },
        { username: 'DummyOfficial2', role: 'OFFICIAL', trustScore: 100 },
        { username: 'DummyOfficial3', role: 'OFFICIAL', trustScore: 98 },
        { username: 'DummyOfficial4', role: 'OFFICIAL', trustScore: 100 },
        
        { username: 'DummyRecruit1', role: 'RECRUIT', trustScore: 85 },
        { username: 'DummyRecruit2', role: 'RECRUIT', trustScore: 100 },
        
        { username: 'DummyExternal1', role: 'INVITED', trustScore: 100 },
        { username: 'DummyExternal2', role: 'INVITED', trustScore: 100 }
    ];

    for (let u of dummyUsers) {
        // Check if exists
        const exists = await User.findOne({ username: u.username });
        if (!exists) {
            const hwId = crypto.randomUUID();
            const newUser = new User({
                username: u.username,
                password: hashedPassword,
                role: u.role,
                trustScore: u.trustScore,
                hardwareId: hwId,
                activeSessionId: null,
                deviceHistory: [{
                    hardwareId: hwId,
                    deviceModel: 'TestDevice',
                    platform: 'web',
                    loginAt: new Date(),
                    ipAddress: '127.0.0.1',
                    isCurrentDevice: false
                }]
            });
            await newUser.save();
            console.log(`Created ${u.username}`);
        }
    }

    console.log('Done seeding.');
    process.exit(0);
}

seed().catch(console.error);
