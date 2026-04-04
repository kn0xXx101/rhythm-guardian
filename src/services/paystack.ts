import { supabase } from '@/lib/supabase';

export interface PaystackConfig {
  publicKey: string;
}

export interface PaymentData {
  email: string;
  amount: number; // Amount in kobo (smallest currency unit)
  currency?: string;
  reference: string;
  metadata?: Record<string, any>;
  channels?: ('card' | 'bank' | 'ussd' | 'qr' | 'mobile_money' | 'bank_transfer')[];
  subaccount?: string;
  transaction_charge?: number;
  callback?: (response: PaystackResponse) => void;
  onClose?: () => void;
}

export interface PaystackResponse {
  status: 'success' | 'failed' | 'abandoned';
  reference: string;
  trans?: string;
  transaction?: string;
  trxref?: string;
  message?: string;
}

export interface PaymentVerification {
  status: boolean;
  message: string;
  data?: {
    id: number;
    domain: string;
    status: 'success' | 'failed' | 'abandoned';
    reference: string;
    amount: number;
    message: string | null;
    gateway_response: string;
    paid_at: string;
    created_at: string;
    channel: string;
    currency: string;
    ip_address: string;
    metadata?: Record<string, any>;
    fees: number;
    customer: {
      id: number;
      email: string;
      customer_code: string;
    };
    authorization: {
      authorization_code: string;
      bin: string;
      last4: string;
      exp_month: string;
      exp_year: string;
      channel: string;
      card_type: string;
      bank: string;
      country_code: string;
      brand: string;
      reusable: boolean;
      signature: string;
    };
  };
}

/**
 * Paystack Payment Service
 *
 * This service handles all Paystack payment operations including:
 * - Initializing payments
 * - Verifying transactions
 * - Managing payment references
 * - Updating transaction records
 */
class PaystackService {
  private config: PaystackConfig | null = null;
  private scriptLoaded: boolean = false;

