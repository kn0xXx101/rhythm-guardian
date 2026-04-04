import { User, Music, Briefcase } from 'lucide-react';

interface AdminContactDetailProps {
  userRole: string;
}

const AdminContactDetail = ({ userRole }: AdminContactDetailProps) => {
  const getRoleIcon = () => {
    switch (userRole?.toLowerCase()) {
      case 'musician':
        return <Music className="h-3 w-3 flex-shrink-0" />;
      case 'hirer':
        return <Briefcase className="h-3 w-3 flex-shrink-0" />;
      default:
        return <User className="h-3 w-3 flex-shrink-0" />;
    }
  };

  const getRoleLabel = () => {
    switch (userRole?.toLowerCase()) {
      case 'musician':
        return 'Musician';
      case 'hirer':
        return 'Hirer';
      default:
        return 'User';
    }
  };

  return (
    <div className="flex items-center gap-1 mt-1">
      {getRoleIcon()}
      <span className="text-xs">{getRoleLabel()}</span>
    </div>
  );
};

export default AdminContactDetail;
