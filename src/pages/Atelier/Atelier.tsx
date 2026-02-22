import React from 'react';
import styles from './Atelier.module.scss';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import Bestsellers from '@/components/bestsellers/Bestsellers';
import footerImage from '@/assets/images/footer-img.png';
import tatiyanaImage from '@/assets/images/Tatiyana-miraflores.png';

const COLLECTION_NABORY_ID = 'Q29sbGVjdGlvbjoxMQ==';

const TEXT_CONTENT = `Ателье — необычное название для косметического проекта. Я долго искала, как передать идею крафтовости, ручного труда и индивидуального подхода в мире косметики, и поняла, что не нужно уходить далеко от понятных, тёплых ассоциаций.

Раньше я работала с каждой клиенткой индивидуально, вела личные консультации и подбирала формулы под её уникальные задачи. Но когда очередь на консультации стала исчисляться месяцами, я задумалась: как сделать мой опыт доступным большему числу женщин, сохранив при этом глубину и заботу? Так родилось Ателье — пространство, где я могу делиться своим многолетним опытом и уникальными рецептами сразу с сообществом близких по духу женщин.

Годы работы с клиентами, преподавания в школе кремоваров и создания персональных рецептур помогли мне собрать настоящую библиотеку формул — проверенных временем и практикой. Каждый продукт, который я создаю, — это итог многолетних исследований, экспериментов и глубокой любви к природе.

Моя главная цель — показать, как щедро и бережно природа может заботиться о нас, о нашей коже и волосах.

Да, разработка и выпуск новых продуктов часто занимает месяцы или даже годы: мы строго соблюдаем регуляторные нормы, тестируем формулы, проверяем их безопасность и эффективность. Но благодаря постоянной работе с командой R&D мы продолжаем открывать новые комбинации и создавать формулы, которыми я мечтаю делиться с вами здесь, в Ателье.

А желание объединить женщин, близких по духу, вдохновило меня на новый формат — пространство, где красота становится ритуалом любви к себе.`;

const Atelier: React.FC = () => {
  return (
    <React.Fragment>
      <Header />
      <main className={styles.atelierPage}>
        <div className={styles.titleContainer}>
          <h1 className={styles.title}>Косметическое Ателье</h1>
          <p className={styles.desc}>
            Эксклюзивно. Только для тех, кто готов к новой глубине ухода
          </p>
        </div>
        <div className={styles.imageTextBlock}>
        <div className={styles.imageBlock}>
          <img src={tatiyanaImage} alt="Татьяна Патрацкая" />
          <p className={styles.imageCaption}>
            Татьяна Патрацкая, основатель бренда Miraflores
          </p>
        </div>
        <div className={styles.textBlock}>
          {TEXT_CONTENT.split('\n\n').map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
        </div>
        <div className={styles.aboutAtelier}>
          <div className={styles.titles}>
          <h2 className={styles.titlesHeading}>Что такое косметическое ателье?</h2>
          <p className={styles.titlesIntro}>
            Каждый месяц по предоформлению вы можете приобрести три эксклюзивных косметических средства, разработанных мной лично и адаптированных под задачи сезона и состояния кожи:
          </p>
          </div>
          <div className={styles.cardsRow}>
          <div className={styles.cardWrapper}>
            <div className={styles.card}>
              <div className={styles.cardFront}>
                <span className={styles.cardFrontText}>Для лица</span>
              </div>
              <div className={styles.cardBack}>
                <p className={styles.cardBackText}>
                  Для лица — премиальный меристемный бустер или другое средство, которое поддержит кожу именно сейчас: увлажнение, питание, регенерация, защита
                </p>
              </div>
            </div>
          </div>
          <div className={styles.cardWrapper}>
            <div className={styles.card}>
              <div className={styles.cardFront}>
                <span className={styles.cardFrontText}>Для волос</span>
              </div>
              <div className={styles.cardBack}>
                <p className={styles.cardBackText}>
                  Для волос — маски, пилинги, сыворотки для укрепления и роста или для поддержания блеска и лёгкости.
                </p>
              </div>
            </div>
          </div>
          <div className={styles.cardWrapper}>
            <div className={styles.card}>
              <div className={styles.cardFront}>
                <span className={styles.cardFrontText}>Для тела</span>
              </div>
              <div className={styles.cardBack}>
                <p className={styles.cardBackText}>
                  Для тела — дезодоранты, кремы, зубные пасты и другие формулы для полноценного ухода.
                </p>
              </div>
            </div>
          </div>
        </div>
        </div>
        <Bestsellers
          collectionId={COLLECTION_NABORY_ID}
          collectionTitle="Наборы"
          isAtelierSection
          isTitleHidden
        />
        <Footer footerImage={footerImage} />
      </main>
    </React.Fragment>
  );
};

export default Atelier;
