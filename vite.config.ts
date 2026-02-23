import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf-8')) as { version: string }

const LOCALES = ['ru', 'en', 'zh', 'fa']
const PATH_SEGMENTS = ['', 'proxy-toolkit', 'awg-qr-generator', 'awg-config-generator', 'mihomo-config-generator']

function sitemapAndRobotsPlugin(base: string): import('vite').Plugin {
  return {
    name: 'sitemap-and-robots',
    apply: 'build',
    closeBundle() {
      const outDir = path.resolve(__dirname, 'dist')
      const siteUrl = (process.env.VITE_SITE_URL || process.env.SITE_URL || 'https://localhost').replace(/\/$/, '')
      const basePath = base.replace(/\/$/, '')
      const baseUrl = basePath ? `${siteUrl}${basePath}` : siteUrl

      const urls: string[] = []
      for (const locale of LOCALES) {
        for (const segment of PATH_SEGMENTS) {
          const loc = segment ? `${baseUrl}/${locale}/${segment}` : `${baseUrl}/${locale}/`
          urls.push(`  <url>\n    <loc>${escapeXml(loc)}</loc>\n    <changefreq>monthly</changefreq>\n  </url>`)
        }
      }
      const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`
      fs.writeFileSync(path.join(outDir, 'sitemap.xml'), sitemap, 'utf-8')

      const sitemapUrl = `${baseUrl}/sitemap.xml`
      const robots = `User-agent: *\nAllow: /\n\nSitemap: ${sitemapUrl}\n`
      fs.writeFileSync(path.join(outDir, 'robots.txt'), robots, 'utf-8')
    },
  }
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const base = mode === 'production' ? '/Sampo-Forge/' : '/'
  return {
    base,
    plugins: [react(), tailwindcss(), sitemapAndRobotsPlugin(base)],
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      chunkSizeWarningLimit: 1200,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('/node_modules/')) {
              if (
                id.includes('/react/') ||
                id.includes('/react-dom/') ||
                id.includes('/react-router') ||
                id.includes('/scheduler/')
              ) {
                return 'vendor'
              }
              if (id.includes('/echarts/') || id.includes('/echarts-for-react/') || id.includes('/zrender/')) {
                return 'echarts'
              }
              if (
                id.includes('/codemirror/') ||
                id.includes('/@codemirror/') ||
                id.includes('/@lezer/')
              ) {
                return 'codemirror'
              }
            }
          },
        },
      },
    },
  }
})
