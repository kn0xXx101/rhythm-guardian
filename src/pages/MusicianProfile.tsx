import * as React from 'react';
import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ProfileCompletionBanner } from '@/components/profile/ProfileCompletionBanner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TextareaWithCounter } from '@/components/ui/textarea-with-counter';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { Upload, MapPin, Guitar, Clock, Save, CheckCircle2, AlertCircle, ShieldCheck, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PortfolioUpload } from '@/components/musician/PortfolioUpload';
import { PaymentDetailsForm } from '@/components/musician/PaymentDetailsForm';
import { ReviewsSection } from '@/components/musician/ReviewsSection';
import { DocumentUpload } from '../components/profile/DocumentUpload';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import {
  calculateProfileCompletion,
  getCompletionColor,
} from '@/lib/profile-completion';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface ProfileData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  location?: string;
  bio?: string;
  profileImageUrl?: string;
  instruments?: string[];
  genres?: string[];
  hourlyRate?: number;
  basePrice?: number;
  pricingModel?: 'hourly' | 'fixed';
  availability?: string[];
  weekdayStart?: string;
  weekdayEnd?: string;
  weekendStart?: string;
  weekendEnd?: string;
  experienceLevel?: string;
  socialLinks?: {
    youtube?: string;
    instagram?: string;
    tiktok?: string;
    soundcloud?: string;
  };
  paymentDetails?: {
    provider?: string;
    accountNumber?: string;
    accountName?: string;
  };
}

