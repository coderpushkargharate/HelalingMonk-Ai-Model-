// Minimal Razorpay helpers using the REST API + Node crypto, so we don't pull
// in the official SDK. Online payments are disabled gracefully when keys are
// missing.

import crypto from 'node:crypto';

const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = process.env;

export const razorpayEnabled = Boolean(RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET);

function authHeader() {
  const token = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
  return `Basic ${token}`;
}

/**
 * Create a Razorpay order.
 * @param {{ amount: number, currency?: string, receipt?: string }} opts
 *   amount is in the smallest currency unit (paise).
 */
export async function createOrder({ amount, currency = 'INR', receipt }) {
  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, currency, receipt, payment_capture: 1 }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.description || 'Failed to create Razorpay order');
  }
  return data; // { id, amount, currency, ... }
}

/**
 * Verify the checkout signature returned by Razorpay Checkout.
 * signature === HMAC_SHA256(order_id + "|" + payment_id, key_secret)
 */
export function verifyPaymentSignature({ orderId, paymentId, signature }) {
  const expected = crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  // Constant-time compare.
  const a = Buffer.from(expected);
  const b = Buffer.from(signature || '');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Verify a webhook payload signature against RAZORPAY_WEBHOOK_SECRET. */
export function verifyWebhookSignature(rawBody, signature) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature || '');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
