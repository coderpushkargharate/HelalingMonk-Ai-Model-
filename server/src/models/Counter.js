import mongoose from 'mongoose';

// Atomic named counters — used to generate sequential, human-readable IDs
// (e.g. patient IDs HM-000001) without races.
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // counter name, e.g. 'patient'
  seq: { type: Number, default: 0 },
});

export const Counter = mongoose.model('Counter', counterSchema);

// Returns the next value for the named counter, incrementing atomically.
export async function nextSeq(name) {
  const doc = await Counter.findByIdAndUpdate(
    name,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return doc.seq;
}
