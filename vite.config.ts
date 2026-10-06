import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(({mode}) => {
  return {
    base: mode==='demo'?'/mida-restaurant/demo/':'/mida-restaurant/',
    define: {'import.meta.env.VITE_DEMO_MODE': JSON.stringify(mode==='demo')},
    plugins: [react(), tailwindcss(), ...(mode==='demo'?[{name:'presentation-metadata',transformIndexHtml(html:string){return html.replace('<title>Mida - Restaurant Ordering & Multi-Tenant Platform</title>','<title>MIDA · Démonstration restaurant</title><meta name="robots" content="noindex, nofollow" />');}}]:[])],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      proxy: { '/api': 'http://localhost:3001' },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
