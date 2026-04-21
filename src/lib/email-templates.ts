import { formatGHSWithSymbol } from './currency';

export interface EmailTemplate {
  subject: string;
  html: string;
}

/** Aligns with `src/index.css` :root — primary violet, surfaces, semantic accents */
const E = {
  bgPage: '#FAF8FF',
  card: '#FFFFFF',
  border: '#E9E4EF',
  text: '#1E1528',
  muted: '#6B6578',
  primary: '#7C3AED',
  primaryMid: '#8B5CF6',
  primaryLight: '#A78BFA',
  onPrimary: '#FFFFFF',
  success: '#16A34A',
  successLight: '#22C55E',
  successBg: '#F0FDF4',
  successBorder: '#BBF7D0',
  warning: '#D97706',
  warningLight: '#F59E0B',
  warningBg: '#FFFBEB',
  warningBorder: '#FDE68A',
  radius: '12px',
  radiusSm: '8px',
} as const;

function appUrl(): string {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_APP_URL) {
      return String(import.meta.env.VITE_APP_URL).replace(/\/$/, '');
    }
  } catch {
    /* ignore */
  }
  if (typeof process !== 'undefined' && process.env?.VITE_APP_URL) {
    return String(process.env.VITE_APP_URL).replace(/\/$/, '');
  }
  return 'http://localhost:5173';
}

type EmailVariant = 'brand' | 'success' | 'warning';

function variantHeaderGradient(v: EmailVariant): string {
  switch (v) {
    case 'success':
      return `linear-gradient(135deg, ${E.success} 0%, ${E.successLight} 100%)`;
    case 'warning':
      return `linear-gradient(135deg, ${E.warning} 0%, ${E.warningLight} 100%)`;
    default:
      return `linear-gradient(135deg, ${E.primary} 0%, ${E.primaryMid} 55%, ${E.primaryLight} 100%)`;
  }
}

function variantButtonBg(v: EmailVariant): string {
  switch (v) {
    case 'success':
      return E.success;
    case 'warning':
      return E.warning;
    default:
      return E.primary;
  }
}

/**
 * Table-based shell for broad email client support; matches app chrome (violet brand, Poppins, soft cards).
 */
