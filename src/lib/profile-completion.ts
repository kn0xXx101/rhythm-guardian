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
    { key: 'location', label: 'Location', weight: 10 },
    { key: 'phone', label: 'Phone Number', weight: 10 },
    { key: 'avatar_url', label: 'Profile Photo', weight: 10 },
  ];

  const musicianFields: Array<{ key: keyof Profile | 'pricing'; label: string; weight: number }> = [
    { key: 'instruments', label: 'Instruments', weight: 15 },
    { key: 'genres', label: 'Genres', weight: 10 },
    { key: 'pricing' as any, label: 'Pricing (Hourly or Base)', weight: 10 },
    { key: 'available_days', label: 'Available Days', weight: 10 },
  ];

  const fieldsToCheck =
    profile.role === 'musician' ? [...requiredFields, ...musicianFields] : requiredFields;

  const totalWeight = fieldsToCheck.reduce((sum, field) => sum + field.weight, 0);
  let completedWeight = 0;
  const missingFields: string[] = [];

  fieldsToCheck.forEach((field) => {
    let isComplete = false;
    const key = field.key as string;

    if (key === 'pricing') {
      const hourlyRate = profile.hourly_rate;
      const basePrice = (profile as any).base_price;
      isComplete = (hourlyRate !== null && hourlyRate !== undefined && Number(hourlyRate) > 0) ||
                   (basePrice !== null && basePrice !== undefined && Number(basePrice) > 0);
    } else {
      const value = profile[field.key as keyof Profile];
      if (Array.isArray(value)) {
        isComplete = value.length > 0;
      } else if (typeof value === 'number') {
        isComplete = value > 0;
      } else if (typeof value === 'string') {
        isComplete = value.trim().length > 0;
      } else {
        isComplete = value !== null && value !== undefined;
      }
    }

    if (isComplete) {
      completedWeight += field.weight;
    } else {
      missingFields.push(field.label);
    }
  });

  const percentage = Math.round((completedWeight / totalWeight) * 100);
  const isComplete = missingFields.length === 0;

  return {
    percentage,
    missingFields,
    isComplete,
  };
}

export function getCompletionMessage(result: ProfileCompletionResult): string {
  if (result.isComplete || result.percentage >= 100) {
    return 'Your profile is complete!';
  }

  if (result.percentage >= 80) {
    return `Almost there — add ${result.missingFields.slice(0, 3).join(', ')}${result.missingFields.length > 3 ? '…' : ''}`;
  }

  if (result.percentage >= 50) {
    return `Your profile is ${result.percentage}% complete. Add ${result.missingFields.join(', ')} to improve your visibility.`;
  }

  return `Complete your profile to get the most from the platform. Missing: ${result.missingFields.join(', ')}`;
}

export function getCompletionColor(percentage: number): string {
  if (percentage >= 95) return 'text-success';
  if (percentage >= 50) return 'text-warning';
  return 'text-destructive';
}
