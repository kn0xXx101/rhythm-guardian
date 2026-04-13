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
    dedupe: ['react', 'react-dom', 'react-router-dom'],
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
          // React and router MUST be in the same chunk to avoid duplicate React
          if (id.includes('node_modules/react/') || 
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/react-router') ||
              id.includes('node_modules/scheduler/')) {
            return 'react-vendor';
          }

          // Supabase vendor chunk
          if (id.includes('node_modules/@supabase/')) {
            return 'supabase-vendor';
          }

          // Chart vendor chunk (recharts)
          if (id.includes('node_modules/recharts')) {
            return 'chart-vendor';
          }

          // UI vendor chunk
          if (id.includes('node_modules/@radix-ui/') ||
              id.includes('node_modules/lucide-react') ||
              id.includes('node_modules/clsx') ||
              id.includes('node_modules/tailwind-merge') ||
              id.includes('node_modules/class-variance-authority')) {
            return 'ui-vendor';
          }

          // All other node_modules in one vendor chunk
          if (id.includes('node_modules/')) {
            return 'vendor';
          }
        },
      },
    },
  },
}));
