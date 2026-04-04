import { Calendar } from 'lucide-react';

interface MusicianContactDetailProps {
  eventType: string;
}

const MusicianContactDetail = ({ eventType }: MusicianContactDetailProps) => {
  return (
    <div className="flex items-center gap-1 mt-1">
      <Calendar className="h-3 w-3 flex-shrink-0" />
      <span className="text-xs">{eventType}</span>
    </div>
  );
};

export default MusicianContactDetail;
