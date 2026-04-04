import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import { expect, afterEach } from 'vitest';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Configure testing library
configure({ testIdAttribute: 'data-testid' });

// Note: For accessibility testing, use Playwright's accessibility snapshot feature
// or run axe-core manually in E2E tests. For unit tests, verify ARIA attributes
// and semantic HTML manually.

// Cleanup after each test
afterEach(() => {
  // Clean up any mocks or state
});

