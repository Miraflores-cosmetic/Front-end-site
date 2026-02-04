import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import viteImagemin from 'vite-plugin-imagemin';
import tsconfigPaths from 'vite-tsconfig-paths';
import viteCompression from 'vite-plugin-compression';
import svgr from 'vite-plugin-svgr';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths(),
    svgr(),
    viteCompression(),
    viteImagemin({
      pngquant: {
        quality: [0.8, 0.9],
        speed: 4
      },
      webp: {
        quality: 85
      },
      mozjpeg: {
        quality: 80
      },
      svgo: {
        plugins: [
          { name: 'removeViewBox', active: false },
          { name: 'removeEmptyAttrs', active: false }
        ]
      },
      gifsicle: {
        optimizationLevel: 7,
        interlaced: false
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    assetsInlineLimit: 4096,
    rollupOptions: {
      output: {
        assetFileNames: assetInfo => {
          if (/\.(png|jpe?g|svg|gif|tiff|bmp|ico|webp)$/i.test(assetInfo.name || '')) {
            return 'assets/images/[name]-[hash][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        }
      }
    }
  },
  css: {
    devSourcemap: true
  },

  server: {
    port: 5173,
    open: true,
    // Proxy GraphQL requests to the backend during development to avoid CORS issues.
    // In development set VITE_GRAPHQL_URL to '/graphql' so the client calls the same origin
    // and the dev server forwards requests to the real backend.
    proxy: {
      '/graphql': {
        target: 'https://miraflores-shop.com',
        changeOrigin: true,
        secure: true
      },
      '/api/checkout': {
        target: 'https://miraflores-shop.com',
        changeOrigin: true,
        secure: true,
      },
      '/api/cdek': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false
      },
      '/api/yookassa': {
        target: 'http://localhost:3002',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/yookassa/, '') // Remove /api/yookassa prefix
      },
      '/voucher': { // Proxy for voucher validation
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false
      },
      '/auth': { // Proxy for auth endpoints
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false
      },
      '/api/products': { // Proxy for products by care stage endpoint
        target: 'https://miraflores-shop.com',
        changeOrigin: true,
        secure: true
      },
      '/api/steps': { // Proxy for steps endpoint
        target: 'https://miraflores-shop.com',
        changeOrigin: true,
        secure: true
      },
      '/api/favorites': { // Proxy for favorites endpoint
        target: 'https://miraflores-shop.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/favorites$/, '/api/favorites/') // Добавляем trailing slash для сервера
      },
      '/checkout': { // Proxy for checkout endpoints (alternative path)
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false
      }
    }
  }
});
