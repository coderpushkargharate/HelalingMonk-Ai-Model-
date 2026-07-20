// Create (or update the password of) an admin user.
// Usage: node --env-file=.env scripts/create-admin.mjs <email> <password> [name]
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); }

const [, , emailArg, passwordArg, nameArg] = process.argv;
if (!emailArg || !passwordArg) {
  console.error('Usage: node --env-file=.env scripts/create-admin.mjs <email> <password> [name]');
  process.exit(1);
}

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

async function run() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  console.log('✓ connected to', mongoose.connection.name);

  const email = emailArg.toLowerCase();
  const passwordHash = await bcrypt.hash(passwordArg, 10);
  const existing = await User.findOne({ email });

  if (existing) {
    existing.passwordHash = passwordHash;
    existing.role = 'admin';
    existing.active = true;
    await existing.save();
    console.log(`✓ Updated existing user to admin + new password: ${email}`);
  } else {
    await User.create({
      name: nameArg || 'Super Admin',
      email,
      role: 'admin',
      active: true,
      passwordHash,
    });
    console.log(`✓ Created admin: ${email}`);
  }

  await mongoose.disconnect();
  process.exit(0);
}
run().catch((e) => { console.error('Failed:', e.message); process.exit(1); });
