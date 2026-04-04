// Temporary component to help set rates for testing
// Remove this in production

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { setMusicianRate, findMusicianByName } from '@/utils/admin-rate-setter';

export const QuickRateSetter = () => {
  const [musicianName, setMusicianName] = useState('');
  const [rate, setRate] = useState('');
  const [pricingModel, setPricingModel] = useState<'hourly' | 'fixed'>('hourly');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSetRate = async () => {
    if (!musicianName || !rate) {
      toast({
        title: 'Missing Information',
        description: 'Please enter both musician name and rate',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Find musician
      const musicians = await findMusicianByName(musicianName);
      if (!musicians || musicians.length === 0) {
        throw new Error('Musician not found');
      }

      const musician = musicians[0];
      const rateValue = parseFloat(rate);

      // Set rate
      if (pricingModel === 'hourly') {
        await setMusicianRate(musician.user_id, rateValue, 'hourly');
      } else {
        await setMusicianRate(musician.user_id, undefined, 'fixed', rateValue);
      }

      toast({
        title: 'Success',
        description: `Rate set for ${musician.full_name}: ${pricingModel === 'hourly' ? `GHS ${rateValue}/hr` : `GHS ${rateValue} (fixed)`}`,
      });

      // Clear form
      setMusicianName('');
      setRate('');
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to set rate',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Quick Rate Setter (Testing Only)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="musician-name">Musician Name</Label>
          <Input
            id="musician-name"
            placeholder="e.g., Manasseh"
            value={musicianName}
            onChange={(e) => setMusicianName(e.target.value)}
          />
        </div>
        
        <div>
          <Label htmlFor="pricing-model">Pricing Model</Label>
          <Select value={pricingModel} onValueChange={(value: 'hourly' | 'fixed') => setPricingModel(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hourly">Hourly Rate</SelectItem>
              <SelectItem value="fixed">Fixed Price</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="rate">
            {pricingModel === 'hourly' ? 'Hourly Rate (GHS)' : 'Fixed Price (GHS)'}
          </Label>
          <Input
            id="rate"
            type="number"
            placeholder="e.g., 150"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
          />
        </div>

        <Button onClick={handleSetRate} disabled={loading} className="w-full">
          {loading ? 'Setting Rate...' : 'Set Rate'}
        </Button>
      </CardContent>
    </Card>
  );
};