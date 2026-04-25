import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  fetchCanonicalMenuSnapshot,
  type CanonicalMbtiRecommendation,
} from './_utils/menu-source'
import {
  fetchSiteMenuDisplayConfig,
  getDisplayConfigFlagName,
} from './_utils/menu-display-config'
import {
  attachMenuItemIds,
  buildMenuFromSharedCategories,
  hasRenderableMenu,
  type SharedMenuCategory,
  type StaticMenuCategory,
} from '../lib/menu-shared'

const SHOP_MENU_API_URL =
  process.env.SHOP_MENU_API_URL || 'https://shop.kiwimu.com/api/menu/categories'

async function loadStaticMenuCategories(): Promise<StaticMenuCategory[]> {
  const menuPath = path.join(process.cwd(), 'public', 'menu.json')
  const raw = await readFile(menuPath, 'utf8')
  return JSON.parse(raw) as StaticMenuCategory[]
}

function getSharedCategories(payload: unknown): SharedMenuCategory[] | null {
  if (Array.isArray(payload)) return payload as SharedMenuCategory[]
  if (payload && typeof payload === 'object' && Array.isArray((payload as { data?: unknown }).data)) {
    return (payload as { data: SharedMenuCategory[] }).data
  }
  return null
}

function respondWithCategories(
  res: VercelResponse,
  {
    message,
    categories,
    source,
    fallback = false,
    mbtiRecommendation = null,
  }: {
    message?: string
    categories: StaticMenuCategory[]
    source:
      | 'supabase_merged'
      | 'supabase_passthrough'
      | 'shop_merged'
      | 'shop_passthrough'
      | 'static_fallback'
    fallback?: boolean
    mbtiRecommendation?: CanonicalMbtiRecommendation | null
  }
) {
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
  return res.status(200).json({
    success: true,
    source,
    fallback,
    message,
    mbtiRecommendation,
    data: categories,
    total: categories.length,
  })
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed', data: [] })
  }

  let staticCategories: StaticMenuCategory[] = []
  let displayMetadataCategories: StaticMenuCategory[] = []

  try {
    staticCategories = await loadStaticMenuCategories()
  } catch (error) {
    console.error('[menu] Failed to load static menu fallback:', error)
  }

  try {
    const siteDisplayConfig = await fetchSiteMenuDisplayConfig('map')
    if (siteDisplayConfig && siteDisplayConfig.length > 0) {
      displayMetadataCategories = siteDisplayConfig
    }
  } catch (error) {
    console.error(
      `[menu] Failed to load optional display config from Supabase (${getDisplayConfigFlagName()}), falling back to public/menu.json metadata:`,
      error
    )
  }

  const metadataCategories =
    displayMetadataCategories.length > 0 ? displayMetadataCategories : staticCategories
  const decoratedFallbackCategories = attachMenuItemIds(staticCategories)

  try {
    const canonicalMenu = await fetchCanonicalMenuSnapshot()
    const categories =
      metadataCategories.length > 0
        ? buildMenuFromSharedCategories(metadataCategories, canonicalMenu.categories)
        : attachMenuItemIds(canonicalMenu.categories)

    if (hasRenderableMenu(categories)) {
      return respondWithCategories(res, {
        categories,
        source: metadataCategories.length > 0 ? 'supabase_merged' : 'supabase_passthrough',
      })
    }
  } catch (error) {
    console.error('[menu] Failed to fetch canonical menu from Supabase, falling back to shared menu API:', error)
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)

  try {
    const upstream = await fetch(SHOP_MENU_API_URL, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    })

    const payload = await upstream.json().catch(() => null)
    const sharedCategories = getSharedCategories(payload)

    if (upstream.ok && sharedCategories) {
      const categories =
        metadataCategories.length > 0
          ? buildMenuFromSharedCategories(metadataCategories, sharedCategories)
          : attachMenuItemIds(sharedCategories)

      if (hasRenderableMenu(categories)) {
        return respondWithCategories(res, {
          categories,
          source: metadataCategories.length > 0 ? 'shop_merged' : 'shop_passthrough',
          mbtiRecommendation: null,
        })
      }
    }

    if (hasRenderableMenu(decoratedFallbackCategories)) {
      return respondWithCategories(res, {
        message: upstream.ok
          ? 'Shared menu upstream returned an empty or invalid payload, falling back to static menu'
          : `Shared menu upstream failed with HTTP ${upstream.status}, falling back to static menu`,
        categories: decoratedFallbackCategories,
        source: 'static_fallback',
        fallback: true,
        mbtiRecommendation: null,
      })
    }

    return res.status(502).json({
      success: false,
      message: upstream.ok
        ? 'Shared menu upstream returned an invalid payload'
        : `Shared menu upstream failed with HTTP ${upstream.status}`,
      data: [],
      upstream: payload,
    })
  } catch (error) {
    console.error('[menu] Failed to fetch shared menu source:', error)

    if (hasRenderableMenu(decoratedFallbackCategories)) {
      return respondWithCategories(res, {
        message: 'Failed to fetch shared menu source, falling back to static menu',
        categories: decoratedFallbackCategories,
        source: 'static_fallback',
        fallback: true,
        mbtiRecommendation: null,
      })
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch shared menu source',
      data: [],
    })
  } finally {
    clearTimeout(timeout)
  }
}
