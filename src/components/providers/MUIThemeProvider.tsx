import { ThemeProvider, createTheme } from '@mui/material/styles';
import { useTheme as useAppTheme } from '@/contexts/ThemeContext';
import { ReactNode, useMemo } from 'react';

interface MUIThemeProviderProps {
  children: ReactNode;
}

export const MUIThemeProvider = ({ children }: MUIThemeProviderProps) => {
  const { resolvedTheme, settings } = useAppTheme();
  const isDark = resolvedTheme === 'dark';

  // Extract colors from CSS variables or use theme context settings
  const primaryColor = useMemo(() => {
    if (settings?.appearance?.primaryColor) {
      return settings.appearance.primaryColor;
    }
    // Fallback to CSS variable default
    return '#8B5CF6'; // Default primary color (purple-500)
  }, [settings]);

  const secondaryColor = useMemo(() => {
    if (settings?.appearance?.secondaryColor) {
      return settings.appearance.secondaryColor;
    }
    // Fallback to CSS variable default
    return '#EC4899'; // Default secondary color (pink-500)
  }, [settings]);

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: isDark ? 'dark' : 'light',
          primary: {
            main: primaryColor,
          },
          secondary: {
            main: secondaryColor,
          },
          background: {
            default: isDark ? 'hsl(250, 20%, 10%)' : 'hsl(250, 100%, 99%)',
            paper: isDark ? 'hsl(250, 20%, 13%)' : 'hsl(0, 0%, 100%)',
          },
        },
        components: {
          MuiPaper: {
            styleOverrides: {
              root: {
                backgroundImage: 'none',
              },
            },
          },
        },
      }),
    [isDark, primaryColor, secondaryColor]
  );

  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
};
