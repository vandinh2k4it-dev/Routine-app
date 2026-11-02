import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Chèn địa chỉ API vào index.html (preconnect).
// Nếu chưa đặt VITE_API_URL thì bỏ qua, build vẫn chạy bình thường.
function injectApiUrl(api) {
  return {
    name: 'inject-api-url',
    transformIndexHtml(html) {
      return {
        html: html.replaceAll('__API_URL__', api),
        tags: api
          ? [{ tag: 'link', attrs: { rel: 'preconnect', href: api, crossorigin: true }, injectTo: 'head-prepend' }]
          : [],
      };
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const api = (env.VITE_API_URL || '').replace(/\/$/, '');
  return { plugins: [react(), injectApiUrl(api)] };
});
