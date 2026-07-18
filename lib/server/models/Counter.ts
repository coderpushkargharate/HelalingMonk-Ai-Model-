import mongoose from 'mongoose';

// Atomic named counters — used to generate sequential, human-readable IDs
// (e.g. patient IDs HM-000001) without races.
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // counter name, e.g. 'patient'
  seq: { type: Number, default: 0 },
});

// Dedicated collection (the shared EzyLoan DB also has a `counters` collection).
export const Counter =
  (mongoose.models.Counter as mongoose.Model<any>) ||
  mongoose.model('Counter', counterSchema, 'hm_counters');

// Returns the next value for the named counter, incrementing atomically.
export async function nextSeq(name: string): Promise<number> {
  const doc = await Counter.findByIdAndUpdate(
    name,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return doc.seq;
}
