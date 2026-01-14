import React, {JSX} from 'react';
import styles from './ArticleContent.module.scss';

interface Props {
  contentJson: string | null | undefined;
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
