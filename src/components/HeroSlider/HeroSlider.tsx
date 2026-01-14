import React from 'react';
import Slider from 'react-slick';
import styles from './HeroSlider.module.scss';
import { MediaItem } from '@/graphql/types/products.types';

interface HeroSliderProps {
  media: MediaItem[];
}

const HeroSlider: React.FC<HeroSliderProps> = ({ media }) => {
  const settings = {
    dots: true,
    arrows: false,
    infinite: false,
    speed: 700,
    slidesToShow: 1,
    slidesToScroll: 1,
    fade: true,
    adaptiveHeight: true
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
