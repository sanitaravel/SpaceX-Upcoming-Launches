import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import viteCompression from 'vite-plugin-compression'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Generate gzip and brotli compressed assets during build for better Lighthouse scores
    viteCompression({ algorithm: 'gzip', ext: '.gz' }),
    viteCompression({ algorithm: 'brotliCompress', ext: '.br' }),
  ],
  server: {
    // Proxy SpaceX API calls through the dev server to avoid CORS during development.
    proxy: {
      // Tiles (upcoming launches)
      '/api/spacex/tiles': {
        target: 'https://content.spacex.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/spacex\/tiles/, '/api/spacex-website/launches-page-tiles/upcoming'),
      },
      // Missions details
      '/api/spacex/missions': {
        target: 'https://content.spacex.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/spacex\/missions/, '/api/spacex-website/missions'),
      },
      // future_missions.json served from the Azure CDN host
      '/api/spacex/future_missions.json': {
        target: 'https://sxcontent9668.azureedge.us',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/spacex\/future_missions.json/, '/cms-assets/future_missions.json'),
      },
    },
  },
})
