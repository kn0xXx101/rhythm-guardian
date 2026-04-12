import type { Database } from '@/types/supabase';

type Profile = Database['public']['Tables']['profiles']['Row'];

export interface ProfileCompletionResult {
  percentage: number;
  missingFields: string[];
  isComplete: boolean;
}

export function calculateProfileCompletion(
  profile: Partial<Profile> | null
): ProfileCompletionResult {
  if (!profile) {
    return {
      percentage: 0,
      missingFields: ['All fields'],
      isComplete: false,
    };
  }

  const requiredFields: Array<{ key: keyof Profile; label: string; weight: number }> = [
    { key: 'full_name', label: 'Full Name', weight: 10 },
    { key: 'bio', label: 'Bio', weight: 15 },
    { key: 'location', label: "Location", weight: 10 },
    { key: 'phone', label: 'Phone Number', weight: 10 },
    { key: 'avatar_url', label: 'Profile Photo', weight: 5 },
  ];

  const musicianFields: Array<{ key: keyof Profile; label: string; weight: number; optional?: boolean }> = [
    { key: 'instruments', label: 'Instruments', weight: 10 },
    { key: 'genres', label: 'Genres', weight: 10 },
    { key: 'hourly_rate', label: 'Pricing Info', weight: 10 }, 
    { key: 'mobile_money_number', label: 'Payment Details', weight: 10 },
    { key: 'available_days', label: 'Availability', weight: 10 },
  ];

  const fieldsToCheck =
    profile.role === 'musician' ? [...requiredFields, ...musicianFields] : requiredFields;

  const totalWeight = fieldsToCheck.reduce((sum, field) => sum + field.weight, 0);
  let completedWeight = 0;
  const missingFields: string[] = [];

  fieldsToCheck.forEach((field) => {
    const value = profile[field.key];
    let isComplete = false;

    // Special handling for pricing - At least one selection (hourly_rate or base_price)
    if (field.key === 'hourly_rate') {
      const hourlyRate = profile.hourly_rate;
      const basePrice = profile.base_price;
      const pricingModel = profile.pricing_model;
      
      if (pricingModel === 'fixed') {
        isComplete = typeof basePrice === 'number' && Number(basePrice) > 0;
      } else if (pricingModel === 'hourly') {
        isComplete = typeof hourlyRate === 'number' && Number(hourlyRate) > 0;
      } else {
        isComplete = (typeof hourlyRate === 'number' && Number(hourlyRate) > 0) || 
                     (typeof basePrice === 'number' && Number(basePrice) > 0);
      }
    } 
    // Special handling for payment - MUST have EITHER full Mobile Money OR full Bank Account
    else if (field.key === 'mobile_money_number') {
      const momoNumber = profile.mobile_money_number;
      const momoName = profile.mobile_money_name;
      const momoProvider = profile.mobile_money_provider;
      
      const bankNumber = profile.bank_account_number;
      const bankName = profile.bank_account_name;
      const bankCode = profile.bank_code;

      const momoComplete = !!(momoNumber && momoNumber.toString().trim() && momoName && momoProvider);
      const bankComplete = !!(bankNumber && bankNumber.toString().trim() && bankName && bankCode);

      isComplete = momoComplete || bankComplete;
    }
    // Special handling for availability - At least one selection
    else if (field.key === 'available_days') {
      const days = Array.isArray(value) ? value : [];
      isComplete = days.some(d => ['weekdays', 'weekends', 'all_week'].includes(d) || d.startsWith('wd_start:') || d.startsWith('we_start:'));
    }
    else if (Array.isArray(value)) {
      isComplete = value.length > 0;
    } else if (typeof value === 'number') {
      isComplete = Number(value) > 0;
    } else if (typeof value === 'string') {
      isComplete = value.trim().length > 0;
    } else {
      isComplete = value !== null && value !== undefined;
    }

    if (isComplete) {
      completedWeight += field.weight;
    } else {
      missingFields.push(field.label);
    }
  });

  const percentage = Math.min(100, Math.round((completedWeight / totalWeight) * 100));
  const isComplete = percentage >= 80;

  return {
    percentage,
    missingFields,
    isComplete,
  };
}

export function getCompletionMessage(result: ProfileCompletionResult): string {
  if (result.percentage >= 100) {
    return 'Your profile is complete!';
  }

  if (result.percentage >= 80) {
    return 'Your profile looks great! Consider completing the remaining fields.';
  }

  if (result.percentage >= 50) {
    return `Your profile is ${result.percentage}% complete. Add ${result.missingFields.join(', ')} to improve your visibility.`;
  }

  return `Complete your profile to start receiving bookings. Missing: ${result.missingFields.join(', ')}`;
}

export function getCompletionColor(percentage: number): string {
  if (percentage >= 80) return 'text-success';
  if (percentage >= 50) return 'text-warning';
  return 'text-destructive';
}
