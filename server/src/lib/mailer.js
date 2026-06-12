// Centralised email sending via SMTP (nodemailer).
// Designed to be non-fatal: if SMTP is not configured, calls log a warning and
// resolve instead of throwing, so booking/report flows never break on email.

import nodemailer from 'nodemailer';

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASSWORD,
  EMAIL_FROM,
  APP_BASE_URL,
} = process.env;

const enabled = Boolean(SMTP_HOST && SMTP_USER && SMTP_PASSWORD);

let transporter = null;
if (enabled) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465, // 465 = implicit TLS, 587 = STARTTLS
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
  });
} else {
  console.warn('[mailer] SMTP not configured — emails will be skipped.');
}

/**
 * Send an email. Never throws — returns { sent: boolean }.
 * @param {{ to: string, subject: string, html: string, text?: string }} msg
 */
export async function sendMail({ to, subject, html, text }) {
  if (!enabled || !to) return { sent: false };
  try {
    await transporter.sendMail({
      from: EMAIL_FROM || SMTP_USER,
      to,
      subject,
      text: text || html.replace(/<[^>]+>/g, ' '),
      html,
    });
    return { sent: true };
  } catch (err) {
    console.error('[mailer] send failed:', err.message);
    return { sent: false };
  }
}

// ── Shared HTML shell ────────────────────────────────────────────
function layout(title, body) {
  return `
  <div style="font-family:system-ui,Segoe UI,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111827">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px">
      <div style="width:36px;height:36px;background:#16a34a;border-radius:8px"></div>
      <strong style="font-size:18px">HealingMonk</strong>
    </div>
    <h2 style="font-size:18px;margin:0 0 12px">${title}</h2>
    ${body}
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0" />
    <p style="font-size:12px;color:#6b7280">This is an automated message from HealingMonk. Please do not reply.</p>
  </div>`;
}

function row(label, value) {
  return `<tr>
    <td style="padding:4px 12px 4px 0;color:#6b7280;font-size:14px">${label}</td>
    <td style="padding:4px 0;font-size:14px;font-weight:600">${value}</td>
  </tr>`;
}

// ── Templated emails ─────────────────────────────────────────────

export function welcomeStaffEmail({ name, email, role, tempPassword }) {
  const loginUrl = APP_BASE_URL || '';
  return {
    subject: `Your HealingMonk ${role} account is ready`,
    html: layout(
      `Welcome, ${name}`,
      `<p style="font-size:14px">An admin created a <strong>${role}</strong> account for you on HealingMonk.</p>
       <table style="margin:12px 0">
         ${row('Email', email)}
         ${tempPassword ? row('Temporary password', tempPassword) : ''}
       </table>
       ${loginUrl ? `<a href="${loginUrl}" style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600;font-size:14px">Sign in</a>` : ''}
       <p style="font-size:13px;color:#6b7280;margin-top:12px">Please change your password after your first sign-in.</p>`
    ),
  };
}

export function appointmentBookedEmail({ patientName, doctorName, when, reason }) {
  return {
    subject: `Appointment confirmed — ${when}`,
    html: layout(
      'Your appointment is confirmed',
      `<p style="font-size:14px">Hi ${patientName}, your appointment has been booked.</p>
       <table style="margin:12px 0">
         ${row('Date &amp; time', when)}
         ${doctorName ? row('Doctor', `Dr. ${doctorName}`) : ''}
         ${reason ? row('Reason', reason) : ''}
       </table>
       <p style="font-size:13px;color:#6b7280">Please arrive 10 minutes early. To reschedule, contact the clinic reception.</p>`
    ),
  };
}

export function appointmentRescheduledEmail({ patientName, doctorName, when }) {
  return {
    subject: `Appointment rescheduled — ${when}`,
    html: layout(
      'Your appointment was rescheduled',
      `<p style="font-size:14px">Hi ${patientName}, your appointment has a new time.</p>
       <table style="margin:12px 0">
         ${row('New date &amp; time', when)}
         ${doctorName ? row('Doctor', `Dr. ${doctorName}`) : ''}
       </table>`
    ),
  };
}

export function reportReadyEmail({ patientName, doctorName, overallScore, flaggedCount }) {
  return {
    subject: 'Your HealingMonk assessment report is ready',
    html: layout(
      'Assessment report ready',
      `<p style="font-size:14px">Hi ${patientName}, your movement assessment has been completed${doctorName ? ` by Dr. ${doctorName}` : ''}.</p>
       <table style="margin:12px 0">
         ${overallScore != null ? row('Overall score', `${overallScore}/100`) : ''}
         ${row('Areas flagged', String(flaggedCount ?? 0))}
       </table>
       <p style="font-size:13px;color:#6b7280">Your doctor will review the findings and prescribed exercises with you.</p>`
    ),
  };
}

export function paymentReceiptEmail({ patientName, amount, currency, method, reference }) {
  const amt = `${currency || 'INR'} ${(amount / 100).toFixed(2)}`;
  return {
    subject: `Payment received — ${amt}`,
    html: layout(
      'Payment receipt',
      `<p style="font-size:14px">Hi ${patientName}, we have received your payment. Thank you.</p>
       <table style="margin:12px 0">
         ${row('Amount', amt)}
         ${row('Method', method === 'online' ? 'Online (Razorpay)' : 'Cash')}
         ${reference ? row('Reference', reference) : ''}
       </table>`
    ),
  };
}
