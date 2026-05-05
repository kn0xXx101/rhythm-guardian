import React, { useState, useEffect } from 'react';
import ComingSoon from '@/pages/ComingSoon';
import { LoadingScreen } from '@/components/ui/loading-screen';

interface GeoRestrictionProps {
  children: React.ReactNode;
}

const GHANA_COUNTRY_CODE = 'GH';

export function GeoRestriction({ children }: GeoRestrictionProps) {
  const [isAllowed, setIsAllowed] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkLocation() {
      // In development, you might want to bypass this or simulate a specific location
      if (import.meta.env.DEV) {
        console.log('[GeoRestriction] Development mode: allowing access by default');
        setIsAllowed(true);
        setIsLoading(false);
        return;
      }

      try {
        // Using ip-api.com (free for non-commercial use, no API key required for HTTP/client-side)
        // Note: For production, a paid service like ipinfo.io or MaxMind is recommended
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();

        // Security checks:
        // 1. Check country code
        // 2. Simple VPN/Proxy detection (many free APIs provide a 'security' or 'proxy' flag)
        const isGhana = data.country_code === GHANA_COUNTRY_CODE;
        const isProxy = data.security?.is_proxy || data.security?.is_vpn || false;

        if (isGhana && !isProxy) {
          setIsAllowed(true);
        } else {
          console.warn(`[GeoRestriction] Access denied: Country=${data.country_code}, Proxy=${isProxy}`);
          setIsAllowed(false);
        }
      } catch (error) {
        console.error('[GeoRestriction] Error fetching location:', error);
        // Fail open or closed depending on policy. Here we'll fail closed for strictness.
        setIsAllowed(false);
      } finally {
        setIsLoading(false);
      }
    }

    checkLocation();
  }, []);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (isAllowed === false) {
    return <ComingSoon />;
  }

  return <>{children}</>;
}
