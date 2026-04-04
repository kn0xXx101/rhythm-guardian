export interface SearchPreferences {
  id: string;
  user_id: string;
  name: string;
  instruments?: string[];
  genres?: string[];
  min_price?: number;
  max_price?: number;
  location?: string;
  radius?: number;
  min_rating?: number;
  experience_level?: string;
  is_default: boolean;
  created_at: string;
}

export interface Favorite {
  id: string;
  user_id: string;
  musician_user_id: string;
  collection_name: string;
  notes?: string;
  created_at: string;
}

export interface MusicianAvailability {
  id: string;
  musician_user_id: string;
  date: string;
  status: 'available' | 'booked' | 'blocked';
  time_slots: TimeSlot[];
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface TimeSlot {
  start: string;
  end: string;
  available: boolean;
}

export interface AvailabilityPattern {
  id: string;
  musician_user_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
  created_at: string;
}

export interface PricingPackage {
  id: string;
  musician_user_id: string;
  name: string;
  tier: 'bronze' | 'silver' | 'gold' | 'custom';
  description?: string;
  price: number;
  duration_hours: number;
  includes: string[];
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface PackageAddon {
  id: string;
  musician_user_id: string;
  name: string;
  description?: string;
  price: number;
  is_active: boolean;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  icon?: string;
  is_read: boolean;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  data: Record<string, any>;
  created_at: string;
}

export interface NotificationPreferences {
  id: string;
  user_id: string;
  email_bookings: boolean;
  email_messages: boolean;
  email_reviews: boolean;
  email_promotions: boolean;
  in_app_bookings: boolean;
  in_app_messages: boolean;
  in_app_reviews: boolean;
  in_app_system: boolean;
  push_bookings: boolean;
  push_messages: boolean;
  updated_at: string;
}

export interface PortfolioItem {
  id: string;
  musician_user_id: string;
  type: 'audio' | 'video' | 'photo' | 'document';
  title: string;
  description?: string;
  file_url: string;
  thumbnail_url?: string;
  duration_seconds?: number;
  file_size_bytes?: number;
  display_order: number;
  is_featured: boolean;
  views: number;
  created_at: string;
}

export interface FeaturedListing {
  id: string;
  musician_user_id: string;
  package: 'basic' | 'premium' | 'elite';
  start_date: string;
  end_date: string;
  amount_paid: number;
  position?: number;
  impressions: number;
  clicks: number;
  status: 'active' | 'expired' | 'cancelled';
  created_at: string;
}

export interface PromotionCode {
  id: string;
  code: string;
  type: 'percentage' | 'fixed_amount';
  value: number;
  description?: string;
  max_uses?: number;
  uses_count: number;
  min_booking_amount: number;
  valid_from: string;
  valid_until?: string;
  is_active: boolean;
  created_at: string;
}

export interface ReviewResponse {
  id: string;
  review_id: string;
  musician_user_id: string;
  response: string;
  created_at: string;
  updated_at: string;
}

export interface ReviewMedia {
  id: string;
  review_id: string;
  type: 'photo' | 'video';
  url: string;
  thumbnail_url?: string;
  created_at: string;
}

export interface Referral {
  id: string;
  referrer_id: string;
  referred_email: string;
  referred_user_id?: string;
  referral_code: string;
  status: 'pending' | 'completed' | 'rewarded';
  reward_amount: number;
  created_at: string;
  completed_at?: string;
}

export interface LoyaltyPoints {
  id: string;
  user_id: string;
  points: number;
  reason: string;
  reference_type?: string;
  reference_id?: string;
  expires_at?: string;
  created_at: string;
}

export interface Reward {
  id: string;
  name: string;
  description?: string;
  points_required: number;
  type: 'discount' | 'free_feature' | 'cash_back';
  value: number;
  is_active: boolean;
  created_at: string;
}

export interface Dispute {
  id: string;
  booking_id: string;
  filed_by: string;
  type: 'no_show' | 'quality' | 'payment' | 'cancellation' | 'other';
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high';
  description: string;
  resolution?: string;
  resolved_by?: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface DisputeMessage {
  id: string;
  dispute_id: string;
  sender_id: string;
  message: string;
  is_internal: boolean;
  created_at: string;
}

export interface DisputeEvidence {
  id: string;
  dispute_id: string;
  uploaded_by: string;
  type: 'photo' | 'video' | 'document' | 'audio';
  url: string;
  description?: string;
  created_at: string;
}

export interface BookingProtectionPlan {
  id: string;
  name: string;
  description?: string;
  coverage_percentage: number;
  fee_percentage: number;
  max_claim_amount?: number;
  terms?: string;
  is_active: boolean;
  created_at: string;
}

export interface CancellationPolicy {
  id: string;
  name: string;
  description?: string;
  hours_before_event: number;
  refund_percentage: number;
  is_default: boolean;
  created_at: string;
}

export interface ProtectionClaim {
  id: string;
  booking_id: string;
  claimant_id: string;
  claim_type: string;
  claim_amount: number;
  status: 'pending' | 'approved' | 'denied' | 'paid';
  description: string;
  evidence_urls: string[];
  admin_notes?: string;
  processed_by?: string;
  processed_at?: string;
  created_at: string;
}

export interface VerificationDocument {
  id: string;
  user_id: string;
  document_type: 'national_id' | 'passport' | 'drivers_license' | 'selfie';
  front_url: string;
  back_url?: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  verified_by?: string;
  verified_at?: string;
  created_at: string;
}

export interface VerificationCheck {
  id: string;
  user_id: string;
  check_type: 'identity' | 'email' | 'phone' | 'address' | 'background';
  status: 'pending' | 'passed' | 'failed';
  data: Record<string, any>;
  checked_at: string;
}

export interface BackgroundCheck {
  id: string;
  user_id: string;
  provider?: string;
  status: 'pending' | 'clear' | 'flagged' | 'failed';
  report_url?: string;
  result_data: Record<string, any>;
  initiated_at: string;
  completed_at?: string;
}

export interface AnalyticsEvent {
  id: string;
  user_id?: string;
  event_type: string;
  event_name: string;
  properties: Record<string, any>;
  session_id?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface EarningsSummary {
  id: string;
  musician_user_id: string;
  period_start: string;
  period_end: string;
  total_earnings: number;
  platform_fees: number;
  net_earnings: number;
  completed_bookings: number;
  cancelled_bookings: number;
  refunded_amount: number;
  created_at: string;
}

export interface ReportTemplate {
  id: string;
  user_id: string;
  name: string;
  report_type: string;
  filters: Record<string, any>;
  columns: string[];
  schedule?: string;
  is_active: boolean;
  created_at: string;
}

export interface BookingNegotiation {
  id: string;
  booking_id?: string;
  hirer_id: string;
  musician_id: string;
  status: 'active' | 'accepted' | 'declined' | 'expired';
  current_offer_by?: 'hirer' | 'musician';
  current_price: number;
  original_price: number;
  notes?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CustomProposal {
  id: string;
  negotiation_id: string;
  proposed_by: string;
  price: number;
  duration_hours?: number;
  description?: string;
  includes: string[];
  terms?: string;
  valid_until?: string;
  created_at: string;
}

export interface VideoCall {
  id: string;
  booking_id?: string;
  host_id: string;
  participant_id: string;
  call_type: 'audition' | 'consultation' | 'interview' | 'other';
  scheduled_at: string;
  duration_minutes: number;
  room_url?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'missed';
  notes?: string;
  recording_url?: string;
  started_at?: string;
  ended_at?: string;
  created_at: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body_html: string;
  body_text: string;
  variables: string[];
  category?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ScheduledEmail {
  id: string;
  user_id: string;
  template_name: string;
  trigger_event: string;
  delay_hours: number;
  variables: Record<string, any>;
  status: 'pending' | 'sent' | 'cancelled';
  scheduled_for: string;
  sent_at?: string;
  created_at: string;
}

export interface OnboardingProgress {
  id: string;
  user_id: string;
  completed_steps: string[];
  current_step?: string;
  is_completed: boolean;
  skipped: boolean;
  started_at: string;
  completed_at?: string;
}

export interface FeatureTour {
  id: string;
  user_id: string;
  tour_name: string;
  completed: boolean;
  last_step: number;
  completed_at?: string;
  created_at: string;
}

export interface EnhancedProfile {
  user_id: string;
  instruments?: string[];
  genres?: string[];
  experience_level?: string;
  price_min?: number;
  price_max?: number;
  latitude?: number;
  longitude?: number;
  city?: string;
  state?: string;
  country?: string;
  search_radius?: number;
  is_featured?: boolean;
  featured_until?: string;
  profile_views?: number;
  response_rate?: number;
  response_time_hours?: number;
  identity_verified?: boolean;
  background_check_status?: 'none' | 'pending' | 'clear' | 'flagged';
  trust_score?: number;
}

export interface SearchFilters {
  instruments?: string[];
  genres?: string[];
  minPrice?: number;
  maxPrice?: number;
  location?: string;
  radius?: number;
  minRating?: number;
  experienceLevel?: string;
  availableDate?: string;
  isFeatured?: boolean;
  isVerified?: boolean;
}
