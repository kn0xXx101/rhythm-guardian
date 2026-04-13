import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    watch: {
      usePolling: true,
    },
    headers: mode === 'development' ? {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    } : undefined,
  },
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    // Ensure a single React instance is used across the app to avoid
    // hooks reading from a different React context (which can cause
    // \"useContext\" to be null in hooks like useNavigate)
    dedupe: ['react', 'react-dom'],
  },
  build: {
    chunkSizeWarningLimit: 600,
    // Add hash to filenames for cache busting
    rollupOptions: {
      output: {
        // Add hash to all output files
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',
        manualChunks: (id) => {
          // React vendor chunk
          if (id.includes('node_modules/react/') || 
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/react-router') ||
              id.includes('node_modules/scheduler/')) {
            return 'react-vendor';
          }

          // Chart vendor chunk (recharts)
          if (id.includes('node_modules/recharts')) {
            return 'chart-vendor';
          }

          // UI vendor chunk (Radix UI, Lucide, shadcn utilities)
          if (id.includes('node_modules/@radix-ui/') ||
              id.includes('node_modules/lucide-react') ||
              id.includes('node_modules/clsx') ||
              id.includes('node_modules/tailwind-merge') ||
              id.includes('node_modules/class-variance-authority') ||
              id.includes('node_modules/cmdk') ||
              id.includes('node_modules/sonner') ||
              id.includes('node_modules/vaul') ||
              id.includes('node_modules/next-themes')) {
            return 'ui-vendor';
          }

          // Supabase vendor chunk
          if (id.includes('node_modules/@supabase/')) {
            return 'supabase-vendor';
          }

          // Form vendor chunk (react-hook-form, zod)
          if (id.includes('node_modules/react-hook-form') ||
              id.includes('node_modules/@hookform/') ||
              id.includes('node_modules/zod')) {
            return 'form-vendor';
          }

          // Query vendor chunk (@tanstack)
          if (id.includes('node_modules/@tanstack/')) {
            return 'query-vendor';
          }

          // Date utilities chunk
          if (id.includes('node_modules/date-fns') ||
              id.includes('node_modules/react-day-picker')) {
            return 'date-vendor';
          }

          // MUI vendor chunk (if used)
          if (id.includes('node_modules/@mui/') ||
              id.includes('node_modules/@emotion/')) {
            return 'mui-vendor';
          }

          // Other vendor chunk for remaining node_modules
          if (id.includes('node_modules/')) {
            return 'vendor';
          }
        },
      },
    },
  },
}));
