import { useState, useEffect, useRef } from 'react';
import styles from './StepsBlock.module.scss';
import shablon1 from '@/assets/images/shablon1.webp';
import shablon2 from '@/assets/images/shablon2.webp';
import shablon3 from '@/assets/images/shablon3.webp';
import shablon4 from '@/assets/images/shablon4.webp';
import etap1 from '@/assets/images/etap1.webp';
import etap2 from '@/assets/images/etap2.webp';
import etap3 from '@/assets/images/etap3.webp';
import etap4 from '@/assets/images/etap4.webp';
import Step from './step/Step';
import { getAllSteps, StepData } from '@/graphql/queries/pages.service';
import { SpinnerLoader } from '@/components/spinner/SpinnerLoader';

// Дефолтные шаги для fallback
const defaultSteps = [
  {
    id: 1,
    title: 'Очищение',
    description:
      'Самое важное выбирать хороший составы для очищения. Наши продукты мягко удаляют загрязнения, не вызывая чувства стянутости.',
    image: shablon1,
    hoverImage: etap1
  },
  {
    id: 2,
    title: 'Энзимный мусс для умывания',
    description: 'Энзимы риса + фруктовые энзимы и фруктовые кислоты',
    image: shablon2,
    hoverImage: etap2
  },
  {
    id: 3,
    title: 'Цветочный мист',
    description: 'Мист для мягкой и сияющей кожи с экстрактом розы',
    image: shablon3,
    hoverImage: etap3
  },
  {
    id: 4,
    title: 'Цветочный мист',
    description: 'Мист для мягкой и сияющей кожи с экстрактом розы',
    image: shablon4,
    hoverImage: etap4
  }
];

export default function StepsBlock() {
  const [activeIndex, setActiveIndex] = useState<number | null>(0); // Первый шаг активен по умолчанию на десктопе
  const [steps, setSteps] = useState<StepData[]>(defaultSteps);
  const [loading, setLoading] = useState(true);
  const [isSectionLoaded, setIsSectionLoaded] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const fetchSteps = async () => {
      try {
        setLoading(true);
        console.log('[StepsBlock] Fetching steps...');
        const stepsData = await getAllSteps();
        console.log('[StepsBlock] Received steps data:', stepsData);
        console.log('[StepsBlock] Steps count:', stepsData?.length || 0);
        
        if (stepsData && stepsData.length > 0) {
          // Преобразуем данные из API в формат компонента
          // Используем ТОЛЬКО данные из API, без fallback на моки
          const formattedSteps = stepsData.map((step) => {
            const formatted = {
              id: step.id,
              title: step.title,
              description: step.description,
              image: step.image || '', // Без fallback на моки
              hoverImage: step.hoverImage || undefined // Без fallback на моки
            };
            console.log(`[StepsBlock] Step ${formatted.id}:`, {
              title: formatted.title,
              hasImage: !!step.image,
              image: step.image,
              hasHoverImage: !!step.hoverImage,
              hoverImage: step.hoverImage
            });
            return formatted;
          });
          console.log('[StepsBlock] Setting formatted steps:', formattedSteps);
          setSteps(formattedSteps);
        } else {
          console.warn('[StepsBlock] No steps data received, using default steps');
          // Если данных нет, используем дефолтные
          setSteps(defaultSteps);
        }
      } catch (err) {
        console.error('[StepsBlock] Error fetching steps:', err);
        // При ошибке используем дефолтные шаги
        setSteps(defaultSteps);
      } finally {
        setLoading(false);
      }
    };

    fetchSteps();
  }, []);

  // Intersection Observer для запуска анимации при скролле к секции
  useEffect(() => {
    // Ждем пока загрузка завершится и DOM готов
    if (loading || isSectionLoaded) return;

    // Небольшая задержка для обеспечения готовности DOM
    const setupObserver = () => {
      if (!sectionRef.current || isSectionLoaded) return;

      // Проверяем, видна ли секция сразу при загрузке
      const checkVisibility = () => {
        if (sectionRef.current) {
          const rect = sectionRef.current.getBoundingClientRect();
          const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
          return isVisible;
        }
        return false;
      };

      // Проверяем сразу
      if (checkVisibility()) {
        setIsSectionLoaded(true);
        return;
      }

      // Небольшая задержка для повторной проверки (на случай если DOM еще не готов)
      const timer = setTimeout(() => {
        if (checkVisibility()) {
          setIsSectionLoaded(true);
          return;
        }
      }, 100);

      // Создаем Intersection Observer
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            // Если секция видна в viewport, запускаем анимацию
            if (entry.isIntersecting && !isSectionLoaded) {
              setIsSectionLoaded(true);
            }
          });
        },
        {
          // Запускаем анимацию когда секция видна на 20%
          threshold: 0.2,
          // Небольшой отступ сверху для более раннего запуска
          rootMargin: '0px 0px -100px 0px'
        }
      );

      if (sectionRef.current) {
        observer.observe(sectionRef.current);
      }

      return () => {
        clearTimeout(timer);
        if (sectionRef.current) {
          observer.unobserve(sectionRef.current);
        }
      };
    };

    // Небольшая задержка для обеспечения готовности DOM после загрузки
    const timer = setTimeout(setupObserver, 50);

    return () => {
      clearTimeout(timer);
    };
  }, [loading, isSectionLoaded]);

  if (loading) {
    return <SpinnerLoader />;
  }

  return (
    <section 
      ref={sectionRef}
      className={`${styles.stepsContainer} ${isSectionLoaded ? styles.sectionAnimated : ''}`} 
      id="steps-block"
    >
      <div className={styles.headerWrrapper}>
        <p className={styles.title}>каждый шаг усиливает предыдущий</p>
        <div className={styles.descriptionWrapper}>
          <p className={styles.desc}>
            Знали ли вы, что даже самое эффективное средство не сработает, если кожа неправильно очищена.
            Агрессивное умывание всего за минуту может нарушить защитный барьер и сделать кожу уязвимой
          </p>
        </div>
      </div>
      <div 
        className={styles.stepsWrapper}
        onMouseLeave={() => setActiveIndex(0)}
      >
        {steps.map((product, index) => (
          <div
            key={product.id || index}
            className={`${styles.stepWrapper} ${
              activeIndex === index ? styles.active : activeIndex !== null ? styles.inactive : ''
            }`}
            onMouseEnter={() => setActiveIndex(index)}
            onTouchStart={() => {
              if (activeIndex === index) {
                setActiveIndex(null);
              } else {
                setActiveIndex(index);
              }
            }}
          >
            <Step
              etap={index + 1}
              image={product.image}
              hoverImage={product.hoverImage}
              title={product.title}
              description={product.description}
              isActive={activeIndex === index}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
