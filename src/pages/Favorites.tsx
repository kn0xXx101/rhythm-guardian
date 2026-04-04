import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, MapPin, Star, MessageCircle, TrendingUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { searchService } from '@/services/search';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { CardSkeleton } from '@/components/ui/card-skeleton';

export default function Favorites() {
  const [favorites, setFavorites] = useState<any[]>([]);
  const [collections, setCollections] = useState<string[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<string>('default');
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      loadFavorites();
      loadCollections();
    }
  }, [user]);

  const loadFavorites = async () => {
    if (!user) return;

    try {
      const data = await searchService.getUserFavorites(user.id);
      setFavorites(data);
    } catch (error) {
      console.error('Failed to load favorites:', error);
      toast({ title: 'Failed to load favorites', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const loadCollections = async () => {
    if (!user) return;

    try {
      const cols = await searchService.getFavoriteCollections(user.id);
      setCollections(cols);
    } catch (error) {
      console.error('Failed to load collections:', error);
    }
  };

  const handleRemoveFavorite = async (musicianUserId: string) => {
    try {
      await searchService.removeFromFavorites(musicianUserId);
      setFavorites((prev) => prev.filter((f) => f.musician_user_id !== musicianUserId));
      toast({ title: 'Removed from favorites' });
    } catch (error) {
      toast({ title: 'Failed to remove favorite', variant: 'destructive' });
    }
  };

  const filteredFavorites = favorites.filter(
    (f) => selectedCollection === 'all' || f.collection_name === selectedCollection
  );

  return (
    <div className="container mx-auto p-6 space-y-6 animate-fade-in">
      <DashboardHeader
        heading="My Favorites"
        text="Musicians you've saved for later."
      />

      <div className="flex gap-2 flex-wrap">
        <Button
          variant={selectedCollection === 'default' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedCollection('default')}
          className="rounded-full"
        >
          All
        </Button>
        {collections
          .filter((c) => c !== 'default')
          .map((collection) => (
            <Button
              key={collection}
              variant={selectedCollection === collection ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCollection(collection)}
              className="rounded-full"
            >
              {collection}
            </Button>
          ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} className="h-[280px]" />
          ))}
        </div>
      ) : filteredFavorites.length === 0 ? (
        <Card variant="glass" className="p-8 text-center">
          <CardContent className="pt-6">
            <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-xl font-semibold mb-2">No favorites yet</p>
            <p className="text-muted-foreground mb-6">
              Start exploring musicians and save them to your favorites list.
            </p>
            <Button onClick={() => navigate('/search')} className="group">
              Explore Musicians
              <TrendingUp className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFavorites.map((favorite) => (
            <Card key={favorite.id} variant="gradient-border" className="overflow-hidden hover-scale group">
              <CardHeader className="flex flex-row items-center gap-4 pb-2">
                <Avatar className="h-12 w-12 border-2 border-primary/10">
                  <AvatarImage src={favorite.profiles?.avatar_url} />
                  <AvatarFallback>{favorite.profiles?.full_name?.[0] || 'M'}</AvatarFallback>
                </Avatar>
                <div className="flex-1 overflow-hidden">
                  <CardTitle className="text-lg truncate">
                    {favorite.profiles?.full_name || 'Unknown Musician'}
                  </CardTitle>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Star className="h-3 w-3 text-yellow-500 fill-yellow-500 mr-1" />
                    <span>{favorite.profiles?.rating || 'New'}</span>
                    <span className="mx-1">•</span>
                    <span className="truncate">{favorite.profiles?.instruments?.[0] || 'Musician'}</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                  onClick={() => handleRemoveFavorite(favorite.musician_user_id)}
                >
                  <Heart className="h-5 w-5 fill-current" />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 mr-2 text-primary" />
                    <span className="truncate">{favorite.profiles?.location || 'Location not specified'}</span>
                  </div>
                  
                  {favorite.notes && (
                    <div className="text-sm bg-muted/50 p-2 rounded-md italic">
                      "{favorite.notes}"
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button 
                      className="flex-1 group" 
                      onClick={() => navigate(`/musician/${favorite.musician_user_id}`)}
                    >
                      View Profile
                      <TrendingUp className="ml-2 h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => navigate(`/hirer/chat?user=${favorite.musician_user_id}`)}
                    >
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
