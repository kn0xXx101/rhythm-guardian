# Debugging Blank Page Issues

If you're seeing a blank page at localhost:8080, follow these debugging steps:

## Step 1: Check Browser Console

1. Open Developer Tools (F12 or Right-click → Inspect)
2. Go to the **Console** tab
3. Look for any red error messages
4. Share the error message for troubleshooting

## Step 2: Check Network Tab

1. Open Developer Tools (F12)
2. Go to the **Network** tab
3. Refresh the page (F5)
4. Check if:
   - `main.tsx` loads successfully (status 200)
   - Any files fail to load (status 404, 500, etc.)
   - JavaScript files are being blocked

## Step 3: Check for Common Issues

### Issue: JavaScript Errors
- Look for errors in the console
- Common causes:
  - Missing dependencies
  - Import errors
  - Runtime errors in components

### Issue: Service Worker Problems
- Open Application tab in DevTools
- Check Service Workers section
- Try unregistering service workers
- Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

### Issue: Stuck in Loading State
- The app might be stuck waiting for auth initialization
- Check if `AuthContext` or `ThemeContext` is failing
- Look for infinite loading indicators

### Issue: CORS or CSP Errors
- Check console for CORS or Content Security Policy errors
- These would prevent scripts from loading

## Step 4: Try These Fixes

### Clear Browser Cache
1. Hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
2. Clear cache: Ctrl+Shift+Delete → Clear cached images and files

### Stop and Restart Dev Server
```bash
# Stop the current dev server (Ctrl+C)
npm run dev
```

### Check if Dev Server is Running
```bash
# Should see output like:
# VITE v6.x.x  ready in xxx ms
# ➜  Local:   http://localhost:8080/
```

### Verify Dependencies
```bash
npm install
```

### Check for TypeScript Errors
```bash
npx tsc --noEmit
```

## Step 5: Common Error Patterns

### "Cannot read property of undefined"
- Usually means a component is trying to access a property that doesn't exist
- Check the error stack trace to find the component

### "Module not found"
- A file is missing or the import path is wrong
- Check the import statement in the error

### "useAuth must be used within AuthProvider"
- A component using `useAuth` is rendered outside `AuthProvider`
- Check component tree structure

### "useSidebarContext must be used within SidebarProvider"
- `TopNav` or another component is rendered outside `SidebarProvider`
- Check layout component structure

## Step 6: Enable Verbose Logging

Add this to `src/main.tsx` temporarily to see what's happening:

```typescript
console.log('main.tsx loaded');
console.log('Root element:', document.getElementById('root'));
```

## Step 7: Check React DevTools

1. Install React Developer Tools browser extension
2. Open DevTools → React tab
3. Check if React is rendering anything
4. If React tab is empty, React hasn't mounted (check console for errors)

## Still Having Issues?

1. Share the console error messages
2. Share the Network tab screenshot (showing failed requests)
3. Share any relevant code changes made recently
4. Check if the issue started after a specific change




