import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, X } from 'lucide-react';

export interface SearchContact {
  id: string;
  name: string;
  image: string;
  role: string;
  isOnline: boolean;
  lastSeen: string;
}

interface ChatSearchBarProps {
  /** Roles to search for. Defaults to all non-admin roles. */
  searchRoles?: string[];
  onSelect: (contact: SearchContact) => void;
}

export function ChatSearchBar({ searchRoles, onSelect }: ChatSearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchContact[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearch = async (value: string) => {
    setQuery(value);
    if (!value.trim()) { setResults([]); return; }

    setIsSearching(true);
    try {
      let q = supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, last_active_at, role')
        .or(`full_name.ilike.%${value}%,email.ilike.%${value}%`)
        .limit(10);

      if (searchRoles && searchRoles.length > 0) {
        q = q.in('role', searchRoles);
      } else {
        q = q.neq('role', 'admin');
      }

      const { data } = await q;
      setResults(
        (data || []).map((p: any) => {
          const lastActive = p.last_active_at ? new Date(p.last_active_at) : new Date(0);
          return {
            id: p.user_id,
            name: p.full_name || 'Unknown',
            image: p.avatar_url || '/placeholder.svg',
            role: p.role || 'user',
            isOnline: Date.now() - lastActive.getTime() < 5 * 60 * 1000,
            lastSeen: p.last_active_at || new Date().toISOString(),
          };
        })
      );
    } catch (err) {
      console.error('Chat search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelect = (contact: SearchContact) => {
    onSelect(contact);
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative p-3 border-b flex-shrink-0">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search users..."
          value={query}
          onChange={(e) => { handleSearch(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          className="pl-9 pr-8"
        />
        {query && (
          <button
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => { setQuery(''); setResults([]); setOpen(false); }}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {open && query && (
        <div className="absolute left-3 right-3 mt-1 border rounded-md bg-background shadow-lg max-h-60 overflow-y-auto z-50">
          {isSearching ? (
            <p className="p-3 text-sm text-muted-foreground">Searching...</p>
          ) : results.length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground">No users found</p>
          ) : (
            results.map((r) => (
              <button
                key={r.id}
                onClick={() => handleSelect(r)}
                className="w-full flex items-center gap-3 p-3 hover:bg-muted transition-colors text-left"
              >
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarImage src={r.image} />
                  <AvatarFallback>{r.name.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{r.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{r.role}</p>
                </div>
                {r.isOnline && <span className="h-2 w-2 rounded-full bg-green-500 flex-shrink-0" />}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
