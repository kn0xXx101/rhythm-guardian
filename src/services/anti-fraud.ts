import { supabase } from '@/lib/supabase';

export interface FraudDetection {
  id: string;
  user_id: string;
  risk_score: number;
  risk_factors: string[];
  is_flagged: boolean;
  flagged_reason?: string;
  flagged_at?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  status: 'active' | 'suspended' | 'cleared';
  created_at: string;
  updated_at: string;
}

export interface MessagingRestriction {
  id: string;
  hirer_id: string;
  musician_id: string;
  can_message: boolean;
  booking_id?: string;
  restriction_reason: string;
  created_at: string;
  updated_at: string;
}

export interface EventLocation {
  id: string;
  booking_id: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  pin_description?: string;
  shared_by: string;
  shared_at: string;
  is_confirmed: boolean;
  confirmed_by?: string;
  confirmed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ReminderPreference {
  id: string;
  user_id: string;
  booking_id: string;
  reminder_type: 'event_start' | 'payment_due' | 'location_share' | 'custom';
  minutes_before: number;
  is_enabled: boolean;
  custom_message?: string;
  notification_methods: string[];
  created_at: string;
  updated_at: string;
}

export interface SuggestedMessage {
  id: string;
  category: 'booking_inquiry' | 'payment_confirmation' | 'event_details' | 'location_sharing' | 'post_event' | 'general';
  message_template: string;
  variables: string[];
  is_active: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * Check if messaging is allowed between two users
 */
export async function canUsersMessage(hirerId: string, musicianId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('can_users_message', {
    hirer_user_id: hirerId,
    musician_user_id: musicianId,
  });

  if (error) {
    console.error('Error checking messaging permissions:', error);
    return false;
  }

  return data || false;
}

/**
 * Calculate fraud risk score for a user
 */
export async function calculateFraudRisk(userId: string): Promise<number> {
  const { data, error } = await supabase.rpc('calculate_fraud_risk', {
    user_uuid: userId,
  });

  if (error) {
    console.error('Error calculating fraud risk:', error);
    return 0;
  }

  return data || 0;
}

/**
 * Get fraud detection record for a user
 */
export async function getFraudDetection(userId: string): Promise<FraudDetection | null> {
  const { data, error } = await supabase
    .from('fraud_detection')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No record found, calculate risk score
      await calculateFraudRisk(userId);
      return getFraudDetection(userId);
    }
    console.error('Error fetching fraud detection:', error);
    return null;
  }

  return data;
}

/**
 * Flag a user for manual review
 */
