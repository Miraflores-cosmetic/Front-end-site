import React, { useEffect, useState, useMemo } from 'react';
import styles from './About.module.scss';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import footerImage from '@/assets/images/footer-img.png';
import logo from '@/assets/icons/Miraflores_logo.svg';
import aboutImg from '@/assets/images/about-img.png';
import flwImg from '@/assets/images/flw.png';
import { getPageBySlug, PageNode } from '@/graphql/queries/pages.service';
import { normalizeMediaUrl } from '@/utils/mediaUrl';
import { editorJsToHtml } from '@/utils/editorJsParser';

const PARALLAX_RATE = 0.2;
const ABOUT_PAGE_SLUG = 'stranitsa-o-nas';

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

function parseAboutBlocks(page: PageNode | null): AboutBlockItem[] {
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

const About: React.FC = () => {
  const [scrollY, setScrollY] = useState(0);
  const [aboutPage, setAboutPage] = useState<PageNode | null>(null);

  const aboutBlocks = useMemo(() => parseAboutBlocks(aboutPage), [aboutPage]);

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
      <Header />
      <main className={styles.aboutContainer}>
        <div className={styles.aboutContent}>
          <div className={styles.logoWrapper}>
            <img src={aboutImg} alt="" className={styles.aboutImg} />
            <img src={logo} alt="Miraflores" className={styles.logo} />
            <img
              src={flwImg}
              alt=""
              className={styles.flwImg}
              style={{ transform: `translateY(${parallaxUp}px)` }}
            />
          </div>
          <div className={styles.aboutTextWrapper}>
            <p className={styles.aboutText}>
              это ботаническая нутри-косметика, созданная не для маскировки, а для активации вашей природной красоты. Внимательно прислушиваясь к коже, свету и ритмам природы, она мягко напоминает женщине:
              <br />
              Красота уже внутри. Нужно лишь помочь ей проявиться.
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

          {aboutBlocks.length > 0 && (
            <section className={styles.aboutGridSection} aria-label="О нас">
              <img
                src={flwImg}
                alt=""
                className={styles.flwImgGrid}
                style={{ transform: `translateY(${parallaxUp}px)` }}
              />
              <div className={styles.aboutGrid}>
                {aboutBlocks.map((block, index) => {
                  const imageCell = (
                    <div key="img" className={styles.aboutGridCell}>
                      {block.imageUrl && (
                        <img
                          src={block.imageUrl}
                          alt=""
                          className={styles.aboutGridImage}
                        />
                      )}
                    </div>
                  );
                  const textCell = (
                    <div key="txt" className={styles.aboutGridCell}>
                      {block.text &&
                        (block.isHtml ? (
                          <div
                            className={styles.aboutGridText}
                            dangerouslySetInnerHTML={{ __html: block.text }}
                          />
                        ) : (
                          <p className={styles.aboutGridText}>{block.text}</p>
                        ))}
                    </div>
                  );
                  return (
                    <React.Fragment key={index}>
                      <div className={styles.aboutGridRow}>
                        {index % 2 === 0 ? (
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
                      {index === Math.min(1, aboutBlocks.length - 1) && (
                        <div className={styles.aboutGridTaglineBreak}>
                          <div className={styles.aboutTagline}>
                            <img src={logo} alt="Miraflores" className={styles.aboutTaglineLogo} />
                            <span className={styles.aboutTaglineText}>
                              Создано с любовью, подтверждено наукой
                            </span>
                          </div>
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </section>
          )}

          <div className={styles.aboutMissionWrapper}>
            <div className={styles.aboutMissionHead}>
              <img src={logo} alt="Miraflores" className={styles.aboutMissionLogo} />
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
        <Footer footerImage={footerImage} />
        </div>
      </main>
    </>
  );
};

export default About;
