// Reset a user's password by email.
// Usage (Node 20.6+, reads .env for MONGODB_URI):
//   node --env-file=.env scripts/set-admin-password.mjs <email> <newPassword>
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('MONGODB_URI is not set. Add it to .env');
  process.exit(1);
}

const [, , emailArg, passwordArg] = process.argv;
if (!emailArg || !passwordArg) {
  console.error('Usage: node --env-file=.env scripts/set-admin-password.mjs <email> <newPassword>');
  process.exit(1);
}

// Minimal User schema matching lib/server/models/User.ts (collection hm_users).
const userSchema = new mongoose.Schema({ email: String, passwordHash: String }, { strict: false });
const User = mongoose.model('User', userSchema, 'hm_users');

async function run() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  console.log('✓ MongoDB connected');

  const email = emailArg.toLowerCase();
  const user = await User.findOne({ email });
  if (!user) {
    console.error(`No user found with email: ${email}`);
    await mongoose.disconnect();
    process.exit(1);
  }

  user.passwordHash = await bcrypt.hash(passwordArg, 10);
  await user.save();
  console.log(`✓ Password updated for ${email} (role: ${user.role})`);

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
