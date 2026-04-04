# XSS Vulnerability Testing Guide

This document describes how to test for Cross-Site Scripting (XSS) vulnerabilities in the Rhythm Guardian application.

## XSS Testing Utilities

### Test Payloads

Common XSS test payloads:

```javascript
// Basic XSS payloads
const xssPayloads = [
  '<script>alert("XSS")</script>',
  '<img src=x onerror=alert("XSS")>',
  '<svg onload=alert("XSS")>',
  'javascript:alert("XSS")',
  '<iframe src="javascript:alert(\'XSS\')"></iframe>',
  '<body onload=alert("XSS")>',
  '<input onfocus=alert("XSS") autofocus>',
  '<select onfocus=alert("XSS") autofocus>',
  '<textarea onfocus=alert("XSS") autofocus>',
  '<keygen onfocus=alert("XSS") autofocus>',
  '<video><source onerror="alert(\'XSS\')">',
  '<audio src=x onerror=alert("XSS")>',
  '<details open ontoggle=alert("XSS")>',
  '<marquee onstart=alert("XSS")>',
  '<div onmouseover=alert("XSS")>',
  '<svg/onload=alert("XSS")>',
  '"><script>alert("XSS")</script>',
  '\'><script>alert("XSS")</script>',
  '</script><script>alert("XSS")</script>',
  '<script>alert(String.fromCharCode(88,83,83))</script>',
  '<script>eval(String.fromCharCode(97,108,101,114,116,40,34,88,83,83,34,41))</script>',
];
```

### Manual Testing Checklist

Test these areas for XSS vulnerabilities:

#### 1. User Input Fields
- [ ] Profile name
- [ ] Profile bio
- [ ] Message content
- [ ] Booking requirements/description
- [ ] Review comments
- [ ] Search queries
- [ ] URL parameters

#### 2. Display Areas
- [ ] User profiles
- [ ] Chat messages
- [ ] Booking details
- [ ] Reviews
- [ ] Notifications
- [ ] Error messages
- [ ] Success messages

#### 3. Form Fields
- [ ] Text inputs
- [ ] Textareas
- [ ] Rich text editors (if any)
- [ ] URL inputs
- [ ] Email inputs

### Automated Testing

#### Using Playwright

Create test file: `tests/security/xss.test.ts`

```typescript
import { test, expect } from '@playwright/test';

const xssPayloads = [
  '<script>alert("XSS")</script>',
  '<img src=x onerror=alert("XSS")>',
  '<svg onload=alert("XSS")>',
];

test.describe('XSS Vulnerability Tests', () => {
  test('profile name should sanitize XSS payloads', async ({ page }) => {
    await page.goto('/profile/edit');
    
    for (const payload of xssPayloads) {
      await page.fill('input[name="full_name"]', payload);
      await page.click('button[type="submit"]');
      
      // Check that script tags are not rendered
      const scriptTags = await page.$$('script');
      expect(scriptTags.length).toBe(0);
      
      // Check that payload is escaped in displayed text
      const displayText = await page.textContent('body');
      expect(displayText).not.toContain('<script>');
    }
  });

  test('message content should sanitize XSS payloads', async ({ page }) => {
    await page.goto('/chat');
    
    for (const payload of xssPayloads) {
      await page.fill('textarea[name="message"]', payload);
      await page.click('button[type="submit"]');
      
      // Wait for message to appear
      await page.waitForSelector('[data-testid="message"]');
      
      // Check that script tags are not rendered
      const scriptTags = await page.$$('script');
      expect(scriptTags.length).toBe(0);
    }
  });

  test('review comments should sanitize XSS payloads', async ({ page }) => {
    await page.goto('/reviews');
    
    for (const payload of xssPayloads) {
      await page.fill('textarea[name="comment"]', payload);
      await page.click('button[type="submit"]');
      
      // Check that script tags are not rendered
      const scriptTags = await page.$$('script');
      expect(scriptTags.length).toBe(0);
    }
  });
});
```

Run tests:
```bash
npm run test:e2e tests/security/xss.test.ts
```

#### Using DOMPurify in Tests

Test that DOMPurify is working:

```typescript
import { describe, it, expect } from 'vitest';
import DOMPurify from 'dompurify';

describe('XSS Sanitization', () => {
  it('should sanitize script tags', () => {
    const dirty = '<script>alert("XSS")</script>';
    const clean = DOMPurify.sanitize(dirty);
    expect(clean).not.toContain('<script>');
    expect(clean).toBe('');
  });

  it('should sanitize img onerror', () => {
    const dirty = '<img src=x onerror=alert("XSS")>';
    const clean = DOMPurify.sanitize(dirty);
    expect(clean).not.toContain('onerror');
  });

  it('should sanitize svg onload', () => {
    const dirty = '<svg onload=alert("XSS")>';
    const clean = DOMPurify.sanitize(dirty);
    expect(clean).not.toContain('onload');
  });
});
```

### Browser DevTools Testing

1. Open browser DevTools (F12)
2. Navigate to Console tab
3. Try injecting XSS payloads in input fields
4. Check if any scripts execute
5. Check Network tab for unexpected requests

### Testing Checklist

- [ ] Test all user input fields
- [ ] Test URL parameters
- [ ] Test stored XSS (save payload, then view)
- [ ] Test reflected XSS (payload in URL, reflected in page)
- [ ] Test DOM-based XSS (payload in client-side JavaScript)
- [ ] Verify CSP headers are set
- [ ] Verify DOMPurify is used for sanitization
- [ ] Verify server-side validation rejects malicious input
- [ ] Test with different browsers (Chrome, Firefox, Safari)
- [ ] Test with browser extensions disabled

### Prevention Checklist

- [ ] All user input is sanitized with DOMPurify
- [ ] Server-side validation rejects malicious input
- [ ] CSP headers are properly configured
- [ ] Content is escaped when rendering (React does this by default)
- [ ] No use of `dangerouslySetInnerHTML` without sanitization
- [ ] URL parameters are validated
- [ ] Database values are sanitized before storage
- [ ] Error messages don't echo user input unsanitized

### Reporting Vulnerabilities

If you find an XSS vulnerability:

1. Document the vulnerability:
   - Location (page/component)
   - Steps to reproduce
   - Payload used
   - Expected vs actual behavior
   - Browser and version

2. Create a security issue (private repository) or report directly

3. Do not publicly disclose until fixed

### Resources

- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [DOMPurify Documentation](https://github.com/cure53/DOMPurify)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)

