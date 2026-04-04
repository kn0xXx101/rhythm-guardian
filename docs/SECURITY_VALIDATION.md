# Server-Side Validation and Security

This document describes server-side validation utilities and Content Security Policy (CSP) configuration.

## Server-Side Validation

### Location

Server-side validation utilities are located in `supabase/functions/_shared/validation.ts`.

### Usage in Edge Functions

```typescript
import { validate, bookingSchema } from '../_shared/validation';

Deno.serve(async (req) => {
  const body = await req.json();
  
  const result = validate(bookingSchema, body);
  if (!result.success) {
    return new Response(
      JSON.stringify({ error: result.error.errors }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  // Use validated data
  const booking = result.data;
  // ... process booking
});
```

### Available Schemas

- `emailSchema` - Email validation
- `passwordSchema` - Password validation (min 8 chars)
- `nameSchema` - Name validation
- `phoneSchema` - Phone number validation
- `urlSchema` - URL validation
- `uuidSchema` - UUID validation
- `bookingSchema` - Booking creation/update
- `messageSchema` - Message creation
- `profileUpdateSchema` - Profile updates
- `reviewSchema` - Review creation

## Content Security Policy (CSP)

### Recommended CSP Headers

For a React application with Supabase, use these CSP headers:

```
Content-Security-Policy: 
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https: blob:;
  font-src 'self' data:;
  connect-src 'self' https://*.supabase.co https://*.paystack.com;
  frame-src 'self' https://*.supabase.co;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
```

### Implementation

#### Option 1: Vite Plugin (Development)

Install `vite-plugin-csp`:

```bash
npm install --save-dev vite-plugin-csp
```

Add to `vite.config.ts`:

```typescript
import { csp } from 'vite-plugin-csp';

export default defineConfig({
  plugins: [
    react(),
    csp({
      policies: {
        'default-src': ["'self'"],
        'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://*.supabase.co"],
        'style-src': ["'self'", "'unsafe-inline'"],
        'img-src': ["'self'", "data:", "https:", "blob:"],
        'connect-src': ["'self'", "https://*.supabase.co", "https://*.paystack.com"],
      },
    }),
  ],
});
```

#### Option 2: Server Headers (Production)

For production, set CSP headers on your web server:

**Nginx:**
```nginx
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; connect-src 'self' https://*.supabase.co https://*.paystack.com; frame-src 'self' https://*.supabase.co; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests;" always;
```

**Vercel (vercel.json):**
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; connect-src 'self' https://*.supabase.co https://*.paystack.com; frame-src 'self' https://*.supabase.co; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests;"
        }
      ]
    }
  ]
}
```

**Netlify (_headers file):**
```
/*
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; connect-src 'self' https://*.supabase.co https://*.paystack.com; frame-src 'self' https://*.supabase.co; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests;
```

#### Option 3: Supabase Edge Function Middleware

Create middleware for all edge functions:

```typescript
// supabase/functions/_shared/middleware.ts
export function addSecurityHeaders(response: Response): Response {
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; connect-src 'self' https://*.supabase.co https://*.paystack.com; frame-src 'self' https://*.supabase.co; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests;"
  );
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  return response;
}
```

## Security Best Practices

1. **Always validate server-side**: Never trust client-side validation alone
2. **Use prepared statements**: Prevent SQL injection (Supabase handles this)
3. **Sanitize user input**: Clean input before storing
4. **Use HTTPS**: Always use encrypted connections
5. **Implement rate limiting**: Prevent abuse
6. **Regular security audits**: Keep dependencies updated
7. **Monitor for vulnerabilities**: Use tools like Snyk or Dependabot

## Testing Security

See `docs/XSS_TESTING.md` for XSS vulnerability testing.

