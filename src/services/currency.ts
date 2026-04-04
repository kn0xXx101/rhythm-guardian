import { supabase } from '@/lib/supabase';

export interface Currency {
  code: string;
  name: string;
  symbol: string;
  decimal_places: number;
  is_active: boolean;
}

export interface ExchangeRate {
  from_currency: string;
  to_currency: string;
  rate: number;
  effective_date: string;
}

export const currencyService = {
  /**
   * Get all supported currencies
   */
  async getCurrencies(): Promise<Currency[]> {
    try {
      const { data, error } = await supabase
        .from('currencies' as any)
        .select('*')
        .eq('is_active', true)
        .order('code');

      if (error) throw error;
      return (data || []) as Currency[];
    } catch (error) {
      console.error('Error fetching currencies:', error);
      return [];
    }
  },

  /**
   * Get exchange rate between two currencies
   */
  async getExchangeRate(fromCurrency: string, toCurrency: string): Promise<number | null> {
    try {
      const { data, error } = await supabase.rpc('get_exchange_rate' as any, {
        p_from_currency: fromCurrency,
        p_to_currency: toCurrency,
      });

      if (error) throw error;
      return data as number;
    } catch (error) {
      console.error('Error fetching exchange rate:', error);
      return null;
    }
  },

  /**
   * Convert amount from one currency to another
   */
  async convertCurrency(
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): Promise<number | null> {
    try {
      const { data, error} = await supabase.rpc('convert_currency' as any, {
        p_amount: amount,
        p_from_currency: fromCurrency,
        p_to_currency: toCurrency,
      });

      if (error) throw error;
      return data as number;
    } catch (error) {
      console.error('Error converting currency:', error);
      return null;
    }
  },

  /**
   * Format amount with currency symbol
   */
  formatAmount(amount: number, currencyCode: string, currencies: Currency[]): string {
    const currency = currencies.find((c) => c.code === currencyCode);
    if (!currency) return `${amount.toFixed(2)}`;

    const formatted = amount.toFixed(currency.decimal_places);
    return `${currency.symbol}${formatted}`;
  },

  /**
   * Get all exchange rates
   */
  async getAllExchangeRates(): Promise<ExchangeRate[]> {
    try {
      const { data, error } = await supabase
        .from('exchange_rates' as any)
        .select('*')
        .order('from_currency')
        .order('to_currency');

      if (error) throw error;
      return (data || []) as ExchangeRate[];
    } catch (error) {
      console.error('Error fetching exchange rates:', error);
      return [];
    }
  },

  /**
   * Update exchange rate (admin only)
   */
  async updateExchangeRate(params: {
    fromCurrency: string;
    toCurrency: string;
    rate: number;
  }) {
    try {
      const { error } = await supabase.from('exchange_rates' as any).upsert({
        from_currency: params.fromCurrency,
        to_currency: params.toCurrency,
        rate: params.rate,
        effective_date: new Date().toISOString().split('T')[0],
        source: 'manual',
      });

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error('Error updating exchange rate:', error);
      return { success: false, error: error.message };
    }
  },
};
