import { defineConfig } from 'vite';

/**
 * Relative asset paths so one build drops onto Vercel, Netlify, GitHub Pages,
 * S3 or any nginx container without a rebuild.
 */
export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    sourcemap: false,
    cssMinify: true,
    chunkSizeWarningLimit: 900,
    assetsInlineLimit: 2048,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three/examples')) return 'three-addons';
          if (id.includes('node_modules/three')) return 'three';
          if (id.includes('node_modules')) return 'vendor';
          return undefined;
        },
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash][extname]',
      },
    },
  },
  server: { host: '0.0.0.0', port: 5173 },
  preview: { host: '0.0.0.0', port: 4173 },
});