  /**
   * Initialize Paystack with public key
   */
  async initialize(): Promise<void> {
    try {
      // 1. Try to get from environment variable first
      const envKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
      if (envKey) {
        // Validate key format - accept both pk_ and psk_ prefixes
        if (!envKey.startsWith('pk_test_') && !envKey.startsWith('pk_live_') && !envKey.startsWith('psk_test_') && !envKey.startsWith('psk_live_')) {
          console.error('Invalid Paystack key format. Key should start with pk_test_, pk_live_, psk_test_, or psk_live_');
          throw new Error('Invalid Paystack public key format. Please check your .env file.');
        }
        
        console.log('Using Paystack public key from environment');
        this.config = { publicKey: envKey };
        await this.loadPaystackScript();
        return;
      }

      // 2. Fallback to database settings
      const { data: settings } = await supabase
        .from('platform_settings')
        .select('value')
        .eq('key', 'integrations')
        .single();

      const settingsValue = settings?.value as any;
      if (settingsValue?.paystackPublicKey) {
        console.log('Using Paystack public key from database');
        this.config = {
          publicKey: settingsValue.paystackPublicKey,
        };
        await this.loadPaystackScript();
      } else {
        const errorMsg = 'Paystack public key not configured. Please add VITE_PAYSTACK_PUBLIC_KEY to your .env file.';
        console.error(errorMsg);
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error('Failed to initialize Paystack:', error);
      throw error;
    }
  }

  /**
   * Load Paystack inline script
   */
  private async loadPaystackScript(): Promise<void> {
    if (this.scriptLoaded) return;

    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        reject(new Error('Paystack can only be loaded in browser environment'));
        return;
      }

      // Check if script already exists
      if ((window as any).PaystackPop) {
        this.scriptLoaded = true;
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.async = true;
      script.onload = () => {
        this.scriptLoaded = true;
        resolve();
      };
      script.onerror = () => reject(new Error('Failed to load Paystack script'));
      document.body.appendChild(script);
    });
  }

  /**
   * Generate a unique payment reference
   */
  generateReference(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `RG-${timestamp}-${random}`;
  }

  /**
   * Initialize a payment
   */
  async initializePayment(paymentData: PaymentData): Promise<void> {
    if (!this.config) {
      throw new Error('Paystack not initialized. Call initialize() first.');
    }

    if (!this.scriptLoaded) {
      await this.loadPaystackScript();
    }

    const PaystackPop = (window as any).PaystackPop;
    if (!PaystackPop) {
      throw new Error('Paystack script not loaded properly');
    }

    const handler = PaystackPop.setup({
      key: this.config.publicKey,
      email: paymentData.email,
      amount: paymentData.amount,
      currency: paymentData.currency || 'GHS',
      ref: paymentData.reference,
      metadata: paymentData.metadata || {},
      channels: paymentData.channels || [
        'card',
        'bank',
        'ussd',
        'qr',
        'mobile_money',
        'bank_transfer',
      ],
      subaccount: paymentData.subaccount,
      transaction_charge: paymentData.transaction_charge,
      callback: (response: PaystackResponse) => {
        console.log('Payment successful:', response);
        if (paymentData.callback) {
          paymentData.callback(response);
        }
      },
      onClose: () => {
        console.log('Payment window closed');
        if (paymentData.onClose) {
          paymentData.onClose();
        }
      },
    });

    handler.openIframe();
  }

  /**
   * Verify a payment transaction
   * Note: This should be called from your backend/Edge Function for security
   * @param reference - The Paystack payment reference
   * @param expectedAmount - Optional amount in pesewas (GHS × 100). When provided,
   *   the Edge Function will reject the verification if Paystack confirms a different amount.
   */
  async verifyTransaction(reference: string, expectedAmount?: number): Promise<PaymentVerification> {
    try {
      console.log('Starting payment verification for reference:', reference);
      
      // Call Edge Function to verify payment
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Supabase configuration missing');
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session - please log in again');
      }

      const edgeFunctionUrl = `${supabaseUrl}/functions/v1/paystack-verify`;
      console.log('Calling Edge Function at:', edgeFunctionUrl);
      console.log('With reference:', reference);
      console.log('Session token exists:', !!session.access_token);

      // Add timeout to fetch request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      try {
        const body: Record<string, unknown> = { reference };
        if (typeof expectedAmount === 'number') {
          body.expectedAmount = expectedAmount;
        }

        const response = await fetch(edgeFunctionUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: supabaseAnonKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        console.log('Edge Function response status:', response.status);

        if (!response.ok) {
          let errorMessage = 'Failed to verify payment';
          try {
            const error = await response.json();
            console.error('Edge Function error response:', error);
            errorMessage = error.message || error.error || errorMessage;
            
            // Check if it's a configuration issue
            if (errorMessage.includes('PAYSTACK_SECRET_KEY')) {
              errorMessage = 'Payment verification not configured. Please contact support.';
            }
          } catch (e) {
            errorMessage = `HTTP error! status: ${response.status}`;
            console.error('Failed to parse error response:', e);
          }
          throw new Error(errorMessage);
        }

        const verification: PaymentVerification = await response.json();
        console.log('Verification result:', verification);
        
        return verification;
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        
        if (fetchError.name === 'AbortError') {
          throw new Error('Payment verification timed out. Please try again or contact support.');
        }
        
        throw fetchError;
      }
    } catch (error: any) {
      console.error('Payment verification failed:', error);
      throw new Error(error.message || 'Payment verification failed');
    }
  }

  /**
   * Create a transaction record in database
   */
  async createTransaction(data: {
    bookingId: string;
    userId: string;
    amount: number;
    type: 'booking_payment' | 'refund' | 'platform_fee' | 'payout';
    paymentMethod?: string;
    reference: string;
    status?: 'pending' | 'paid' | 'failed' | 'refunded';
    platformFee?: number;
    currency?: string;
  }): Promise<string> {
    try {
      console.log('Creating transaction for booking:', data.bookingId, 'user:', data.userId);
      
      const payload: any = {
        booking_id: data.bookingId,
        user_id: data.userId,
        amount: data.amount,
        type: data.type,
        payment_method: data.paymentMethod || 'card',
        status: data.status || 'pending',
        paystack_reference: data.reference,
        currency: data.currency || 'GHS',
        platform_fee: data.platformFee || 0,
      };

      const { data: transaction, error } = await supabase
        .from('transactions')
        .insert(payload)
        .select('id')
        .single();

      if (error) {
        console.error('Supabase error creating transaction:', error);
        
        // Handle specific error codes
        if (error.code === '42P10') { // Missing column
          console.warn('Transaction table missing columns, trying fallback insert...');
          const fallbackPayload = {
            booking_id: data.bookingId,
            user_id: data.userId,
            amount: data.amount,
            type: data.type,
            payment_method: data.paymentMethod || 'card',
            status: data.status || 'pending',
          };
          const { data: fallbackTx, error: fallbackError } = await supabase
            .from('transactions')
            .insert(fallbackPayload)
            .select('id')
            .single();
          
          if (fallbackError) throw fallbackError;
          return fallbackTx.id;
        }
        
        throw error;
      }
      
      if (!transaction) throw new Error('Failed to create transaction record');

      return transaction.id;
    } catch (error: any) {
      console.error('Failed to create transaction:', error);
      throw new Error(error.message || error.details || 'Failed to initialize transaction in database');
    }
  }

  /**
   * Update transaction status after verification
   */
  async updateTransaction(reference: string, verificationData: PaymentVerification): Promise<void> {
    try {
      if (!verificationData.data) {
        throw new Error('No verification data provided');
      }

      const { error } = await supabase
        .from('transactions')
        .update({
          status: verificationData.data.status === 'success' ? 'paid' : 'failed',
          paystack_authorization: verificationData.data.authorization,
          channel: verificationData.data.channel,
          ip_address: verificationData.data.ip_address,
          metadata: {
            ...verificationData.data.metadata,
            customer_code: verificationData.data.customer?.customer_code,
            gateway_response: verificationData.data.gateway_response,
          },
        })
        .eq('paystack_reference', reference);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to update transaction:', error);
      throw error;
    }
  }

  /**
   * Process booking payment
   */
  async processBookingPayment(bookingId: string): Promise<void> {
    try {
      // Get booking details
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select('*, hirer:profiles!bookings_hirer_id_fkey(user_id, full_name, email), musician:profiles!bookings_musician_id_fkey(paystack_subaccount)')
        .eq('id', bookingId)
        .single();

      if (bookingError) throw bookingError;
      if (!booking) throw new Error('Booking not found');

      // Get deposit percentage and platform fee from settings
      const { data: bookingSettings } = await supabase
        .from('platform_settings')
        .select('value')
        .eq('key', 'booking')
        .single();

      const bookingSettingsValue = bookingSettings?.value as any;
      const depositPercentage = bookingSettingsValue?.depositPercentage || 25;
      const totalAmountNum = Number(booking.total_amount) || 0;
      const depositAmount = (totalAmountNum * depositPercentage) / 100;
      
      // Get platform commission rate from booking payment settings
      let platformFeePercentage = 15; // Default fallback
      try {
        const { data: paymentSettings } = await supabase
          .from('platform_settings')
          .select('key, value')
          .in('key', ['booking', 'payment'])
          .limit(2);
        
        // Check booking settings first (new structure)
        const bookingSetting = paymentSettings?.find((s: any) => s.key === 'booking');
        if (bookingSetting?.value) {
          const bookingValue = bookingSetting.value as any;
          if (bookingValue.platformCommissionRate !== undefined) {
            platformFeePercentage = Number(bookingValue.platformCommissionRate);
          }
        }
        
        // Fallback to payment settings (old structure) if not found
        if (platformFeePercentage === 15) {
          const paymentSetting = paymentSettings?.find((s: any) => s.key === 'payment');
          if (paymentSetting?.value) {
            const paymentValue = paymentSetting.value as any;
            if (paymentValue.platform_fee_percentage !== undefined) {
              platformFeePercentage = Number(paymentValue.platform_fee_percentage);
            }
          }
        }
      } catch (error) {
        console.warn('Failed to fetch platform commission rate, using default:', error);
      }
      
      const platformFee = (depositAmount * platformFeePercentage) / 100;

      // Generate payment reference
      const reference = this.generateReference();

      // Get hirer info (handling potential TypeScript issues with Supabase joins)
      const hirer = (booking as any).hirer;
      if (!hirer) throw new Error('Hirer information not found for booking');

      // Get musician subaccount if it exists
      const musicianProfile = (booking as any).musician;
      const subaccount = musicianProfile?.paystack_subaccount;

      // Create transaction record
      await this.createTransaction({
        bookingId: (booking as any).id,
        userId: hirer.user_id,
        amount: depositAmount,
        type: 'booking_payment',
        reference,
        status: 'pending',
        platformFee,
        currency: 'GHS',
      });

      // Initialize payment
      const paymentPayload: PaymentData = {
        email: hirer.email || '',
        amount: Math.round(depositAmount * 100), // Convert to kobo
        reference,
        metadata: {
          bookingId: (booking as any).id,
          hirerId: hirer.user_id,
          musicianId: (booking as any).musician_id,
          type: 'deposit',
        },
        callback: async (response) => {
          if (response.status === 'success') {
            // Verify payment
            const verification = await this.verifyTransaction(reference);

            if (verification.status && verification.data?.status === 'success') {
              // Update transaction
              await this.updateTransaction(reference, verification);

              // Update booking status
              await supabase
                .from('bookings')
                .update({
                  payment_status: 'paid',
                  deposit_paid: true,
                  deposit_amount: depositAmount,
                })
                .eq('id', bookingId);

              console.log('Booking payment successful');
            }
          }
        },
      };

      if (subaccount) {
        paymentPayload.subaccount = subaccount;
        // In split payments, the platform charge is a flat value specified in kobo
        // Or if percentage, Paystack handles it automatically based on subaccount config.
        // We'll let Paystack logic use the subaccount's built-in percentage_charge 
        // that we set during createSubaccount, so we don't necessarily need transaction_charge
        // but supplying it can override the subaccount default if we want exact control.
        // paymentPayload.transaction_charge = Math.round(platformFee * 100); 
      }

      await this.initializePayment(paymentPayload);
    } catch (error) {
      console.error('Failed to process booking payment:', error);
      throw error;
    }
  }

  /**
   * Check if Paystack is configured
   */
  isConfigured(): boolean {
    const envKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
    const isConfigured = !!this.config?.publicKey || !!envKey;
    
    if (!isConfigured) {
      console.warn('Paystack configuration check failed. config.publicKey:', this.config?.publicKey, 'envKey:', !!envKey);
    }
    
    return isConfigured;
  }

  /**
   * Create a Paystack Subaccount for a musician
   */
  async createSubaccount(data: {
    business_name: string;
    settlement_bank: string;
    account_number: string;
    percentage_charge: number;
  }): Promise<string> {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Supabase configuration missing');
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session. Please log in first.');
      }

      const edgeFunctionUrl = `${supabaseUrl}/functions/v1/create-paystack-subaccount`;
      
      const requestBody = {
        business_name: data.business_name,
        settlement_bank: data.settlement_bank,
        account_number: data.account_number,
        percentage_charge: data.percentage_charge
      };

      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: supabaseAnonKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create subaccount');
      }

      const result = await response.json();
      return result.subaccount_code;
    } catch (error: any) {
      console.error('Error creating subaccount:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const paystackService = new PaystackService();
