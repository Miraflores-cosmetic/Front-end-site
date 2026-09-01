import React, { useEffect, useState, useMemo } from 'react';
import styles from './About.module.scss';
import siteLogo from '@/assets/icons/Logo-mira.svg';
import aboutImg from '@/assets/images/about-img.png';
import flwImg from '@/assets/images/flw.png';
import { getPageBySlug, PageNode } from '@/graphql/queries/pages.service';
import { normalizeMediaUrl } from '@/utils/mediaUrl';
import { editorJsToHtml } from '@/utils/editorJsParser';
import { parseAboutCmsGridBlocks } from '@/utils/parseAboutCmsGrid';
import { useScreenMatch } from '@/hooks/useScreenMatch';

const PARALLAX_RATE = 0.2;
const ABOUT_PAGE_SLUG = 'about';

const FALLBACK_INTRO =
  'это ботаническая нутри-косметика, созданная не для маскировки, а для активации вашей природной красоты. Внимательно прислушиваясь к коже, свету и ритмам природы, она мягко напоминает женщине:\nКрасота уже внутри. Нужно лишь помочь ей проявиться.';

const TIMELINE_LABELS = [
  'Научно-исследовательский подход',
  '15 лет на рынке',
  'Собственное производство',
  'Ограниченные партии и гарантия высокого качества',
  '80% постоянных клиентов',
  'Собираем травы в 3 регионах России'
];

interface AboutBlockItem {
  imageUrl: string;
  text: string;
  isHtml: boolean;
}

function parseLegacyAboutBlocks(page: PageNode | null): AboutBlockItem[] {
  if (!page?.assignedAttributes?.length) return [];

  const byIndex: Record<number, { imageUrl?: string; text?: string; isHtml?: boolean }> = {};

  for (const attr of page.assignedAttributes) {
    const slug = attr.attribute?.slug || '';
    const match = slug.match(/^(kartinka-o-nas|tekst-o-nas)-(\d+)$/);
    if (!match) continue;
    const kind = match[1];
    const index = parseInt(match[2], 10);
    if (!byIndex[index]) byIndex[index] = {};

    if (kind === 'kartinka-o-nas' && (attr as any).fileValue?.url) {
      byIndex[index].imageUrl = normalizeMediaUrl((attr as any).fileValue.url);
    }
    if (kind === 'tekst-o-nas') {
      const textVal = (attr as any).textValue;
      const richVal = (attr as any).richTextValue;
      if (typeof textVal === 'string') {
        byIndex[index].text = textVal;
        byIndex[index].isHtml = false;
      } else if (richVal != null) {
        try {
          byIndex[index].text = typeof richVal === 'string' ? richVal : editorJsToHtml(richVal);
          byIndex[index].isHtml = true;
        } catch {
          byIndex[index].text = String(richVal);
          byIndex[index].isHtml = false;
        }
      }
    }
  }

  const indices = Object.keys(byIndex)
    .map(Number)
    .filter((n) => byIndex[n].imageUrl || byIndex[n].text)
    .sort((a, b) => a - b);

  return indices.map((i) => ({
    imageUrl: byIndex[i].imageUrl || '',
    text: byIndex[i].text || '',
    isHtml: !!byIndex[i].isHtml
  }));
}

function AboutGridSection({
  blocks,
  isMobile,
  showTaglineAfterIndex,
  ariaLabel,
  className,
  showFlwDecoration = true,
  flwParallaxY = 0,
}: {
  blocks: AboutBlockItem[];
  isMobile: boolean;
  showTaglineAfterIndex?: number;
  ariaLabel: string;
  className?: string;
  showFlwDecoration?: boolean;
  flwParallaxY?: number;
}) {
  if (!blocks.length) return null;

  return (
    <section
      className={`${styles.aboutGridSection} ${className ?? ''}`.trim()}
      aria-label={ariaLabel}
    >
      {showFlwDecoration ? (
        <img
          src={flwImg}
          alt=""
          className={styles.flwImgGrid}
          aria-hidden
          style={{ transform: `translateY(${flwParallaxY}px)` }}
        />
      ) : null}
      <div className={styles.aboutGrid}>
        {blocks.map((block, index) => {
          const imageCell = block.imageUrl ? (
            <div className={styles.aboutGridCell}>
              <img src={block.imageUrl} alt="" className={styles.aboutGridImage} />
            </div>
          ) : null;
          const textCell = block.text ? (
            <div className={styles.aboutGridCell}>
              {block.isHtml ? (
                <div
                  className={styles.aboutGridText}
                  dangerouslySetInnerHTML={{ __html: block.text }}
                />
              ) : (
                <p className={styles.aboutGridText}>{block.text}</p>
              )}
            </div>
          ) : null;

          if (!block.imageUrl) {
            return (
              <div key={index} className={styles.aboutGridTextOnly}>
                {textCell}
              </div>
            );
          }

          return (
            <React.Fragment key={index}>
              <div className={styles.aboutGridRow}>
                {isMobile || index % 2 === 0 ? (
                  <>
                    {imageCell}
                    {textCell}
                  </>
                ) : (
                  <>
                    {textCell}
                    {imageCell}
                  </>
                )}
              </div>
              {showTaglineAfterIndex === index ? (
                <div className={styles.aboutGridTaglineBreak}>
                  <div className={styles.aboutTagline}>
                    <img src={siteLogo} alt="Miraflores" className={styles.aboutTaglineLogo} />
                    <span className={styles.aboutTaglineText}>
                      Создано с любовью, подтверждено наукой
                    </span>
                  </div>
                </div>
              ) : null}
            </React.Fragment>
          );
        })}
      </div>
    </section>
  );
}

