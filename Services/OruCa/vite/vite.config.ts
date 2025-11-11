import react from '@vitejs/plugin-react';
import path from "path";
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('chakra-ui')) return 'chakra';
            return 'vendor';
          }
        },
      },
    },
  },
  resolve:{
    alias: {
      '@Apps': path.resolve(__dirname, 'src/App'),
      '@pages': path.resolve(__dirname, 'src/App/pages'),
      '@components': path.resolve(__dirname, 'src/App/components'),
      '@snippets': path.resolve(__dirname, "src/snippets/components/ui"),
      '@contexts': path.resolve(__dirname, "src/App/contexts"),
    }
  },
  plugins: [react()],
  server:{
    host:"0.0.0.0",
    port:4000,
    strictPort: true,
    watch:{
      usePolling:true,
      interval:1000
    },
    fs:{
      allow: [
        "/node_modules/@fontsource",
        "/app"
      ],
    },
    proxy: {
      '/api': {
        target: 'http://api:3000', // Docker Composeのサービス名
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      // WebSocketのプロキシ設定
      '/socket': {
        target: 'ws://api:3000',  // WebSocket接続先を指定
        ws: true,  // WebSocketプロキシを有効化
        changeOrigin: true,
        rewriteWsOrigin: true,
      },
    },
  }
})
