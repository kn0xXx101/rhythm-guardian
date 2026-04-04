import { Guitar, Mic, User } from 'lucide-react';

interface HirerContactDetailProps {
  instrument: string;
}

const HirerContactDetail = ({ instrument }: HirerContactDetailProps) => {
  return (
    <div className="flex items-center gap-1 mt-1">
      {instrument === 'Guitar' && <Guitar className="h-3 w-3 flex-shrink-0" />}
      {instrument === 'Piano' && <User className="h-3 w-3 flex-shrink-0" />}
      {instrument === 'Drums' && <Mic className="h-3 w-3 flex-shrink-0" />}
      <span className="text-xs">{instrument}</span>
    </div>
  );
};

export default HirerContactDetail;
