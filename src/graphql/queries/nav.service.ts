import { fetchCategories } from '@/api/catalogApi';
import { uploadsUrl } from '@/api/apiClient';
import { NavMenuResponse } from '@/types/nav';

export async function getNavMenuItems(): Promise<NavMenuResponse> {
  const { items } = await fetchCategories();
  return {
    menus: {
      edges: [
        {
          node: {
            id: 'nav-categories',
            name: 'Каталог',
            slug: 'catalog',
            items: items.flatMap((root) => [
              {
                id: root.id,
                name: root.name,
                category: {
                  id: root.id,
                  slug: root.slug,
                  backgroundImage: root.imageUrl
                    ? { url: uploadsUrl(root.imageUrl) || root.imageUrl }
                    : { url: '' },
                },
              },
              ...(root.children ?? []).map((ch) => ({
                id: ch.id,
                name: ch.name,
                category: {
                  id: ch.id,
                  slug: ch.slug,
                  backgroundImage: ch.imageUrl
                    ? { url: uploadsUrl(ch.imageUrl) || ch.imageUrl }
                    : { url: '' },
                },
              })),
            ]),
          },
        },
      ],
    },
  };
}
