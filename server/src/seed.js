import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from './db.js';
import { User } from './models/User.js';

// Creates the bootstrap admin from SEED_ADMIN_* env vars if it doesn't exist.
async function seed() {
  await connectDB(process.env.MONGODB_URI);

  const email = (process.env.SEED_ADMIN_EMAIL || 'admin@healingmonk.com').toLowerCase();
  const existing = await User.findOne({ email });
  if (existing) {
    console.log(`Admin already exists: ${email} (role: ${existing.role})`);
  } else {
    const admin = new User({
      name: process.env.SEED_ADMIN_NAME || 'Clinic Admin',
      email,
      role: 'admin',
    });
    await admin.setPassword(process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!');
    await admin.save();
    console.log(`✓ Created admin: ${email}`);
    console.log('  Password is whatever you set in SEED_ADMIN_PASSWORD — change it after first login.');
  }

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
