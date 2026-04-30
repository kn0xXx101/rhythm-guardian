# Musician Profile Mandatory Fields for Search Visibility

## Overview
This document outlines the mandatory fields that musicians must complete for their profiles to appear in hirer search results. These requirements are enforced by the `isMusicianSearchEligible` function in the search system.

## Mandatory Fields (Marked with *)

### 1. **Full Name** *
- **Location**: Basic Info tab
- **Fields**: First Name * + Last Name *
- **Requirement**: Both first and last name must be provided (minimum 2 characters when combined)
- **Why Required**: Hirers need to know who they're booking

### 2. **Location** *
- **Location**: Basic Info tab
- **Field**: Location *
- **Requirement**: Must be at least 2 characters long
- **Example**: "East Legon, Accra"
- **Why Required**: Hirers search by location to find nearby musicians

### 3. **Bio** *
- **Location**: Basic Info tab
- **Field**: Bio *
- **Requirement**: Must be provided (any length)
- **Why Required**: Hirers need to understand the musician's background and style

### 4. **Phone Number** *
- **Location**: Basic Info tab
- **Field**: Phone Number *
- **Format**: Ghana phone number format (+233 XX XXX XXXX)
- **Why Required**: Contact information for booking coordination

### 5. **Instruments** *
- **Location**: Instruments & Skills tab
- **Field**: Primary Instrument *
- **Requirement**: At least one instrument must be added
- **Why Required**: Hirers search by instrument type
- **Empty State Message**: "* At least one instrument is required to appear in search results"

### 6. **Music Styles/Genres** *
- **Location**: Instruments & Skills tab
- **Field**: Music Styles *
- **Requirement**: At least one genre must be added
- **Why Required**: Helps hirers find musicians who play their preferred style
- **Empty State Message**: "* At least one music style is required to appear in search results"

### 7. **Pricing** *
- **Location**: Availability tab (Pricing Options section)
- **Fields**: Either Hourly Rate * OR Flat Fee *
- **Requirement**: Must have either `hourly_rate` OR `base_price` with a value > 0
- **Why Required**: Hirers need to know pricing to make booking decisions

### 8. **Payment Details** *
- **Location**: Payment Details tab
- **Fields**: Either Bank Account OR Mobile Money details
- **Requirements**:
  - **Bank Account**: Account Name * + Account Number + Bank Name
  - **Mobile Money**: Account Name + Mobile Number + Provider
- **Why Required**: Musicians need payment details to receive payouts
- **Validation**: At least one complete payment method must be provided

## Search Eligibility Logic

The system uses this logic to determine if a musician appears in search:

```typescript
function isMusicianSearchEligible(musician) {
  const instruments = Array.isArray(musician.instruments) ? musician.instruments.filter(Boolean) : [];
  const hasPricing = Number.isFinite(Number(musician.base_price)) || Number.isFinite(Number(musician.hourly_rate));
  const hasPaymentDetails = 
    (musician.bank_account_number && musician.bank_code) ||
    (musician.mobile_money_number && musician.mobile_money_provider);
  
  const hasBasics =
    typeof musician.full_name === 'string' &&
    musician.full_name.trim().length >= 2 &&
    typeof musician.location === 'string' &&
    musician.location.trim().length >= 2 &&
    instruments.length > 0 &&
    hasPricing &&
    hasPaymentDetails;

  // Check profile completion percentage (must be >= 80%)
  return hasBasics && (musician.profile_completion_percentage >= 80);
}
```

## User Experience Improvements

### Visual Indicators
- **Asterisks (*)**: All mandatory field labels now include asterisks
- **Empty State Messages**: Clear messages when required fields are empty
- **Color Coding**: Red text for missing required fields
- **Completion Status**: Profile completion banner shows progress

### Helpful Messages
- **Instruments**: "* At least one instrument is required to appear in search results"
- **Genres**: "* At least one music style is required to appear in search results"  
- **Payment Details**: "* Payment details required to appear in search results"
- **Descriptions**: Updated to mention "Required for search visibility"

### Form Validation
- **Real-time Feedback**: Users see immediately what's missing
- **Contextual Help**: Explanations of why fields are required
- **Progress Tracking**: Profile completion percentage updates as fields are filled

## Profile Completion Calculation

The system calculates completion based on 10 total fields:
1. Full Name (first + last)
2. Email (auto-filled)
3. Phone Number
4. Location  
5. Bio
6. Profile Photo
7. Instruments (at least one)
8. Genres (at least one)
9. Pricing (hourly rate OR base price)
10. Payment Details (bank OR mobile money)

**Search Visibility Threshold**: 80% completion (8 out of 10 fields)

## Implementation Details

### Files Modified
- `src/pages/MusicianProfile.tsx` - Added asterisks and empty state messages
- `src/components/musician/PaymentDetailsForm.tsx` - Added asterisks and updated messaging
- Form labels updated to include * for mandatory fields
- Empty states show clear requirements

### Search Logic
- `src/pages/InstrumentalistSearch.tsx` - Contains `isMusicianSearchEligible` function
- `src/lib/profile-completion.ts` - Calculates completion percentage
- Only musicians meeting all requirements appear in search results

## Benefits

### For Musicians
- **Clear Requirements**: Know exactly what's needed to appear in search
- **Visual Guidance**: Asterisks and messages make requirements obvious
- **Progress Tracking**: See completion percentage increase as fields are filled

### For Hirers  
- **Quality Results**: Only complete, bookable profiles appear in search
- **Reliable Information**: All musicians have contact details and pricing
- **Better Matching**: Complete instrument and genre information

### For Platform
- **Higher Conversion**: Complete profiles lead to more successful bookings
- **Better UX**: Clear requirements reduce confusion and support requests
- **Quality Control**: Ensures all searchable musicians are actually bookable

This implementation ensures that only serious, complete musician profiles appear in search results, improving the overall quality and reliability of the platform for hirers.