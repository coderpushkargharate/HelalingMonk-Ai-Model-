// App-wide constants (safe for both client and server).
export const APP_NAME = 'HealingMonk';

// The frontend talks to the API same-origin at /api. Override only if the API
// is hosted elsewhere (must be NEXT_PUBLIC_ to reach the browser).
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
