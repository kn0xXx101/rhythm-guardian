import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, ArrowRight, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface TourStep {
  title: string;
  description: string;
  target?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

interface OnboardingTourProps {
  tourName: string;
  steps: TourStep[];
  onComplete: () => void;
}

export function OnboardingTour({ tourName, steps, onComplete }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    checkTourStatus();
  }, [tourName]);

  const checkTourStatus = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('feature_tours')
        .select('*')
        .eq('user_id', user.id)
        .eq('tour_name', tourName)
        .maybeSingle();

      if (!data || !data.completed) {
        setIsVisible(true);
        if (data) {
          setCurrentStep(data.last_step || 0);
        }
      }
    } catch (error) {
      console.error('Failed to check tour status:', error);
    }
  };

  const handleNext = async () => {
    const nextStep = currentStep + 1;

    if (nextStep < steps.length) {
      setCurrentStep(nextStep);
      await saveTourProgress(nextStep, false);
    } else {
      await completeTour();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = async () => {
    await completeTour();
  };

  const saveTourProgress = async (step: number, completed: boolean) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('feature_tours').upsert(
        {
          user_id: user.id,
          tour_name: tourName,
          last_step: step,
          completed,
          completed_at: completed ? new Date().toISOString() : null,
        },
        {
          onConflict: 'user_id,tour_name',
        }
      );
    } catch (error) {
      console.error('Failed to save tour progress:', error);
    }
  };

  const completeTour = async () => {
    await saveTourProgress(steps.length - 1, true);
    setIsVisible(false);
    onComplete();
  };

  if (!isVisible || steps.length === 0) {
    return null;
  }

  const step = steps[currentStep];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-1">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleSkip} className="flex-shrink-0">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center justify-between mt-6">
            <div className="flex gap-1">
              {steps.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-2 w-2 rounded-full ${
                    idx === currentStep ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              ))}
            </div>

            <div className="flex gap-2">
              {currentStep > 0 && (
                <Button variant="outline" size="sm" onClick={handlePrev}>
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
              )}
              <Button size="sm" onClick={handleNext}>
                {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
                {currentStep < steps.length - 1 && <ArrowRight className="h-4 w-4 ml-1" />}
              </Button>
            </div>
          </div>

          <div className="mt-4 text-center">
            <Button variant="link" size="sm" onClick={handleSkip}>
              Skip tour
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
