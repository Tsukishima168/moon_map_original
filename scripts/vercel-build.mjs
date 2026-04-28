/**
 * Vercel Build Output API build script
 *
 * 架構說明：
 * - 前端：Vite build → .vercel/output/static/
 * - API functions：esbuild bundle → .vercel/output/functions/api/<name>.func/
 *
 * 好處：
 * - 每個 API function 是 self-contained bundle，不依賴 module resolution
 * - 新增 api/*.ts 或 api/_utils/*.ts 完全不需要動這個檔案
 * - 本地與 production 行為一致
 */

import { build } from 'esbuild'
import {
  mkdirSync,
  writeFileSync,
  rmSync,
  readdirSync,
  cpSync,
} from 'node:fs'
import { join } from 'node:path'
import { execSync } from 'node:child_process'

// ── 1. Vite 前端 build ──────────────────────────────────────────────────────
console.log('▶ Building frontend (vite)...')
execSync('npx vite build', { stdio: 'inherit' })

// ── 2. 準備輸出目錄 ──────────────────────────────────────────────────────────
const OUT = '.vercel/output'
rmSync(OUT, { recursive: true, force: true })
mkdirSync(`${OUT}/static`, { recursive: true })
mkdirSync(`${OUT}/functions`, { recursive: true })

// ── 3. 複製靜態檔案 ──────────────────────────────────────────────────────────
cpSync('dist', `${OUT}/static`, { recursive: true })
console.log('✓ Static assets copied')

// ── 4. 掃描 API entry points（遞迴，排除 _ 前綴檔案與目錄）──────────────────
function scanApiEntries(dir, prefix = '') {
  const entries = []
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    if (item.name.startsWith('_')) continue
    const fullPath = join(dir, item.name)
    const routePrefix = prefix ? `${prefix}/${item.name}` : item.name
    if (item.isDirectory()) {
      entries.push(...scanApiEntries(fullPath, routePrefix))
    } else if (item.isFile() && item.name.endsWith('.ts')) {
      entries.push({
        file: fullPath,               // e.g. api/rewards/claim.ts
        route: routePrefix.replace(/\.ts$/, ''), // e.g. rewards/claim
      })
    }
  }
  return entries
}

const apiEntries = scanApiEntries('api')
console.log(`\n▶ Bundling ${apiEntries.length} API functions...`)

// ── 5. Bundle 每個 function ──────────────────────────────────────────────────
await Promise.all(
  apiEntries.map(async ({ file, route }) => {
    const funcDir = `${OUT}/functions/api/${route}.func`
    mkdirSync(funcDir, { recursive: true })

    await build({
      entryPoints: [file],
      bundle: true,           // inline 所有 relative imports（_utils, lib）
      packages: 'external',   // node_modules 保持 external（已在 server 上）
      platform: 'node',
      target: 'node20',
      format: 'cjs',          // CommonJS，無 extension 問題
      outfile: join(funcDir, 'index.js'),
    })

    writeFileSync(
      join(funcDir, '.vc-config.json'),
      JSON.stringify({
        runtime: 'nodejs20.x',
        handler: 'index.js',
        launcherType: 'Nodejs',
        shouldAddHelpers: true,
      })
    )

    console.log(`  ✓ /api/${route}`)
  })
)

// ── 6. 輸出 Vercel routing config ───────────────────────────────────────────
writeFileSync(
  `${OUT}/config.json`,
  JSON.stringify(
    {
      version: 3,
      routes: [
        // 靜態資源：immutable cache
        {
          src: '/assets/(.*)',
          headers: { 'Cache-Control': 'public, max-age=31536000, immutable' },
          continue: true,
        },
        // API functions
        ...apiEntries.map(({ route }) => ({
          src: `/api/${route}`,
          dest: `/api/${route}`,
        })),
        // SPA fallback
        { handle: 'filesystem' },
        { src: '/(.*)', dest: '/index.html' },
      ],
    },
    null,
    2
  )
)

console.log('\n✓ Build complete → .vercel/output/')
