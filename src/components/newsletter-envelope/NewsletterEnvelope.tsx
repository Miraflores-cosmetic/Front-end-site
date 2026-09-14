import React, { useId, useState } from 'react';
import { HomeSection } from '@/components/home-section/HomeSection';
import { useToast } from '@/components/toast/toast';
import { subscribeNewsletter } from '@/api/newsletterApi';
import { MetrikaGoal, reachGoal } from '@/lib/metrika';
import styles from './NewsletterEnvelope.module.scss';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Конверт: клапан сзади → письмо → передний V-карман.
 * @param source — метка источника подписки (homepage | article | …)
 */
export function NewsletterEnvelope({ source = 'homepage' }: { source?: string }) {
  const toast = useToast();
  const titleId = useId();
  const emailId = useId();
  const nameId = useId();

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    if (!EMAIL_RE.test(value)) {
      toast.error('Укажите корректный email');
      return;
    }
    setSubmitting(true);
    try {
      await subscribeNewsletter({
        email: value,
        name: name.trim() || undefined,
        source,
      });
      reachGoal(MetrikaGoal.newsletterSubscribe, {
        emailDomain: value.split('@')[1],
        hasName: Boolean(name.trim()),
        source,
      });
      toast.success('Спасибо! Вы подписались на рассылку.');
      setEmail('');
      setName('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Не удалось подписаться');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <HomeSection id="newsletter" anchor className={styles.section} aria-labelledby={titleId}>
      <h2 id={titleId} className={styles.title}>
        Кто хочет знать больше
      </h2>
      <p className={styles.subtitle}>для тех, кому важно понимать</p>

      <div className={styles.copy}>
        <ul className={styles.bullets}>
          <li>
            Ежемесячный дайджест про составы косметики, почему и как работают активы на
            простом языке
          </li>
          <li>
            Разбираем все модные тенденции: PDRN / стволовые клетки / экзосомы / ниацинамид
          </li>
        </ul>
        <p className={styles.cta}>
          Подписывайтесь и научитесь понимать косметику и что вам действительно продают
        </p>
      </div>

      <div className={styles.envelope} role="group" aria-label="Подписка на рассылку">
        {/* Одна задняя стенка: корпус + открытый клапан */}
        <div className={styles.backWall} aria-hidden />

        {/* Письмо / форма */}
        <form className={styles.letter} onSubmit={(e) => void onSubmit(e)}>
          <label className={styles.srOnly} htmlFor={emailId}>
            Email
          </label>
          <input
            id={emailId}
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            placeholder="Email"
            value={email}
            disabled={submitting}
            onChange={(e) => setEmail(e.target.value)}
            className={styles.input}
            required
          />

          <label className={styles.srOnly} htmlFor={nameId}>
            ФИО (необязательно)
          </label>
          <input
            id={nameId}
            type="text"
            name="name"
            autoComplete="name"
            placeholder="ФИО (необязательно)"
            value={name}
            disabled={submitting}
            onChange={(e) => setName(e.target.value)}
            className={styles.input}
          />

          <button type="submit" className={styles.submit} disabled={submitting}>
            {submitting ? '…' : 'Подписаться'}
          </button>

          <p className={styles.micro}>Согласие на маркетинговые письма.</p>
        </form>

        {/* Передние слои кармана: боковые створки + нижний клапан поверх */}
        <div className={styles.sideLeft} aria-hidden />
        <div className={styles.sideRight} aria-hidden />
        <div className={styles.bottomFlap} aria-hidden />
      </div>
    </HomeSection>
  );
}

export default NewsletterEnvelope;
