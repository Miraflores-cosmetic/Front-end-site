import React from 'react';
import styles from './TopBlock.module.scss';

import flower from '@/assets/images/flower.webp';
import flowerSmall from '@/assets/images/flowerSmall.webp';
import lineTo from '@/assets/icons/lineTo.svg';
import lineToVertical from '@/assets/icons/lineToVertival.svg';
import info from '@/assets/icons/info.svg';

import { useScreenMatch } from '@/hooks/useScreenMatch';
import DesktopTextImages from './DesktopTextImages';
import TextWrapper from './TextWrapper';
import MarqueeText from './MarqeenText';

const TopBlock: React.FC = () => {
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

  return (
    <section className={styles.topBlockContainer}>
      <article className={styles.left}>
        <div className={styles.wrapper}>
          {isTablet ? <MarqueeText /> : <DesktopTextImages />}

          <div className={styles.content}>
            <img src={flowerSmall} alt='Маленький цветок' />

            <div className={styles.contentText}>
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

            <img src={isMobile ? lineToVertical : lineTo} alt='Стрелка' className={styles.lineTo} />
            <img src={info} alt='Информация' className={styles.info} />
          </div>
        </div>
      </article>

      <article className={styles.right}>
        <img src={flower} alt='Цветок' />
      </article>
    </section>
  );
};

export default TopBlock;
