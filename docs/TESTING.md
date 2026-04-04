# Testing Guide

This document describes the testing setup and how to write and run tests in the Rhythm Guardian application.

## Test Types

### 1. Unit Tests (Vitest)

Unit tests test individual functions and components in isolation.

**Location:** `src/__tests__/**/*.test.{ts,tsx}`

**Run tests:**
```bash
npm test
npm test:ui        # Run with UI
npm test:coverage  # Run with coverage report
```

**Example:**
```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from '@/lib/utils';

describe('myFunction', () => {
  it('should return expected value', () => {
    expect(myFunction('input')).toBe('expected');
  });
});
```

### 2. Component Tests (Testing Library)

Component tests use React Testing Library to test components from a user's perspective.

**Location:** `src/__tests__/components/**/*.test.tsx`

**Run tests:**
```bash
npm test
```

**Example:**
```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from '@/components/ui/button';

describe('Button Component', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });
});
```

### 3. E2E Tests (Playwright)

End-to-end tests test complete user flows across the entire application.

**Location:** `tests/e2e/**/*.spec.ts`

**Run tests:**
```bash
npm run test:e2e      # Run E2E tests
npm run test:e2e:ui   # Run with UI mode
```

**Example:**
```typescript
import { test, expect } from '@playwright/test';

test('user can login', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[name="email"]', 'user@example.com');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/dashboard');
});
```

### 4. Accessibility Tests (Vitest + vitest-axe)

Accessibility tests ensure components meet WCAG standards.

**Location:** `src/__tests__/**/*.a11y.test.{ts,tsx}`

**Run tests:**
```bash
npm run test:accessibility
```

**Example:**
```typescript
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Button } from '@/components/ui/button';
import { axe, toHaveNoViolations } from 'vitest-axe';

expect.extend(toHaveNoViolations);

describe('Button Accessibility', () => {
  it('should not have accessibility violations', async () => {
    const { container } = render(<Button>Click me</Button>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

### 5. Visual Regression Tests (Playwright + Percy/Chromatic)

Visual regression tests compare screenshots to detect visual changes.

**Setup:** Configure visual comparison tools (Percy, Chromatic, or Playwright's built-in comparison)

**Example:**
```typescript
import { test, expect } from '@playwright/test';

test('homepage visual regression', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveScreenshot('homepage.png');
});
```

### 6. Performance Tests (Web Vitals + Lighthouse)

Performance tests measure and monitor application performance.

**Manual Testing:**
- Use Chrome DevTools Lighthouse
- Use Web Vitals extension
- Monitor Core Web Vitals (LCP, FID, CLS)

**Automated:**
- Lighthouse CI for CI/CD
- Web Vitals API for runtime monitoring

## Test Configuration

### Vitest Configuration

See `vitest.config.ts` for unit/component test configuration.

### Playwright Configuration

See `playwright.config.ts` for E2E test configuration.

### Coverage Thresholds

Target coverage:
- Statements: 80%
- Branches: 80%
- Functions: 80%
- Lines: 80%

## Best Practices

1. **Write tests first (TDD)** when possible
2. **Test user behavior**, not implementation details
3. **Keep tests simple** and focused on one thing
4. **Use descriptive test names** that explain what is being tested
5. **Mock external dependencies** (APIs, services)
6. **Clean up after tests** (reset mocks, clear state)
7. **Run tests before committing** changes
8. **Keep tests fast** - slow tests reduce developer productivity

## Running Tests

```bash
# Run all unit/component tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e

# Run accessibility tests
npm run test:accessibility
```

## Continuous Integration

Tests run automatically on:
- Pull requests
- Pushes to main branch
- Scheduled daily runs

## Debugging Tests

### Vitest
```bash
# Run with UI for debugging
npm test:ui

# Run specific test file
npm test -- src/__tests__/MyTest.test.ts
```

### Playwright
```bash
# Run with UI mode
npm run test:e2e:ui

# Run with debug mode
npx playwright test --debug
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library Documentation](https://testing-library.com/)
- [Playwright Documentation](https://playwright.dev/)
- [Web Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Web Vitals](https://web.dev/vitals/)

