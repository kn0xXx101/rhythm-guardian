import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatGHSWithSymbol } from '@/lib/currency';
import { Info, Wallet, Minus, Plus, Coins, Calculator, Clock } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface FeeBreakdownProps {
  bookingAmount?: number;
  platformCommissionRate: number;
  showDetailed?: boolean;
  className?: string;
  isCalculator?: boolean;
}

export function FeeBreakdown({ 
  bookingAmount: initialAmount = 100, 
  platformCommissionRate, 
  showDetailed = false,
  className = "",
  isCalculator = false
}: FeeBreakdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [flatAmount, setFlatAmount] = useState(initialAmount);
  const [hourlyRate, setHourlyRate] = useState(50);
  const [hours, setHours] = useState(2);

  // Calculate fees for flat rate
  const calculateFees = (amount: number) => {
    const platformFee = amount * (platformCommissionRate / 100);
    const paystackFeePercentage = 1.5;
    const paystackFixedFee = 0.50;
    const paystackFee = (amount * (paystackFeePercentage / 100)) + paystackFixedFee;
    const totalFees = platformFee + paystackFee;
    const musicianReceives = Math.max(0, amount - totalFees);

    return {
      platformFee,
      paystackFee,
      totalFees,
      musicianReceives,
      paystackFeePercentage,
      paystackFixedFee
    };
  };

  const flatFees = calculateFees(flatAmount);
  const hourlyTotal = hourlyRate * hours;
  const hourlyFees = calculateFees(hourlyTotal);

  const BreakdownContent = ({ amount, fees, showInputs = false, type = 'flat' }: { 
    amount: number; 
    fees: ReturnType<typeof calculateFees>;
    showInputs?: boolean;
    type?: 'flat' | 'hourly';
  }) => (
    <div className="space-y-4">
      {showInputs && (
        <div className="space-y-3">
          {type === 'flat' ? (
            <div className="bg-white p-4 rounded-lg border-2">
              <Label htmlFor="flat-amount" className="text-sm text-muted-foreground mb-2 block">
                Enter Booking Amount
              </Label>
              <Input
                id="flat-amount"
                type="number"
                min="1"
                step="0.01"
                value={flatAmount}
                onChange={(e) => setFlatAmount(Math.max(1, parseFloat(e.target.value) || 0))}
                className="text-3xl font-bold h-16 text-center border-0 bg-gray-900 text-white"
                placeholder="0"
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-white p-4 rounded-lg border-2">
                <Label htmlFor="hourly-rate" className="text-sm text-muted-foreground mb-2 block">
                  Hourly Rate (₵)
                </Label>
                <Input
                  id="hourly-rate"
                  type="number"
                  min="1"
                  step="0.01"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(Math.max(1, parseFloat(e.target.value) || 0))}
                  className="text-2xl font-bold h-14 text-center border-0 bg-gray-900 text-white"
                  placeholder="0"
                />
              </div>
              <div className="bg-white p-4 rounded-lg border-2">
                <Label htmlFor="hours" className="text-sm text-muted-foreground mb-2 block">
                  Number of Hours
                </Label>
                <Input
                  id="hours"
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={hours}
                  onChange={(e) => setHours(Math.max(0.5, parseFloat(e.target.value) || 0))}
                  className="text-2xl font-bold h-14 text-center border-0 bg-gray-900 text-white"
                  placeholder="0"
                />
              </div>
            </div>
          )}
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border-2 border-green-200">
          <div className="flex items-center gap-3">
            <Plus className="h-5 w-5 text-green-600" />
            <span className="font-medium text-gray-700">
              {type === 'hourly' ? `${hours}h × ₵${hourlyRate}/hr` : 'Booking Amount'}
            </span>
          </div>
          <span className="font-bold text-2xl text-green-600">
            {formatGHSWithSymbol(amount)}
          </span>
        </div>

        <div className="pt-2">
          <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">
            Deductions
          </h4>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-100">
              <div className="flex items-center gap-3">
                <Minus className="h-5 w-5 text-red-600" />
                <div>
                  <div className="font-medium text-gray-700">Platform Commission</div>
                  <div className="text-xs text-gray-500">
                    {platformCommissionRate}% of booking amount
                  </div>
                </div>
              </div>
              <span className="font-bold text-xl text-red-600">
                -{formatGHSWithSymbol(fees.platformFee)}
              </span>
            </div>

            <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-100">
              <div className="flex items-center gap-3">
                <Minus className="h-5 w-5 text-red-600" />
                <div>
                  <div className="font-medium text-gray-700">Payment Processing</div>
                  <div className="text-xs text-gray-500">
                    Paystack: {fees.paystackFeePercentage}% + ₵{fees.paystackFixedFee.toFixed(2)}
                  </div>
                </div>
              </div>
              <span className="font-bold text-xl text-red-600">
                -{formatGHSWithSymbol(fees.paystackFee)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between p-5 bg-blue-50 rounded-lg border-2 border-blue-300 mt-4">
          <div className="flex items-center gap-3">
            <Wallet className="h-6 w-6 text-blue-600" />
            <div>
              <div className="text-sm text-gray-600">Net after all fees</div>
            </div>
          </div>
          <span className="font-bold text-3xl text-blue-600">
            {formatGHSWithSymbol(fees.musicianReceives)}
          </span>
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg border">
        <h5 className="font-semibold mb-3 flex items-center gap-2 text-gray-700">
          <Info className="h-4 w-4" />
          Fee Breakdown Summary
        </h5>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Platform keeps:</span>
            <span className="font-semibold text-gray-900">{platformCommissionRate.toFixed(1)}%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Payment processor:</span>
            <span className="font-semibold text-gray-900">{((fees.paystackFee / amount) * 100).toFixed(1)}%</span>
          </div>
          <Separator className="my-2" />
          <div className="flex justify-between items-center pt-1">
            <span className="font-semibold text-gray-700">You receive:</span>
            <span className="font-bold text-lg text-blue-600">{((fees.musicianReceives / amount) * 100).toFixed(1)}%</span>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h5 className="font-semibold mb-2 text-blue-900">How It Works</h5>
        <ul className="space-y-1.5 text-sm text-blue-800">
          <li>• Payment is held in escrow until service completion</li>
          <li>• Both parties must confirm service completion</li>
          <li>• Funds are automatically released to your account</li>
          <li>• Platform commission supports service operations</li>
          <li>• Payment processing fees cover transaction costs</li>
        </ul>
      </div>
    </div>
  );

  if (showDetailed || isCalculator) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            {isCalculator ? 'Earnings Calculator' : 'Fee Breakdown'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isCalculator ? (
            <Tabs defaultValue="flat" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="flat" className="flex items-center gap-2">
                  <Coins className="h-4 w-4" />
                  Flat Rate
                </TabsTrigger>
                <TabsTrigger value="hourly" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Hourly Rate
                </TabsTrigger>
              </TabsList>
              <TabsContent value="flat" className="mt-4">
                <BreakdownContent 
                  amount={flatAmount} 
                  fees={flatFees} 
                  showInputs={true}
                  type="flat"
                />
              </TabsContent>
              <TabsContent value="hourly" className="mt-4">
                <BreakdownContent 
                  amount={hourlyTotal} 
                  fees={hourlyFees} 
                  showInputs={true}
                  type="hourly"
                />
              </TabsContent>
            </Tabs>
          ) : (
            <BreakdownContent amount={flatAmount} fees={flatFees} />
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          <Info className="h-4 w-4 mr-2" />
          View Fee Breakdown
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Fee Breakdown Calculator</DialogTitle>
          <DialogDescription>
            Calculate your earnings for different booking amounts
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="flat" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="flat">Flat Rate</TabsTrigger>
            <TabsTrigger value="hourly">Hourly Rate</TabsTrigger>
          </TabsList>
          <TabsContent value="flat" className="mt-4">
            <BreakdownContent 
              amount={flatAmount} 
              fees={flatFees} 
              showInputs={true}
              type="flat"
            />
          </TabsContent>
          <TabsContent value="hourly" className="mt-4">
            <BreakdownContent 
              amount={hourlyTotal} 
              fees={hourlyFees} 
              showInputs={true}
              type="hourly"
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export default FeeBreakdown;