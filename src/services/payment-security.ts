/**
 * Payment Security & Idempotency
 * Prevents duplicate payments and ensures transaction integrity
 */

import { supabase } from '@/lib/supabase';
import crypto from 'crypto-js';

/**
 * Generate idempotency key for payment
 */
export function generateIdempotencyKey(
  userId: string,
  bookingId: string,
  amount: number
): string {
  const timestamp = Date.now();
  const data = `${userId}-${bookingId}-${amount}-${timestamp}`;
  return crypto.SHA256(data).toString();
}

/**
 * Check if payment with idempotency key already exists
 */
export async function checkIdempotencyKey(
  key: string
): Promise<{ exists: boolean; result?: any }> {
  try {
    const { data, error } = await supabase
      .from('transactions' as any)
      .select('*')
      .eq('idempotency_key', key)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned
      throw error;
    }

    return {
      exists: !!data,
      result: data,
    };
  } catch (error) {
    console.error('Error checking idempotency key:', error);
    return { exists: false };
  }
}

/**
 * Store idempotency key with result
 */
export async function storeIdempotencyKey(
  key: string,
  transactionId: string,
  result: any
): Promise<void> {
  try {
    await supabase.from('transactions' as any).update({
      idempotency_key: key,
      metadata: {
        ...result,
        idempotency_stored_at: new Date().toISOString(),
      },
    }).eq('id', transactionId);
  } catch (error) {
    console.error('Error storing idempotency key:', error);
  }
}

/**
 * Validate payment amount
 */
export function validatePaymentAmount(amount: number): {
  valid: boolean;
  error?: string;
} {
  if (amount <= 0) {
    return { valid: false, error: 'Amount must be greater than 0' };
  }

  if (amount > 1000000) {
    // Max 1M GHS
    return { valid: false, error: 'Amount exceeds maximum limit' };
  }

  if (!Number.isFinite(amount)) {
    return { valid: false, error: 'Amount must be a valid number' };
  }

  // Check for reasonable decimal places (max 2)
  const decimalPlaces = (amount.toString().split('.')[1] || '').length;
  if (decimalPlaces > 2) {
    return { valid: false, error: 'Amount can have maximum 2 decimal places' };
  }

  return { valid: true };
}

/**
 * Validate payment reference
 */
export function validatePaymentReference(reference: string): {
  valid: boolean;
  error?: string;
} {
  if (!reference || reference.trim().length === 0) {
    return { valid: false, error: 'Payment reference is required' };
  }

  if (reference.length > 100) {
    return { valid: false, error: 'Payment reference too long' };
  }

  // Check for valid characters (alphanumeric, dash, underscore)
  if (!/^[a-zA-Z0-9_-]+$/.test(reference)) {
    return { valid: false, error: 'Payment reference contains invalid characters' };
  }

  return { valid: true };
}

/**
 * Sanitize payment data
 */
export function sanitizePaymentData(data: any): any {
  return {
    amount: parseFloat(data.amount),
    currency: (data.currency || 'GHS').toUpperCase(),
    reference: data.reference?.trim(),
    email: data.email?.toLowerCase().trim(),
    metadata: {
      ...data.metadata,
      sanitized_at: new Date().toISOString(),
    },
  };
}

/**
 * Verify payment signature (for webhooks)
 */
export function verifyPaymentSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const hash = crypto.HmacSHA512(payload, secret).toString();
  return hash === signature;
}

/**
 * Rate limit check for payments
 */
const paymentAttempts = new Map<string, number[]>();

export function checkPaymentRateLimit(
  userId: string,
  maxAttempts: number = 5,
  windowMs: number = 60000 // 1 minute
): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const userAttempts = paymentAttempts.get(userId) || [];

  // Remove old attempts outside the window
  const recentAttempts = userAttempts.filter((time) => now - time < windowMs);

  if (recentAttempts.length >= maxAttempts) {
    const oldestAttempt = Math.min(...recentAttempts);
    const retryAfter = windowMs - (now - oldestAttempt);
    return { allowed: false, retryAfter };
  }

  // Add current attempt
  recentAttempts.push(now);
  paymentAttempts.set(userId, recentAttempts);

  return { allowed: true };
}

/**
 * Detect suspicious payment patterns
 */
export function detectSuspiciousPayment(data: {
  userId: string;
  amount: number;
  recentPayments: number[];
}): { suspicious: boolean; reason?: string } {
  const { userId, amount, recentPayments } = data;

  // Check for rapid successive payments
  if (recentPayments.length > 10) {
    return {
      suspicious: true,
      reason: 'Too many payments in short time',
    };
  }

  // Check for unusually large amount
  const avgAmount = recentPayments.reduce((a, b) => a + b, 0) / recentPayments.length;
  if (amount > avgAmount * 10 && amount > 10000) {
    return {
      suspicious: true,
      reason: 'Unusually large payment amount',
    };
  }

  // Check for round numbers (potential testing)
  if (amount % 1000 === 0 && amount > 10000) {
    return {
      suspicious: true,
      reason: 'Suspicious round number',
    };
  }

  return { suspicious: false };
}

/**
 * Log payment attempt for audit
 */
export async function logPaymentAttempt(data: {
  userId: string;
  bookingId: string;
  amount: number;
  status: 'success' | 'failed' | 'pending';
  error?: string;
  metadata?: any;
}): Promise<void> {
  try {
    await supabase.from('payment_audit_log' as any).insert({
      user_id: data.userId,
      booking_id: data.bookingId,
      amount: data.amount,
      status: data.status,
      error_message: data.error,
      metadata: data.metadata,
      ip_address: await getClientIP(),
      user_agent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error logging payment attempt:', error);
  }
}

/**
 * Get client IP address
 */
async function getClientIP(): Promise<string> {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch {
    return 'unknown';
  }
}

/**
 * Encrypt sensitive payment data
 */
export function encryptPaymentData(data: string, key: string): string {
  return crypto.AES.encrypt(data, key).toString();
}

/**
 * Decrypt sensitive payment data
 */
export function decryptPaymentData(encryptedData: string, key: string): string {
  const bytes = crypto.AES.decrypt(encryptedData, key);
  return bytes.toString(crypto.enc.Utf8);
}
