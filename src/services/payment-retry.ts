/**
 * Payment Retry Logic with Exponential Backoff
 * Ensures payment reliability even with network issues
 */

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  timeout?: number;
}

export class PaymentRetryError extends Error {
  constructor(
    message: string,
    public attempts: number,
    public lastError: Error
  ) {
    super(message);
    this.name = 'PaymentRetryError';
  }
}

/**
 * Sleep utility
 */
const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
    timeout = 30000,
  } = options;

  let lastError: Error;
  let delay = initialDelay;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Wrap in timeout
      const result = await withTimeout(fn(), timeout);
      
      // Log successful retry if not first attempt
      if (attempt > 0) {
        console.log(`[PaymentRetry] Succeeded on attempt ${attempt + 1}`);
      }
      
      return result;
    } catch (error) {
      lastError = error as Error;
      
      console.error(
        `[PaymentRetry] Attempt ${attempt + 1}/${maxRetries} failed:`,
        error
      );

      // Don't retry on last attempt
      if (attempt === maxRetries - 1) {
        break;
      }

      // Don't retry on certain errors
      if (isNonRetryableError(error)) {
        console.log('[PaymentRetry] Non-retryable error, stopping');
        break;
      }

      // Wait before retry with exponential backoff
      console.log(`[PaymentRetry] Waiting ${delay}ms before retry...`);
      await sleep(delay);
      
      // Increase delay for next attempt
      delay = Math.min(delay * backoffMultiplier, maxDelay);
    }
  }

  throw new PaymentRetryError(
    `Payment failed after ${maxRetries} attempts`,
    maxRetries,
    lastError!
  );
}

/**
 * Wrap promise with timeout
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number
): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms)
  );

  return Promise.race([promise, timeout]);
}

/**
 * Check if error should not be retried
 */
function isNonRetryableError(error: any): boolean {
  // Don't retry on validation errors
  if (error.message?.includes('validation')) return true;
  if (error.message?.includes('invalid')) return true;
  if (error.message?.includes('unauthorized')) return true;
  if (error.message?.includes('forbidden')) return true;
  
  // Don't retry on 4xx errors (except 429 rate limit)
  if (error.status >= 400 && error.status < 500 && error.status !== 429) {
    return true;
  }

  return false;
}

/**
 * Retry specifically for payment operations
 */
export async function retryPayment<T>(
  fn: () => Promise<T>,
  paymentId: string
): Promise<T> {
  console.log(`[PaymentRetry] Starting payment ${paymentId}`);
  
  try {
    const result = await retryWithBackoff(fn, {
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 5000,
      timeout: 30000,
    });
    
    console.log(`[PaymentRetry] Payment ${paymentId} succeeded`);
    return result;
  } catch (error) {
    console.error(`[PaymentRetry] Payment ${paymentId} failed:`, error);
    throw error;
  }
}

/**
 * Retry for payout operations
 */
export async function retryPayout<T>(
  fn: () => Promise<T>,
  payoutId: string
): Promise<T> {
  console.log(`[PaymentRetry] Starting payout ${payoutId}`);
  
  try {
    const result = await retryWithBackoff(fn, {
      maxRetries: 5, // More retries for payouts
      initialDelay: 2000,
      maxDelay: 10000,
      timeout: 60000, // Longer timeout for payouts
    });
    
    console.log(`[PaymentRetry] Payout ${payoutId} succeeded`);
    return result;
  } catch (error) {
    console.error(`[PaymentRetry] Payout ${payoutId} failed:`, error);
    throw error;
  }
}

/**
 * Retry for refund operations
 */
export async function retryRefund<T>(
  fn: () => Promise<T>,
  refundId: string
): Promise<T> {
  console.log(`[PaymentRetry] Starting refund ${refundId}`);
  
  try {
    const result = await retryWithBackoff(fn, {
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 5000,
      timeout: 30000,
    });
    
    console.log(`[PaymentRetry] Refund ${refundId} succeeded`);
    return result;
  } catch (error) {
    console.error(`[PaymentRetry] Refund ${refundId} failed:`, error);
    throw error;
  }
}
