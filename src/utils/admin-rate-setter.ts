// Admin utility to set rates for existing musicians
// This should only be used for testing/demo purposes

import { supabase } from '@/lib/supabase';

export const setMusicianRate = async (
  musicianId: string, 
  hourlyRate?: number, 
  pricingModel: 'hourly' | 'fixed' = 'hourly',
  basePrice?: number
) => {
  try {
    const updateData: any = {
      pricing_model: pricingModel,
    };

    if (pricingModel === 'hourly' && hourlyRate) {
      updateData.hourly_rate = hourlyRate;
      updateData.base_price = null;
    } else if (pricingModel === 'fixed' && basePrice) {
      updateData.base_price = basePrice;
      updateData.hourly_rate = null;
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('user_id', musicianId)
      .eq('role', 'musician')
      .select();

    if (error) throw error;

    console.log('Rate updated successfully:', data);
    return data;
  } catch (error) {
    console.error('Error setting musician rate:', error);
    throw error;
  }
};

// Helper function to find musician by name
export const findMusicianByName = async (name: string) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, full_name, hourly_rate, base_price, pricing_model')
      .eq('role', 'musician')
      .ilike('full_name', `%${name}%`);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error finding musician:', error);
    throw error;
  }
};

// Example usage (run in browser console):
// import { setMusicianRate, findMusicianByName } from './src/utils/admin-rate-setter';
// 
// // Find the musician first
// const musicians = await findMusicianByName('Manasseh');
// console.log(musicians);
// 
// // Set their rate
// await setMusicianRate(musicians[0].user_id, 150, 'hourly');