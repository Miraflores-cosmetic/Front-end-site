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
    /**
     * Фаза 4: только Админ панель 2.0
     * - Nest API :3001
     * - Next BFF (CDEK/Yandex) :3010
     */
    proxy: {
      '/api/v1': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        secure: false,
      },
      '/api/cdek': {
        target: 'http://127.0.0.1:3010',
        changeOrigin: true,
        secure: false,
      },
      '/api/yandex-delivery': {
        target: 'http://127.0.0.1:3010',
        changeOrigin: true,
        secure: false,
      },
      '/api/yandex': {
        target: 'http://127.0.0.1:3010',
        changeOrigin: true,
        secure: false,
      },
    }
  }
});
