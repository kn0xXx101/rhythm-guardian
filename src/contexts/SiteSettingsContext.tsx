import React, { createContext, useContext, useState, useEffect } from 'react';
import { getSettings } from '@/api/settings';

interface SiteSettingsContextType {
  siteName: string;
  siteDescription: string;
  isLoading: boolean;
}

const SiteSettingsContext = createContext<SiteSettingsContextType | undefined>(undefined);

export function SiteSettingsProvider({ children }: { children: React.ReactNode }) {
  const [siteName, setSiteName] = useState('Rhythm Guardian');
  const [siteDescription, setSiteDescription] = useState(
    'Connect with talented musicians and find the perfect sound for your event.'
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const settings = await getSettings();
        if (settings?.general?.siteName) setSiteName(settings.general.siteName);
        if (settings?.general?.siteDescription) setSiteDescription(settings.general.siteDescription);
      } catch {
        // Keep defaults
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  return (
    <SiteSettingsContext.Provider value={{ siteName, siteDescription, isLoading }}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings() {
  const ctx = useContext(SiteSettingsContext);
  if (ctx === undefined) {
    return {
      siteName: 'Rhythm Guardian',
      siteDescription: 'Connect with talented musicians and find the perfect sound for your event.',
      isLoading: false,
    };
  }
  return ctx;
}
