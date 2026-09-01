import React from 'react';
import styles from './FAQ.module.scss';
import { FAQBlock } from '@/components/faq-block/FAQBlock';
import { useDocumentSeo } from '@/hooks/useDocumentSeo';

const FAQ: React.FC = () => {
  useDocumentSeo({
    title: 'FAQ',
    description:
      'Частые вопросы о заказе, доставке и уходе за кожей — ответы Miraflores.',
    canonicalPath: '/faq',
  });

  return (
    <main className={styles.faqPageContainer}>
      <FAQBlock variant="page" />
    </main>
  );
};

export default FAQ;
