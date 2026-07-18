// Centralized, server-only access to environment variables. Import this from
// API route handlers / server lib instead of reaching into process.env directly.
// NOTE: server-only — never import into a client component.

export const env = {
  MONGODB_URI: process.env.MONGODB_URI ?? '',
  JWT_SECRET: process.env.JWT_SECRET ?? '',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? '7d',
  APP_BASE_URL: process.env.APP_BASE_URL ?? '',
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID ?? '',
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET ?? '',
};

/** Throw if a required server env var is missing (call from server code only). */
export function requireEnv(name: keyof typeof env): string {
  const v = env[name];
  if (!v) throw new Error(`Missing required environment variable: ${name}`);
  return v;
}
