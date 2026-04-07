export interface StaticMenuPrice {
  spec: string;
  price: string;
}

export interface StaticMenuItem {
  name: string;
  description?: string;
  image?: string | null;
  prices?: StaticMenuPrice[];
}

export interface StaticMenuCategory {
  id: string;
  title: string;
  subtitle: string;
  hidePrice?: boolean;
  items: StaticMenuItem[];
}

export interface SharedMenuCategory {
  id: string;
  title: string;
  subtitle?: string | null;
  items: Array<{
    name: string;
    description?: string | null;
    image?: string | null;
    prices?: Array<{
      spec?: string;
      price: number;
    }>;
  }>;
}

const formatPrice = (price: number) => `$${new Intl.NumberFormat('en-US').format(price)}`;

export function buildMenuFromSharedCategories(
  staticCategories: StaticMenuCategory[],
  sharedCategories: SharedMenuCategory[]
): StaticMenuCategory[] {
  const staticItemByName = new Map<string, StaticMenuItem>();
  const staticItemOrderByCategory = new Map<string, Map<string, number>>();

  for (const category of staticCategories) {
    const order = new Map<string, number>();

    category.items.forEach((item, index) => {
      staticItemByName.set(item.name, item);
      order.set(item.name, index);
    });

    staticItemOrderByCategory.set(category.id, order);
  }

  const sharedCategoryById = new Map(sharedCategories.map((category) => [category.id, category]));

  return staticCategories.map((staticCategory) => {
    const sharedCategory = sharedCategoryById.get(staticCategory.id);
    const mergedItems = (sharedCategory?.items ?? [])
      .map((item, index) => {
        const staticItem = staticItemByName.get(item.name);
        const staticOrder = staticItemOrderByCategory.get(staticCategory.id)?.get(item.name);

        return {
          name: item.name,
          description: staticItem?.description ?? item.description ?? '',
          image: staticItem?.image ?? item.image ?? null,
          prices: (item.prices ?? [])
            .filter((variant) => Number.isFinite(variant.price))
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
      items: mergedItems,
    };
  });
}
