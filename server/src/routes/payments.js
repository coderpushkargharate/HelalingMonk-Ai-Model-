import { Router } from 'express';
import { Payment } from '../models/Payment.js';
import { Patient } from '../models/Patient.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { sendMail, paymentReceiptEmail } from '../lib/mailer.js';
import {
  razorpayEnabled,
  createOrder,
  verifyPaymentSignature,
} from '../lib/razorpay.js';

const router = Router();

router.use(requireAuth);

// List payments, optionally ?patient=<id>. Staff only.
router.get('/', requireRole('admin', 'doctor', 'reception'), async (req, res) => {
  const filter = {};
  if (req.query.patient) filter.patient = req.query.patient;
  const payments = await Payment.find(filter).sort({ createdAt: -1 }).limit(300);
  res.json({ payments: payments.map((p) => p.toJSONSafe()) });
});

// Record a cash payment at the desk. Reception/admin.
router.post('/cash', requireRole('admin', 'reception'), async (req, res) => {
  try {
    const { patientId, amount, plan, notes } = req.body || {};
    const paise = Math.round(Number(amount) * 100);
    if (!patientId || !paise || paise <= 0) {
      return res.status(400).json({ error: 'patientId and a positive amount are required' });
    }
    const patient = await Patient.findById(patientId);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    const payment = await Payment.create({
      patient: patient._id,
      amount: paise,
      currency: 'INR',
      method: 'cash',
      status: 'paid',
      plan: plan || '',
      notes: notes || '',
      collectedBy: req.user._id,
    });

    if (patient.email) {
      sendMail({
        to: patient.email,
        ...paymentReceiptEmail({
          patientName: patient.name,
          amount: paise,
          currency: 'INR',
          method: 'cash',
        }),
      });
    }
    res.status(201).json({ payment: payment.toJSONSafe() });
  } catch (err) {
    console.error('cash payment error', err);
    res.status(500).json({ error: 'Could not record payment' });
  }
});

// Create a Razorpay order for online payment. Any authenticated user (patient
// can pay their own bill; reception can initiate on a patient's behalf).
router.post('/order', async (req, res) => {
  try {
    if (!razorpayEnabled) {
      return res.status(503).json({ error: 'Online payments are not configured' });
    }
    const { patientId, amount, plan } = req.body || {};
    const paise = Math.round(Number(amount) * 100);
    if (!patientId || !paise || paise <= 0) {
      return res.status(400).json({ error: 'patientId and a positive amount are required' });
    }
    const patient = await Patient.findById(patientId);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    const payment = await Payment.create({
      patient: patient._id,
      amount: paise,
      currency: 'INR',
      method: 'online',
      status: 'created',
      plan: plan || '',
      collectedBy: req.user._id,
    });

    const order = await createOrder({
      amount: paise,
      currency: 'INR',
      receipt: payment._id.toString(),
    });
    payment.razorpayOrderId = order.id;
    await payment.save();

    res.status(201).json({
      paymentId: payment._id.toString(),
      orderId: order.id,
      amount: paise,
      currency: 'INR',
      keyId: process.env.RAZORPAY_KEY_ID,
      patientName: patient.name,
    });
  } catch (err) {
    console.error('create order error', err);
    res.status(500).json({ error: err.message || 'Could not create payment order' });
  }
});

// Verify a completed Razorpay checkout and mark the payment paid.
router.post('/verify', async (req, res) => {
  try {
    const { paymentId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body || {};
    const payment = await Payment.findById(paymentId).populate('patient', 'name email');
    if (!payment) return res.status(404).json({ error: 'Payment not found' });

    const ok = verifyPaymentSignature({
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId,
      signature: razorpaySignature,
    });
    if (!ok) {
      payment.status = 'failed';
      await payment.save();
      return res.status(400).json({ error: 'Payment signature verification failed' });
    }

    payment.status = 'paid';
    payment.razorpayPaymentId = razorpayPaymentId;
    await payment.save();

    if (payment.patient?.email) {
      sendMail({
        to: payment.patient.email,
        ...paymentReceiptEmail({
          patientName: payment.patient.name,
          amount: payment.amount,
          currency: payment.currency,
          method: 'online',
          reference: razorpayPaymentId,
        }),
      });
    }
    res.json({ payment: payment.toJSONSafe() });
  } catch (err) {
    console.error('verify payment error', err);
    res.status(500).json({ error: 'Could not verify payment' });
  }
});

export default router;
