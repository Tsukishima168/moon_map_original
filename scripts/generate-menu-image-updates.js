/**
 * 依 docs/menu_item_image_mapping.csv 產生更新 menu_items.image 的 SQL
 * 執行後請到 Supabase SQL Editor 執行 scripts/update_menu_images.sql
 *
 * 使用：node scripts/generate-menu-image-updates.js
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')

const SUPABASE_STORAGE_BASE = 'https://xlqwfaailjyvsycjnzkz.supabase.co/storage/v1/object/public/moon-island-assets'
const MENU_ITEMS_PATH = 'menu-items'
const DEFAULT_EXT = 'webp'

function parseCsv(content) {
  const lines = content.trim().split(/\r?\n/)
  if (lines.length < 2) return []
  const header = lines[0].split(',').map(s => s.trim())
  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(s => s.trim())
    const row = {}
    header.forEach((h, j) => { row[h] = values[j] || '' })
    rows.push(row)
  }
  return rows
}

function main() {
  const mappingPath = path.join(projectRoot, 'docs', 'menu_item_image_mapping.csv')
  if (!fs.existsSync(mappingPath)) {
    console.error('❌ 找不到 docs/menu_item_image_mapping.csv')
    process.exit(1)
  }

  const csv = fs.readFileSync(mappingPath, 'utf8')
  const rows = parseCsv(csv)
  if (!rows.length) {
    console.error('❌ mapping CSV 沒有資料列')
    process.exit(1)
  }

  const updates = []
  for (const row of rows) {
    const imageId = row.image_id
    const dbName = row.db_name
    if (!imageId || !dbName) continue
    const imageUrl = `${SUPABASE_STORAGE_BASE}/${MENU_ITEMS_PATH}/${imageId}.${DEFAULT_EXT}`
    const escapedName = dbName.replace(/'/g, "''")
    updates.push(`UPDATE menu_items SET image = '${imageUrl}' WHERE name = '${escapedName}';`)
  }

  const sql = `-- 由 generate-menu-image-updates.js 產生，請在 Supabase SQL Editor 執行
-- 會將 menu_items.image 更新為 Storage 公開網址（menu-items/{image_id}.webp）

${updates.join('\n')}
`

  const outPath = path.join(projectRoot, 'scripts', 'update_menu_images.sql')
  fs.writeFileSync(outPath, sql, 'utf8')
  console.log(`✅ 已產生 ${updates.length} 條 UPDATE 語句`)
  console.log(`   輸出：${outPath}`)
  console.log('\n📋 下一步：到 Supabase Dashboard → SQL Editor 貼上並執行該檔案')
}

main()
