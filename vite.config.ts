import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      build: {
        rollupOptions: {
          output: {
            manualChunks(id) {
              if (!id.includes('node_modules')) return;
              // react-datepicker 與它專屬的依賴不指定 chunk，讓 Rollup 依 dynamic import 自然切成延後載入的 chunk；
              // 若寫進 vendor / react-vendor（id 含 'react'），就會被首屏拉進來。
              if (/node_modules\/(react-datepicker|date-fns|@floating-ui|clsx)\//.test(id)) return;
              if (id.includes('@supabase')) return 'supabase';
              if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) return 'react-vendor';
              if (id.includes('react')) return 'react-vendor';
              return 'vendor';
            },
          },
        },
      },
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
