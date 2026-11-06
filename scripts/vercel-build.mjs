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
      bundle: true,           // inline 所有 relative imports（_utils, lib）＋所有 npm 套件
      // packages: 'external' 移除：Build Output API 的 .func 目錄沒有 node_modules，
      // 必須把 npm 套件（@supabase/supabase-js 等）一起打進 bundle
      platform: 'node',
      target: 'node24',
      format: 'cjs',          // CommonJS format
      outfile: join(funcDir, 'index.cjs'), // .cjs 明確告訴 Node 用 CJS，不受 package.json "type":"module" 影響
    })

    writeFileSync(
      join(funcDir, '.vc-config.json'),
      JSON.stringify({
        runtime: 'nodejs24.x',
        handler: 'index.cjs',  // 對應上面的 .cjs 檔名
        launcherType: 'Nodejs',
        shouldAddHelpers: true,
      })
    )

    console.log(`  ✓ /api/${route}`)
  })
)

// ── 6. 輸出 Vercel routing config ───────────────────────────────────────────
// Vite（rolldown）的 hash 檔名：<name>-<8 碼 base64url>.<ext>，例如 index-C8u_ucvv.js。
// immutable 只能給「內容變了檔名就會變」的檔；public/assets 底下的檔（season-04/*、logo-chinese.*
// 等）檔名不帶 hash，換圖不改檔名，不能套 immutable，否則客人最久一年看不到新圖。
// ⚠ 所以 public/assets 的檔名尾段不要剛好變成 8 碼（-AbCdEfGh.png 這種）：會被這條規則誤判成 hash 檔。
//   （目前 logo-chinese.*、*-desktop.* 的尾段是 7 碼，差一碼。）
const HASHED_ASSET_SRC = '^/assets/[^/]+-[A-Za-z0-9_-]{8}\\.[A-Za-z0-9]+$'

writeFileSync(
  `${OUT}/config.json`,
  JSON.stringify(
    {
      version: 3,
      routes: [
        // hash 靜態檔：immutable cache。
        // 放在 handle:'filesystem' 之前——該 phase 之後的規則只在 filesystem 沒命中時才檢查，
        // 放後面就看不到已存在的檔案了。
        {
          src: HASHED_ASSET_SRC,
          headers: { 'Cache-Control': 'public, max-age=31536000, immutable' },
          continue: true,
        },
        // API functions
        ...apiEntries.map(({ route }) => ({
          src: `/api/${route}`,
          dest: `/api/${route}`,
        })),
        // SPA fallback：排除 /assets/ 開頭的路徑——缺檔的 /assets/* 要回 404，
        // 不能回 index.html（HTML 被當成 JS／圖片，還可能被快取）。
        // /assets/ 底下沒有任何前端路由（SPA 路徑只有 / 與 /menu）。
        { handle: 'filesystem' },
        { src: '^/(?!assets/).*$', dest: '/index.html' },
      ],
    },
    null,
    2
  )
)

console.log('\n✓ Build complete → .vercel/output/')
