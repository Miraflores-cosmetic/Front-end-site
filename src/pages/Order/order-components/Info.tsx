import { getCartTextPage } from '@/graphql/queries/pages.service';
import { editorJsToHtml } from '@/utils/editorJsParser';
import { useEffect, useState } from 'react';
import styles from '../right-part/OrderRightPart.module.scss';
import userImage from '@/assets/images/userImage.webp';

const InfoContent = () => {
  const [content, setContent] = useState<string | null>(null);

  useEffect(() => {
    getCartTextPage().then(page => {
      if (page && page.content) {
        // Если контент - строка (JSON), парсим
        try {
          const parsed = typeof page.content === 'string' ? JSON.parse(page.content) : page.content;
          const html = editorJsToHtml(parsed);
          setContent(html);
        } catch (e) {
          // Если не JSON, используем как есть (если это просто текст)
          setContent(typeof page.content === 'string' ? page.content : '');
        }
      }
    });
  }, []);

  return (
    <section className={styles.infoWrapper}>
      <div className={styles.userWrapper}>
        <img className={styles.userImage} src={userImage} alt='user image' />
        <div className={styles.userInfo}>
          <p className={styles.userName}>Дмитрий Патрацкий</p>
          <p className={styles.userRole}>CEO</p>
        </div>
      </div>
      <div className={styles.textsWrapper}>
        {content ? (
          <div
            className={styles.dynamicContent}
            dangerouslySetInnerHTML={{ __html: content }}
          />
        ) : (
          <>
            <p className={styles.text}>
              Многие наши товары изготавливаются непосредственно после заказа, поэтому срок от приёма
              заказа до его отправки такого заказа составляет <span>3-5 рабочих дня</span> после 100%
              оплаты.
            </p>
            <p className={styles.text}>
              После обработки заказа нашими операторами, информация о заказе будет отправлена на e-mail,
              указанный при оформлении заказа
            </p>
          </>
        )}
      </div>
    </section>
  );
};

export default InfoContent;
