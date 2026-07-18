import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/server/db';
import { Payment } from '@/lib/server/models/Payment';
import { requireAuth } from '@/lib/server/auth';
import { sendMail, paymentReceiptEmail } from '@/lib/server/mailer';
import { verifyPaymentSignature } from '@/lib/server/razorpay';

export const dynamic = 'force-dynamic';

// Verify a completed Razorpay checkout and mark the payment paid.
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  if (error) return error;

  try {
    await connectDB();
    const { paymentId, razorpayOrderId, razorpayPaymentId, razorpaySignature } =
      (await req.json().catch(() => ({}))) || {};
    const payment = await Payment.findById(paymentId).populate('patient', 'name email');
    if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });

    const ok = verifyPaymentSignature({
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId,
      signature: razorpaySignature,
    });
    if (!ok) {
      payment.status = 'failed';
      await payment.save();
      return NextResponse.json({ error: 'Payment signature verification failed' }, { status: 400 });
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
    return NextResponse.json({ payment: payment.toJSONSafe() });
  } catch (err) {
    console.error('verify payment error', err);
    return NextResponse.json({ error: 'Could not verify payment' }, { status: 500 });
  }
}
