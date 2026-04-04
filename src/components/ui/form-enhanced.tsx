/**
 * Enhanced form components that integrate with react-hook-form
 * and provide real-time validation, character counters, and masks
 */

import * as React from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MaskedInput } from '@/components/ui/input-masked';
import { TextareaWithCounter } from '@/components/ui/textarea-with-counter';
import { AutocompleteInput } from '@/components/ui/autocomplete';
import {
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
} from '@/components/ui/form';
import { cn } from '@/lib/utils';
import { MaskPattern } from '@/lib/input-masks';
import type { AutocompleteOption } from '@/components/ui/autocomplete';

/**
 * Enhanced Input field with real-time validation
 */
export interface FormInputProps extends Omit<React.ComponentProps<typeof Input>, 'name'> {
  name: string;
  label?: string;
  description?: string;
  mask?: MaskPattern[] | 'phone' | 'phoneGhana' | 'phoneUS' | 'creditCard' | 'date' | 'time';
  showValidation?: boolean;
  characterCount?: boolean;
}

export function FormInput({
  name,
  label,
  description,
  mask,
  showValidation = true,
  characterCount = false,
  ...props
}: FormInputProps) {
  return (
    <FormField
      name={name}
      render={({ field, fieldState }) => (
        <FormItem>
          {label && <FormLabel>{label}</FormLabel>}
          <FormControl>
            {mask ? (
              <MaskedInput
                {...field}
                mask={mask}
                showValidation={showValidation}
                isValid={!fieldState.error}
                characterCount={characterCount}
                {...props}
              />
            ) : (
              <Input
                {...field}
                aria-invalid={!!fieldState.error}
                className={cn(
                  fieldState.error && 'border-destructive focus-visible:ring-destructive',
                  characterCount && props.maxLength && 'pr-16'
                )}
                {...props}
              />
            )}
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

/**
 * Enhanced Textarea with character counter
 */
export interface FormTextareaProps extends Omit<React.ComponentProps<typeof Textarea>, 'name'> {
  name: string;
  label?: string;
  description?: string;
  showValidation?: boolean;
  characterCount?: boolean;
}

export function FormTextarea({
  name,
  label,
  description,
  showValidation = true,
  characterCount = true,
  ...props
}: FormTextareaProps) {
  return (
    <FormField
      name={name}
      render={({ field, fieldState }) => (
        <FormItem>
          {label && <FormLabel>{label}</FormLabel>}
          <FormControl>
            {characterCount && props.maxLength ? (
              <TextareaWithCounter
                {...field}
                {...props}
                showValidation={showValidation}
                isValid={!fieldState.error}
              />
            ) : (
              <Textarea
                {...field}
                {...props}
                className={cn(
                  fieldState.error && 'border-destructive focus-visible:ring-destructive'
                )}
              />
            )}
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

/**
 * Form Autocomplete input
 */
export interface FormAutocompleteProps {
  name: string;
  label?: string;
  description?: string;
  options: AutocompleteOption[];
  onSelect?: (option: AutocompleteOption) => void;
  emptyMessage?: string;
  filterOptions?: boolean;
  maxResults?: number;
}

export function FormAutocomplete({
  name,
  label,
  description,
  options,
  onSelect,
  emptyMessage,
  filterOptions = true,
  maxResults = 10,
}: FormAutocompleteProps) {
  return (
    <FormField
      name={name}
      render={({ field, fieldState }) => (
        <FormItem>
          {label && <FormLabel>{label}</FormLabel>}
          <FormControl>
            <AutocompleteInput
              {...field}
              options={options}
              onSelect={onSelect}
              emptyMessage={emptyMessage}
              filterOptions={filterOptions}
              maxResults={maxResults}
              className={cn(
                fieldState.error && 'border-destructive focus-visible:ring-destructive'
              )}
            />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

/**
 * Hook to enable real-time validation on a form
 * Use with react-hook-form's useForm hook
 */
export function useFormWithRealtimeValidation<T extends Record<string, any>>(options?: {
  mode?: 'onChange' | 'onBlur' | 'onSubmit' | 'onTouched' | 'all';
}) {
  return {
    mode: options?.mode || 'onChange', // Real-time validation
    reValidateMode: 'onChange',
  };
}
