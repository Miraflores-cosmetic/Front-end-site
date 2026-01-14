import React, { JSX, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import styles from './CatalogList.module.scss';
import kremgroup from '@/assets/images/kremgroup.webp';
import hear from '@/assets/images/hear.webp';
import etap3 from '@/assets/images/etap3.webp';
import etap2 from '@/assets/images/etap2.webp';
import etap4 from '@/assets/images/cat-2.jpg';
import face from '@/assets/images/face.webp';
import { useScreenMatch } from '@/hooks/useScreenMatch';
import { getAllCategorMenu } from '@/graphql/queries/category.service';
import { ImageWithFallback } from '@/components/image-with-fallback/ImageWithFallback';

interface CategoryItem {
  id: string;
  title: string;
  image: string;
  slug: string;
}

const CatalogList: React.FC = () => {
  const isMobile = useScreenMatch(768);
  const [items, setItems] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Fallback изображения для разных позиций
  const fallbackImages = [
    isMobile ? hear : kremgroup,
    isMobile ? etap3 : hear,
    isMobile ? hear : etap3,
    isMobile ? etap3 : hear,
    isMobile ? hear : etap2,
    isMobile ? etap3 : face,
    isMobile ? hear : etap4,
    isMobile ? etap3 : hear,
    isMobile ? hear : etap2,
    isMobile ? etap3 : face,
    isMobile ? hear : etap3,
    isMobile ? etap3 : etap4
  ];

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        const categories = await getAllCategorMenu();
        
        // Преобразуем категории в формат items, фильтруем только те, у которых есть slug
        const categoryItems: CategoryItem[] = categories
          .filter((cat: any) => cat.slug) // Убираем категории без slug
          .map((cat: any, index: number) => ({
            id: cat.id,
            title: cat.name || '',
            image: cat.backgroundImage?.url || fallbackImages[index % fallbackImages.length],
            slug: cat.slug || ''
          }));

        // Ограничиваем до 12 элементов для сохранения layout
        setItems(categoryItems.slice(0, 12));
      } catch (error) {
        console.error('Error fetching categories:', error);
        // Fallback на статичные данные при ошибке
        setItems([
          {
            id: '1',
            title: isMobile ? 'Волосы' : 'Наборы',
            image: isMobile ? hear : kremgroup,
            slug: ''
          },
          { id: '2', title: 'Лицо', image: isMobile ? etap3 : hear, slug: '' },
          { id: '3', title: 'Волосы', image: isMobile ? hear : etap3, slug: '' },
          { id: '4', title: 'Лицо', image: isMobile ? etap3 : hear, slug: '' },
          { id: '5', title: 'Волосы', image: isMobile ? hear : etap2, slug: '' },
          { id: '6', title: 'Лицо', image: isMobile ? etap3 : face, slug: '' },
          {
            id: '7',
            title: isMobile ? 'Волосы' : 'Наборы',
            image: isMobile ? hear : etap4,
            slug: ''
          },
          { id: '8', title: 'Лицо', image: isMobile ? etap3 : hear, slug: '' },
          { id: '9', title: 'Волосы', image: isMobile ? hear : etap2, slug: '' },
          { id: '10', title: 'Лицо', image: isMobile ? etap3 : face, slug: '' },
          { id: '11', title: 'Волосы', image: isMobile ? hear : etap3, slug: '' },
          { id: '12', title: 'Лицо', image: isMobile ? etap3 : etap4, slug: '' }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, [isMobile]);

  const layout: { index: number | null; span?: number; col?: number }[][] = [
    [{ index: 0, span: 2 }, { index: 1 }, { index: 2 }],
    [{ index: null }, { index: null }, { index: 3, col: 3 }, { index: null }],
    [{ index: 4 }, { index: 5 }, { index: 6, span: 2 }, { index: null }],
    [{ index: null }, { index: 7, col: 2 }, { index: null }, { index: null }],
    [{ index: 8 }, { index: 9 }, { index: 10 }, { index: 11 }]
  ];

  let renderedIndex = 0;

  const totalRows: JSX.Element[] = [];

  while (renderedIndex < items.length) {
    layout.forEach((row, rIdx) => {
      row.forEach((cell, cIdx) => {
        if (renderedIndex >= items.length) return;

        if (cell.index === null) {
          totalRows.push(
            <div key={`ph-${renderedIndex}-${rIdx}-${cIdx}`} className={styles.placeholder} />
          );
        } else {
          const item = items[renderedIndex];
          const gridStyle: React.CSSProperties = {};
          if (cell.span && !isMobile) gridStyle.gridColumn = `span ${cell.span}`;
          if (cell.span && !isMobile) gridStyle.gridRow = `span ${cell.span}`;
          if (cell.col && !isMobile) gridStyle.gridColumnStart = cell.col;

          totalRows.push(
            <div key={item.id} className={styles.item} style={gridStyle}>
              <Link to={`/category/${item.slug}`} className={styles.itemLink}>
                <ImageWithFallback src={item.image} alt={item.title} className={styles.itemImage} />
                <p className={styles.itemTitle}>{item.title}</p>
              </Link>
            </div>
          );

          renderedIndex++;
        }
      });
    });
  }

  return <div className={styles['catalog-grid']}>{totalRows}</div>;
};

export default CatalogList;
