import { defineConfig } from "vite";
import type { Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve as pathResolve } from "node:path";

/** Written to dist/version.json each build so clients can detect deploys without waiting on HTML cache. */
function emitVersionJson(): Plugin {
  return {
    name: "emit-version-json",
    writeBundle(options) {
      const outDir = options.dir ?? pathResolve(process.cwd(), "dist");
      const pkgPath = pathResolve(process.cwd(), "package.json");
      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as { version: string };
      const sha =
        process.env.VERCEL_GIT_COMMIT_SHA ||
        process.env.CF_PAGES_COMMIT_SHA ||
        process.env.GITHUB_SHA ||
        "";
      const version = sha ? sha.slice(0, 12) : `${pkg.version}-${Date.now()}`;
      mkdirSync(outDir, { recursive: true });
      writeFileSync(
        pathResolve(outDir, "version.json"),
        `${JSON.stringify({
          version,
          builtAt: new Date().toISOString(),
          pkgVersion: pkg.version,
        })}\n`,
        "utf-8"
      );
    },
  };
}

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
    emitVersionJson(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ['react', 'react-dom', 'react-router-dom'],
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',
      },
    },
  },
}));
