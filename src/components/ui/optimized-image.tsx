import React, { useState, useEffect, ImgHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'srcSet'> {
  src: string;
  alt: string;
  srcSet?: string;
  sizes?: string;
  fallbackSrc?: string;
  blurPlaceholder?: string;
  className?: string;
  priority?: boolean; // For above-the-fold images
  webpSrc?: string;
  avifSrc?: string;
}

/**
 * OptimizedImage component with lazy loading, error handling, and next-gen format support
 *
 * Features:
 * - Native lazy loading (loading="lazy")
 * - Automatic error fallback
 * - Optional blur placeholder
 * - WebP/AVIF format support with fallbacks
 * - Responsive images via srcset
 */
export const OptimizedImage = React.forwardRef<HTMLImageElement, OptimizedImageProps>(
  (
    {
      src,
      alt,
      srcSet,
      sizes,
      fallbackSrc = '/placeholder.svg',
      blurPlaceholder,
      className,
      priority = false,
      webpSrc,
      avifSrc,
      onError,
      ...props
    },
    ref
  ) => {
    const [imgSrc, setImgSrc] = useState<string>(src);
    const [hasError, setHasError] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Reset state when src changes
    useEffect(() => {
      setImgSrc(src);
      setHasError(false);
      setIsLoading(true);
    }, [src]);

    const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
      if (!hasError && imgSrc !== fallbackSrc) {
        setHasError(true);
        setImgSrc(fallbackSrc);
        setIsLoading(false);
      }
      onError?.(e);
    };

    const handleLoad = () => {
      setIsLoading(false);
    };

    // If we have AVIF or WebP sources, use picture element for better format support
    if (avifSrc || webpSrc) {
      return (
        <div className={cn('relative', className)}>
          {isLoading && blurPlaceholder && (
            <img
              src={blurPlaceholder}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover blur-md scale-110"
            />
          )}
          <picture className="block w-full h-full">
            {avifSrc && <source srcSet={avifSrc} type="image/avif" {...(sizes && { sizes })} />}
            {webpSrc && <source srcSet={webpSrc} type="image/webp" {...(sizes && { sizes })} />}
            <img
              ref={ref}
              src={imgSrc}
              alt={alt}
              srcSet={srcSet}
              sizes={sizes}
              loading={priority ? 'eager' : 'lazy'}
              decoding="async"
              className={cn(
                'w-full h-full object-cover transition-opacity duration-300',
                isLoading && blurPlaceholder ? 'opacity-0' : 'opacity-100'
              )}
              onError={handleError}
              onLoad={handleLoad}
              {...props}
            />
          </picture>
        </div>
      );
    }

    // Standard img element with optimizations
    return (
      <div className={cn('relative overflow-hidden', className)}>
        {isLoading && blurPlaceholder && (
          <img
            src={blurPlaceholder}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover blur-md scale-110"
          />
        )}
        <img
          ref={ref}
          src={imgSrc}
          alt={alt}
          srcSet={srcSet}
          sizes={sizes}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          className={cn(
            'w-full h-full object-cover transition-opacity duration-300',
            isLoading && blurPlaceholder ? 'opacity-0' : 'opacity-100'
          )}
          onError={handleError}
          onLoad={handleLoad}
          {...props}
        />
      </div>
    );
  }
);

OptimizedImage.displayName = 'OptimizedImage';

// Utility function to generate a blur placeholder data URL
export const generateBlurPlaceholder = (width = 20, height = 20): string => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#e5e7eb';
    ctx.fillRect(0, 0, width, height);
  }
  return canvas.toDataURL();
};
