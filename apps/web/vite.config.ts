import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { defineConfig } from 'vite'
import tsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'
import viteReact from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'

export default defineConfig({
  server: {
    host: '127.0.0.1',
    port: 3000,
    allowedHosts: ['.ts.net', 'simone-pc.tail2a49c0.ts.net'],
  },
  plugins: [
    tailwindcss(),
    tsConfigPaths({ projects: ['./tsconfig.json'] }),
    tanstackStart(),
    nitro(),
    viteReact(),
  ],
})
