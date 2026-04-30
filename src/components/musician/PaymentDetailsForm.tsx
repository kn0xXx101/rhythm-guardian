import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, CheckCircle, AlertTriangle } from 'lucide-react';

export function PaymentDetailsForm() {
  const { refreshUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [mobileMoneyNumber, setMobileMoneyNumber] = useState('');
  const [mobileMoneyProvider, setMobileMoneyProvider] = useState('');
  const [mobileMoneyName, setMobileMoneyName] = useState('');
  const { toast } = useToast();

  const getErrorText = (error: unknown) => {
    if (!error || typeof error !== 'object') return '';
    const message = 'message' in error ? String(error.message) : '';
    const details = 'details' in error ? String(error.details) : '';
    const hint = 'hint' in error ? String(error.hint) : '';
    return `${message} ${details} ${hint}`.toLowerCase();
  };

  const getMissingColumnFromError = (error: unknown) => {
    const text = getErrorText(error);
    const match = text.match(/'([^']+)'\s*column/);
    if (match?.[1]) return match[1];
    const matchAlt = text.match(/column\s+'([^']+)'/);
    return matchAlt?.[1];
  };

  useEffect(() => {
    fetchPaymentDetails();
  }, []);

  const fetchPaymentDetails = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let columns = [
        'bank_account_number',
        'bank_code',
        'bank_account_name',
        'mobile_money_number',
        'mobile_money_provider',
        'mobile_money_name',
      ];
      let profile: any = null;
      let fetchError: any = null;

      for (let attempt = 0; attempt < 3; attempt += 1) {
        const { data, error } = (await supabase
          .from('profiles')
          .select(columns.join(', '))
          .eq('user_id', user.id)
          .single()) as { data: any; error: any };

        if (!error) {
          profile = data;
          fetchError = null;
          break;
        }

        const missingColumn = getMissingColumnFromError(error);
        if (!missingColumn || !columns.includes(missingColumn)) {
          fetchError = error;
          break;
        }

        columns = columns.filter((column) => column !== missingColumn);
        fetchError = error;
      }

      if (fetchError) throw fetchError;

      if (profile) {
        setBankAccountNumber(profile.bank_account_number || '');
        setBankCode(profile.bank_code || '');
        setBankAccountName(profile.bank_account_name || '');
        setMobileMoneyNumber(profile.mobile_money_number || '');
        setMobileMoneyProvider(profile.mobile_money_provider || '');
        setMobileMoneyName(profile.mobile_money_name || '');
      }
    } catch (error) {
      console.error('Error fetching payment details:', error);
    } finally {
      setIsFetching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      // Validate at least one payment method
      if (!bankAccountNumber && !mobileMoneyNumber) {
        toast({
          title: 'Validation Error',
          description: 'Please provide either bank account or mobile money details',
          variant: 'destructive',
        });
        return;
      }

      // Validate bank account details if provided
      if (bankAccountNumber && (!bankCode || !bankAccountName.trim())) {
        toast({
          title: 'Validation Error',
          description: 'Please provide bank code and account name for bank account details',
          variant: 'destructive',
        });
        return;
      }

      // Validate mobile money details if provided
      if (mobileMoneyNumber && (!mobileMoneyProvider || !mobileMoneyName.trim())) {
        toast({
          title: 'Validation Error',
          description: 'Please provide mobile money provider and account name',
          variant: 'destructive',
        });
        return;
      }

      // Build update payload - only include fields that have values
      const payload: any = {
        bank_account_number: bankAccountNumber || null,
        bank_code: bankCode || null,
        bank_account_name: bankAccountName || null,
        mobile_money_number: mobileMoneyNumber || null,
        mobile_money_provider: mobileMoneyProvider || null,
        mobile_money_name: mobileMoneyName || null,
      };

      console.log('Saving payment details:', payload);

      let updateError: any = null;
      
      // Update the profiles table
      const { error } = await supabase
        .from('profiles')
        .update(payload)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating payment details:', error);
        updateError = error;
      }

      if (updateError) throw updateError;

      // Refresh global user state to update completion bar everywhere
      await refreshUser();

      toast({
        title: 'Success',
        description: 'Payment details updated successfully',
      });
    } catch (error: any) {
      console.error('Error updating payment details:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update payment details',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const hasPaymentDetails = bankAccountNumber || mobileMoneyNumber;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Details *</CardTitle>
        <CardDescription>
          Add your bank account or mobile money details to receive payouts (Required for search visibility)
        </CardDescription>
        {hasPaymentDetails ? (
          <div className="flex items-center gap-2 text-green-600 text-sm mt-2">
            <CheckCircle className="h-4 w-4" />
            <span>Payment details configured</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-red-600 text-sm mt-2">
            <AlertTriangle className="h-4 w-4" />
            <span>* Payment details required to appear in search results</span>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Bank Account Section */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Bank Account (Recommended)</h3>
            
            <div className="space-y-2">
              <Label htmlFor="bankCode">Bank Name</Label>
              <Select value={bankCode} onValueChange={setBankCode}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your bank" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GCB">GCB Bank</SelectItem>
                  <SelectItem value="SCB">Standard Chartered</SelectItem>
                  <SelectItem value="CAL">CAL Bank</SelectItem>
                  <SelectItem value="ADB">Agricultural Development Bank</SelectItem>
                  <SelectItem value="FBL">Fidelity Bank</SelectItem>
                  <SelectItem value="EBG">Ecobank Ghana</SelectItem>
                  <SelectItem value="GTB">Guaranty Trust Bank</SelectItem>
                  <SelectItem value="ZBL">Zenith Bank</SelectItem>
                  <SelectItem value="ABG">Access Bank Ghana</SelectItem>
                  <SelectItem value="UBA">United Bank for Africa</SelectItem>
                  <SelectItem value="SBG">Stanbic Bank</SelectItem>
                  <SelectItem value="PBL">Prudential Bank</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountName">Account Name *</Label>
              <Input
                id="accountName"
                placeholder="Full name as it appears on your account"
                value={bankAccountName}
                onChange={(e) => setBankAccountName(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Enter your full name exactly as it appears on your bank account
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountNumber">Account Number</Label>
              <Input
                id="accountNumber"
                placeholder="Enter your account number"
                value={bankAccountNumber}
                onChange={(e) => setBankAccountNumber(e.target.value)}
              />
            </div>
          </div>

          {/* Mobile Money Section */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold text-lg">Mobile Money (Alternative)</h3>
            
            <div className="space-y-2">
              <Label htmlFor="provider">Mobile Money Provider</Label>
              <Select value={mobileMoneyProvider} onValueChange={setMobileMoneyProvider}>
                <SelectTrigger>
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MTN">MTN Mobile Money</SelectItem>
                  <SelectItem value="VOD">Vodafone Cash</SelectItem>
                  <SelectItem value="ATL">AirtelTigo Money</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mobileMoneyName">Account Name</Label>
              <Input
                id="mobileMoneyName"
                placeholder="Full name as registered on mobile money"
                value={mobileMoneyName}
                onChange={(e) => setMobileMoneyName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mobileNumber">Mobile Money Number</Label>
              <Input
                id="mobileNumber"
                placeholder="e.g., 0241234567"
                value={mobileMoneyNumber}
                onChange={(e) => setMobileMoneyNumber(e.target.value)}
              />
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Important Notes:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Ensure your account details are correct to avoid payment delays</li>
              <li>• Bank transfers are processed within 1-3 business days</li>
              <li>• Mobile money transfers are usually instant</li>
              <li>• You can update these details anytime</li>
            </ul>
          </div>

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Payment Details'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
