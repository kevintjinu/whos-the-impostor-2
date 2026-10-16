import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

function normaliseBasePath(basePath: string) {
  if (!basePath || basePath === '/') return '/'

  return `/${basePath.replace(/^\/+|\/+$/g, '')}/`
}

// https://vite.dev/config/
export default defineConfig({
  // GitHub Actions supplies the repository path for project Pages builds.
  // Leaving it unset keeps local development and LAN testing at the root path.
  base: normaliseBasePath(process.env.VITE_BASE_PATH ?? '/'),
  plugins: [react()],
})