const MusicianProfile: React.FC = () => {
  const location = useLocation();
  const { user, refreshUser } = useAuth();
  const [formattedProfileData, setFormattedProfileData] = useState<ProfileData>({});
  const [originalProfile, setOriginalProfile] = useState<any>(null);
  const { toast } = useToast();
  const [profileImage, setProfileImage] = useState('/placeholder.svg');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const profileFromNav = (location.state as any)?.profileData;

    const applyProfileToState = (profile: any) => {
      setOriginalProfile(profile);
      const [firstName = '', lastName = ''] = (profile.full_name || '').split(' ');
      setFormattedProfileData({
        firstName,
        lastName,
        email: profile.email,
        phone: profile.phone,
        location: profile.location,
        bio: profile.bio,
        profileImageUrl: profile.avatar_url,
        instruments: profile.instruments || [],
        genres: profile.genres || [],
        hourlyRate: profile.hourly_rate,
        basePrice: profile.base_price,
        pricingModel: profile.pricing_model || 'hourly',
        availability: (profile.available_days || profile.availability || []).filter((d: string) => d === 'weekdays' || d === 'weekends' || d === 'all_week'),
        weekdayStart: (profile.available_days || []).find((d: string) => d.startsWith('wd_start:'))?.split(':')[1] || '18:00',
        weekdayEnd: (profile.available_days || []).find((d: string) => d.startsWith('wd_end:'))?.split(':')[1] || '23:00',
        weekendStart: (profile.available_days || []).find((d: string) => d.startsWith('we_start:'))?.split(':')[1] || '09:00',
        weekendEnd: (profile.available_days || []).find((d: string) => d.startsWith('we_end:'))?.split(':')[1] || '23:00',
        experienceLevel: profile.experience_level || 'intermediate',
        socialLinks: {
          youtube: profile.youtube_url,
          instagram: profile.instagram_url,
          tiktok: profile.tiktok_url,
          soundcloud: profile.soundcloud_url,
        },
        paymentDetails: {
          bankAccountNumber: profile.bank_account_number,
          bankAccountName: profile.bank_account_name,
          bankCode: profile.bank_code,
          mobileMoneyNumber: profile.mobile_money_number,
          mobileMoneyProvider: profile.mobile_money_provider,
          mobileMoneyName: profile.mobile_money_name,
        },
      });
    };

    // Primary path: if a previous page passed profile data via navigation state, use it.
    if (profileFromNav) {
      applyProfileToState(profileFromNav);
      return;
    }

    // Fallback path: most navigations to `/musician/profile` won't include route state.
    // In that case, populate from the authenticated user profile (source of truth).
    if (user?.id) {
      applyProfileToState(user);
    }
  }, [location.state, user]);

  useEffect(() => {
    // Ensure we have a fresh profile when landing directly on this page.
    if (!(location.state as any)?.profileData) {
      refreshUser();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Authoritative fetch: ensures completion + missing fields reflect DB, even if auth context is stale/partial.
    const profileFromNav = (location.state as any)?.profileData;
    if (!user?.id || profileFromNav) return;

    let isMounted = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select(
            'user_id,role,full_name,email,phone,location,bio,avatar_url,instruments,genres,hourly_rate,available_days,pricing_model,base_price,experience_level,youtube_url,instagram_url,tiktok_url,soundcloud_url,bank_account_number,bank_account_name,bank_code,mobile_money_number,mobile_money_provider,mobile_money_name,created_at,updated_at,status,documents_submitted,documents_verified'
          )
          .eq('user_id', user.id)
          .single();

        if (!isMounted) return;
        if (error) {
          console.warn('Failed to load musician profile from DB:', error);
          return;
        }
        if (data) {
          setOriginalProfile(data);
        }
      } catch (e) {
        console.warn('Unexpected error loading musician profile:', e);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [location.state, user?.id]);

  useEffect(() => {
    if (formattedProfileData.profileImageUrl) {
      setProfileImage(formattedProfileData.profileImageUrl);
    }
  }, [formattedProfileData.profileImageUrl]);

  const handleSave = async () => {
    if (!user?.id) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'You must be logged in to save your profile.',
      });
      return;
    }

    setIsSaving(true);
    try {
      // Collect form values from state or DOM (prefer state for reliability across tabs)
      const firstNameInput = document.getElementById('first-name') as HTMLInputElement;
      const lastNameInput = document.getElementById('last-name') as HTMLInputElement;
      const phoneInput = document.getElementById('phone') as HTMLInputElement;
      const locationValInput = document.getElementById('location') as HTMLInputElement;
      const bioInput = document.getElementById('bio') as HTMLTextAreaElement;
      const priceAmountInput = document.getElementById('price-amount') as HTMLInputElement;

      const firstName = firstNameInput ? firstNameInput.value.trim() : (formattedProfileData.firstName || '');
      const lastName = lastNameInput ? lastNameInput.value.trim() : (formattedProfileData.lastName || '');
      const phone = phoneInput ? phoneInput.value.trim() : (formattedProfileData.phone || '');
      const locationVal = locationValInput ? locationValInput.value.trim() : (formattedProfileData.location || '');
      const bio = bioInput ? bioInput.value.trim() : (formattedProfileData.bio || '');
      
      let priceAmountValue = 0;
      if (priceAmountInput) {
        priceAmountValue = priceAmountInput.value ? parseFloat(priceAmountInput.value) : 0;
      } else {
        priceAmountValue = (formattedProfileData.pricingModel === 'fixed' 
          ? formattedProfileData.basePrice 
          : formattedProfileData.hourlyRate) || 0;
      }

      // Combine firstName and lastName into full_name
      const fullName =
        `${firstName} ${lastName}`.trim() ||
        (formattedProfileData.firstName && formattedProfileData.lastName
          ? `${formattedProfileData.firstName} ${formattedProfileData.lastName}`.trim()
          : null);

      // Prepare update object - only include fields that have values
      const updateData: any = {};

      if (fullName) updateData.full_name = fullName;
      if (phone) updateData.phone = phone;
      if (locationVal) updateData.location = locationVal;
      if (bio) updateData.bio = bio;
      if (formattedProfileData.instruments && formattedProfileData.instruments.length > 0) {
        updateData.instruments = formattedProfileData.instruments;
      }
      if (formattedProfileData.genres && formattedProfileData.genres.length > 0) {
        updateData.genres = formattedProfileData.genres;
      }

      // Update pricing based on selected model (Selective)
      const currentPricingModel = formattedProfileData.pricingModel || 'hourly';
      updateData.pricing_model = currentPricingModel;
      
      if (currentPricingModel === 'fixed') {
        updateData.base_price = priceAmountValue > 0 ? priceAmountValue : null;
        updateData.hourly_rate = null; // Clear the other one
      } else {
        updateData.hourly_rate = priceAmountValue > 0 ? priceAmountValue : null;
        updateData.base_price = null; // Clear the other one
      }

      // Filter out existing time strings to avoid duplicates
      const baseAvailability = (formattedProfileData.availability || []).filter(
        (d: string) => d === 'weekdays' || d === 'weekends' || d === 'all_week'
      ) as string[];
      const finalAvailability = [...baseAvailability];

      if (baseAvailability.includes('weekdays') || baseAvailability.includes('all_week')) {
        finalAvailability.push(`wd_start:${formattedProfileData.weekdayStart || '18:00'}`);
        finalAvailability.push(`wd_end:${formattedProfileData.weekdayEnd || '23:00'}`);
      }
      if (baseAvailability.includes('weekends') || baseAvailability.includes('all_week')) {
        finalAvailability.push(`we_start:${formattedProfileData.weekendStart || '09:00'}`);
        finalAvailability.push(`we_end:${formattedProfileData.weekendEnd || '23:00'}`);
      }
      updateData.available_days = finalAvailability.length > 0 ? finalAvailability : null;

      // Only update avatar_url if it's a valid URL (not placeholder or base64)
      if (
        profileImage &&
        profileImage !== '/placeholder.svg' &&
        (profileImage.startsWith('http') || profileImage.startsWith('https'))
      ) {
        updateData.avatar_url = profileImage;
      }

      // Calculate profile completion metrics
      const currentProfileState = {
        ...originalProfile,
        ...updateData,
      };
      const { percentage, isComplete: isProfileComplete } = calculateProfileCompletion(currentProfileState);
      
      updateData.profile_completion_percentage = percentage;
      updateData.profile_complete = isProfileComplete;

      // Only update if there's data to update
      if (Object.keys(updateData).length === 0) {
        toast({
          title: 'No changes',
          description: 'No changes were made to save.',
        });
        setIsSaving(false);
        return;
      }

      // Update profile in database
      const { error } = await supabase.from('profiles').update(updateData).eq('user_id', user.id);

      if (error) {
        // Fallback for missing columns (resilience) - only if it's clearly a missing column error
        const isMissingColumnError = 
          error.code === '42703' || // Postgres: undefined_column
          error.message?.includes('column') && error.message?.includes('does not exist');

        if (isMissingColumnError && (error.message?.includes('pricing_model') || error.message?.includes('base_price'))) {
          console.warn('Pricing columns missing in database, falling back to hourly rate only.');
          const fallbackData = { ...updateData };
          delete fallbackData.pricing_model;
          delete fallbackData.base_price;
          // Use priceAmountValue for the fallback hourly_rate
          fallbackData.hourly_rate = priceAmountValue;
          const { error: fallbackError } = await supabase.from('profiles').update(fallbackData).eq('user_id', user.id);
          if (fallbackError) throw fallbackError;
        } else {
          throw error;
        }
      }

      // Update local states immediately
      setFormattedProfileData((prev) => ({
        ...prev,
        firstName,
        lastName,
        phone,
        location: locationVal,
        bio,
        profileImageUrl: updateData.avatar_url || prev.profileImageUrl,
        hourlyRate: updateData.hourly_rate,
        basePrice: updateData.base_price,
        pricingModel: updateData.pricing_model,
        availability: baseAvailability,
        weekdayStart: formattedProfileData.weekdayStart,
        weekdayEnd: formattedProfileData.weekdayEnd,
        weekendStart: formattedProfileData.weekendStart,
        weekendEnd: formattedProfileData.weekendEnd,
      }));

      setOriginalProfile(currentProfileState);

      toast({
        title: 'Profile Updated',
        description: 'Your changes have been saved successfully.',
      });

      // Refresh global user state to update completion bar everywhere
      await refreshUser();
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast({
        variant: 'destructive',
        title: 'Error saving profile',
        description: error.message || 'Failed to save your profile. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please upload an image smaller than 2MB',
        variant: 'destructive',
      });
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image file',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Upload to Supabase storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(fileName);

      setProfileImage(publicUrl);

      toast({
        title: 'Image uploaded',
        description: 'Your profile image has been uploaded successfully.',
      });
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: error.message || 'Failed to upload image. Please try again.',
      });
    }
  };

  // Calculate profile completion
  const profileForCompletion = originalProfile
    ? {
      ...originalProfile,
      full_name:
        originalProfile.full_name ||
        (formattedProfileData.firstName && formattedProfileData.lastName
          ? `${formattedProfileData.firstName} ${formattedProfileData.lastName}`.trim()
          : null),
      avatar_url: profileImage !== '/placeholder.svg' ? profileImage : originalProfile.avatar_url,
      bio: formattedProfileData.bio?.trim() ? formattedProfileData.bio : originalProfile.bio,
      phone: formattedProfileData.phone?.trim() ? formattedProfileData.phone : originalProfile.phone,
      location: formattedProfileData.location?.trim()
        ? formattedProfileData.location
        : originalProfile.location,
      instruments:
        (formattedProfileData.instruments?.length ?? 0) > 0
          ? formattedProfileData.instruments
          : (originalProfile.instruments ?? []),
      genres:
        (formattedProfileData.genres?.length ?? 0) > 0
          ? formattedProfileData.genres
          : (originalProfile.genres ?? []),
      hourly_rate:
        typeof formattedProfileData.hourlyRate === 'number' && formattedProfileData.hourlyRate > 0
          ? formattedProfileData.hourlyRate
          : originalProfile.hourly_rate,
      base_price:
        typeof formattedProfileData.basePrice === 'number' && formattedProfileData.basePrice > 0
          ? formattedProfileData.basePrice
          : (originalProfile as any).base_price,
      pricing_model:
        formattedProfileData.pricingModel || (originalProfile as any).pricing_model || null,
      available_days:
        (formattedProfileData.availability?.length ?? 0) > 0
          ? formattedProfileData.availability
          : (originalProfile.available_days ?? []),
      role: originalProfile.role || 'musician',
    }
    : null;

  const completionResult = calculateProfileCompletion(profileForCompletion);

  return (
    <div className="container mx-auto py-8 space-y-6 animate-fade-in">
      <DashboardHeader
        heading="My Profile"
        text="Manage your musician profile, portfolio, and settings."
      />

      <ProfileCompletionBanner />

      <Tabs defaultValue="basic">
        <TabsList className="mb-6">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="instruments">Instruments & Skills</TabsTrigger>
          <TabsTrigger value="samples">Portfolio & Samples</TabsTrigger>
          <TabsTrigger value="availability">Availability</TabsTrigger>
          <TabsTrigger value="payment">Payment Details</TabsTrigger>
          <TabsTrigger value="verification">Verification & Documents</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
        </TabsList>

        <TabsContent value="basic">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle>Profile Picture</CardTitle>
                <CardDescription>Upload a professional photo</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <div className="w-40 h-40 rounded-full overflow-hidden mb-4 border-4 border-primary/20">
                  <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                </div>
                <Label
                  htmlFor="profile-image"
                  className="cursor-pointer flex items-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary px-4 py-2 rounded-md transition-colors"
                >
                  <Upload className="h-4 w-4" />
                  Upload Photo
                </Label>
                <Input
                  id="profile-image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <p className="text-xs text-muted-foreground mt-2">PNG, JPG or JPEG (max. 2MB)</p>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Update your basic information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first-name">First Name</Label>
                    <Input
                      id="first-name"
                      placeholder="First Name"
                      value={formattedProfileData.firstName || ''}
                      onChange={(e) => setFormattedProfileData(prev => ({ ...prev, firstName: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last-name">Last Name</Label>
                    <Input
                      id="last-name"
                      placeholder="Last Name"
                      value={formattedProfileData.lastName || ''}
                      onChange={(e) => setFormattedProfileData(prev => ({ ...prev, lastName: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@example.com"
                    value={formattedProfileData.email || ''}
                    readOnly
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+233 50 123 4567"
                    value={formattedProfileData.phone || ''}
                    onChange={(e) => setFormattedProfileData(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="location"
                      className="pl-9"
                      placeholder="Your location"
                      value={formattedProfileData.location || ''}
                      onChange={(e) => setFormattedProfileData(prev => ({ ...prev, location: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <TextareaWithCounter
                    id="bio"
                    placeholder="Tell clients about yourself..."
                    value={formattedProfileData.bio || ''}
                    onChange={(e) => setFormattedProfileData(prev => ({ ...prev, bio: e.target.value }))}
                    maxLength={500}
                    className="min-h-32"
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleSave} className="ml-auto" disabled={isSaving}>
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="instruments">
          <Card>
            <CardHeader>
              <CardTitle>Instruments & Skills</CardTitle>
              <CardDescription>
                What instruments do you play and what styles can you perform?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Primary Instrument</h3>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        Add Instrument
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Instrument</DialogTitle>
                        <DialogDescription>Add a new instrument that you play</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="instrument-name">Instrument Name</Label>
                          <Input id="instrument-name" placeholder="e.g. Guitar, Piano, Drums" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="experience-years">Years of Experience</Label>
                          <Input id="experience-years" type="number" min="0" placeholder="e.g. 5" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="proficiency">Proficiency Level</Label>
                          <Select defaultValue="intermediate">
                            <SelectTrigger>
                              <SelectValue placeholder="Select level" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="beginner">Beginner</SelectItem>
                              <SelectItem value="intermediate">Intermediate</SelectItem>
                              <SelectItem value="advanced">Advanced</SelectItem>
                              <SelectItem value="expert">Expert</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() =>
                            document.querySelector<HTMLButtonElement>('[data-dismiss]')?.click()
                          }
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={() => {
                            const instrumentName = (
                              document.getElementById('instrument-name') as HTMLInputElement
                            ).value;
                            const experienceYears = (
                              document.getElementById('experience-years') as HTMLInputElement
                            ).value;
                            if (instrumentName && experienceYears) {
                              setFormattedProfileData((prev) => ({
                                ...prev,
                                instruments: [...(prev.instruments || []), instrumentName],
                              }));
                              document.querySelector<HTMLButtonElement>('[data-dismiss]')?.click();
                            }
                          }}
                        >
                          Add Instrument
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="grid grid-cols-1 gap-4 border rounded-md p-4">
                  {formattedProfileData.instruments?.map((instrument, index) => (
                    <div key={index} className="flex items-center gap-4">
                      <div className="bg-primary/10 p-3 rounded-full">
                        <Guitar className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div>
                            <h4 className="font-medium">{instrument}</h4>
                            <p className="text-sm text-muted-foreground">6 years experience</p>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm">
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={() => {
                                setFormattedProfileData((prev) => ({
                                  ...prev,
                                  instruments: prev.instruments?.filter((_, i) => i !== index),
                                }));
                              }}
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Music Styles</h3>
                <div className="flex flex-wrap gap-2">
                  {formattedProfileData.genres?.map((genre, index) => (
                    <div
                      key={index}
                      className="bg-primary/10 text-primary px-3 py-1 rounded-full flex items-center gap-2"
                    >
                      {genre}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 p-0"
                        onClick={() => {
                          setFormattedProfileData((prev) => ({
                            ...prev,
                            genres: prev.genres?.filter((_, i) => i !== index),
                          }));
                        }}
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="rounded-full">
                        + Add Style
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Music Style</DialogTitle>
                        <DialogDescription>
                          Add a new music style or genre that you perform
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="genre-name">Style/Genre Name</Label>
                          <Input id="genre-name" placeholder="e.g. Jazz, Rock, Classical" />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() =>
                            document.querySelector<HTMLButtonElement>('[data-dismiss]')?.click()
                          }
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={() => {
                            const genreName = (
                              document.getElementById('genre-name') as HTMLInputElement
                            ).value;
                            if (genreName) {
                              setFormattedProfileData((prev) => ({
                                ...prev,
                                genres: [...(prev.genres || []), genreName],
                              }));
                              document.querySelector<HTMLButtonElement>('[data-dismiss]')?.click();
                            }
                          }}
                        >
                          Add Style
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="experience">Experience Level</Label>
                <Select defaultValue={formattedProfileData.experienceLevel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your experience level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner (1-2 years)</SelectItem>
                    <SelectItem value="intermediate">Intermediate (3-5 years)</SelectItem>
                    <SelectItem value="advanced">Advanced (6-10 years)</SelectItem>
                    <SelectItem value="expert">Expert (10+ years)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSave} className="ml-auto">
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="samples">
          <div className="space-y-6">
            <PortfolioUpload />

            <Card>
              <CardHeader>
                <CardTitle>Social Media Links</CardTitle>
                <CardDescription>
                  Connect your social media profiles to showcase your work
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 space-y-2">
                      <Label htmlFor="youtube">YouTube Channel</Label>
                      <Input
                        id="youtube"
                        placeholder="https://youtube.com/@your_channel"
                        value={formattedProfileData.socialLinks?.youtube || ''}
                        onChange={(e) => setFormattedProfileData(prev => ({
                          ...prev,
                          socialLinks: { ...prev.socialLinks, youtube: e.target.value }
                        }))}
                      />
                    </div>
                    <div className="flex-1 space-y-2">
                      <Label htmlFor="instagram">Instagram</Label>
                      <Input
                        id="instagram"
                        placeholder="https://instagram.com/your_handle"
                        value={formattedProfileData.socialLinks?.instagram || ''}
                        onChange={(e) => setFormattedProfileData(prev => ({
                          ...prev,
                          socialLinks: { ...prev.socialLinks, instagram: e.target.value }
                        }))}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 space-y-2">
                      <Label htmlFor="tiktok">TikTok</Label>
                      <Input
                        id="tiktok"
                        placeholder="https://tiktok.com/@your_handle"
                        value={formattedProfileData.socialLinks?.tiktok || ''}
                        onChange={(e) => setFormattedProfileData(prev => ({
                          ...prev,
                          socialLinks: { ...prev.socialLinks, tiktok: e.target.value }
                        }))}
                      />
                    </div>
                    <div className="flex-1 space-y-2">
                      <Label htmlFor="soundcloud">SoundCloud</Label>
                      <Input
                        id="soundcloud"
                        placeholder="https://soundcloud.com/your_handle"
                        value={formattedProfileData.socialLinks?.soundcloud || ''}
                        onChange={(e) => setFormattedProfileData(prev => ({
                          ...prev,
                          socialLinks: { ...prev.socialLinks, soundcloud: e.target.value }
                        }))}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleSave} className="ml-auto" disabled={isSaving}>
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="availability">
          <Card className="border-none shadow-none bg-transparent">
            <CardHeader className="px-0 pt-0">
              <CardTitle className="text-2xl">Availability & Pricing</CardTitle>
              <CardDescription className="text-base">
                Configure your working hours and rates. <span className="font-medium text-amber-600">Note: To reach 100% completion, please provide one pricing option and one availability selection. You can update these at any time.</span>
              </CardDescription>
            </CardHeader>
            
            <CardContent className="px-0 space-y-8">
              {/* Pricing Card */}
              <Card className="overflow-hidden border-muted/60 shadow-sm">
                <CardHeader className="bg-muted/30 pb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Save className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Pricing Options</CardTitle>
                      <CardDescription>Select how you want to be paid</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label htmlFor="pricing-model" className="text-sm font-semibold">Pricing Model</Label>
                      <Select
                        value={formattedProfileData.pricingModel || 'hourly'}
                        onValueChange={(value) => {
                          const newModel = value as 'hourly' | 'fixed';
                          setFormattedProfileData((prev) => ({
                            ...prev,
                            pricingModel: newModel,
                            // Clear the opposite rate when switching
                            [newModel === 'fixed' ? 'hourlyRate' : 'basePrice']: null
                          }));
                        }}
                      >
                        <SelectTrigger id="pricing-model" className="h-11">
                          <SelectValue placeholder="Select pricing model" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hourly">Hourly Rate (Pay per hour)</SelectItem>
                          <SelectItem value="fixed">Flat Fee (Full performance charge)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="price-amount" className="text-sm font-semibold">
                        {formattedProfileData.pricingModel === 'fixed'
                          ? 'Flat Fee Amount (GHS)'
                          : 'Hourly Rate Amount (GHS)'}
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                          ₵
                        </span>
                        <Input
                          id="price-amount"
                          type="number"
                          className="pl-8 h-11 text-lg font-medium"
                          placeholder="0.00"
                          value={
                            formattedProfileData.pricingModel === 'fixed'
                              ? (formattedProfileData.basePrice || '')
                              : (formattedProfileData.hourlyRate || '')
                          }
                          onChange={(e) => {
                            const val = e.target.value ? parseFloat(e.target.value) : 0;
                            setFormattedProfileData(prev => ({
                              ...prev,
                              [prev.pricingModel === 'fixed' ? 'basePrice' : 'hourlyRate']: val
                            }));
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Availability Card */}
              <Card className="overflow-hidden border-muted/60 shadow-sm">
                <CardHeader className="bg-muted/30 pb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Clock className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Availability</CardTitle>
                      <CardDescription>When are you available for bookings?</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  <div className="space-y-3">
                    <Label htmlFor="availability-type" className="text-sm font-semibold">Working Days</Label>
                    <Select
                      value={
                        formattedProfileData.availability?.includes('all_week')
                          ? 'all_week'
                          : formattedProfileData.availability?.includes('weekdays')
                          ? 'weekdays'
                          : formattedProfileData.availability?.includes('weekends')
                          ? 'weekends'
                          : ''
                      }
                      onValueChange={(value) =>
                        setFormattedProfileData((prev) => ({
                          ...prev,
                          availability: [value],
                        }))
                      }
                    >
                      <SelectTrigger id="availability-type" className="h-11">
                        <SelectValue placeholder="Select your availability" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekdays">Weekdays (Mon - Fri)</SelectItem>
                        <SelectItem value="weekends">Weekends (Sat - Sun)</SelectItem>
                        <SelectItem value="all_week">Full Week (Mon - Sun)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {(formattedProfileData.availability?.includes('weekdays') || 
                      formattedProfileData.availability?.includes('all_week')) && (
                      <div className="space-y-4 p-4 rounded-xl bg-blue-50/30 border border-blue-100">
                        <div className="flex items-center gap-2 text-blue-700">
                          <Clock className="h-4 w-4" />
                          <span className="text-sm font-bold uppercase tracking-wider">Weekday Hours</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Start</Label>
                            <Select 
                              value={formattedProfileData.weekdayStart || '18:00'}
                              onValueChange={(val) => setFormattedProfileData(prev => ({ ...prev, weekdayStart: val }))}
                            >
                              <SelectTrigger className="h-10 bg-white border-blue-200">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: 24 }).map((_, i) => {
                                  const hour = i.toString().padStart(2, '0');
                                  return <SelectItem key={`wd-start-${i}`} value={`${hour}:00`}>{hour}:00</SelectItem>;
                                })}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground">End</Label>
                            <Select 
                              value={formattedProfileData.weekdayEnd || '23:00'}
                              onValueChange={(val) => setFormattedProfileData(prev => ({ ...prev, weekdayEnd: val }))}
                            >
                              <SelectTrigger className="h-10 bg-white border-blue-200">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: 24 }).map((_, i) => {
                                  const hour = i.toString().padStart(2, '0');
                                  return <SelectItem key={`wd-end-${i}`} value={`${hour}:00`}>{hour}:00</SelectItem>;
                                })}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    )}

                    {(formattedProfileData.availability?.includes('weekends') || 
                      formattedProfileData.availability?.includes('all_week')) && (
                      <div className="space-y-4 p-4 rounded-xl bg-orange-50/30 border border-orange-100">
                        <div className="flex items-center gap-2 text-orange-700">
                          <Clock className="h-4 w-4" />
                          <span className="text-sm font-bold uppercase tracking-wider">Weekend Hours</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Start</Label>
                            <Select 
                              value={formattedProfileData.weekendStart || '09:00'}
                              onValueChange={(val) => setFormattedProfileData(prev => ({ ...prev, weekendStart: val }))}
                            >
                              <SelectTrigger className="h-10 bg-white border-orange-200">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: 24 }).map((_, i) => {
                                  const hour = i.toString().padStart(2, '0');
                                  return <SelectItem key={`we-start-${i}`} value={`${hour}:00`}>{hour}:00</SelectItem>;
                                })}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground">End</Label>
                            <Select 
                              value={formattedProfileData.weekendEnd || '23:00'}
                              onValueChange={(val) => setFormattedProfileData(prev => ({ ...prev, weekendEnd: val }))}
                            >
                              <SelectTrigger className="h-10 bg-white border-orange-200">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: 24 }).map((_, i) => {
                                  const hour = i.toString().padStart(2, '0');
                                  return <SelectItem key={`we-end-${i}`} value={`${hour}:00`}>{hour}:00</SelectItem>;
                                })}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </CardContent>
            
            <CardFooter className="px-0 pt-2 flex justify-end">
              <Button onClick={handleSave} size="lg" className="px-8 font-semibold shadow-md" disabled={isSaving}>
                <Save className="mr-2 h-5 w-5" />
                {isSaving ? 'Saving Changes...' : 'Save Profile Settings'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="verification">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DocumentUpload />
          </div>
        </TabsContent>

        <TabsContent value="payment">
          <PaymentDetailsForm />
        </TabsContent>

        <TabsContent value="reviews">
          {user?.id && <ReviewsSection musicianId={user.id} />}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MusicianProfile;