export async function flagUserForReview(
  userId: string,
  reason: string,
  reviewerId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('fraud_detection')
    .update({
      is_flagged: true,
      flagged_reason: reason,
      flagged_at: new Date().toISOString(),
      reviewed_by: reviewerId,
      status: 'suspended',
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (error) {
    console.error('Error flagging user:', error);
    return false;
  }

  return true;
}

/**
 * Clear fraud flag for a user
 */
export async function clearFraudFlag(userId: string, reviewerId: string): Promise<boolean> {
  const { error } = await supabase
    .from('fraud_detection')
    .update({
      is_flagged: false,
      flagged_reason: null,
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      status: 'cleared',
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (error) {
    console.error('Error clearing fraud flag:', error);
    return false;
  }

  return true;
}

/**
 * Get messaging restrictions for a user
 */
export async function getMessagingRestrictions(userId: string): Promise<MessagingRestriction[]> {
  const { data, error } = await supabase
    .from('messaging_restrictions')
    .select('*')
    .or(`hirer_id.eq.${userId},musician_id.eq.${userId}`);

  if (error) {
    console.error('Error fetching messaging restrictions:', error);
    return [];
  }

  return data || [];
}

/**
 * Share event location
 */
export async function shareEventLocation(
  bookingId: string,
  location: {
    latitude?: number;
    longitude?: number;
    address?: string;
    pin_description?: string;
  },
  sharedBy: string
): Promise<EventLocation | null> {
  const { data, error } = await supabase
    .from('event_locations')
    .upsert({
      booking_id: bookingId,
      latitude: location.latitude,
      longitude: location.longitude,
      address: location.address,
      pin_description: location.pin_description,
      shared_by: sharedBy,
      shared_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Error sharing location:', error);
    return null;
  }

  return data;
}

/**
 * Confirm event location
 */
export async function confirmEventLocation(
  locationId: string,
  confirmedBy: string
): Promise<boolean> {
  const { error } = await supabase
    .from('event_locations')
    .update({
      is_confirmed: true,
      confirmed_by: confirmedBy,
      confirmed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', locationId);

  if (error) {
    console.error('Error confirming location:', error);
    return false;
  }

  return true;
}

/**
 * Get event location for a booking
 */
export async function getEventLocation(bookingId: string): Promise<EventLocation | null> {
  const { data, error } = await supabase
    .from('event_locations')
    .select('*')
    .eq('booking_id', bookingId)
    .single();

  if (error) {
    if (error.code !== 'PGRST116') {
      console.error('Error fetching event location:', error);
    }
    return null;
  }

  return data;
}

/**
 * Set reminder preferences for a booking
 */
export async function setReminderPreferences(
  userId: string,
  bookingId: string,
  preferences: Omit<ReminderPreference, 'id' | 'user_id' | 'booking_id' | 'created_at' | 'updated_at'>[]
): Promise<boolean> {
  // Delete existing preferences for this booking
  await supabase
    .from('reminder_preferences')
    .delete()
    .eq('user_id', userId)
    .eq('booking_id', bookingId);

  // Insert new preferences
  const { error } = await supabase
    .from('reminder_preferences')
    .insert(
      preferences.map(pref => ({
        user_id: userId,
        booking_id: bookingId,
        ...pref,
      }))
    );

  if (error) {
    console.error('Error setting reminder preferences:', error);
    return false;
  }

  // Schedule reminders
  await supabase.rpc('schedule_booking_reminders', {
    booking_uuid: bookingId,
  });

  return true;
}

/**
 * Get reminder preferences for a user and booking
 */
export async function getReminderPreferences(
  userId: string,
  bookingId: string
): Promise<ReminderPreference[]> {
  const { data, error } = await supabase
    .from('reminder_preferences')
    .select('*')
    .eq('user_id', userId)
    .eq('booking_id', bookingId);

  if (error) {
    console.error('Error fetching reminder preferences:', error);
    return [];
  }

  return data || [];
}

/**
 * Get suggested messages by category
 */
export async function getSuggestedMessages(category?: string): Promise<SuggestedMessage[]> {
  let query = supabase
    .from('suggested_messages')
    .select('*')
    .eq('is_active', true)
    .order('usage_count', { ascending: false });

  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching suggested messages:', error);
    return [];
  }

  return data || [];
}

/**
 * Use a suggested message (increment usage count)
 */
export async function useSuggestedMessage(messageId: string): Promise<void> {
  const { error } = await supabase.rpc('increment', {
    table_name: 'suggested_messages',
    row_id: messageId,
    column_name: 'usage_count',
  });

  if (error) {
    console.error('Error updating message usage:', error);
  }
}

/**
 * Replace variables in message template
 */
export function replaceMessageVariables(
  template: string,
  variables: Record<string, string>
): string {
  let message = template;
  
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{${key}}`, 'g');
    message = message.replace(regex, value);
  });

  return message;
}

/**
 * Check if user has high fraud risk
 */
export async function hasHighFraudRisk(userId: string): Promise<boolean> {
  const fraudDetection = await getFraudDetection(userId);
  return fraudDetection ? fraudDetection.risk_score > 70 : false;
}

/**
 * Get all flagged users (admin only)
 */
export async function getFlaggedUsers(): Promise<FraudDetection[]> {
  const { data, error } = await supabase
    .from('fraud_detection')
    .select(`
      *,
      user:profiles!fraud_detection_user_id_fkey(full_name, email, avatar_url)
    `)
    .eq('is_flagged', true)
    .order('flagged_at', { ascending: false });

  if (error) {
    console.error('Error fetching flagged users:', error);
    return [];
  }

  return data || [];
}

/**
 * Get high risk users (admin only)
 */
export async function getHighRiskUsers(): Promise<FraudDetection[]> {
  const { data, error } = await supabase
    .from('fraud_detection')
    .select(`
      *,
      user:profiles!fraud_detection_user_id_fkey(full_name, email, avatar_url)
    `)
    .gte('risk_score', 70)
    .order('risk_score', { ascending: false });

  if (error) {
    console.error('Error fetching high risk users:', error);
    return [];
  }

  return data || [];
}