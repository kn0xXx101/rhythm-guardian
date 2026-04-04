import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { shareEventLocation, confirmEventLocation, getEventLocation, type EventLocation } from '@/services/anti-fraud';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { MapPin, Navigation, CheckCircle2, Clock, Share2, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface LocationSharingProps {
  bookingId: string;
  onLocationShared?: (location: EventLocation) => void;
}

export function LocationSharing({ bookingId, onLocationShared }: LocationSharingProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [location, setLocation] = useState<EventLocation | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [showShareForm, setShowShareForm] = useState(false);
  const [formData, setFormData] = useState({
    address: '',
    pin_description: '',
    latitude: '',
    longitude: '',
  });

  useEffect(() => {
    loadEventLocation();
  }, [bookingId]);

  const loadEventLocation = async () => {
    try {
      const data = await getEventLocation(bookingId);
      setLocation(data);
    } catch (error) {
      console.error('Error loading event location:', error);
    }
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: 'Location Not Supported',
        description: 'Your browser does not support location services.',
        variant: 'destructive',
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData(prev => ({
          ...prev,
          latitude: position.coords.latitude.toString(),
          longitude: position.coords.longitude.toString(),
        }));
        toast({
          title: 'Location Captured',
          description: 'Current location has been captured successfully.',
        });
      },
      (error) => {
        console.error('Error getting location:', error);
        toast({
          title: 'Location Error',
          description: 'Unable to get your current location. Please enter manually.',
          variant: 'destructive',
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  const handleShareLocation = async () => {
    if (!user) return;

    if (!formData.address && (!formData.latitude || !formData.longitude)) {
      toast({
        title: 'Missing Information',
        description: 'Please provide either an address or GPS coordinates.',
        variant: 'destructive',
      });
      return;
    }

    setIsSharing(true);
    try {
      const locationData = {
        address: formData.address || undefined,
        pin_description: formData.pin_description || undefined,
        latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
        longitude: formData.longitude ? parseFloat(formData.longitude) : undefined,
      };

      const sharedLocation = await shareEventLocation(bookingId, locationData, user.id);
      
      if (sharedLocation) {
        setLocation(sharedLocation);
        setShowShareForm(false);
        setFormData({ address: '', pin_description: '', latitude: '', longitude: '' });
        
        toast({
          title: 'Location Shared',
          description: 'Event location has been shared successfully.',
        });

        onLocationShared?.(sharedLocation);
      }
    } catch (error) {
      console.error('Error sharing location:', error);
      toast({
        title: 'Error',
        description: 'Failed to share location. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSharing(false);
    }
  };

  const handleConfirmLocation = async () => {
    if (!user || !location) return;

    setIsConfirming(true);
    try {
      const success = await confirmEventLocation(location.id, user.id);
      
      if (success) {
        await loadEventLocation(); // Reload to get updated data
        toast({
          title: 'Location Confirmed',
          description: 'You have confirmed the event location.',
        });
      }
    } catch (error) {
      console.error('Error confirming location:', error);
      toast({
        title: 'Error',
        description: 'Failed to confirm location. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsConfirming(false);
    }
  };

  const openInMaps = () => {
    if (!location) return;

    let url = '';
    if (location.latitude && location.longitude) {
      // Use GPS coordinates
      url = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
    } else if (location.address) {
      // Use address
      url = `https://www.google.com/maps/search/${encodeURIComponent(location.address)}`;
    }

    if (url) {
      window.open(url, '_blank');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Event Location
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {location ? (
          <div className="space-y-4">
            {/* Location Display */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">Shared Location</h4>
                  <p className="text-sm text-gray-600">
                    Shared by {location.shared_by === user?.id ? 'you' : 'other party'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {location.is_confirmed ? (
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Confirmed
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <Clock className="w-3 h-3 mr-1" />
                      Pending
                    </Badge>
                  )}
                </div>
              </div>

              {location.address && (
                <div className="mb-2">
                  <p className="text-sm font-medium text-gray-700">Address:</p>
                  <p className="text-gray-900">{location.address}</p>
                </div>
              )}

              {location.pin_description && (
                <div className="mb-2">
                  <p className="text-sm font-medium text-gray-700">Description:</p>
                  <p className="text-gray-900">{location.pin_description}</p>
                </div>
              )}

              {location.latitude && location.longitude && (
                <div className="mb-2">
                  <p className="text-sm font-medium text-gray-700">GPS Coordinates:</p>
                  <p className="text-gray-900 font-mono text-sm">
                    {location.latitude}, {location.longitude}
                  </p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                onClick={openInMaps}
                variant="outline"
                className="flex-1 gap-2"
                disabled={!location.address && (!location.latitude || !location.longitude)}
              >
                <ExternalLink className="w-4 h-4" />
                Open in Maps
              </Button>

              {!location.is_confirmed && location.shared_by !== user?.id && (
                <Button
                  onClick={handleConfirmLocation}
                  disabled={isConfirming}
                  className="flex-1 gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isConfirming ? 'Confirming...' : 'Confirm Location'}
                </Button>
              )}
            </div>

            {/* Update Location Button */}
            {location.shared_by === user?.id && (
              <Button
                onClick={() => setShowShareForm(true)}
                variant="outline"
                className="w-full gap-2"
              >
                <Share2 className="w-4 h-4" />
                Update Location
              </Button>
            )}
          </div>
        ) : (
          <div className="text-center py-6">
            <MapPin className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 mb-4">No location shared yet</p>
            <Button
              onClick={() => setShowShareForm(true)}
              className="gap-2"
            >
              <Share2 className="w-4 h-4" />
              Share Event Location
            </Button>
          </div>
        )}

        {/* Share Location Form */}
        {showShareForm && (
          <div className="border-t pt-4 space-y-4">
            <h4 className="font-semibold">Share Event Location</h4>
            
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Event Address
                </label>
                <Input
                  placeholder="Enter the full event address"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Location Description (Optional)
                </label>
                <Textarea
                  placeholder="Additional details about the location (e.g., parking instructions, entrance details)"
                  value={formData.pin_description}
                  onChange={(e) => setFormData(prev => ({ ...prev, pin_description: e.target.value }))}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    Latitude (Optional)
                  </label>
                  <Input
                    type="number"
                    step="any"
                    placeholder="0.000000"
                    value={formData.latitude}
                    onChange={(e) => setFormData(prev => ({ ...prev, latitude: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    Longitude (Optional)
                  </label>
                  <Input
                    type="number"
                    step="any"
                    placeholder="0.000000"
                    value={formData.longitude}
                    onChange={(e) => setFormData(prev => ({ ...prev, longitude: e.target.value }))}
                  />
                </div>
              </div>

              <Button
                onClick={handleGetCurrentLocation}
                variant="outline"
                className="w-full gap-2"
              >
                <Navigation className="w-4 h-4" />
                Use Current Location
              </Button>

              <Alert>
                <MapPin className="h-4 w-4" />
                <AlertDescription>
                  GPS coordinates provide the most accurate location for navigation apps.
                </AlertDescription>
              </Alert>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => setShowShareForm(false)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleShareLocation}
                disabled={isSharing}
                className="flex-1 gap-2"
              >
                <Share2 className="w-4 h-4" />
                {isSharing ? 'Sharing...' : 'Share Location'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}