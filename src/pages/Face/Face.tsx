import React, { useState } from 'react';
import styles from './Face.module.scss';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import footerImage from '@/assets/images/footerImage.webp';
import TabBar from '@/components/tab-bar/TabBar';
import { motion, AnimatePresence } from 'framer-motion';

import krem from '@/assets/images/Cream.png';
import kosmetika from '@/assets/images/kosmetika.webp';

import girlwithsmile from '@/assets/images/girlsmile.webp';
import etap1 from '@/assets/images/etap1.webp';
import etap2 from '@/assets/images/etap2.webp';
import etap3 from '@/assets/images/etap3.webp';
import etap4 from '@/assets/images/etap4.webp';
import { FaceCard } from './face-card/FaceCard';
import Slider from 'react-slick';
import { useScreenMatch } from '@/hooks/useScreenMatch';

const FacePage: React.FC = () => {
  const isMobile = useScreenMatch(756);
  const [activeTab, setActiveTab] = useState('КРЕМ');

  const products = [
    {
      id: 1,
      title: 'Энзимный мусс для умывания',
      description: 'Энзимы риса + фруктовые энзимы и фруктовые кислоты',
      price: 3590,
      oldPrice: 4600,
      discount: 22,
      image: krem,
      hoverImage: girlwithsmile,
      type: 'sun',
      category: 'КРЕМ'
    },
    {
      id: 2,
      title: 'Энзимный мусс для умывания',
      description: 'Энзимы риса + фруктовые энзимы и фруктовые кислоты',
      price: 3590,
      oldPrice: 4600,
      discount: 22,
      image: kosmetika,
      hoverImage: girlwithsmile,
      type: 'moon',
      category: 'МАСЛО'
    },
    {
      id: 3,
      title: 'Цветочный мист',
      description: 'Мист для мягкой и сияющей кожи с экстрактом розы',
      price: 3590,
      oldPrice: 4600,
      discount: 23,
      image: krem,
      hoverImage: girlwithsmile,
      type: 'sun',
      category: 'ТОНИК-ЭССЕНЦИЯ'
    },
    {
      id: 4,
      title: 'Цветочный мист',
      description: 'Мист для мягкой и сияющей кожи с экстрактом розы',
      price: 3590,
      label: 'Новинка',
      image: kosmetika,
      hoverImage: girlwithsmile,
      type: 'moon',
      category: 'ТОНИК-ЭССЕНЦИЯ'
    },
    {
      id: 5,
      title: 'Цветочный мист',
      description: 'Мист для мягкой и сияющей кожи с экстрактом розы',
      price: 3590,
      label: 'Новинка',
      image: krem,
      hoverImage: girlwithsmile,
      type: 'sun',
      category: 'Крем'
    },
    {
      id: 6,
      title: 'Цветочный мист',
      description: 'Мист для мягкой и сияющей кожи с экстрактом розы',
      price: 3590,
      label: 'Новинка',
      image: krem,
      hoverImage: girlwithsmile,
      type: 'sun',
      category: 'Крем'
    }
  ];

  const images = [
    {
      id: 1,
      title: 'Волосы',
      image: etap1
    },
    {
      id: 2,
      title: 'Лицо',
      image: etap2
    },
    {
      id: 3,
      title: 'Лицо',
      image: etap3,
      discount: '10%'
    },
    {
      id: 4,
      title: 'Лицо',
      image: etap4,
      discount: '10%'
    },
    {
      id: 5,
      title: 'Лицо',
      image: krem,
      discount: '10%'
    },
    {
      id: 6,
      title: 'Лицо',
      image: krem
    }
  ];

  const settings = {
    dots: false,
    arrows: true,
    infinite: false,
    speed: 500,
    slidesToShow: 3.5,
    slidesToScroll: 1
  };
  const filtered = products.filter(p => p.category === activeTab);

  return (
    <article className={styles.faceContainer}>
      <Header />
      <p className={styles.title}>Лицо</p>
      <TabBar
        tabs={['КРЕМ', 'МАСЛО', 'ТОНИК-ЭССЕНЦИЯ']}
        active={activeTab}
        onChange={setActiveTab}
      />
      {/*<section className={styles.wrapper}>*/}
      {/*  {products.map(product => (*/}
      {/*    <FaceCard key={product.id} product={product} />*/}
      {/*  ))}*/}
      {/*</section>*/}
      <section className={styles.wrapper}>
        <AnimatePresence mode='wait'>
          {filtered.map(product => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -30, scale: 0.9 }}
              transition={{ duration: 0.4 }}
            >
              <FaceCard product={product} />
            </motion.div>
          ))}
        </AnimatePresence>
      </section>
      {!isMobile && (
        <section className={styles.categoryWrapper}>
          <p className={styles.title}>КАТЕГОРИИ</p>
          <article>
            <Slider {...settings} className={styles.imageSlider}>
              {images.map(product => (
                <article className={styles.imagesWrapper}>
                  <img src={product.image} className={styles.slideImage} />
                  <div className={styles.discountWrapper}>
                    <p className={styles.name}>{product.title}</p>
                    {product.discount && <p className={styles.discount}>{product.discount}</p>}
                  </div>
                </article>
              ))}
            </Slider>
          </article>
        </section>
      )}
      <Footer footerImage={footerImage} />
    </article>
  );
};

export default FacePage;
