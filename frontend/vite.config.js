import { defineConfig } from 'vite';

export default defineConfig({
  base: './',  // 使用相对路径，部署到任意位置都行
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,  // 图片不转base64，保持原样
    rollupOptions: {
      input: {
        main: 'index.html'
      }
    }
  },
  server: {
    port: 3000,
    open: true
  }
});