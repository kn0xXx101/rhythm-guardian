import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Search, Save, Filter } from 'lucide-react';
import { SearchFilters, SearchPreferences } from '@/types/features';
import { searchService } from '@/services/search';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface AdvancedSearchFiltersProps {
  onSearch: (filters: SearchFilters) => void;
  onSaveSearch?: (name: string, filters: SearchFilters) => void;
  initialFilters?: SearchFilters;
}

const INSTRUMENTS = [
  'Piano',
  'Guitar',
  'Drums',
  'Bass',
  'Violin',
  'Saxophone',
  'Trumpet',
  'Flute',
  'Cello',
];
const GENRES = [
  'Classical',
  'Jazz',
  'Rock',
  'Pop',
  'Blues',
  'Country',
  'Electronic',
  'Hip-Hop',
  'R&B',
];
const EXPERIENCE_LEVELS = ['beginner', 'intermediate', 'advanced', 'professional'];

export function AdvancedSearchFilters({ onSearch, onSaveSearch, initialFilters }: AdvancedSearchFiltersProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [filters, setFilters] = useState<SearchFilters>(initialFilters || {
    minPrice: 0,
    maxPrice: 100000,
    minRating: 0,
  });
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>(initialFilters?.instruments || []);
  const [selectedGenres, setSelectedGenres] = useState<string[]>(initialFilters?.genres || []);
  const [priceRange, setPriceRange] = useState<number[]>([
    initialFilters?.minPrice || 0,
    initialFilters?.maxPrice || 100000
  ]);
  const [saveName, setSaveName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [savedPresets, setSavedPresets] = useState<SearchPreferences[]>([]);
  const [showPresets, setShowPresets] = useState(false);

  // Load saved presets
  useEffect(() => {
    if (user && onSaveSearch) {
      searchService.getUserSearchPreferences(user.id)
        .then(setSavedPresets)
        .catch(() => {
          // Silently fail if user not logged in or service unavailable
        });
    }
  }, [user, onSaveSearch]);

  // Update filters when initialFilters change
  useEffect(() => {
    if (initialFilters) {
      setFilters(initialFilters);
      setSelectedInstruments(initialFilters.instruments || []);
      setSelectedGenres(initialFilters.genres || []);
      setPriceRange([
        initialFilters.minPrice || 0,
        initialFilters.maxPrice || 100000
      ]);
    }
  }, [initialFilters]);

  const toggleInstrument = (instrument: string) => {
    setSelectedInstruments((prev) =>
      prev.includes(instrument) ? prev.filter((i) => i !== instrument) : [...prev, instrument]
    );
  };

  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  const handleSearch = () => {
    const searchFilters: SearchFilters = {
      ...filters,
      instruments: selectedInstruments.length > 0 ? selectedInstruments : undefined,
      genres: selectedGenres.length > 0 ? selectedGenres : undefined,
      minPrice: priceRange[0],
      maxPrice: priceRange[1],
    };
    onSearch(searchFilters);
  };

  const handleSaveSearch = async () => {
    if (saveName && onSaveSearch && user) {
      const searchFilters: SearchFilters = {
        ...filters,
        instruments: selectedInstruments,
        genres: selectedGenres,
        minPrice: priceRange[0],
        maxPrice: priceRange[1],
      };
      
      try {
        await searchService.saveSearchPreference({
          user_id: user.id,
          name: saveName,
          instruments: selectedInstruments.length > 0 ? selectedInstruments : undefined,
          genres: selectedGenres.length > 0 ? selectedGenres : undefined,
          min_price: priceRange[0] > 0 ? priceRange[0] : undefined,
          max_price: priceRange[1] < 100000 ? priceRange[1] : undefined,
          location: filters.location || undefined,
          min_rating: filters.minRating || undefined,
          experience_level: filters.experienceLevel || undefined,
          is_default: false,
        });
        onSaveSearch(saveName, searchFilters);
        toast({
          title: 'Search saved',
          description: `Saved "${saveName}" as a search preset.`,
        });
        setSaveName('');
        setShowSaveDialog(false);
        // Refresh presets
        const updated = await searchService.getUserSearchPreferences(user.id);
        setSavedPresets(updated);
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error saving search',
          description: 'Failed to save search preset. Please try again.',
        });
      }
    }
  };

  const loadPreset = (preset: SearchPreferences) => {
    const presetFilters: SearchFilters = {
      instruments: preset.instruments,
      genres: preset.genres,
      minPrice: preset.min_price,
      maxPrice: preset.max_price,
      location: preset.location,
      minRating: preset.min_rating,
      experienceLevel: preset.experience_level,
    };
    setFilters(presetFilters);
    setSelectedInstruments(preset.instruments || []);
    setSelectedGenres(preset.genres || []);
    setPriceRange([
      preset.min_price || 0,
      preset.max_price || 100000
    ]);
    setShowPresets(false);
    onSearch(presetFilters);
  };

  const deletePreset = async (id: string) => {
    if (!user) return;
    try {
      await searchService.deleteSearchPreference(id);
      setSavedPresets(savedPresets.filter(p => p.id !== id));
      toast({
        title: 'Preset deleted',
        description: 'Search preset has been deleted.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error deleting preset',
        description: 'Failed to delete search preset. Please try again.',
      });
    }
  };

  const clearFilters = () => {
    setFilters({ minPrice: 0, maxPrice: 100000, minRating: 0 });
    setSelectedInstruments([]);
    setSelectedGenres([]);
    setPriceRange([0, 100000]);
    onSearch({});
  };

  // Get active filter chips
  const getActiveFilters = () => {
    const active: Array<{ label: string; value: string; onRemove: () => void }> = [];
    
    selectedInstruments.forEach(inst => {
      active.push({
        label: `Instrument: ${inst}`,
        value: `instrument-${inst}`,
        onRemove: () => setSelectedInstruments(prev => prev.filter(i => i !== inst))
      });
    });

    selectedGenres.forEach(genre => {
      active.push({
        label: `Genre: ${genre}`,
        value: `genre-${genre}`,
        onRemove: () => setSelectedGenres(prev => prev.filter(g => g !== genre))
      });
    });

    if (filters.location) {
      active.push({
        label: `Location: ${filters.location}`,
        value: 'location',
        onRemove: () => setFilters({ ...filters, location: undefined })
      });
    }

    if (filters.experienceLevel) {
      active.push({
        label: `Experience: ${filters.experienceLevel}`,
        value: 'experience',
        onRemove: () => setFilters({ ...filters, experienceLevel: undefined })
      });
    }

    if (filters.minRating && filters.minRating > 0) {
      active.push({
        label: `Rating: ${filters.minRating}+`,
        value: 'rating',
        onRemove: () => setFilters({ ...filters, minRating: 0 })
      });
    }

    if (filters.isFeatured) {
      active.push({
        label: 'Featured only',
        value: 'featured',
        onRemove: () => setFilters({ ...filters, isFeatured: false })
      });
    }

    if (filters.isVerified) {
      active.push({
        label: 'Verified only',
        value: 'verified',
        onRemove: () => setFilters({ ...filters, isVerified: false })
      });
    }

    if (priceRange[0] > 0 || priceRange[1] < 100000) {
      active.push({
        label: `Price: ${priceRange[0]} - ${priceRange[1]}`,
        value: 'price',
        onRemove: () => setPriceRange([0, 100000])
      });
    }

    return active;
  };

  const activeFilters = getActiveFilters();

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Advanced Search</span>
          <div className="flex gap-2">
            {onSaveSearch && savedPresets.length > 0 && (
              <Popover open={showPresets} onOpenChange={setShowPresets}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Presets ({savedPresets.length})
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Saved Presets</Label>
                    <div className="space-y-1 max-h-64 overflow-y-auto">
                      {savedPresets.map((preset) => (
                        <div
                          key={preset.id}
                          className="flex items-center justify-between p-2 hover:bg-muted rounded cursor-pointer group"
                        >
                          <button
                            onClick={() => loadPreset(preset)}
                            className="flex-1 text-left text-sm"
                          >
                            {preset.name}
                          </button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              deletePreset(preset.id);
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}
            {activeFilters.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear All
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Active Filter Chips */}
        {activeFilters.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Active Filters</Label>
            <div className="flex flex-wrap gap-2">
              {activeFilters.map((filter) => (
                <Badge
                  key={filter.value}
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={filter.onRemove}
                >
                  {filter.label}
                  <X className="ml-1 h-3 w-3" />
                </Badge>
              ))}
            </div>
          </div>
        )}
        <div className="space-y-2">
          <Label>Instruments</Label>
          <div className="flex flex-wrap gap-2">
            {INSTRUMENTS.map((instrument) => (
              <Badge
                key={instrument}
                variant={selectedInstruments.includes(instrument) ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => toggleInstrument(instrument)}
              >
                {instrument}
                {selectedInstruments.includes(instrument) && <X className="ml-1 h-3 w-3" />}
              </Badge>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Genres</Label>
          <div className="flex flex-wrap gap-2">
            {GENRES.map((genre) => (
              <Badge
                key={genre}
                variant={selectedGenres.includes(genre) ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => toggleGenre(genre)}
              >
                {genre}
                {selectedGenres.includes(genre) && <X className="ml-1 h-3 w-3" />}
              </Badge>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Price Range (₦)</Label>
          <div className="px-2">
            <Slider
              min={0}
              max={100000}
              step={1000}
              value={priceRange}
              onValueChange={setPriceRange}
            />
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>₦{priceRange[0].toLocaleString()}</span>
            <span>₦{priceRange[1].toLocaleString()}</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Location</Label>
          <Input
            placeholder="City or state"
            value={filters.location || ''}
            onChange={(e) => setFilters({ ...filters, location: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label>Experience Level</Label>
          <Select
            value={filters.experienceLevel || ''}
            onValueChange={(value) => setFilters({ ...filters, experienceLevel: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select experience level" />
            </SelectTrigger>
            <SelectContent>
              {EXPERIENCE_LEVELS.map((level) => (
                <SelectItem key={level} value={level}>
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Minimum Rating</Label>
          <Select
            value={filters.minRating?.toString() || ''}
            onValueChange={(value) => setFilters({ ...filters, minRating: parseFloat(value) })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Any rating" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Any</SelectItem>
              <SelectItem value="3">3+ Stars</SelectItem>
              <SelectItem value="4">4+ Stars</SelectItem>
              <SelectItem value="4.5">4.5+ Stars</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="featured"
            checked={filters.isFeatured || false}
            onChange={(e) => setFilters({ ...filters, isFeatured: e.target.checked })}
            className="rounded"
          />
          <Label htmlFor="featured" className="cursor-pointer">
            Featured musicians only
          </Label>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="verified"
            checked={filters.isVerified || false}
            onChange={(e) => setFilters({ ...filters, isVerified: e.target.checked })}
            className="rounded"
          />
          <Label htmlFor="verified" className="cursor-pointer">
            Verified musicians only
          </Label>
        </div>

        <div className="flex gap-2">
          <Button className="flex-1" onClick={handleSearch}>
            <Search className="mr-2 h-4 w-4" />
            Search
          </Button>
          {onSaveSearch && (
            <Button variant="outline" onClick={() => setShowSaveDialog(!showSaveDialog)}>
              <Save className="h-4 w-4" />
            </Button>
          )}
        </div>

        {showSaveDialog && (
          <div className="space-y-2">
            <Input
              placeholder="Save search as..."
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
            />
            <Button className="w-full" onClick={handleSaveSearch}>
              Save Search
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
