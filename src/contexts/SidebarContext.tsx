import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

const SIDEBAR_STORAGE_KEY = 'sidebar:collapsed';

interface SidebarContextType {
  isCollapsed: boolean;
  toggleCollapse: () => void;
  isMobile: boolean;
  isMobileOpen: boolean;
  toggleMobileSidebar: () => void;
  setMobileSidebarOpen: (open: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const useSidebarContext = () => {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebarContext must be used within a SidebarProvider');
  }
  return context;
};

interface SidebarProviderProps {
  children: ReactNode;
}

export const SidebarProvider: React.FC<SidebarProviderProps> = ({ children }) => {
  const isMobile = useIsMobile();
  const [isMobileOpen, setMobileSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (isMobile) return false;
    const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    return saved === 'true';
  });

  useEffect(() => {
    if (!isMobile) {
      const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY);
      if (saved !== null) {
        setIsCollapsed(saved === 'true');
      }
      setMobileSidebarOpen(false);
    } else {
      setIsCollapsed(false);
    }
  }, [isMobile]);

  const toggleCollapse = useCallback(() => {
    if (isMobile) return;
    setIsCollapsed((prev) => {
      const newState = !prev;
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(newState));
      return newState;
    });
  }, [isMobile]);

  const toggleMobileSidebar = useCallback(() => {
    setMobileSidebarOpen((prev) => !prev);
  }, []);

  return (
    <SidebarContext.Provider 
      value={{ 
        isCollapsed, 
        toggleCollapse, 
        isMobile,
        isMobileOpen,
        toggleMobileSidebar,
        setMobileSidebarOpen
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
};
