# Migration to Features Folder Structure

This document provides a step-by-step guide for migrating code to the new features-based folder structure.

## Current Status

The features folder structure has been created, and index files have been set up to re-export existing code. The actual file migration should be done incrementally to avoid breaking changes.

## Migration Steps

### Phase 1: Booking Feature (Low Risk)

1. **Move Booking Component:**
   ```bash
   mv src/components/booking/PaymentModal.tsx src/features/bookings/components/
   ```

2. **Move Booking Hook:**
   ```bash
   mv src/hooks/use-bookings.ts src/features/bookings/hooks/
   ```

3. **Move Booking Service:**
   ```bash
   mv src/services/booking.ts src/features/bookings/services/
   ```

4. **Update Imports:**
   - Search for `@/components/booking/PaymentModal` and replace with `@/features/bookings/components/PaymentModal`
   - Search for `@/hooks/use-bookings` and replace with `@/features/bookings/hooks/use-bookings`
   - Search for `@/services/booking` and replace with `@/features/bookings/services/booking`

5. **Update index.ts:**
   - Update `src/features/bookings/index.ts` to use local imports

### Phase 2: Chat Feature (Medium Risk)

1. **Move Chat Components:**
   ```bash
   mv src/components/chat/* src/features/chat/components/
   ```

2. **Move Chat Hook:**
   ```bash
   mv src/hooks/use-messages.ts src/features/chat/hooks/
   ```

3. **Move Chat Services:**
   ```bash
   mv src/services/message.ts src/features/chat/services/
   mv src/services/chat-monitor.ts src/features/chat/services/
   mv src/services/encryption.ts src/features/chat/services/
   ```

4. **Move Chat Types:**
   ```bash
   mv src/types/chat.ts src/features/chat/types/
   ```

5. **Update Imports:**
   - Update all imports from `@/components/chat/*` to `@/features/chat/components/*`
   - Update all imports from `@/hooks/use-messages` to `@/features/chat/hooks/use-messages`
   - Update all imports from `@/services/message`, `@/services/chat-monitor`, `@/services/encryption` to `@/features/chat/services/*`
   - Update all imports from `@/types/chat` to `@/features/chat/types/chat`

6. **Update index.ts:**
   - Update `src/features/chat/index.ts` to use local imports

### Phase 3: Profile Feature (Medium Risk)

1. **Move Profile Components:**
   ```bash
   mv src/components/musician/PortfolioUpload.tsx src/features/profiles/components/
   mv src/components/portfolio/PortfolioGallery.tsx src/features/profiles/components/
   mv src/components/availability/AvailabilityCalendar.tsx src/features/profiles/components/
   ```

2. **Move Profile Hooks:**
   ```bash
   mv src/hooks/use-users.ts src/features/profiles/hooks/
   mv src/hooks/use-search-users.ts src/features/profiles/hooks/
   ```

3. **Move Profile Services:**
   ```bash
   mv src/services/user.ts src/features/profiles/services/
   mv src/services/portfolio.ts src/features/profiles/services/
   mv src/services/availability.ts src/features/profiles/services/
   ```

4. **Update Imports:**
   - Update all imports accordingly
   - Update `src/features/profiles/index.ts` to use local imports

## Testing After Migration

After each phase:

1. Run tests: `npm test`
2. Run lint: `npm run lint`
3. Check for TypeScript errors: `npx tsc --noEmit`
4. Test the application manually
5. Commit changes after successful migration

## Rollback Plan

If issues occur:

1. Revert the commit
2. Files can be moved back using git:
   ```bash
   git checkout HEAD~1 -- src/features/
   git checkout HEAD~1 -- src/components/
   git checkout HEAD~1 -- src/hooks/
   git checkout HEAD~1 -- src/services/
   ```

## Benefits After Migration

- **Better organization**: Related code grouped together
- **Easier navigation**: Find feature code quickly
- **Clear dependencies**: Features are self-contained
- **Improved scalability**: Easy to add new features
- **Better maintainability**: Changes localized to features

## Notes

- Migration should be done incrementally
- Test thoroughly after each phase
- Keep old imports working via index.ts until migration is complete
- Update documentation as you migrate

