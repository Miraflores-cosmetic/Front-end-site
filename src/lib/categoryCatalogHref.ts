export type CategoryHrefNode = {
  slug: string;
  parent?: CategoryHrefNode | null;
};

/** Путь в каталог: /catalog/root или /catalog/root/leaf для подкатегорий. */
export function buildCategoryCatalogHref(category: CategoryHrefNode): string {
  const leafSlug = category.slug;
  const parent = category.parent;
  if (!parent) {
    return `/catalog/${encodeURIComponent(leafSlug)}`;
  }
  const rootSlug = parent.parent?.slug ?? parent.slug;
  if (rootSlug === leafSlug) {
    return `/catalog/${encodeURIComponent(rootSlug)}`;
  }
  return `/catalog/${encodeURIComponent(rootSlug)}/${encodeURIComponent(leafSlug)}`;
}

export type CategoryTreeNode = {
  slug: string;
  name: string;
  children?: CategoryTreeNode[];
};

export type ResolvedCategoryPath = {
  root: CategoryTreeNode;
  leaf: CategoryTreeNode;
};

/** Ищет slug среди корней, детей и внуков (до 3 уровней). */
export function findCategoryInTree(
  categories: CategoryTreeNode[],
  slug: string,
): ResolvedCategoryPath | null {
  for (const root of categories) {
    if (root.slug === slug) {
      return { root, leaf: root };
    }
    for (const child of root.children ?? []) {
      if (child.slug === slug) {
        return { root, leaf: child };
      }
      for (const grand of child.children ?? []) {
        if (grand.slug === slug) {
          return { root, leaf: grand };
        }
      }
    }
  }
  return null;
}

/** Ищет подкатегорию (любой глубины до 3) внутри корня. */
export function findSubcategoryInRoot(
  root: CategoryTreeNode,
  slug: string,
): CategoryTreeNode | null {
  for (const child of root.children ?? []) {
    if (child.slug === slug) return child;
    for (const grand of child.children ?? []) {
      if (grand.slug === slug) return grand;
    }
  }
  return null;
}
