import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';

export interface AutocompleteOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface AutocompleteProps {
  options: AutocompleteOption[];
  value?: string;
  onChange?: (value: string) => void;
  onSearch?: (search: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
  allowCustomValue?: boolean;
  filterOptions?: boolean;
  groupBy?: (option: AutocompleteOption) => string;
  renderOption?: (option: AutocompleteOption) => React.ReactNode;
}

export function Autocomplete({
  options,
  value,
  onChange,
  onSearch,
  placeholder = 'Select option...',
  searchPlaceholder = 'Search...',
  emptyMessage = 'No results found.',
  disabled = false,
  className,
  allowCustomValue = false,
  filterOptions = true,
  groupBy,
  renderOption,
}: AutocompleteProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');

  const selectedOption = React.useMemo(
    () => options.find((option) => option.value === value),
    [options, value]
  );

  const filteredOptions = React.useMemo(() => {
    if (!filterOptions || !search) return options;

    const searchLower = search.toLowerCase();
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(searchLower) ||
        option.value.toLowerCase().includes(searchLower)
    );
  }, [options, search, filterOptions]);

  const groupedOptions = React.useMemo(() => {
    if (!groupBy) return null;

    const groups: Record<string, AutocompleteOption[]> = {};
    filteredOptions.forEach((option) => {
      const group = groupBy(option);
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(option);
    });

    return groups;
  }, [filteredOptions, groupBy]);

  const handleInputChange = (value: string) => {
    setSearch(value);
    onSearch?.(value);

    if (allowCustomValue && onChange) {
      onChange(value);
    }
  };

  const handleSelect = (selectedValue: string) => {
    const option = options.find((opt) => opt.value === selectedValue);
    if (option?.disabled) return;

    onChange?.(selectedValue === value ? '' : selectedValue);
    setOpen(false);
    setSearch('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-full justify-between',
            !selectedOption && 'text-muted-foreground',
            className
          )}
          disabled={disabled}
        >
          <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={search}
            onValueChange={handleInputChange}
          />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            {groupedOptions ? (
              Object.entries(groupedOptions).map(([groupName, groupOptions]) => (
                <CommandGroup key={groupName} heading={groupName}>
                  {groupOptions.map((option) => (
                    <CommandItem
                      key={option.value}
                      value={option.value}
                      onSelect={handleSelect}
                      disabled={option.disabled}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          value === option.value ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      {renderOption ? renderOption(option) : option.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))
            ) : (
              <CommandGroup>
                {filteredOptions.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={handleSelect}
                    disabled={option.disabled}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === option.value ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    {renderOption ? renderOption(option) : option.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Autocomplete as input field (allows typing and selecting)
 */
export interface AutocompleteInputProps {
  options: AutocompleteOption[];
  value?: string;
  onChange?: (value: string) => void;
  onOptionSelect?: (option: AutocompleteOption) => void;
  emptyMessage?: string;
  filterOptions?: boolean;
  maxResults?: number;
  inputProps?: React.ComponentProps<'input'>;
}

export function AutocompleteInput({
  options,
  value = '',
  onChange,
  onOptionSelect,
  emptyMessage = 'No results found.',
  filterOptions = true,
  maxResults = 10,
  inputProps,
}: AutocompleteInputProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState(value);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const popoverRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setSearch(value);
  }, [value]);

  const filteredOptions = React.useMemo(() => {
    if (!filterOptions || !search) return options.slice(0, maxResults);

    const searchLower = search.toLowerCase();
    return options
      .filter(
        (option) =>
          option.label.toLowerCase().includes(searchLower) ||
          option.value.toLowerCase().includes(searchLower)
      )
      .slice(0, maxResults);
  }, [options, search, filterOptions, maxResults]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearch(newValue);
    onChange?.(newValue);
    setOpen(newValue.length > 0 && filteredOptions.length > 0);
  };

  const handleSelect = (option: AutocompleteOption) => {
    setSearch(option.label);
    onChange?.(option.value);
    onOptionSelect?.(option);
    setOpen(false);
    inputRef.current?.blur();
  };

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full">
      <Input
        ref={inputRef}
        value={search}
        onChange={handleInputChange}
        onFocus={() => setOpen(search.length > 0 && filteredOptions.length > 0)}
        {...inputProps}
      />
      {open && filteredOptions.length > 0 && (
        <div
          ref={popoverRef}
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover shadow-md"
        >
          {filteredOptions.map((option) => (
            <div
              key={option.value}
              className={cn(
                'cursor-pointer px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground',
                option.disabled && 'cursor-not-allowed opacity-50'
              )}
              role={option.disabled ? undefined : 'button'}
              tabIndex={option.disabled ? -1 : 0}
              onClick={() => !option.disabled && handleSelect(option)}
              onKeyDown={(event) => {
                if (!option.disabled && (event.key === 'Enter' || event.key === ' ')) {
                  event.preventDefault();
                  handleSelect(option);
                }
              }}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
      {open && search.length > 0 && filteredOptions.length === 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover px-4 py-2 text-sm text-muted-foreground shadow-md">
          {emptyMessage}
        </div>
      )}
    </div>
  );
}
