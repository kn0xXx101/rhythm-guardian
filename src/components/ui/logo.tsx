import { useSiteSettings } from '@/contexts/SiteSettingsContext';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function Logo({ className = '', showText = true, size = 'md' }: LogoProps) {
  const { siteName } = useSiteSettings();
  const { settings } = useTheme();
  
  // Recommended logo sizes for different contexts
  const sizes = {
    sm: 'h-12 w-12',    // 48px - For small UI elements, buttons
    md: 'h-16 w-16',    // 64px - For navigation, headers
    lg: 'h-24 w-24',    // 96px - For hero sections, main branding
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-xl',
  };

  // Get admin colors or fallback to defaults
  const primaryColor = settings?.appearance?.primaryColor || '#FF8C00';
  const secondaryColor = settings?.appearance?.secondaryColor || '#00BFFF';

  // Create dynamic gradient based on admin colors
  const getGradientStyle = () => {
    return {
      background: `linear-gradient(to right, ${primaryColor}, ${secondaryColor})`,
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
    };
  };

  // Dynamic SVG styling with admin colors
  const getSvgStyle = () => {
    return {
      filter: `drop-shadow(0 0 4px ${primaryColor}40)`,
      '--primary-color': primaryColor,
      '--secondary-color': secondaryColor,
    } as React.CSSProperties;
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Audio Waveform Shield Logo */}
      <img 
        src="/logo.svg" 
        alt="Rhythm Guardian Logo"
        className={`${sizes[size]} object-contain transition-transform duration-300 hover:scale-105`}
        style={getSvgStyle()}
      />

      {showText && (
        <span 
          className={cn(
            "font-bold tracking-tight whitespace-nowrap",
            textSizes[size]
          )}
          style={getGradientStyle()}
        >
          {siteName}
        </span>
      )}
    </div>
  );
}
