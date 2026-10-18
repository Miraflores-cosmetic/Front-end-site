import { getCartTextPage } from '@/graphql/queries/pages.service';
import { editorJsToHtml } from '@/utils/editorJsParser';
import { sanitizeCmsHtml } from '@/utils/sanitizeCmsHtml';
import { useEffect, useState } from 'react';
import styles from '../right-part/OrderRightPart.module.scss';

const InfoContent = () => {
  const [content, setContent] = useState<string | null>(null);

  useEffect(() => {
    getCartTextPage().then(page => {
      if (page && page.content) {
        try {
          const parsed = typeof page.content === 'string' ? JSON.parse(page.content) : page.content;
          const html = sanitizeCmsHtml(editorJsToHtml(parsed));
          setContent(html);
        } catch {
          setContent(
            typeof page.content === 'string' ? sanitizeCmsHtml(page.content) : '',
          );
        }
      }
    });
  }, []);

  return (
    <section className={styles.infoWrapper}>
      <div className={styles.textsWrapper}>
        {content ? (
          <div
            className={styles.dynamicContent}
            dangerouslySetInnerHTML={{ __html: content }}
          />
        ) : (
          <>
            <p className={styles.text}>
              Мы всегда стараемся отправлять ваши заказы максимально оперативно. Однако, редко, срок от
              приёма заказа до его отправки может составлять <span>3-5 рабочих дней</span>.
            </p>
            <p className={styles.text}>
              После обработки заказа нашими операторами, информация о заказе будет отправлена на e-mail,
              указанный при оформлении заказа.
            </p>
          </>
        )}
      </div>
    </section>
  );
};

export default InfoContent;
