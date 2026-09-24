import { defineConfig } from 'vitest/config';
import path from 'path';

const orderChatCoreSrc = path.resolve(__dirname, '../packages/order-chat-core/src/index.ts');
const orderChatUiSrc = path.resolve(__dirname, '../packages/order-chat-ui/src/index.ts');

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@miraflores/order-chat-core': orderChatCoreSrc,
      '@miraflores/order-chat-ui': orderChatUiSrc,
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
