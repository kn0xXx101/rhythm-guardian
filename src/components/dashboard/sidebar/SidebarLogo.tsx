import { cn } from '@/lib/utils';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';
import { useTheme } from '@/contexts/ThemeContext';

interface SidebarLogoProps {
  isCollapsed?: boolean;
}

const SidebarLogo = ({ isCollapsed = false }: SidebarLogoProps) => {
  const { siteName } = useSiteSettings();
  const { settings } = useTheme();
  
  // Get admin colors or fallback to defaults
  const primaryColor = settings?.appearance?.primaryColor || '#8B5CF6';
  const secondaryColor = settings?.appearance?.secondaryColor || '#EC4899';
  
  return (
    <div
      className={cn(
        'py-1 px-1 flex flex-col items-center justify-center transition-all duration-300 relative gap-0'
      )}
    >
      <div className="relative group flex-shrink-0 mb-0">
        {/* Audio Waveform Shield Logo */}
        <img 
          src="/logo.svg" 
          alt="Rhythm Guardian Logo"
          className="w-32 h-32 object-contain transition-transform duration-300 hover:scale-110"
          style={{
            filter: `drop-shadow(0 0 8px ${primaryColor}60)`,
          } as React.CSSProperties}
        />
      </div>
      {!isCollapsed && (
        <h1
          className="text-lg font-bold text-center whitespace-nowrap transition-opacity duration-300"
          style={{
            background: `linear-gradient(to right, ${primaryColor}, ${secondaryColor})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginTop: '-16px',
          }}
        >
          {siteName}
        </h1>
      )}
    </div>
  );
};

export default SidebarLogo;
