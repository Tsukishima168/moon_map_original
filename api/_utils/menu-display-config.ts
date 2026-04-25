import { createAdminClient } from './supabase-admin'
import { resolveMenuItemId } from '../../lib/menu-catalog'
import type { StaticMenuCategory } from '../../lib/menu-shared'

interface DbSiteCategoryConfigRow {
  category_id: string
  title: string | null
  subtitle: string | null
  hide_price: boolean | null
  sort_order: number | null
}

interface DbSiteItemConfigRow {
  category_id: string
  item_key: string | null
  item_name: string
  description_override: string | null
  image_override: string | null
  sort_order: number | null
}

const DISPLAY_CONFIG_FLAG = 'ENABLE_SUPABASE_MENU_DISPLAY_CONFIG'

function isFeatureEnabled() {
  const value = process.env[DISPLAY_CONFIG_FLAG]?.trim().toLowerCase()
  return value === '1' || value === 'true' || value === 'yes'
}

function isMissingDisplayConfigRelation(error: { code?: string; message?: string } | null) {
  if (!error) return false
  return (
    error.code === '42P01' ||
    error.code === '42703' ||
    /site_category_configs|site_item_configs|does not exist|undefined column/i.test(
      error.message ?? ''
    )
  )
}

export async function fetchSiteMenuDisplayConfig(
  siteKey: string
): Promise<StaticMenuCategory[] | null> {
  if (!isFeatureEnabled()) return null

  const adminClient = createAdminClient()
  const [categoriesResult, itemsResult] = await Promise.all([
    adminClient
      .from('site_category_configs')
      .select('category_id,title,subtitle,hide_price,sort_order')
      .eq('site_key', siteKey)
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
    adminClient
      .from('site_item_configs')
      .select('category_id,item_key,item_name,description_override,image_override,sort_order')
      .eq('site_key', siteKey)
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
  ])

  if (isMissingDisplayConfigRelation(categoriesResult.error) || isMissingDisplayConfigRelation(itemsResult.error)) {
    return null
  }

  if (categoriesResult.error) throw categoriesResult.error
  if (itemsResult.error) throw itemsResult.error

  const categories = (categoriesResult.data ?? []) as DbSiteCategoryConfigRow[]
  const items = (itemsResult.data ?? []) as DbSiteItemConfigRow[]

  if (categories.length === 0) return null

  const itemsByCategoryId = new Map<string, StaticMenuCategory['items']>()

  for (const item of items) {
    const categoryItems = itemsByCategoryId.get(item.category_id) ?? []
    categoryItems.push({
      id: item.item_key ?? resolveMenuItemId(item.item_name) ?? item.item_name,
      name: item.item_name,
      description: item.description_override,
      image: item.image_override,
      prices: [],
    })
    itemsByCategoryId.set(item.category_id, categoryItems)
  }

  return categories.map((category) => ({
    id: category.category_id,
    title: category.title ?? category.category_id,
    subtitle: category.subtitle ?? '',
    hidePrice: category.hide_price ?? false,
    items: itemsByCategoryId.get(category.category_id) ?? [],
  }))
}

export function getDisplayConfigFlagName() {
  return DISPLAY_CONFIG_FLAG
}
