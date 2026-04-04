import { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Clock, TrendingUp, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'rhythm-guardian-recent-searches';
const MAX_RECENT_SEARCHES = 10;
const MAX_SUGGESTIONS = 8;

// Popular searches - could be fetched from API in production
const POPULAR_SEARCHES = [
  'Guitar',
  'Piano',
  'Jazz',
  'Wedding',
  'Corporate Event',
  'Live Performance',
  'Classical',
  'DJ',
];

interface SearchSuggestionsProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: (query: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchSuggestions({
  value,
  onChange,
  onSearch,
  placeholder = 'Search musicians...',
  className,
}: SearchSuggestionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setRecentSearches(Array.isArray(parsed) ? parsed : []);
      }
    } catch (error) {
      console.error('Error loading recent searches:', error);
    }
  }, []);

  // Generate suggestions based on input value
  useEffect(() => {
    if (!value.trim()) {
      setSuggestions([]);
      return;
    }

    const lowerValue = value.toLowerCase();
    const filtered: string[] = [];

    // Add matching popular searches
    POPULAR_SEARCHES.forEach(search => {
      if (search.toLowerCase().includes(lowerValue) && filtered.length < MAX_SUGGESTIONS) {
        filtered.push(search);
      }
    });

    // Add matching recent searches (excluding duplicates)
    recentSearches.forEach(search => {
      if (
        search.toLowerCase().includes(lowerValue) &&
        !filtered.includes(search) &&
        filtered.length < MAX_SUGGESTIONS
      ) {
        filtered.push(search);
      }
    });

    setSuggestions(filtered);
  }, [value, recentSearches]);

  const saveRecentSearch = useCallback((query: string) => {
    if (!query.trim()) return;

    setRecentSearches(prev => {
      // Remove duplicate and add to beginning
      const filtered = prev.filter(s => s.toLowerCase() !== query.toLowerCase());
      const updated = [query, ...filtered].slice(0, MAX_RECENT_SEARCHES);
      
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (error) {
        console.error('Error saving recent search:', error);
      }
      
      return updated;
    });
  }, []);

  const handleSearch = useCallback((query: string) => {
    const trimmedQuery = query.trim();
    if (trimmedQuery) {
      saveRecentSearch(trimmedQuery);
      onSearch(trimmedQuery);
      setIsOpen(false);
      setSelectedIndex(-1);
    }
  }, [onSearch, saveRecentSearch]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    const allSuggestions = [
      ...suggestions,
      ...recentSearches.filter(s => !suggestions.includes(s))
    ].slice(0, MAX_SUGGESTIONS);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => 
        prev < allSuggestions.length - 1 ? prev + 1 : prev
      );
      setIsOpen(true);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < allSuggestions.length) {
        handleSearch(allSuggestions[selectedIndex]);
      } else if (value.trim()) {
        handleSearch(value);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setSelectedIndex(-1);
      inputRef.current?.blur();
    }
  }, [suggestions, recentSearches, selectedIndex, value, handleSearch]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setIsOpen(true);
    setSelectedIndex(-1);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleInputBlur = (e: React.FocusEvent) => {
    // Delay closing to allow click events on suggestions
    setTimeout(() => {
      if (!containerRef.current?.contains(document.activeElement)) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    }, 200);
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing recent searches:', error);
    }
  };

  const showSuggestions = isOpen && (suggestions.length > 0 || recentSearches.length > 0 || value.trim());

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          placeholder={placeholder}
          className="pl-10 pr-4"
        />
      </div>

      {showSuggestions && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-96 overflow-y-auto">
          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div className="p-2 border-b">
              <div className="text-xs font-semibold text-muted-foreground px-2 py-1 mb-1">
                Suggestions
              </div>
              {suggestions.map((suggestion, index) => (
                <button
                  key={suggestion}
                  onClick={() => handleSearch(suggestion)}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded hover:bg-accent flex items-center gap-2',
                    selectedIndex === index && 'bg-accent'
                  )}
                >
                  <Search className="h-3 w-3 text-muted-foreground" />
                  <span>{suggestion}</span>
                </button>
              ))}
            </div>
          )}

          {/* Recent Searches */}
          {recentSearches.length > 0 && !value.trim() && (
            <div className="p-2 border-b">
              <div className="flex items-center justify-between px-2 py-1 mb-1">
                <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Recent Searches
                </div>
                <button
                  onClick={clearRecentSearches}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
              </div>
              {recentSearches.slice(0, MAX_SUGGESTIONS).map((search, index) => (
                <button
                  key={`recent-${index}`}
                  onClick={() => handleSearch(search)}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded hover:bg-accent flex items-center gap-2',
                    selectedIndex === suggestions.length + index && 'bg-accent'
                  )}
                >
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span>{search}</span>
                </button>
              ))}
            </div>
          )}

          {/* Popular Searches */}
          {!value.trim() && recentSearches.length === 0 && (
            <div className="p-2">
              <div className="text-xs font-semibold text-muted-foreground px-2 py-1 mb-2 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Popular Searches
              </div>
              <div className="flex flex-wrap gap-2 px-2">
                {POPULAR_SEARCHES.slice(0, 6).map((search) => (
                  <Badge
                    key={search}
                    variant="outline"
                    className="cursor-pointer hover:bg-accent"
                    onClick={() => handleSearch(search)}
                  >
                    {search}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

