import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MaskedInput } from '@/components/ui/input-masked';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { Upload, MapPin, Save, CheckCircle2, AlertCircle, User, Mail, Phone, Calendar as CalendarIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface HirerProfileData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  location?: string;
  bio?: string;
  profileImageUrl?: string;
}

const HirerProfile: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [profileData, setProfileData] = useState<HirerProfileData>({});
  const [profileImage, setProfileImage] = useState('/placeholder.svg');
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      // Split full name into first and last name
      const [firstName = '', lastName = ''] = (user.full_name || '').split(' ');

      setProfileData({
        firstName,
        lastName,
        email: user.email || undefined,
        phone: user.phone || undefined,
        location: user.location || undefined,
        bio: user.bio || undefined,
        profileImageUrl: user.avatar_url || undefined,
      });

      if (user.avatar_url) {
        setProfileImage(user.avatar_url);
      }
    }
  }, [user]);

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: 'File too large',
        description: 'Please upload an image smaller than 2MB.',
      });
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setProfileImage(publicUrl);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      // Refresh user data to update completion status
      await refreshUser();

      toast({
        title: 'Avatar Updated',
        description: 'Your profile picture has been uploaded successfully.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: error?.message || 'There was an issue uploading your avatar.',
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    setIsSaving(true);
    try {
      // Collect form values from the DOM elements
      const firstNameInput = document.getElementById('first-name') as HTMLInputElement;
      const lastNameInput = document.getElementById('last-name') as HTMLInputElement;
      const phoneInput = document.getElementById('phone') as HTMLInputElement;
      const locationInput = document.getElementById('location') as HTMLInputElement;
      const bioInput = document.getElementById('bio') as HTMLTextAreaElement;

      const firstName = firstNameInput?.value?.trim() || '';
      const lastName = lastNameInput?.value?.trim() || '';
      const phone = phoneInput?.value?.trim() || '';
      const location = locationInput?.value?.trim() || '';
      const bio = bioInput?.value?.trim() || '';

      // Combine firstName and lastName into full_name
      const fullName = `${firstName} ${lastName}`.trim() || null;

      // Prepare update object
      const updateData: any = {};

      if (fullName) updateData.full_name = fullName;
      if (phone) updateData.phone = phone;
      if (location) updateData.location = location;
      if (bio) updateData.bio = bio;

      // Only update avatar_url if it's a valid URL
      if (
        profileImage &&
        profileImage !== '/placeholder.svg' &&
        (profileImage.startsWith('http') || profileImage.startsWith('https'))
      ) {
        updateData.avatar_url = profileImage;
      }

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

      if (error) throw error;

      await refreshUser();
      setIsEditing(false);

      toast({
        title: 'Profile Updated',
        description: 'Your profile changes have been saved successfully.',
      });
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

  // Custom profile completion calculation for hirers
  // This ensures we only check hirer-relevant fields
  const completionResult = useMemo(() => {
    if (!user) {
      return {
        percentage: 0,
        missingFields: ['All fields'],
        isComplete: false,
      };
    }

    // Define hirer-specific required fields
    const hirerFields = [
      { key: 'full_name', label: 'Full Name', weight: 20 },
      { key: 'phone', label: 'Phone Number', weight: 20 },
      { key: 'location', label: 'Location', weight: 20 },
      { key: 'bio', label: 'Bio', weight: 20 },
      { key: 'avatar_url', label: 'Profile Photo', weight: 20 },
    ];

    const totalWeight = hirerFields.reduce((sum, field) => sum + field.weight, 0);
    let completedWeight = 0;
    const missingFields: string[] = [];

    hirerFields.forEach((field) => {
      const value = user[field.key as keyof typeof user];
      let isComplete = false;

      if (typeof value === 'string') {
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

    const percentage = Math.round((completedWeight / totalWeight) * 100);
    const isComplete = percentage >= 80;

    console.log('=== HirerProfile Custom Completion ===');
    console.log('User role from DB:', user.role);
    console.log('Fields checked:', hirerFields.map(f => f.label));
    console.log('Completed fields:', hirerFields.filter(f => {
      const value = user[f.key as keyof typeof user];
      return typeof value === 'string' ? value.trim().length > 0 : value !== null && value !== undefined;
    }).map(f => f.label));
    console.log('Missing fields:', missingFields);
    console.log('Completion percentage:', percentage);
    console.log('=== End Custom Completion ===');

    return {
      percentage,
      missingFields,
      isComplete,
    };
  }, [user]);

  return (
    <div className="container mx-auto p-6 animate-fade-in">
      <DashboardHeader
        heading="My Profile"
        text="Manage your hirer profile and preferences."
      />
      
      {/* Profile Status Card */}
      <Card variant="gradient-border" className="mt-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              Profile Completion
              {completionResult.isComplete ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-yellow-600" />
              )}
            </CardTitle>
            <span className={cn(
              "text-2xl font-bold",
              completionResult.percentage >= 80 ? "text-green-600" : completionResult.percentage >= 50 ? "text-yellow-600" : "text-red-600"
            )}>
              {completionResult.percentage}%
            </span>
          </div>
          <CardDescription>
            {completionResult.percentage >= 100
              ? 'Your profile is complete!'
              : completionResult.percentage >= 80
              ? 'Your profile looks great! Consider completing the remaining fields.'
              : `Your profile is ${completionResult.percentage}% complete. Complete the missing fields to improve your visibility.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={completionResult.percentage} className="h-3" />
          {completionResult.missingFields.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium mb-2">Missing Fields:</p>
              <div className="flex flex-wrap gap-2">
                {completionResult.missingFields.map((field, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"
                  >
                    {field}
                  </span>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card variant="glass" className="mt-6 overflow-hidden border-primary/10 shadow-2xl">
        <div className="h-32 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent" />
        <CardContent className="-mt-16 relative">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="flex flex-col items-center space-y-4">
              <div className="relative group">
                <Avatar className="h-32 w-32 border-4 border-background shadow-xl group-hover:shadow-2xl transition-all duration-300">
                  <AvatarImage src={profileImage !== '/placeholder.svg' ? profileImage : undefined} />
                  <AvatarFallback className="text-2xl bg-primary/5">
                    {user?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div 
                  className={cn(
                    "absolute inset-0 bg-black/40 rounded-full flex items-center justify-center transition-all cursor-pointer border-4 border-transparent",
                    isUploadingAvatar ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  )}
                  onClick={() => !isUploadingAvatar && fileInputRef.current?.click()}
                >
                  {isUploadingAvatar ? (
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                  ) : (
                    <Upload className="h-8 w-8 text-white" />
                  )}
                </div>
              </div>
              
              <div className="flex flex-col items-center gap-2">
                <Badge variant={user?.status === 'active' ? 'default' : 'secondary'} className="capitalize px-3 py-1">
                  {user?.status || 'Pending'}
                </Badge>
                {user?.created_at && (
                  <div className="flex items-center text-xs text-muted-foreground">
                    <CalendarIcon className="h-3 w-3 mr-1" />
                    Joined {new Date(user.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                  </div>
                )}
              </div>
              
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleAvatarUpload}
                accept="image/*"
                className="hidden"
              />
            </div>

            <div className="flex-1 w-full space-y-8 pt-16">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                    {user?.full_name || 'Your Name'}
                    {user?.status === 'active' && <CheckCircle2 className="h-6 w-6 text-green-600" />}
                  </h2>
                  <p className="text-muted-foreground flex items-center gap-2 mt-1">
                    <Mail className="h-4 w-4" />
                    {user?.email}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {isEditing && (
                    <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 border-amber-500/20 flex items-center gap-1">
                      <div className="h-3 w-3 animate-pulse bg-amber-500 rounded-full" />
                      Editing Mode
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs py-1">
                    HIRER
                  </Badge>
                  {!isEditing && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setIsEditing(true)}
                      className="h-8 gap-2 border-primary/20 hover:border-primary/50 transition-colors"
                    >
                      <User className="h-3.5 w-3.5" />
                      Edit Profile
                    </Button>
                  )}
                </div>
              </div>

              <Separator className="opacity-50" />

              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="mb-6">
                  <TabsTrigger value="basic">Basic Info</TabsTrigger>
                  <TabsTrigger value="preferences">Event Preferences</TabsTrigger>
                </TabsList>

                <TabsContent value="basic">
                  <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="first-name">First Name</Label>
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <Input
                          id="first-name"
                          type="text"
                          defaultValue={profileData.firstName || ''}
                          placeholder="First Name"
                          disabled={!isEditing}
                          className={cn(!isEditing && "bg-muted/50 border-transparent cursor-default")}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="last-name">Last Name</Label>
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <Input
                          id="last-name"
                          type="text"
                          defaultValue={profileData.lastName || ''}
                          placeholder="Last Name"
                          disabled={!isEditing}
                          className={cn(!isEditing && "bg-muted/50 border-transparent cursor-default")}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          value={user?.email || ''}
                          disabled
                          placeholder="Email"
                          className="bg-muted/50 border-transparent cursor-not-allowed"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        {isEditing ? (
                          <MaskedInput
                            id="phone"
                            type="tel"
                            mask="phoneGhana"
                            defaultValue={profileData.phone || ''}
                            placeholder="+233 50 123 4567"
                            className="bg-background transition-colors"
                          />
                        ) : (
                          <Input
                            value={profileData.phone || 'No phone provided'}
                            disabled
                            className="bg-muted/50 border-transparent cursor-default"
                          />
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="location">Location</Label>
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <Input
                          id="location"
                          type="text"
                          defaultValue={profileData.location || ''}
                          placeholder="Your location"
                          disabled={!isEditing}
                          className={cn(!isEditing && "bg-muted/50 border-transparent cursor-default")}
                        />
                      </div>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="bio">About Me / Bio</Label>
                      {isEditing ? (
                        <Textarea
                          id="bio"
                          placeholder="Tell musicians about yourself and your events..."
                          defaultValue={profileData.bio || ''}
                          className="min-h-[120px] bg-background/50 focus:bg-background transition-colors"
                        />
                      ) : (
                        <div className="p-4 rounded-lg bg-primary/5 border border-primary/10 min-h-[120px] text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap italic">
                          {profileData.bio || "No bio provided yet. Tell musicians about yourself and your events!"}
                        </div>
                      )}
                    </div>

                    {isEditing && (
                      <div className="flex justify-end space-x-4 md:col-span-2 pt-6 border-t border-border/50">
                        <Button 
                          type="button" 
                          variant="ghost" 
                          disabled={isSaving}
                          onClick={() => {
                            setIsEditing(false);
                            // Reset form values
                            window.location.reload();
                          }}
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={isSaving}
                          className="min-w-[140px] shadow-lg shadow-primary/20 bg-primary hover:bg-primary-hover transition-all duration-300"
                        >
                          {isSaving ? (
                            <>
                              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="mr-2 h-4 w-4" />
                              Save Changes
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </form>
                </TabsContent>

                <TabsContent value="preferences">
                  <Card>
                    <CardHeader>
                      <CardTitle>Event Preferences</CardTitle>
                      <CardDescription>
                        Help musicians understand your event needs and preferences
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="text-center py-8 text-muted-foreground">
                        <p>Event preferences configuration coming soon...</p>
                        <p className="text-sm mt-2">This will include event types, preferred genres, budget ranges, and communication preferences.</p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HirerProfile;