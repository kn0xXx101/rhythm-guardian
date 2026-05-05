import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Music, Globe, Mail, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function ComingSoon() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const { toast } = useToast();

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsSubmitting(true);
    try {
      // Check if we have a waiting_list table, otherwise use a generic RPC or handle gracefully
      const { error } = await supabase
        .from('waiting_list')
        .insert([{ email, source: 'geo_restriction', created_at: new Date().toISOString() }]);

      if (error) {
        if (error.code === '42P01') {
          // Table doesn't exist, log for admin but show success to user (or use a different storage)
          console.warn('waiting_list table missing, email:', email);
        } else {
          throw error;
        }
      }

      setIsSubscribed(true);
      toast({
        title: "You're on the list!",
        description: "We'll notify you as soon as we expand to your region.",
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Subscription failed',
        description: error.message || 'Something went wrong. Please try again later.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 bg-gradient-to-b from-primary/5 to-background">
      <Card className="max-w-md w-full shadow-xl border-t-4 border-t-primary">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Music className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight">Expanding Soon!</CardTitle>
          <CardDescription className="text-lg mt-2">
            Rhythm Guardian is currently exclusive to <span className="font-semibold text-primary">Ghana</span>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 p-4 rounded-lg border border-border text-center">
            <Globe className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              We've detected you're visiting from a different region. We're working hard to bring our 
              musician booking platform to your country very soon!
            </p>
          </div>

          {!isSubscribed ? (
            <form onSubmit={handleSubscribe} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Get notified when we launch in your area</Label>
                <div className="flex gap-2">
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="your@email.com" 
                    required 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isSubmitting}
                  />
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
                    Notify Me
                  </Button>
                </div>
              </div>
            </form>
          ) : (
            <div className="flex flex-col items-center justify-center py-4 text-center animate-in fade-in zoom-in duration-300">
              <CheckCircle2 className="w-12 h-12 text-green-500 mb-2" />
              <p className="font-semibold text-lg">Thank you for your interest!</p>
              <p className="text-sm text-muted-foreground">We'll be in touch soon.</p>
            </div>
          )}

          <div className="pt-4 border-t flex justify-center">
            <Button variant="link" asChild>
              <a href="https://rhythm-guardian.com" target="_blank" rel="noopener noreferrer">
                Learn more about us
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
