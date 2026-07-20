// Diagnostic: inspect hm_users and locate a given email across collections.
// Usage: node --env-file=.env scripts/check-users.mjs [email] [password]
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); }

const [, , emailArg, passwordArg] = process.argv;

async function run() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  const db = mongoose.connection.db;
  console.log('✓ connected to DB:', mongoose.connection.name);

  const cols = await db.listCollections().toArray();
  console.log('\nCollections:', cols.map((c) => c.name).join(', '));

  const hm = db.collection('hm_users');
  console.log('\nhm_users count:', await hm.countDocuments());
  const all = await hm.find({}).project({ email: 1, role: 1, active: 1, name: 1 }).toArray();
  for (const u of all) console.log(`  - ${u.email} | role=${u.role} active=${u.active} name=${u.name}`);

  if (emailArg) {
    const email = emailArg.toLowerCase();
    console.log(`\n--- Searching all collections for "${email}" ---`);
    for (const c of cols) {
      const doc = await db.collection(c.name).findOne({ email });
      if (doc) {
        console.log(`FOUND in "${c.name}": _id=${doc._id} role=${doc.role} active=${doc.active} hasHash=${!!doc.passwordHash}`);
        if (passwordArg && doc.passwordHash) {
          console.log(`  password match: ${await bcrypt.compare(passwordArg, doc.passwordHash)}`);
        }
      }
    }
  }
  await mongoose.disconnect();
  process.exit(0);
}
run().catch((e) => { console.error('Failed:', e.message); process.exit(1); });
