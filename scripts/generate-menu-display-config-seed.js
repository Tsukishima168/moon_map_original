import { readFileSync } from 'node:fs'
import path from 'node:path'

const SITE_KEY = process.env.SITE_KEY || 'map'
const menuPath = path.join(process.cwd(), 'public', 'menu.json')
const catalogPath = path.join(process.cwd(), 'lib', 'menu-catalog.ts')

const normalize = (value) => value.trim().replace(/\s+/g, ' ')
const sql = (value) => `'${String(value).replace(/'/g, "''")}'`
const nullableSql = (value) => (value == null || value === '' ? 'null' : sql(value))

const menuJson = JSON.parse(readFileSync(menuPath, 'utf8'))
const catalogSource = readFileSync(catalogPath, 'utf8')

const catalogEntries = [...catalogSource.matchAll(/id:\s*'([^']+)'[\s\S]*?aliases:\s*\[([\s\S]*?)\]/g)]
const itemKeyByAlias = new Map()

for (const match of catalogEntries) {
  const [, itemKey, aliasesBlock] = match
  itemKeyByAlias.set(normalize(itemKey), itemKey)

  const aliases = [...aliasesBlock.matchAll(/'([^']+)'/g)].map((aliasMatch) => aliasMatch[1])
  for (const alias of aliases) {
    itemKeyByAlias.set(normalize(alias), itemKey)
  }
}

const resolveItemKey = (name) => itemKeyByAlias.get(normalize(name)) ?? null

const lines = []

lines.push('-- Generated from public/menu.json')
lines.push(`-- site_key = ${SITE_KEY}`)
lines.push('begin;')
lines.push(`delete from site_item_configs where site_key = ${sql(SITE_KEY)};`)
lines.push('')

for (const [categoryIndex, category] of menuJson.entries()) {
  lines.push(
    `insert into site_category_configs (site_key, category_id, title, subtitle, hide_price, sort_order, is_active) values (${sql(
      SITE_KEY
    )}, ${sql(category.id)}, ${sql(category.title)}, ${nullableSql(category.subtitle ?? null)}, ${
      category.hidePrice ? 'true' : 'false'
    }, ${categoryIndex}, true) on conflict (site_key, category_id) do update set title = excluded.title, subtitle = excluded.subtitle, hide_price = excluded.hide_price, sort_order = excluded.sort_order, is_active = true;`
  )

  for (const [itemIndex, item] of (category.items ?? []).entries()) {
    lines.push(
      `insert into site_item_configs (site_key, category_id, item_key, item_name, description_override, image_override, sort_order, is_active) values (${sql(
        SITE_KEY
      )}, ${sql(category.id)}, ${nullableSql(resolveItemKey(item.name))}, ${sql(item.name)}, ${nullableSql(
        item.description ?? null
      )}, ${nullableSql(item.image ?? null)}, ${itemIndex}, true);`
    )
  }

  lines.push('')
}

lines.push('commit;')

console.log(lines.join('\n'))
