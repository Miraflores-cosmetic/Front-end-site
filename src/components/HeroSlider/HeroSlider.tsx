import React from 'react';
import Slider from 'react-slick';
import styles from './HeroSlider.module.scss';
import { MediaItem } from '@/graphql/types/products.types';
import { useScreenMatch } from '@/hooks/useScreenMatch';

interface HeroSliderProps {
  media: MediaItem[];
}

const HeroSlider: React.FC<HeroSliderProps> = ({ media }) => {
  const isMobile = useScreenMatch();
  const settings = {
    dots: true,
    arrows: !isMobile,
    infinite: false,
    speed: 700,
    slidesToShow: 1,
    slidesToScroll: 1,
    // На мобилке fade мешает ощущению "перетаскивания"
    fade: !isMobile,
    adaptiveHeight: false,
    swipe: true,
    touchMove: true,
    draggable: true,
  };

  return (
    <div className={styles.heroSlider}>
      <Slider {...settings}>
        {media.map((src, index) => (
          <div key={index} className={styles.slide}>
            <img src={src.url} alt={src.alt} />
          </div>
        ))}
      </Slider>
    </div>
  );
};

export default HeroSlider;