const About: React.FC = () => {
  const [scrollY, setScrollY] = useState(0);
  const [aboutPage, setAboutPage] = useState<PageNode | null>(null);
  const isMobile = useScreenMatch();

  const legacyBlocks = useMemo(() => parseLegacyAboutBlocks(aboutPage), [aboutPage]);
  const cmsGridBlocks = useMemo(
    () =>
      parseAboutCmsGridBlocks(aboutPage?.content).map((b) => ({
        imageUrl: b.imageUrl,
        text: b.textHtml,
        isHtml: true,
      })),
    [aboutPage?.content],
  );

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    getPageBySlug(ABOUT_PAGE_SLUG).then(setAboutPage).catch(() => setAboutPage(null));
  }, []);

  useEffect(() => {
    let rafId: number;
    const handleScroll = () => {
      rafId = requestAnimationFrame(() => setScrollY(window.scrollY));
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(rafId);
    };
  }, []);

  const parallaxDown = scrollY * PARALLAX_RATE;
  const parallaxUp = -scrollY * PARALLAX_RATE;

  return (
    <>
      <main className={styles.aboutContainer}>
        <div className={styles.aboutContent}>
          <div className={styles.logoWrapper}>
            <img src={aboutImg} alt="" className={styles.aboutImg} />
            <img src={siteLogo} alt="Miraflores" className={styles.logo} />
            <img
              src={flwImg}
              alt=""
              className={styles.flwImg}
              style={{ transform: `translateY(${parallaxUp}px)` }}
            />
          </div>
          <div className={styles.aboutTextWrapper}>
            <p className={styles.aboutText}>
              {FALLBACK_INTRO.split('\n').map((line, i, arr) => (
                <React.Fragment key={i}>
                  {line}
                  {i < arr.length - 1 ? <br /> : null}
                </React.Fragment>
              ))}
            </p>
            <img
              src={flwImg}
              alt=""
              className={styles.flwImgLeft}
              style={{ transform: `rotate(-30deg) translateY(${parallaxDown}px)` }}
            />
          </div>

          <section className={styles.timelineSection} aria-label="Наши преимущества">
            <div className={styles.timelineScroll}>
              <div className={styles.timelineTrack}>
                {[...TIMELINE_LABELS, ...TIMELINE_LABELS].map((label, i) => (
                  <div key={i} className={styles.timelinePoint}>
                    <span className={styles.timelineDot} />
                    <p className={styles.timelineLabel}>{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <AboutGridSection
            blocks={legacyBlocks}
            isMobile={isMobile}
            showTaglineAfterIndex={Math.min(1, Math.max(0, legacyBlocks.length - 1))}
            ariaLabel="О нас"
            flwParallaxY={parallaxUp}
          />

          <div className={styles.aboutMissionWrapper}>
            <div className={styles.aboutMissionHead}>
              <img src={siteLogo} alt="Miraflores" className={styles.aboutMissionLogo} />
              <span className={styles.aboutMissionDash}>—</span>
              <span className={styles.aboutMissionTitle}>Дело всей жизни</span>
            </div>
            <p className={styles.aboutMissionText}>
              Мы создали Miraflores не ради трендов и не ради громких лозунгов. Это история о любви к науке, к
              природе и к людям. Мы работаем ради максимально эффективной формулы внутри баночки, а не ради обещаний снаружи. И,
              как бы ни были важны красивые слоганы, мы сосредоточены на том, что внутри флакона: на качестве,
              эффективности и безопасности. Miraflores - это команда, которая верит в свой путь, в друг друга и в принципы.
              Ценим каждого, кто выбирает нас, внимательно прислушиваемся к вашей обратной связи и продолжаем
              развиваться вместе с вами. Miraflores - это про любовь и уважение к коже, к природе и к себе.
            </p>
          </div>

          <AboutGridSection
            blocks={cmsGridBlocks}
            isMobile={isMobile}
            ariaLabel="Материалы из админки"
            className={styles.aboutCmsGridSection}
            showFlwDecoration={false}
          />
        </div>
      </main>
    </>
  );
};

export default About;
