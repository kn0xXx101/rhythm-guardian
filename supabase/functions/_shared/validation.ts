/**
 * Server-side validation utilities for Supabase Edge Functions
 * 
 * This file contains validation functions that can be used in Supabase Edge Functions
 * to validate user input server-side.
 */

import { z } from 'zod';

/**
 * Common validation schemas
 */
export const emailSchema = z.string().email('Invalid email address').max(255);
export const passwordSchema = z.string().min(8, 'Password must be at least 8 characters').max(128);
export const nameSchema = z.string().min(1, 'Name is required').max(100);
export const phoneSchema = z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number');
export const urlSchema = z.string().url('Invalid URL').max(2048);
export const uuidSchema = z.string().uuid('Invalid UUID');

/**
 * Booking validation schema
 */
export const bookingSchema = z.object({
  musician_id: uuidSchema,
  hirer_id: uuidSchema,
  event_type: z.string().min(1).max(100),
  event_date: z.string().datetime(),
  duration_hours: z.number().int().min(1).max(24),
  location: z.string().min(1).max(500),
  budget: z.number().min(0),
  total_amount: z.number().min(0),
  requirements: z.string().max(5000).optional(),
});

/**
 * Message validation schema
 */
export const messageSchema = z.object({
  sender_id: uuidSchema,
  receiver_id: uuidSchema,
  content: z.string().min(1, 'Message cannot be empty').max(1000, 'Message too long'),
  booking_id: uuidSchema.optional(),
  reply_to: uuidSchema.optional(),
});

/**
 * Profile validation schema
 */
export const profileUpdateSchema = z.object({
  full_name: nameSchema.optional(),
  bio: z.string().max(2000).optional(),
  location: z.string().max(200).optional(),
  phone: phoneSchema.optional(),
  instruments: z.array(z.string()).max(10).optional(),
  hourly_rate: z.number().min(0).max(10000).optional(),
  availability: z.record(z.boolean()).optional(),
});

/**
 * Review validation schema
 */
export const reviewSchema = z.object({
  booking_id: uuidSchema,
  reviewer_id: uuidSchema,
  reviewee_id: uuidSchema,
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
});

/**
 * Generic validation function
 */
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Sanitize string input (basic XSS prevention)
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validate and sanitize input
 */
export function validateAndSanitize<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  const validationResult = validate(schema, data);
  if (!validationResult.success) {
    return { 
      success: false, 
      error: validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
    };
  }
  
  // Additional sanitization for string fields
  if (typeof validationResult.data === 'object' && validationResult.data !== null) {
    const sanitized = { ...validationResult.data };
    for (const key in sanitized) {
      if (typeof sanitized[key] === 'string') {
        sanitized[key] = sanitizeString(sanitized[key]);
      }
    }
    return { success: true, data: sanitized as T };
  }
  
  return { success: true, data: validationResult.data };
}

