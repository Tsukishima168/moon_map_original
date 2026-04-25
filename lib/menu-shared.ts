import { resolveMenuItemId } from './menu-catalog';

export interface MenuPrice {
  spec?: string;
  price: number | string;
}

export interface MenuItem {
  id?: string | null;
  name: string;
  description?: string | null;
  image?: string | null;
  prices?: MenuPrice[];
}

export interface MenuCategory {
  id: string;
  title: string;
  subtitle?: string | null;
  hidePrice?: boolean;
  items: MenuItem[];
}

export type StaticMenuCategory = MenuCategory;
export type SharedMenuCategory = MenuCategory;

const normalizeLookupKey = (value: string) => value.trim().replace(/\s+/g, ' ');

const toNumericPrice = (price: number | string) => {
  if (typeof price === 'number') return price;
  const parsed = Number(String(price).replace(/[^\d.]/g, ''));
  return Number.isFinite(parsed) ? parsed : NaN;
};

const formatPrice = (price: number | string) => {
  if (typeof price === 'string' && price.trim().startsWith('$')) return price;
  const numericPrice = toNumericPrice(price);
  if (!Number.isFinite(numericPrice)) return String(price);
  return `$${new Intl.NumberFormat('en-US').format(numericPrice)}`;
};

export function attachMenuItemIds(categories: MenuCategory[]): StaticMenuCategory[] {
  return categories.map((category) => ({
    ...category,
    subtitle: category.subtitle ?? '',
    items: (category.items ?? []).map((item) => ({
      ...item,
      id: resolveMenuItemId(item.name) ?? item.id ?? null,
      description: item.description ?? '',
      image: item.image ?? null,
      prices: (item.prices ?? []).map((variant) => ({
        spec: variant.spec ?? '標準',
        price: formatPrice(variant.price),
      })),
    })),
  }));
}

export function buildMenuFromSharedCategories(
  staticCategories: StaticMenuCategory[],
  sharedCategories: SharedMenuCategory[]
): StaticMenuCategory[] {
  const decoratedStaticCategories = attachMenuItemIds(staticCategories);
  const staticItemById = new Map<string, MenuItem>();
  const staticItemByName = new Map<string, MenuItem>();
  const staticItemOrderByCategory = new Map<string, Map<string, number>>();

  for (const category of decoratedStaticCategories) {
    const order = new Map<string, number>();

    category.items.forEach((item, index) => {
      if (item.id) {
        staticItemById.set(item.id, item);
        order.set(item.id, index);
      }

      staticItemByName.set(normalizeLookupKey(item.name), item);
      order.set(normalizeLookupKey(item.name), index);
    });

    staticItemOrderByCategory.set(category.id, order);
  }

  const sharedCategoryById = new Map(sharedCategories.map((category) => [category.id, category]));

  return decoratedStaticCategories.map((staticCategory) => {
    const sharedCategory = sharedCategoryById.get(staticCategory.id);

    if (!sharedCategory) return staticCategory;

    const mergedItems = (sharedCategory.items ?? [])
      .map((item, index) => {
        const resolvedId = resolveMenuItemId(item.name) ?? item.id ?? null;
        const staticItem = (resolvedId && staticItemById.get(resolvedId)) || staticItemByName.get(normalizeLookupKey(item.name));
        const orderKey = resolvedId ?? normalizeLookupKey(item.name);
        const staticOrder = staticItemOrderByCategory.get(staticCategory.id)?.get(orderKey);

        return {
          id: resolvedId,
          name: item.name,
          description: staticItem?.description ?? item.description ?? '',
          image: staticItem?.image ?? item.image ?? null,
          prices: (item.prices ?? [])
            .filter((variant) => Number.isFinite(toNumericPrice(variant.price)))
            .map((variant) => ({
              spec: variant.spec ?? '標準',
              price: formatPrice(variant.price),
            })),
          __order: staticOrder ?? index,
        };
      })
      .sort((a, b) => {
        if (a.__order !== b.__order) return a.__order - b.__order;
        return a.name.localeCompare(b.name, 'zh-Hant');
      })
      .map(({ __order, ...menuItem }) => menuItem);

    return {
      id: staticCategory.id,
      title: staticCategory.title,
      subtitle: staticCategory.subtitle,
      hidePrice: staticCategory.hidePrice,
      items: mergedItems.length > 0 ? mergedItems : staticCategory.items,
    };
  });
}

export function hasRenderableMenu(categories: MenuCategory[]) {
  return categories.some((category) => (category.items ?? []).length > 0);
}

export { getMenuCatalogEntry, type MenuItemId } from './menu-catalog';
