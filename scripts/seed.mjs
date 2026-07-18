// Bootstrap the super-admin from SEED_ADMIN_* env vars if it doesn't exist.
// Run with:  npm run seed   (uses node --env-file=.env, Node 20.6+)
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('MONGODB_URI is not set. Add it to .env');
  process.exit(1);
}

// Minimal, self-contained User schema matching lib/server/models/User.ts. Kept
// standalone so this script needs no TS/Next runtime.
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, required: true, default: 'patient' },
    active: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);
const User = mongoose.model('User', userSchema, 'hm_users');

async function seed() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  console.log('✓ MongoDB connected');

  const email = (process.env.SEED_ADMIN_EMAIL || 'admin@healingmonk.com').toLowerCase();
  const existing = await User.findOne({ email });
  if (existing) {
    console.log(`Admin already exists: ${email} (role: ${existing.role})`);
  } else {
    const passwordHash = await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!', 10);
    await User.create({
      name: process.env.SEED_ADMIN_NAME || 'Clinic Admin',
      email,
      role: 'admin',
      passwordHash,
    });
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
