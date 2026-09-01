import React, { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import styles from './FAQBlock.module.scss';
import { getFaqItems, type FaqItem } from '@/api/settingsApi';
import { HomeSection } from '@/components/home-section/HomeSection';
import { sanitizeCmsHtml } from '@/utils/sanitizeCmsHtml';
import { faqAnswerPlainText, faqAnswerToHtml } from '@/utils/faqAnswerHtml';
import { scrollToAnchorWhenReady } from '@/utils/scrollToAnchor';

function renderFaqAnswerHtml(raw: string): string {
  return sanitizeCmsHtml(faqAnswerToHtml(raw));
}

function FaqSkeleton() {
  return (
    <div className={styles.faqContent} aria-hidden>
      <div className={styles.skeletonTitle} />
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className={styles.skeletonRow} />
      ))}
    </div>
  );
}

function FaqJsonLd({ items }: { items: FaqItem[] }) {
  if (!items.length) return null;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((it) => ({
      '@type': 'Question',
      name: it.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faqAnswerPlainText(it.answer),
      },
    })),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
      }}
    />
  );
}

function resolveHashIndex(items: FaqItem[], hash: string): number {
  const id = hash.replace(/^#/, '').trim();
  if (!id) return -1;
  const byCms = items.findIndex((it) => id === `faq-${it.id}` || id === it.id);
  if (byCms >= 0) return byCms;
  const m = /^faq-(\d+)$/.exec(id);
  if (m) {
    const n = Number(m[1]);
    if (Number.isFinite(n) && n >= 1 && n <= items.length) return n - 1;
  }
  return -1;
}

export const FAQBlock: React.FC<{
  /** home — секция с ритмом Home; page — flush под /faq */
  variant?: 'home' | 'page';
}> = ({ variant = 'home' }) => {
  const location = useLocation();
  const [faqItems, setFaqItems] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const isPage = variant === 'page';
  const HeadingTag = isPage ? 'h1' : 'h2';

  const fetchFAQ = useCallback(async () => {
    try {
      setLoading(true);
      setError(false);
      setFaqItems(await getFaqItems());
    } catch (err) {
      console.error('Error fetching FAQ:', err);
      setFaqItems([]);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchFAQ();
  }, [fetchFAQ]);

  useEffect(() => {
    if (loading || !faqItems.length) return;
    const idx = resolveHashIndex(faqItems, location.hash);
    if (idx < 0) return;
    setExpandedIndex(idx);
    const item = faqItems[idx]!;
    return scrollToAnchorWhenReady(`faq-${item.id}`);
  }, [loading, faqItems, location.hash]);

  const toggleQuestion = (index: number) => {
    setExpandedIndex((prev) => (prev === index ? null : index));
  };

  return (
    <HomeSection
      className={`${styles.faqContainer} ${isPage ? styles.faqContainerPage : ''}`}
      id={isPage ? undefined : 'faq'}
      flush={isPage}
      anchor={!isPage}
    >
      {isPage && !loading && !error && faqItems.length > 0 ? (
        <FaqJsonLd items={faqItems} />
      ) : null}

      {loading ? (
        <FaqSkeleton />
      ) : error ? (
        <div className={styles.faqContent}>
          <HeadingTag className={styles.title}>FAQ</HeadingTag>
          <p className={styles.statusMsg}>Не удалось загрузить FAQ.</p>
          <button type="button" className={styles.retryBtn} onClick={() => void fetchFAQ()}>
            Повторить
          </button>
        </div>
      ) : faqItems.length === 0 ? (
        <div className={styles.faqContent}>
          <HeadingTag className={styles.title}>FAQ</HeadingTag>
          <p className={styles.statusMsg}>Пока нет вопросов в FAQ.</p>
        </div>
      ) : (
        <div className={styles.faqContent}>
          <HeadingTag className={styles.title}>FAQ</HeadingTag>
          <div className={styles.faqList}>
            {faqItems.map((item, index) => {
              const expanded = expandedIndex === index;
              const itemId = `faq-${item.id}`;
              const panelId = `${itemId}-panel`;
              const triggerId = `${panelId}-trigger`;
              return (
                <div key={item.id} id={itemId} className={styles.faqItem}>
                  <button
                    type="button"
                    id={triggerId}
                    className={styles.question}
                    onClick={() => toggleQuestion(index)}
                    aria-expanded={expanded}
                    aria-controls={panelId}
                  >
                    <span className={styles.questionText}>{item.question}</span>
                    <span
                      className={`${styles.chevron} ${expanded ? styles.chevronOpen : ''}`}
                      aria-hidden
                    >
                      <svg width="18" height="18" viewBox="0 0 22 22" fill="none">
                        <path
                          d="M11 4v14M4 11h14"
                          stroke="currentColor"
                          strokeWidth="1.3"
                        />
                      </svg>
                    </span>
                  </button>
                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={triggerId}
                    hidden={!expanded}
                    className={styles.answer}
                    dangerouslySetInnerHTML={{ __html: renderFaqAnswerHtml(item.answer) }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </HomeSection>
  );
};
