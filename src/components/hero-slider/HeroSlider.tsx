import React, { useEffect, useState, useMemo } from 'react';
import Slider from 'react-slick';
import styles from './HeroSlider.module.scss';
import topBlockStyles from '@/components/TopBlock/TopBlock.module.scss';
import { getPageBySlug, PageNode } from '@/graphql/queries/pages.service';
import { SpinnerLoader } from '@/components/spinner/SpinnerLoader';
import { useScreenMatch } from '@/hooks/useScreenMatch';
import DesktopTextImages from '@/components/TopBlock/DesktopTextImages';
import TextWrapper from '@/components/TopBlock/TextWrapper';
import MarqueeText from '@/components/TopBlock/MarqeenText';
import { ImageWithFallback } from '@/components/image-with-fallback/ImageWithFallback';
import lineTo from '@/assets/icons/lineTo.svg';
import lineToVertical from '@/assets/icons/lineToVertival.svg';
import info from '@/assets/icons/info.svg';
import flower from '@/assets/images/flower.webp';
import flowerSmall from '@/assets/images/flowerSmall.webp';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';

interface SlideData {
  largeImage: string; // flower (правая большая картинка)
  smallImage: string; // flowerSmall (маленькая картинка слева)
}

export const HeroSlider: React.FC = () => {
  const [slides, setSlides] = useState<SlideData[]>([]);
  const [loading, setLoading] = useState(true);
  const isTablet = useScreenMatch(800);
  const isMobile = useScreenMatch(450);

  const mobileTexts = {
    title: 'Предложения',
    items: ['Подобрать уход', 'Акции']
  };

  const desktopTexts = {
    title: 'Подобрать уход',
    items: ['Программа благодарности', 'Шаг за шагом к чистой коже']
  };

  useEffect(() => {
    const fetchSlider = async () => {
      try {
        setLoading(true);
        const pageData = await getPageBySlug('slaider');
        
        if (pageData) {
          // Структура: большая картинка основная + маленькая картинка на одном слайде
          const slidesMap = new Map<number, Partial<SlideData>>();

          if (pageData.assignedAttributes && pageData.assignedAttributes.length > 0) {
            pageData.assignedAttributes.forEach((attr) => {
              const attrSlug = attr.attribute?.slug || '';
              const attrName = attr.attribute?.name || '';
              
              // Определяем номер слайда
              let slideNumber = 1;
              if (attrName.includes('- 2') || attrSlug.includes('-2')) {
                slideNumber = 2;
              } else if (attrName.includes('- 3') || attrSlug.includes('-3')) {
                slideNumber = 3;
              } else if (attrName.includes('- 4') || attrSlug.includes('-4')) {
                slideNumber = 4;
              } else if (attrName.includes('основная') || attrSlug.includes('osnovnaya')) {
                slideNumber = 1;
              }
              
              if (!slidesMap.has(slideNumber)) {
                slidesMap.set(slideNumber, {});
              }
              
              const slide = slidesMap.get(slideNumber)!;
              
              // Большая картинка (flower - справа)
              if ((attrName.includes('Большая картинка') || attrSlug.includes('bolshaya-kartinka')) &&
                  attr.fileValue?.url) {
                slide.largeImage = attr.fileValue.url;
              }
              
              // Маленькая картинка (flowerSmall - слева)
              if ((attrName.includes('Маленькая картинка') || attrSlug.includes('malenkaya-kartinka')) &&
                  attr.fileValue?.url) {
                slide.smallImage = attr.fileValue.url;
              }
            });
          }

          // Формируем массив слайдов в правильном порядке
          const slidesData: SlideData[] = [];
          for (let i = 1; i <= 10; i++) {
            const slide = slidesMap.get(i);
            if (slide && (slide.largeImage || slide.smallImage)) {
              slidesData.push({
                largeImage: slide.largeImage || '',
                smallImage: slide.smallImage || ''
              });
            }
          }
          
          // Если есть слайды, используем их, иначе используем дефолтные картинки
          if (slidesData.length > 0) {
            setSlides(slidesData);
          } else {
            // Если нет данных, создаём один слайд с пустыми картинками (будут использованы дефолтные)
            setSlides([{ largeImage: '', smallImage: '' }]);
          }
        } else {
          // Если страница не найдена, создаём один слайд с пустыми картинками
          setSlides([{ largeImage: '', smallImage: '' }]);
        }
      } catch (err: any) {
        console.error('Error fetching slider:', err);
        // При ошибке создаём один слайд с пустыми картинками
        setSlides([{ largeImage: '', smallImage: '' }]);
      } finally {
        setLoading(false);
      }
    };

    fetchSlider();
  }, []);


  const settings = useMemo(() => ({
    dots: false,
    infinite: slides.length > 1, // infinite работает только если больше 1 слайда
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: slides.length > 1, // autoplay работает только если больше 1 слайда
    autoplaySpeed: 3000,
    arrows: false,
    fade: true,
    cssEase: 'linear',
    touchMove: true,
    swipe: true,
    draggable: true,
    touchThreshold: 5,
    adaptiveHeight: true,
    pauseOnHover: false,
    pauseOnFocus: false
  }), [slides.length]);

  if (loading) {
    return <SpinnerLoader />;
  }

  return (
    <section 
      className={styles.heroSlider}
      style={{ position: 'relative', zIndex: 10 }}
    >
      <Slider {...settings} className={styles.slider}>
        {slides.map((slide, index) => {
          // Используем картинки из админки или дефолтные
          const largeImage = slide.largeImage || flower;
          const smallImage = slide.smallImage || flowerSmall;
          
          return (
            <div key={index} className={styles.slide}>
              <section className={topBlockStyles.topBlockContainer}>
                <article className={topBlockStyles.left}>
                  <div className={topBlockStyles.wrapper}>
                    {isTablet ? <MarqueeText /> : <DesktopTextImages />}

                    <div className={topBlockStyles.content}>
                      <ImageWithFallback src={smallImage} alt='Маленький цветок' />

                      <div className={topBlockStyles.contentText}>
                        <TextWrapper
                          title={isTablet ? mobileTexts.title : desktopTexts.title}
                          items={isTablet ? mobileTexts.items : desktopTexts.items}
                          titleStyle={{
                            textTransform: 'uppercase',
                            fontSize: isMobile ? '14px' : '16px'
                          }}
                          textStyle={{
                            textTransform: 'uppercase',
                            fontSize: isMobile ? '14px' : '16px'
                          }}
                        />
                      </div>

                      <img src={isMobile ? lineToVertical : lineTo} alt='Стрелка' className={topBlockStyles.lineTo} />
                      <img src={info} alt='Информация' className={topBlockStyles.info} />
                    </div>
                  </div>
                </article>

                <article className={topBlockStyles.right}>
                  <ImageWithFallback src={largeImage} alt='Цветок' />
                </article>
              </section>
            </div>
          );
        })}
      </Slider>
    </section>
  );
};
