import React from 'react';
import { useSelector } from 'react-redux';
import MenuList from './menu-list/MenuList';
import type { RootState } from '@/store/store';
import { isHiddenInNav } from '@/utils/navHide';
import {
  SITE_ABOUT_LINKS,
  SITE_INFO_LINKS,
  getMenuSupportLinks,
} from '@/config/siteNavLinks';

/** Общие секции ссылок (каталог / о компании / инфо / поддержка). */
export function MenuNavSections() {
  const { items, loading: navLoading } = useSelector((state: RootState) => state.nav);
  const { isAuth } = useSelector((state: RootState) => state.authSlice);

  const catalogItems = items
    .filter((item) => !isHiddenInNav(item))
    .map((item) => ({
      label: item.name,
      href: '/catalog/' + item.category.slug,
    }));

  return (
    <>
      <MenuList
        title="Каталог"
        titleHref="/catalog"
        items={catalogItems}
        loading={navLoading && catalogItems.length === 0}
      />
      <MenuList title="О Компании" withColor items={SITE_ABOUT_LINKS} />
      <MenuList title="Информация" items={SITE_INFO_LINKS} />
      <MenuList title="Поддержка" items={getMenuSupportLinks(isAuth)} />
    </>
  );
}
