import { resolveMenuItemId } from '../../lib/menu-catalog'
import type { SharedMenuCategory, MenuPrice } from '../../lib/menu-shared'
import { createAdminClient } from './supabase-admin'

interface DbMenuCategoryRow {
  id: string
  title: string
  subtitle: string | null
  sort_order: number | null
}

interface DbMenuItemRow {
  id: string
  category_id: string
  name: string
  image: string | null
  description: string | null
  sort_order: number | null
  is_available: boolean
}

interface DbMenuVariantRow {
  menu_item_id: string
  spec: string | null
  price: number | string
  sort_order: number | null
}

interface DbMbtiMenuLinkRow {
  mbti_type: string
  menu_item_id: string | null
  linkage_type: string | null
  soul_dessert_name: string | null
  display_name_override: string | null
  display_description_override: string | null
  priority: number | null
}

export interface CanonicalMbtiRecommendation {
  mbtiType: string
  primaryItemId: string | null
  primaryItemName: string | null
  primaryItemDbId: string | null
  primaryItemDescription: string | null
  soulDessertName: string | null
  linkageType: string | null
}

export interface CanonicalMenuSnapshot {
  categories: SharedMenuCategory[]
}

const normalizeMbtiType = (mbtiType: string | null | undefined) => {
  const normalized = mbtiType?.split('-')[0]?.trim().toUpperCase()
  return normalized || null
}

export function getCanonicalMbtiType(mbtiType: string | null | undefined) {
  return normalizeMbtiType(mbtiType)
}

const toMenuPrice = (variant: DbMenuVariantRow): MenuPrice => ({
  spec: variant.spec ?? '標準',
  price: variant.price,
})

export async function fetchCanonicalMenuSnapshot(): Promise<CanonicalMenuSnapshot> {
  const adminClient = createAdminClient()

  const [categoriesResult, itemsResult, variantsResult] = await Promise.all([
    adminClient
      .from('menu_categories')
      .select('id,title,subtitle,sort_order')
      .order('sort_order', { ascending: true }),
    adminClient
      .from('menu_items')
      .select('id,category_id,name,image,description,sort_order,is_available')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true }),
    adminClient
      .from('menu_variants')
      .select('menu_item_id,spec,price,sort_order')
      .order('sort_order', { ascending: true })
      .order('spec', { ascending: true }),
  ])

  if (categoriesResult.error) throw categoriesResult.error
  if (itemsResult.error) throw itemsResult.error
  if (variantsResult.error) throw variantsResult.error

  const categories = (categoriesResult.data ?? []) as DbMenuCategoryRow[]
  const allItems = (itemsResult.data ?? []) as DbMenuItemRow[]
  const variants = (variantsResult.data ?? []) as DbMenuVariantRow[]
  const activeItems = allItems.filter((item) => item.is_available)

  const variantsByItemId = new Map<string, MenuPrice[]>()

  for (const variant of variants) {
    const list = variantsByItemId.get(variant.menu_item_id) ?? []
    list.push(toMenuPrice(variant))
    variantsByItemId.set(variant.menu_item_id, list)
  }

  const itemsByCategoryId = new Map<string, SharedMenuCategory['items']>()

  for (const item of activeItems) {
    const categoryItems = itemsByCategoryId.get(item.category_id) ?? []
    categoryItems.push({
      id: item.id,
      name: item.name,
      image: item.image,
      description: item.description,
      prices: variantsByItemId.get(item.id) ?? [],
    })
    itemsByCategoryId.set(item.category_id, categoryItems)
  }

  return {
    categories: categories.map((category) => ({
      id: category.id,
      title: category.title,
      subtitle: category.subtitle,
      items: itemsByCategoryId.get(category.id) ?? [],
    })),
  }
}

export async function fetchCanonicalMbtiRecommendation(
  mbtiType: string | null | undefined
): Promise<CanonicalMbtiRecommendation | null> {
  const normalizedMbtiType = normalizeMbtiType(mbtiType)
  if (!normalizedMbtiType) return null

  const adminClient = createAdminClient()
  const { data: linkRows, error: linkError } = await adminClient
    .from('mbti_menu_links')
    .select(
      'mbti_type,menu_item_id,linkage_type,soul_dessert_name,display_name_override,display_description_override,priority'
    )
    .eq('mbti_type', normalizedMbtiType)
    .eq('is_active', true)
    .order('priority', { ascending: true })
    .limit(1)

  if (linkError) throw linkError

  const link = ((linkRows ?? [])[0] ?? null) as DbMbtiMenuLinkRow | null
  if (!link) return null

  let linkedItem: DbMenuItemRow | null = null

  if (link.menu_item_id) {
    const { data: itemRow, error: itemError } = await adminClient
      .from('menu_items')
      .select('id,category_id,name,image,description,sort_order,is_available')
      .eq('id', link.menu_item_id)
      .maybeSingle()

    if (itemError) throw itemError
    linkedItem = (itemRow as DbMenuItemRow | null) ?? null
  }

  const resolvedPrimaryItemId = linkedItem
    ? resolveMenuItemId(linkedItem.name) ?? linkedItem.id
    : null

  return {
    mbtiType: normalizedMbtiType,
    primaryItemId: resolvedPrimaryItemId,
    primaryItemName:
      link.display_name_override ?? linkedItem?.name ?? link.soul_dessert_name ?? null,
    primaryItemDbId: linkedItem?.id ?? link.menu_item_id ?? null,
    primaryItemDescription:
      link.display_description_override ?? linkedItem?.description ?? null,
    soulDessertName: link.soul_dessert_name ?? null,
    linkageType: link.linkage_type ?? null,
  }
}
