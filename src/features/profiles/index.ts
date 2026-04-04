// Profile feature exports
// TODO: Move components, hooks, services, and types here incrementally

// Components (re-exported for now, will move later)
export { PortfolioUpload } from '@/components/musician/PortfolioUpload';
export { PortfolioGallery } from '@/components/portfolio/PortfolioGallery';
export { AvailabilityCalendar } from '@/components/availability/AvailabilityCalendar';

// Hooks (re-exported for now, will move later)
export { useUsers } from '@/hooks/use-users';
export { useSearchUsers } from '@/hooks/use-search-users';

// Services (re-exported for now, will move later)
export { userService } from '@/services/user';
export { portfolioService } from '@/services/portfolio';
export { availabilityService } from '@/services/availability';

// Types - Profile types are defined in @/types/supabase
// Re-export common types when they are extracted

