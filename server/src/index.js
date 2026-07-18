import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './db.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import patientRoutes from './routes/patients.js';
import reportRoutes from './routes/reports.js';
import appointmentRoutes from './routes/appointments.js';
import meRoutes from './routes/me.js';
import publicRoutes from './routes/public.js';
import paymentRoutes from './routes/payments.js';
import adminRoutes from './routes/admin.js';
import { PERMISSIONS } from './permissions.js';

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN?.split(',') ?? '*',
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Expose the role→permission map so the frontend can gate UI consistently.
app.get('/api/permissions', (_req, res) => res.json({ permissions: PERMISSIONS }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/me', meRoutes);
app.use('/api/public', publicRoutes);

// Fallback error handler.
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 4000;

connectDB(process.env.MONGODB_URI)
  .then(() => {
    app.listen(PORT, () => console.log(`✓ API listening on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  });
