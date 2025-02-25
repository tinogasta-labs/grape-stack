import { reactRouter } from '@react-router/dev/vite'
import tailwindcss from '@tailwindcss/vite'
import { reactRouterHonoServer } from 'react-router-hono-server/dev'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  server: {
    port: Number(process.env.PORT || 3000),
  },
  plugins: [
    reactRouterHonoServer({ serverEntryPoint: './server', runtime: 'bun' }),
    tailwindcss(),
    reactRouter(),
    tsconfigPaths(),
  ],
})
