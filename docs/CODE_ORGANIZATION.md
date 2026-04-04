# Code Organization - Features Folder Structure

This document describes the new features-based code organization structure.

## New Structure

```
src/
├── features/
│   ├── bookings/
│   │   ├── components/
│   │   │   └── PaymentModal.tsx
│   │   ├── hooks/
│   │   │   └── use-bookings.ts
│   │   ├── services/
│   │   │   └── booking.ts
│   │   ├── types/
│   │   │   └── booking.ts
│   │   └── index.ts
│   ├── chat/
│   │   ├── components/
│   │   │   ├── ChatHeader.tsx
│   │   │   ├── ChatLayout.tsx
│   │   │   ├── ChatMessages.tsx
│   │   │   ├── ChatSettings.tsx
│   │   │   ├── ContactsList.tsx
│   │   │   ├── MessageInput.tsx
│   │   │   └── ...
│   │   ├── hooks/
│   │   │   └── use-messages.ts
│   │   ├── services/
│   │   │   ├── message.ts
│   │   │   ├── chat-monitor.ts
│   │   │   └── encryption.ts
│   │   ├── types/
│   │   │   └── chat.ts
│   │   └── index.ts
│   └── profiles/
│       ├── components/
│       │   ├── PortfolioUpload.tsx
│       │   └── ...
│       ├── hooks/
│       │   └── use-users.ts
│       ├── services/
│       │   ├── user.ts
│       │   ├── portfolio.ts
│       │   └── availability.ts
│       ├── types/
│       │   └── profile.ts
│       └── index.ts
├── components/
│   ├── ui/          # Shared UI components
│   ├── layout/      # Layout components
│   ├── dashboard/   # Dashboard-specific components
│   └── ...
├── pages/           # Page components (routes)
├── contexts/        # React contexts
├── services/        # Shared services
├── hooks/           # Shared hooks
└── lib/             # Utilities
```

## Migration Status

- [x] Features folder structure created
- [ ] Booking components moved
- [ ] Chat components moved
- [ ] Profile components moved
- [ ] Imports updated
- [ ] Tests updated

## Benefits

1. **Better organization**: Related code is grouped together
2. **Easier navigation**: Find feature-specific code quickly
3. **Better scalability**: Easy to add new features
4. **Clearer dependencies**: Features can be self-contained
5. **Improved maintainability**: Changes are localized to features

## Migration Guide

When moving components:

1. Move component files to `features/[feature]/components/`
2. Move related hooks to `features/[feature]/hooks/`
3. Move related services to `features/[feature]/services/`
4. Move related types to `features/[feature]/types/`
5. Update imports throughout the codebase
6. Create `index.ts` for feature exports
7. Update test file imports

## Import Examples

### Before:
```typescript
import { PaymentModal } from '@/components/booking/PaymentModal';
import { useBookings } from '@/hooks/use-bookings';
import { bookingService } from '@/services/booking';
```

### After:
```typescript
import { PaymentModal } from '@/features/bookings';
import { useBookings } from '@/features/bookings';
import { bookingService } from '@/features/bookings';
```

Or with explicit imports:
```typescript
import { PaymentModal } from '@/features/bookings/components/PaymentModal';
import { useBookings } from '@/features/bookings/hooks/use-bookings';
import { bookingService } from '@/features/bookings/services/booking';
```

