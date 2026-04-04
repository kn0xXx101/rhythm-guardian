import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';

export interface Step {
  id: string;
  title: string;
  description?: string;
  component: React.ReactNode;
  isValid?: boolean;
  optional?: boolean;
}

export interface MultiStepFormProps {
  steps: Step[];
  currentStep: number;
  onStepChange: (step: number) => void;
  onComplete?: () => void;
  onCancel?: () => void;
  showProgress?: boolean;
  allowSkipSteps?: boolean;
  className?: string;
  submitButtonText?: string;
  cancelButtonText?: string;
  nextButtonText?: string;
  previousButtonText?: string;
}

export function MultiStepForm({
  steps,
  currentStep,
  onStepChange,
  onComplete,
  onCancel,
  showProgress = true,
  allowSkipSteps = false,
  className,
  submitButtonText = 'Submit',
  cancelButtonText = 'Cancel',
  nextButtonText = 'Next',
  previousButtonText = 'Previous',
}: MultiStepFormProps) {
  const progress = ((currentStep + 1) / steps.length) * 100;
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;
  const currentStepData = steps[currentStep];

  if (!currentStepData) {
    return null;
  }

  const handleNext = () => {
    if (!isLastStep) {
      onStepChange(currentStep + 1);
    } else {
      onComplete?.();
    }
  };

  const handlePrevious = () => {
    if (!isFirstStep) {
      onStepChange(currentStep - 1);
    }
  };

  const handleStepClick = (stepIndex: number) => {
    if (allowSkipSteps || stepIndex <= currentStep) {
      onStepChange(stepIndex);
    }
  };

  return (
    <div className={cn('w-full space-y-6', className)}>
      {/* Progress Indicator */}
      {showProgress && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Step {currentStep + 1} of {steps.length}
            </span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {/* Step Indicators */}
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isAccessible = allowSkipSteps || index <= currentStep;

          return (
            <React.Fragment key={step.id}>
              <div
                className={cn(
                  'flex flex-col items-center flex-1 cursor-pointer',
                  !isAccessible && 'cursor-not-allowed opacity-50'
                )}
                role="button"
                tabIndex={isAccessible ? 0 : -1}
                aria-disabled={!isAccessible}
                onClick={() => isAccessible && handleStepClick(index)}
                onKeyDown={(event) => {
                  if (isAccessible && (event.key === 'Enter' || event.key === ' ')) {
                    event.preventDefault();
                    handleStepClick(index);
                  }
                }}
              >
                <div
                  className={cn(
                    'flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors',
                    isCompleted && 'bg-primary border-primary text-primary-foreground',
                    isCurrent && 'bg-primary border-primary text-primary-foreground',
                    !isCompleted && !isCurrent && 'border-muted-foreground bg-background'
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <span className="text-sm font-medium">{index + 1}</span>
                  )}
                </div>
                <div className="mt-2 text-center">
                  <div className={cn('text-sm font-medium', isCurrent && 'text-primary')}>
                    {step.title}
                  </div>
                  {step.description && (
                    <div className="text-xs text-muted-foreground mt-1">{step.description}</div>
                  )}
                </div>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'h-0.5 flex-1 mx-2 transition-colors',
                    index < currentStep ? 'bg-primary' : 'bg-muted'
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Current Step Content */}
      <div className="min-h-[300px] py-6">{currentStepData.component}</div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-4 border-t">
        <div>
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              {cancelButtonText}
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isFirstStep && (
            <Button variant="outline" onClick={handlePrevious}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              {previousButtonText}
            </Button>
          )}
          <Button onClick={handleNext} disabled={currentStepData.isValid === false}>
            {isLastStep ? (
              submitButtonText
            ) : (
              <>
                {nextButtonText}
                <ChevronRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