function rhythmEmailShell(opts: {
  preheader: string;
  variant: EmailVariant;
  eyebrow?: string;
  title: string;
  leadHtml: string;
  mainHtml: string;
  cta?: { href: string; label: string };
  footerExtra?: string;
}): string {
  const base = appUrl();
  const btnBg = variantButtonBg(opts.variant);
  const headerGrad = variantHeaderGradient(opts.variant);
  const ctaShadow =
    opts.variant === 'success'
      ? '0 2px 8px rgba(22,163,74,0.22)'
      : opts.variant === 'warning'
        ? '0 2px 8px rgba(217,119,6,0.22)'
        : '0 2px 8px rgba(124,58,237,0.25)';

  const ctaBlock = opts.cta
    ? `
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:28px 0 8px 0;">
        <tr>
          <td align="center">
            <a href="${opts.cta.href}" style="display:inline-block;padding:14px 28px;font-family:Poppins,Segoe UI,Roboto,sans-serif;font-size:15px;font-weight:600;color:${E.onPrimary};text-decoration:none;border-radius:${E.radiusSm};background:${btnBg};box-shadow:${ctaShadow};">${opts.cta.label}</a>
          </td>
        </tr>
      </table>
    `
    : '';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${escapeHtml(opts.title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style type="text/css">
    @media only screen and (max-width: 620px) {
      .rg-wrap { width: 100% !important; padding-left: 16px !important; padding-right: 16px !important; }
      .rg-pad { padding: 24px 20px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${E.bgPage};-webkit-font-smoothing:antialiased;">
  <span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;font-size:0;line-height:0;">${escapeHtml(opts.preheader)}</span>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${E.bgPage};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" class="rg-wrap" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;">
          <tr>
            <td style="padding:0 0 20px 0;text-align:center;">
              <a href="${base}" style="text-decoration:none;display:inline-block;">
                <span style="font-family:Poppins,Segoe UI,Roboto,sans-serif;font-size:22px;font-weight:700;letter-spacing:-0.02em;color:${E.text};">Rhythm Guardian</span>
              </a>
              <div style="font-family:Poppins,Segoe UI,Roboto,sans-serif;font-size:12px;color:${E.muted};margin-top:6px;">Book musicians · Get booked · Secure payments</div>
            </td>
          </tr>
          <tr>
            <td style="border-radius:${E.radius};overflow:hidden;box-shadow:0 4px 24px rgba(30,21,40,0.08);border:1px solid ${E.border};background:${E.card};">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="height:4px;background:${headerGrad};background-color:${btnBg};"></td>
                </tr>
                <tr>
                  <td class="rg-pad" style="padding:32px 28px 28px 28px;">
                    ${opts.eyebrow ? `<p style="margin:0 0 8px 0;font-family:Poppins,Segoe UI,Roboto,sans-serif;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:${E.muted};">${escapeHtml(opts.eyebrow)}</p>` : ''}
                    <h1 style="margin:0 0 16px 0;font-family:Poppins,Segoe UI,Roboto,sans-serif;font-size:24px;font-weight:700;line-height:1.25;color:${E.text};letter-spacing:-0.02em;">${escapeHtml(opts.title)}</h1>
                    <div style="font-family:Poppins,Segoe UI,Roboto,sans-serif;font-size:15px;line-height:1.65;color:${E.muted};">${opts.leadHtml}</div>
                    <div style="margin-top:20px;font-family:Poppins,Segoe UI,Roboto,sans-serif;font-size:15px;line-height:1.65;color:${E.text};">${opts.mainHtml}</div>
                    ${ctaBlock}
                    ${opts.footerExtra ? `<p style="margin:24px 0 0 0;font-family:Poppins,Segoe UI,Roboto,sans-serif;font-size:13px;line-height:1.55;color:${E.muted};">${opts.footerExtra}</p>` : ''}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 8px 0 8px;text-align:center;">
              <p style="margin:0 0 12px 0;font-family:Poppins,Segoe UI,Roboto,sans-serif;font-size:12px;color:${E.muted};line-height:1.5;">
                © ${new Date().getFullYear()} Rhythm Guardian. All rights reserved.
              </p>
              <p style="margin:0 0 16px 0;font-family:Poppins,Segoe UI,Roboto,sans-serif;font-size:12px;">
                <a href="${base}/terms" style="color:${E.primary};text-decoration:none;font-weight:500;">Terms</a>
                <span style="color:${E.border};">&nbsp;·&nbsp;</span>
                <a href="${base}/privacy" style="color:${E.primary};text-decoration:none;font-weight:500;">Privacy</a>
                <span style="color:${E.border};">&nbsp;·&nbsp;</span>
                <a href="${base}" style="color:${E.primary};text-decoration:none;font-weight:500;">Open app</a>
              </p>
              <p style="margin:0;font-family:Poppins,Segoe UI,Roboto,sans-serif;font-size:11px;color:${E.muted};">This is an automated message. Please do not reply directly to this email.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function detailCard(rows: { label: string; value: string }[]): string {
  const rowsHtml = rows
    .map(
      (r) => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid ${E.border};font-family:Poppins,Segoe UI,Roboto,sans-serif;font-size:14px;color:${E.muted};width:42%;vertical-align:top;">${escapeHtml(r.label)}</td>
      <td style="padding:12px 0;border-bottom:1px solid ${E.border};font-family:Poppins,Segoe UI,Roboto,sans-serif;font-size:14px;font-weight:500;color:${E.text};text-align:right;vertical-align:top;">${escapeHtml(r.value)}</td>
    </tr>
  `
    )
    .join('');

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:20px 0;border-radius:${E.radiusSm};border:1px solid ${E.border};background:${E.bgPage};overflow:hidden;">
      ${rowsHtml}
    </table>
  `;
}

function highlightAmount(amount: string, variant: EmailVariant = 'brand'): string {
  const color =
    variant === 'success' ? E.success : variant === 'warning' ? E.warning : E.primary;
  return `<div style="margin:20px 0 8px 0;font-family:Poppins,Segoe UI,Roboto,sans-serif;font-size:36px;font-weight:700;letter-spacing:-0.03em;color:${color};line-height:1;">${amount}</div>`;
}

function callout(html: string, tone: 'success' | 'warning'): string {
  const bg = tone === 'success' ? E.successBg : E.warningBg;
  const bd = tone === 'success' ? E.successBorder : E.warningBorder;
  const tc = tone === 'success' ? '#166534' : '#92400E';
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:20px 0;border-radius:${E.radiusSm};border:1px solid ${bd};background:${bg};">
      <tr>
        <td style="padding:16px 18px;font-family:Poppins,Segoe UI,Roboto,sans-serif;font-size:14px;line-height:1.55;color:${tc};">${html}</td>
      </tr>
    </table>
  `;
}

export const emailTemplates = {
  paymentReceived: (data: {
    hirerName: string;
    musicianName: string;
    amount: number;
    eventType: string;
    eventDate: string;
    bookingId: string;
  }): EmailTemplate => ({
    subject: `Payment received — ${data.eventType}`,
    html: rhythmEmailShell({
      preheader: `Your payment of ${formatGHSWithSymbol(data.amount)} was received. Funds are in escrow.`,
      variant: 'brand',
      eyebrow: 'Payments',
      title: 'Payment received',
      leadHtml: `<p style="margin:0;">Hi <strong style="color:${E.text};">${escapeHtml(data.hirerName)}</strong>,</p>`,
      mainHtml: `
        <p style="margin:0 0 16px 0;">Your payment was processed successfully. Funds are held securely in escrow until both you and the musician confirm the service.</p>
        ${highlightAmount(formatGHSWithSymbol(data.amount), 'brand')}
        ${detailCard([
          { label: 'Musician', value: data.musicianName },
          { label: 'Event', value: data.eventType },
          { label: 'Date', value: data.eventDate },
          { label: 'Booking ID', value: data.bookingId },
        ])}
        <p style="margin:0;">After the event, complete the confirmation steps in the app so the musician can be paid.</p>
      `,
      cta: { href: `${appUrl()}/hirer/bookings`, label: 'View booking' },
      footerExtra: 'Questions? Open Messages in the app or contact support from your dashboard.',
    }),
  }),

  payoutInitiated: (data: {
    musicianName: string;
    amount: number;
    eventType: string;
    hirerName: string;
    accountNumber: string;
    transferReference: string;
  }): EmailTemplate => ({
    subject: `Payout initiated — ${formatGHSWithSymbol(data.amount)}`,
    html: rhythmEmailShell({
      preheader: `Your payout of ${formatGHSWithSymbol(data.amount)} is on its way.`,
      variant: 'success',
      eyebrow: 'Payouts',
      title: 'Payout initiated',
      leadHtml: `<p style="margin:0;">Hi <strong style="color:${E.text};">${escapeHtml(data.musicianName)}</strong>,</p>`,
      mainHtml: `
        <p style="margin:0 0 16px 0;">Your payout has been initiated and is being sent to your account on file.</p>
        ${highlightAmount(formatGHSWithSymbol(data.amount), 'success')}
        ${detailCard([
          { label: 'Event', value: data.eventType },
          { label: 'Client', value: data.hirerName },
          { label: 'Account', value: `••••${data.accountNumber.slice(-4)}` },
          { label: 'Reference', value: data.transferReference },
        ])}
        ${callout(
          `<strong>Expected arrival:</strong> Most transfers complete within 24 hours. Bank processing may take 1–2 business days.`,
          'success'
        )}
        <p style="margin:0;">You’ll get another update when the transfer settles. Thank you for performing on Rhythm Guardian.</p>
      `,
      cta: { href: `${appUrl()}/musician`, label: 'Open dashboard' },
    }),
  }),

  serviceConfirmationReminder: (data: {
    userName: string;
    userRole: 'hirer' | 'musician';
    eventType: string;
    eventDate: string;
    otherPartyName: string;
    bookingId: string;
  }): EmailTemplate => ({
    subject: `Confirm your booking — ${data.eventType}`,
    html: rhythmEmailShell({
      preheader: `Reminder: confirm the ${data.eventType} booking with ${data.otherPartyName}.`,
      variant: 'warning',
      eyebrow: 'Action needed',
      title: data.userRole === 'hirer' ? 'Complete service confirmation' : 'Confirm your performance',
      leadHtml: `<p style="margin:0;">Hi <strong style="color:${E.text};">${escapeHtml(data.userName)}</strong>,</p>`,
      mainHtml: `
        <p style="margin:0 0 16px 0;">The scheduled time for this booking has passed. Please confirm in the app so we can finalize payment and close the booking.</p>
        ${detailCard([
          { label: 'Event', value: data.eventType },
          { label: 'Date', value: data.eventDate },
          {
            label: data.userRole === 'hirer' ? 'Musician' : 'Client',
            value: data.otherPartyName,
          },
          { label: 'Booking ID', value: data.bookingId },
        ])}
        ${callout(
          data.userRole === 'hirer'
            ? `<strong>Hirer:</strong> Tap <strong>Complete service</strong> once the performance matches what you booked.`
            : `<strong>Musician:</strong> Tap <strong>Confirm rendering</strong> after the gig ends.`,
          'warning'
        )}
        <p style="margin:0;">If something went wrong, contact support before confirming.</p>
      `,
      cta: {
        href: `${appUrl()}/${data.userRole}/bookings`,
        label: `Open ${data.userRole === 'hirer' ? 'My bookings' : 'Bookings'}`,
      },
    }),
  }),

  bookingConfirmation: (data: {
    hirerName: string;
    musicianName: string;
    eventType: string;
    eventDate: string;
    location: string;
    amount: number;
    bookingId: string;
  }): EmailTemplate => ({
    subject: `Booking confirmed — ${data.eventType}`,
    html: rhythmEmailShell({
      preheader: `${data.eventType} with ${data.musicianName} on ${data.eventDate}.`,
      variant: 'brand',
      eyebrow: 'Bookings',
      title: 'You’re booked',
      leadHtml: `<p style="margin:0;">Hi <strong style="color:${E.text};">${escapeHtml(data.hirerName)}</strong>,</p>`,
      mainHtml: `
        <p style="margin:0 0 16px 0;">Your booking is confirmed. Here’s a summary — you can share details with your venue or team from the app.</p>
        ${detailCard([
          { label: 'Musician', value: data.musicianName },
          { label: 'Event', value: data.eventType },
          { label: 'Date', value: data.eventDate },
          { label: 'Location', value: data.location },
          { label: 'Amount', value: formatGHSWithSymbol(data.amount) },
          { label: 'Booking ID', value: data.bookingId },
        ])}
        <p style="margin:0;">The musician has been notified. Use Messages to coordinate logistics before the event.</p>
      `,
      cta: { href: `${appUrl()}/hirer/bookings`, label: 'View booking' },
      footerExtra: 'We’ll remind you as the date approaches.',
    }),
  }),
};
