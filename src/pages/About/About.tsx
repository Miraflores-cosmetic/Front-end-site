import React, { useEffect, useState } from 'react';
import styles from './About.module.scss';
import Header from '@/components/Header/Header';
import logo from '@/assets/icons/Miraflores_logo.svg';
import aboutImg from '@/assets/images/about-img.png';
import flwImg from '@/assets/images/flw.png';

const PARALLAX_RATE = 0.2;

const About: React.FC = () => {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    window.scrollTo(0, 0);
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
              это ботаническая нутри-косметика, созданная не для маскировки, а для активации вашей природной красоты. Внимательно прислушиваясь к коже, свету и ритмам природы, она мягко напоминает женщине: красота уже внутри. Нужно лишь помочь ей проявиться.
            </p>
            <img
              src={flwImg}
              alt=""
              className={styles.flwImgLeft}
              style={{ transform: `rotate(-30deg) translateY(${parallaxDown}px)` }}
            />
          </div>
        </div>
      </main>
    </>
  );
};

export default About;
