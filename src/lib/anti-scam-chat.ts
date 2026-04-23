/**
 * Lightweight client-side signals for scam-prone chat content.
 * This is not a content filter: it only drives warnings before send.
 * Server-side: see migration `00058_message_auto_flag_scam_patterns.sql` — a BEFORE INSERT/UPDATE trigger
 * sets `messages.flagged` / `flag_reason` with `auto:*` reasons for overlapping patterns (user reports are preserved).
 */

export type ChatRiskCategory =
  | 'off_platform_payment'
  | 'external_contact'
  | 'financial_details'
  | 'credential_request';

export type ChatRiskAnalysis = {
  shouldWarn: boolean;
  /** Short, user-facing bullet reasons */
  reasons: string[];
  categories: ChatRiskCategory[];
};

const OFF_PLATFORM_PAYMENT: RegExp[] = [
  /\bpay\s+(me\s+)?(outside|off[-\s]?platform|offline|directly)\b/i,
  /\b(cash|wire)\s+(only|payment|upfront)\b/i,
  /\b(venmo|zelle|cashapp|cash\s*app|paypal\.me|paystack\s+link\s+outside)\b/i,
  /\b(send|transfer)\s+(money|funds)\s+(to|directly)\b/i,
  /\b(bypass|skip|avoid)\s+(the\s+)?(platform|app|site|fee)\b/i,
  /\b(full|partial)\s+payment\s+(in\s+)?cash\b/i,
];

const EXTERNAL_CONTACT: RegExp[] = [
  /\b(whatsapp|telegram|signal|discord|snapchat)\b/i,
  /\b(dm|message)\s+me\s+on\s+(insta|instagram|facebook|fb|tiktok|x\b|twitter)\b/i,
  /\b(text|call|whatsapp)\s+me\s+(at|on)\b/i,
  /\b(my|here'?s)\s+(number|phone|cell)\s*(is|:)?\b/i,
  /\b(email|e-?mail)\s+me\s+(at|on)\b/i,
];

const FINANCIAL_DETAILS: RegExp[] = [
  /\b(bank|checking|savings)\s+account\s*(number|no\.?|#)?\b/i,
  /\b(routing|sort)\s+code\b/i,
  /\b(iban|swift|bic)\b/i,
  /\b(card|cvv|cvc|otp|pin)\s*(number|code)?\b/i,
  /\b(mobile\s*money|momo|mtn|vodafone|airteltigo)\s+(number|no\.?)\b/i,
];

const CREDENTIAL: RegExp[] = [
  /\b(password|login|sign[-\s]?in)\s*(details|info)?\b/i,
  /\b(share|send)\s+(your|my)\s+(password|otp|2fa|two[-\s]?factor)\b/i,
];

const PHONE_LIKE = /\b(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{2,4}\)?[-.\s]?)?\d{3}[-.\s]?\d{3,4}[-.\s]?\d{3,6}\b/g;

const EMAIL_LIKE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;

function uniq<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

function matchAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((re) => {
    re.lastIndex = 0;
    return re.test(text);
  });
}

/**
 * Returns whether the composer should show a confirmation before sending.
 */
export function analyzeChatMessageForRisks(text: string): ChatRiskAnalysis {
  const trimmed = text.trim();
  if (!trimmed) {
    return { shouldWarn: false, reasons: [], categories: [] };
  }

  const categories = new Set<ChatRiskCategory>();
  const reasons: string[] = [];

  if (matchAny(trimmed, OFF_PLATFORM_PAYMENT)) {
    categories.add('off_platform_payment');
    reasons.push('Requests to pay outside the platform weaken fraud protection and are against our rules.');
  }
  if (matchAny(trimmed, EXTERNAL_CONTACT)) {
    categories.add('external_contact');
    reasons.push('Moving conversation or payment to other apps makes disputes much harder to resolve fairly.');
  }
  if (matchAny(trimmed, FINANCIAL_DETAILS)) {
    categories.add('financial_details');
    reasons.push('Do not share bank, card, OTP, or wallet details in chat.');
  }
  if (matchAny(trimmed, CREDENTIAL)) {
    categories.add('credential_request');
    reasons.push('Never share passwords or authentication codes with anyone.');
  }

  const phoneMatches = trimmed.match(PHONE_LIKE);
  if (phoneMatches && phoneMatches.some((m) => m.replace(/\D/g, '').length >= 10)) {
    categories.add('external_contact');
    reasons.push('The message looks like it may contain a phone number. Scammers often use this to move you off-platform.');
  }
  if (EMAIL_LIKE.test(trimmed)) {
    categories.add('external_contact');
    reasons.push('The message contains an email address. Be cautious about sharing personal contact details.');
  }

  const dedupedReasons = uniq(reasons).slice(0, 5);
  return {
    shouldWarn: dedupedReasons.length > 0,
    reasons: dedupedReasons,
    categories: [...categories],
  };
}
