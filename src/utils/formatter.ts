// Small shared formatters for the admin/staff tables.

/** Format a date (ISO string or Date) in the clinic timezone (IST). */
export function formatDate(value?: string | Date | null, withTime = false): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    ...(withTime ? { timeStyle: 'short' } : {}),
  });
}

/** Format an amount stored in paise as ₹ rupees. */
export function formatMoney(paise: number, currency = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format((paise || 0) / 100);
}
