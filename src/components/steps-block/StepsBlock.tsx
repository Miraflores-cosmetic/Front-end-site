import { useState, useEffect } from 'react';
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
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [steps, setSteps] = useState<StepData[]>(defaultSteps);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return <SpinnerLoader />;
  }

  return (
    <section className={styles.stepsContainer} id="steps-block">
      <div className={styles.headerWrrapper}>
        <p className={styles.title}>каждый шаг усиливает предыдущий</p>
        <div className={styles.descriptionWrapper}>
          <p className={styles.desc}>
            Знали ли вы, что даже самое эффективное средство не сработает, если кожа неправильно очищена.
            Агрессивное умывание всего за минуту может нарушить защитный барьер и сделать кожу уязвимой
          </p>
        </div>
      </div>
      <div className={styles.stepsWrapper}>
        {steps.map((product, index) => (
          <div
            key={product.id || index}
            className={`${styles.stepWrapper} ${
              activeIndex === index ? styles.active : activeIndex !== null ? styles.inactive : ''
            }`}
            onMouseEnter={() => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(null)}
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
