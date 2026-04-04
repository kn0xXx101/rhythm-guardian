import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Play, Eye, Upload, Trash2 } from 'lucide-react';
import { portfolioService } from '@/services/portfolio';
import { PortfolioItem } from '@/types/features';
import { OptimizedImage } from '@/components/ui/optimized-image';

interface PortfolioGalleryProps {
  musicianUserId: string;
  editable?: boolean;
}

export function PortfolioGallery({ musicianUserId, editable = false }: PortfolioGalleryProps) {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<PortfolioItem | null>(null);
  const [filter, setFilter] = useState<'all' | 'audio' | 'video' | 'photo'>('all');

  useEffect(() => {
    loadPortfolio();
  }, [musicianUserId]);

  const loadPortfolio = async () => {
    try {
      const data = await portfolioService.getPortfolioItems(musicianUserId);
      setItems(data);
    } catch (error) {
      console.error('Failed to load portfolio:', error);
    }
  };

  const handleItemClick = async (item: PortfolioItem) => {
    setSelectedItem(item);
    await portfolioService.incrementViews(item.id);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      await portfolioService.deletePortfolioItem(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      console.error('Failed to delete item:', error);
    }
  };

  const filteredItems = items.filter((item) => filter === 'all' || item.type === filter);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'audio':
        return '🎵';
      case 'video':
        return '🎥';
      case 'photo':
        return '📸';
      default:
        return '📄';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All
          </Button>
          <Button
            variant={filter === 'audio' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('audio')}
          >
            Audio
          </Button>
          <Button
            variant={filter === 'video' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('video')}
          >
            Video
          </Button>
          <Button
            variant={filter === 'photo' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('photo')}
          >
            Photos
          </Button>
        </div>

        {editable && (
          <Button size="sm">
            <Upload className="mr-2 h-4 w-4" />
            Upload
          </Button>
        )}
      </div>

      {filteredItems.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No portfolio items yet
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="relative aspect-video bg-muted">
                {item.thumbnail_url ? (
                  <OptimizedImage
                    src={item.thumbnail_url}
                    alt={item.title}
                    className="w-full h-full object-cover aspect-video"
                    fallbackSrc="/placeholder.svg"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl">
                    {getTypeIcon(item.type)}
                  </div>
                )}

                <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleItemClick(item)}
                    aria-label={item.type === 'photo' ? 'View photo' : 'Play video'}
                  >
                    {item.type === 'photo' ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                  {editable && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(item.id)}
                      aria-label={`Delete ${item.title || 'portfolio item'}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {item.is_featured && <Badge className="absolute top-2 right-2">Featured</Badge>}
              </div>

              <CardContent className="p-4">
                <h3 className="font-medium truncate">{item.title}</h3>
                {item.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                    {item.description}
                  </p>
                )}
                <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                  <span>{item.views} views</span>
                  {item.duration_seconds && (
                    <span>
                      {Math.floor(item.duration_seconds / 60)}:
                      {(item.duration_seconds % 60).toString().padStart(2, '0')}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedItem?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedItem?.type === 'audio' && (
              <audio controls className="w-full">
                <source src={selectedItem.file_url} />
                <track kind="captions" srcLang="en" label="Audio description" />
              </audio>
            )}
            {selectedItem?.type === 'video' && (
              <video controls className="w-full">
                <source src={selectedItem.file_url} />
                <track kind="captions" srcLang="en" label="Captions" />
              </video>
            )}
            {selectedItem?.type === 'photo' && (
              <OptimizedImage
                src={selectedItem.file_url}
                alt={selectedItem.title}
                className="w-full h-auto"
                fallbackSrc="/placeholder.svg"
                priority
              />
            )}
            {selectedItem?.description && (
              <p className="text-muted-foreground">{selectedItem.description}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
