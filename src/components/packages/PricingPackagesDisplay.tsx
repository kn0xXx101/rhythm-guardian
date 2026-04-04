import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';
import { packagesService } from '@/services/packages';
import { PricingPackage, PackageAddon } from '@/types/features';

interface PricingPackagesDisplayProps {
  musicianUserId: string;
  onSelectPackage?: (pkg: PricingPackage) => void;
}

export function PricingPackagesDisplay({
  musicianUserId,
  onSelectPackage,
}: PricingPackagesDisplayProps) {
  const [packages, setPackages] = useState<PricingPackage[]>([]);
  const [addons, setAddons] = useState<PackageAddon[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [musicianUserId]);

  const loadData = async () => {
    try {
      const [pkgs, adds] = await Promise.all([
        packagesService.getMusicianPackages(musicianUserId),
        packagesService.getMusicianAddons(musicianUserId),
      ]);
      setPackages(pkgs);
      setAddons(adds);
    } catch (error) {
      console.error('Failed to load packages:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading packages...</div>;
  }

  if (packages.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          No pricing packages available
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {packages.map((pkg) => (
          <Card
            key={pkg.id}
            className={`relative ${pkg.tier === 'gold' ? 'border-yellow-500 border-2' : ''}`}
          >
            {pkg.tier === 'gold' && (
              <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-yellow-500">
                Most Popular
              </Badge>
            )}

            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{packagesService.getTierIcon(pkg.tier)}</span>
                <CardTitle className={packagesService.getTierColor(pkg.tier)}>{pkg.name}</CardTitle>
              </div>
              <div className="text-3xl font-bold">₦{pkg.price.toLocaleString()}</div>
              <CardDescription>{pkg.duration_hours} hours</CardDescription>
            </CardHeader>

            <CardContent>
              {pkg.description && (
                <p className="text-sm text-muted-foreground mb-4">{pkg.description}</p>
              )}

              <div className="space-y-2">
                <p className="text-sm font-semibold">Includes:</p>
                {pkg.includes.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </CardContent>

            {onSelectPackage && (
              <CardFooter>
                <Button
                  className="w-full"
                  variant={pkg.tier === 'gold' ? 'default' : 'outline'}
                  onClick={() => onSelectPackage(pkg)}
                >
                  Select Package
                </Button>
              </CardFooter>
            )}
          </Card>
        ))}
      </div>

      {addons.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Available Add-ons</CardTitle>
            <CardDescription>Enhance your booking with these extras</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {addons.map((addon) => (
                <div
                  key={addon.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium">{addon.name}</p>
                    {addon.description && (
                      <p className="text-sm text-muted-foreground">{addon.description}</p>
                    )}
                  </div>
                  <div className="text-right ml-4">
                    <p className="font-bold">+₦{addon.price.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
