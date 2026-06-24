import mongoose from 'mongoose';
import User from './models/User.js';
import Scrim from './models/Scrim.js';

mongoose.connect('mongodb://localhost:27017/esports-nexus').then(async () => {
    await User.deleteMany({});
    await Scrim.deleteMany({});
    console.log('Database wiped correctly. Slate cleanly erased for Users and Scrims.');
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
