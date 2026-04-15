import { Bot } from 'lucide-react';
import { AI_ASSISTANT_ID } from '@/services/ai-assistant';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface ChatHeaderProps {
  contact: {
    id?: string | number;
    name: string;
    image: string;
    isOnline?: boolean;
    [key: string]: any;
  } | null;
  renderDetailComponent: () => React.ReactNode;
  onBack?: () => void;
}

const ChatHeader = ({ contact, renderDetailComponent, onBack }: ChatHeaderProps) => {
  if (!contact) return null;

  return (
    <div className="p-4 border-b flex items-center gap-3 flex-shrink-0 bg-background sticky top-0 z-10">
      {onBack && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="md:hidden -ml-2"
          aria-label="Back to conversations"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      )}
      <div className="relative flex-shrink-0">
        <div
          className={`w-10 h-10 rounded-full overflow-hidden ${contact.id === AI_ASSISTANT_ID ? 'bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center' : ''}`}
        >
          {contact.id === AI_ASSISTANT_ID ? (
            <Bot className="w-5 h-5 text-white" />
          ) : (
            <OptimizedImage
              src={contact.image || '/placeholder.svg'}
              alt={contact.name}
              className="w-full h-full object-cover rounded-full"
              fallbackSrc="/placeholder.svg"
            />
          )}
        </div>
        {/* Online status indicator */}
        {contact.isOnline && (
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-medium truncate">{contact.name}</h3>
        <div className="mt-1">{renderDetailComponent()}</div>
      </div>
    </div>
  );
};

export default ChatHeader;
