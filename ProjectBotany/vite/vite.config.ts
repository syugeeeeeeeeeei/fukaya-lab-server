/// <reference types="vitest" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    // ✨ HMR（ホットリロード）の設定を追加
    hmr: {
      port: 5173,
    },
    // ✨ watchオプションを追加してポーリングを有効化
    watch: {
      usePolling: true,
    },
    proxy: {
      // '/image-proxy' というパスへのリクエストをプロキシする設定
      '/plantnet.org': {
        // 転送先のドメイン
        target: 'https://bs.plantnet.org',
        // CORS制限を回避するために、リクエストのオリジンを転送先に偽装する
        changeOrigin: true,
        // パスから '/image-proxy' を削除してリクエストする
        rewrite: (path) => path.replace(/^\/plantnet.org/, ''),
      },
    },
  },
  test: {
    globals: true,
    environment: 'happy-dom', // DOMをシミュレートする環境
    setupFiles: './src/setupTests.ts', // テスト実行前に読み込むファイル
  },
})
