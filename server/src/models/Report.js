import mongoose from 'mongoose';

// One finding per assessment position captured during the session. Stores the
// computed measurement + severity (not the raw image — images stay client-side
// to keep payloads small).
const findingSchema = new mongoose.Schema(
  {
    assessmentId: String,
    name: String,
    bodyRegion: String,
    measurementName: String,
    value: { type: Number, default: null },
    unit: String,
    severity: { type: String, enum: ['normal', 'mild', 'moderate', 'severe', null], default: null },
    painArea: String,
    painCorrelation: String,
  },
  { _id: false }
);

const exerciseSchema = new mongoose.Schema(
  {
    name: String,
    sets: String,
    reps: String,
    frequency: String,
    forFinding: String, // which assessment recommended it
  },
  { _id: false }
);

const reportSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    painAreas: { type: [String], default: [] },
    overallScore: { type: Number, default: null },
    findingsCount: { type: Number, default: 0 },
    flaggedCount: { type: Number, default: 0 },
    findings: { type: [findingSchema], default: [] },
    suggestedExercises: { type: [exerciseSchema], default: [] },
    doctorNotes: { type: String, default: '' },
  },
  { timestamps: true }
);

reportSchema.methods.toJSONSafe = function toJSONSafe() {
  return {
    id: this._id.toString(),
    patient: this.patient?._id ? this.patient._id.toString() : this.patient?.toString(),
    doctor: this.doctor?._id
      ? { id: this.doctor._id.toString(), name: this.doctor.name }
      : this.doctor?.toString(),
    painAreas: this.painAreas || [],
    overallScore: this.overallScore,
    findingsCount: this.findingsCount,
    flaggedCount: this.flaggedCount,
    findings: this.findings || [],
    suggestedExercises: this.suggestedExercises || [],
    doctorNotes: this.doctorNotes || '',
    createdAt: this.createdAt,
  };
};

export const Report = mongoose.model('Report', reportSchema);
