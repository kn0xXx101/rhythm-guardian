import { useState, useEffect, useCallback, useRef } from 'react';
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
  /** Called after we know whether the user still needs this tour (for welcome toast coordination). */
  onReady?: (needsTour: boolean) => void;
  onComplete: () => void;
}

const localTourDoneKey = (tourName: string, userId: string) => `rg_tour_done_${tourName}_${userId}`;

export function OnboardingTour({ tourName, steps, onReady, onComplete }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const onReadyRef = useRef(onReady);
  const onCompleteRef = useRef(onComplete);
  onReadyRef.current = onReady;
  onCompleteRef.current = onComplete;

  const checkTourStatus = useCallback(async () => {
    if (steps.length === 0) {
      onReadyRef.current?.(false);
      return;
    }
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        onReadyRef.current?.(false);
        return;
      }

      const localDone = localStorage.getItem(localTourDoneKey(tourName, user.id)) === '1';

      const { data, error } = await supabase
        .from('feature_tours')
        .select('*')
        .eq('user_id', user.id)
        .eq('tour_name', tourName)
        .maybeSingle();

      if (error) {
        if (localDone) {
          onReadyRef.current?.(false);
          return;
        }
        setIsVisible(true);
        onReadyRef.current?.(true);
        return;
      }

      const completed = Boolean(data?.completed) || localDone;
      if (!completed) {
        setIsVisible(true);
        if (data?.last_step != null && data.last_step >= 0) {
          setCurrentStep(Math.min(data.last_step, steps.length - 1));
        }
        onReadyRef.current?.(true);
      } else {
        onReadyRef.current?.(false);
      }
    } catch (error) {
      console.error('Failed to check tour status:', error);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user && localStorage.getItem(localTourDoneKey(tourName, user.id)) === '1') {
          onReadyRef.current?.(false);
          return;
        }
        if (user) {
          setIsVisible(true);
          onReadyRef.current?.(true);
          return;
        }
      } catch {
        // ignore
      }
      onReadyRef.current?.(false);
    }
  }, [tourName, steps.length]);

  useEffect(() => {
    void checkTourStatus();
  }, [checkTourStatus]);

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

      if (completed) {
        try {
          localStorage.setItem(localTourDoneKey(tourName, user.id), '1');
        } catch {
          // ignore quota / private mode
        }
      }

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
    onCompleteRef.current();
  };

  if (!isVisible || steps.length === 0) {
    return null;
  }

  const step = steps[currentStep];

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      role="presentation"
    >
      <Card
        className="w-full max-w-md rounded-b-none border-b-0 shadow-2xl sm:rounded-xl sm:border sm:border-b max-h-[min(88dvh,100%)] flex flex-col sm:max-h-[85vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-tour-title"
        aria-describedby="onboarding-tour-desc"
      >
        <CardContent className="flex flex-1 flex-col gap-4 overflow-hidden pt-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pb-6">
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Quick orientation · Step {currentStep + 1} of {steps.length}
                </p>
                <h3 id="onboarding-tour-title" className="mt-2 text-lg font-semibold leading-snug">
                  {step.title}
                </h3>
                <p id="onboarding-tour-desc" className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSkip}
                className="h-10 w-10 shrink-0 touch-manipulation"
                aria-label="Close tour"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex flex-shrink-0 flex-col gap-4 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex justify-center gap-1.5 sm:justify-start">
              {steps.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-2 w-2 rounded-full transition-colors ${
                    idx === currentStep ? 'bg-primary' : 'bg-muted'
                  }`}
                  aria-hidden
                />
              ))}
            </div>

            <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
              {currentStep > 0 && (
                <Button
                  variant="outline"
                  size="default"
                  className="w-full touch-manipulation sm:w-auto"
                  onClick={handlePrev}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
              )}
              <Button
                size="default"
                className="w-full touch-manipulation sm:w-auto"
                onClick={handleNext}
              >
                {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
                {currentStep < steps.length - 1 && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="text-center">
            <Button variant="link" size="sm" className="touch-manipulation text-muted-foreground" onClick={handleSkip}>
              Skip tour
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
