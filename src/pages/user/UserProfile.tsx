import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PhoneInput } from '@/components/ui/phone-input';
import { PaymentDetailsForm } from '@/components/musician/PaymentDetailsForm';
import { cn } from '@/lib/utils';
import { User, Mail, Phone, MapPin, Loader2, Camera, CheckCircle, Calendar as CalendarIcon } from 'lucide-react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

const UserProfile = () => {
  const { user, refreshUser, isLoading } = useAuth();
  const { toast } = useToast();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [bio, setBio] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    refreshUser();
  }, []);

  useEffect(() => {
    // Only populate fields if we are NOT currently editing
    // and if user object is available
    if (user && !isEditing) {
      setFullName(user.full_name || '');
      setPhone(user.phone || '');
      setLocation(user.location || '');
      setBio(user.bio || '');
    }
  }, [user, isEditing]); // Include isEditing to re-check if user toggled off edit without cancel

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

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      await refreshUser();
      
      toast({
        title: 'Avatar Updated',
        description: 'Your profile picture has been updated successfully.',
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
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          phone: phone,
          location: location,
          bio: bio,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      await refreshUser();
      setIsEditing(false);

      toast({
        title: 'Profile Updated',
        description: 'Your profile details have been saved successfully.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Update failed',
        description: error?.message || 'There was an issue updating your profile.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading && !user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading profile...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 animate-fade-in">
      <DashboardHeader
        heading="My Profile"
        text="Manage your personal information."
      />
      
      <Card variant="glass" className="mt-6 overflow-hidden border-primary/10 shadow-2xl">
        <div className="h-32 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent" />
        <CardContent className="-mt-16 relative">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="flex flex-col items-center space-y-4">
              <div className="relative group">
                <Avatar className="h-32 w-32 border-4 border-background shadow-xl group-hover:shadow-2xl transition-all duration-300">
                  <AvatarImage src={user?.avatar_url ?? undefined} />
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
                    <Loader2 className="h-8 w-8 text-white animate-spin" />
                  ) : (
                    <Camera className="h-8 w-8 text-white" />
                  )}
                </div>
              </div>
              
              <div className="flex flex-col items-center gap-2">
                <Badge variant={user?.status === 'active' ? 'success' : 'secondary'} className="capitalize px-3 py-1">
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
                    {fullName || 'Your Name'}
                    {user?.status === 'active' && <CheckCircle className="h-6 w-6 text-success" />}
                  </h2>
                  <p className="text-muted-foreground flex items-center gap-2 mt-1">
                    <Mail className="h-4 w-4" />
                    {user?.email}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {isEditing && (
                    <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 border-amber-500/20 flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-pulse" />
                      Editing Mode
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs py-1">
                    {user?.role?.toUpperCase() || 'USER'}
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
                  {user?.updated_at && (
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      Updated {new Date(user.updated_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>

              <Separator className="opacity-50" />

              <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="full-name">
                    Full Name
                  </label>
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <Input
                      id="full-name"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Full Name"
                      disabled={!isEditing}
                      className={cn(!isEditing && "bg-muted/50 border-transparent cursor-default")}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="email">
                    Email
                  </label>
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
                  <label className="text-sm font-medium" htmlFor="phone">
                    Phone
                  </label>
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    {isEditing ? (
                      <PhoneInput
                        id="phone"
                        value={phone}
                        onChange={(value) => setPhone(value)}
                        className="bg-background transition-colors"
                      />
                    ) : (
                      <Input
                        value={phone || 'No phone provided'}
                        disabled
                        className="bg-muted/50 border-transparent cursor-default"
                      />
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="location">
                    Location
                  </label>
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <Input
                      id="location"
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Location"
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
                      placeholder="Tell us about yourself..."
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      className="min-h-[120px] bg-background/50 focus:bg-background transition-colors"
                    />
                  ) : (
                    <div className="p-4 rounded-lg bg-primary/5 border border-primary/10 min-h-[120px] text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap italic">
                      {bio || "No bio provided yet. Tell the community about yourself!"}
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
                        setFullName(user?.full_name || '');
                        setPhone(user?.phone || '');
                        setLocation(user?.location || '');
                        setBio(user?.bio || '');
                        setIsEditing(false);
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
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Save Changes'
                      )}
                    </Button>
                  </div>
                )}
              </form>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Details Section - Only for Musicians */}
      {user?.role === 'musician' && (
        <div className="mt-6">
          <PaymentDetailsForm />
        </div>
      )}
    </div>
  );
};

export default UserProfile;
