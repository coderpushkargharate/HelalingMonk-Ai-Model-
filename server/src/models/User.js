import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { ROLES } from '../permissions.js';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ROLES, required: true, default: 'patient' },
    active: { type: Boolean, default: true },
    // Who created this account (admin who added a doctor/receptionist, etc.)
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

userSchema.methods.setPassword = async function setPassword(plain) {
  this.passwordHash = await bcrypt.hash(plain, 10);
};

userSchema.methods.verifyPassword = function verifyPassword(plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

// Strip sensitive fields whenever a user is serialized to JSON.
userSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
    role: this.role,
    active: this.active,
    createdAt: this.createdAt,
  };
};

// Dedicated collection so HealingMonk never collides with the EzyLoan app that
// shares this Atlas database (its `users` collection has a foreign username_1 index).
export const User = mongoose.model('User', userSchema, 'hm_users');
