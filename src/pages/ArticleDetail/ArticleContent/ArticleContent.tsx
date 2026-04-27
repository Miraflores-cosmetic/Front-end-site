import React, {JSX} from 'react';
import styles from './ArticleContent.module.scss';

interface Props {
  contentJson: string | null | undefined;
}

function renderListItems(items: any): React.ReactNode {
  if (!Array.isArray(items)) return null;
  return items.map((item, idx) => {
    // Editor.js "list" tool чаще всего отдаёт массив строк (HTML/markdown уже преобразованы на бэке)
    if (typeof item === 'string') {
      return <li key={idx} dangerouslySetInnerHTML={{__html: item}} />;
    }

    // Поддержка для вложенных структур (на случай другого лист-плагина)
    if (item && typeof item === 'object') {
      const content = typeof item.content === 'string' ? item.content : '';
      const children = renderListItems(item.items);
      return (
        <li key={idx}>
          {content ? <span dangerouslySetInnerHTML={{__html: content}} /> : null}
          {children ? <ul>{children}</ul> : null}
        </li>
      );
    }

    return null;
  });
}

const ArticleContent: React.FC<Props> = ({contentJson}) => {
  if (!contentJson) return null;
  let content;
  try {
    content = JSON.parse(contentJson);
  } catch {
    return null;
  }

  return (
    <>
      {content.blocks?.map((block: any) => {
        switch (block.type) {
          case 'header': {
            const Tag = `h${block.data.level || 2}` as keyof JSX.IntrinsicElements;
            return (
              <Tag key={block.id} className={styles.titleTxt}
                   dangerouslySetInnerHTML={{__html: block.data.text}}
              />
            );
          }

          case 'paragraph':
            return (
              <p
                key={block.id}
                className={styles.paragraph}
                dangerouslySetInnerHTML={{__html: block.data.text}}
              />
            );
          case 'list': {
            const isOrdered = block.data?.style === 'ordered';
            const ListTag = (isOrdered ? 'ol' : 'ul') as keyof JSX.IntrinsicElements;
            const items = renderListItems(block.data?.items);
            if (!items) return null;
            return (
              <ListTag key={block.id}>
                {items}
              </ListTag>
            );
          }
          case 'image':
            return (
              <div  key={block.id}  className={styles.imageWrapper}>
                <img
                  src={block.data.file?.url}
                  alt={block.data.caption || ''}
                />
              </div>
            );
          default:
            return null;
        }
      })}
    </>
  );
};

export default ArticleContent;
