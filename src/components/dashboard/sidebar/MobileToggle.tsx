import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';

interface MobileToggleProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

const MobileToggle = ({ isOpen, toggleSidebar }: MobileToggleProps) => {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleSidebar}
      className="fixed top-4 left-4 z-50 lg:hidden"
    >
      {isOpen ? <X /> : <Menu />}
    </Button>
  );
};

export default MobileToggle;
