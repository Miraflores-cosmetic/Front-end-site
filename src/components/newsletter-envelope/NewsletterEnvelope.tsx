import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { HomeSection } from '@/components/home-section/HomeSection';
import { useToast } from '@/components/toast/toast';
import { MetrikaGoal, reachGoal } from '@/lib/metrika';
import styles from './NewsletterEnvelope.module.scss';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Phase = 'closed' | 'peek' | 'open';

/**
 * CSS-конверт: shell обрезает вкладыш (не рвёт низ/края),
 * клапан снаружи shell — может откидываться вверх.
 */
export function NewsletterEnvelope() {
  const toast = useToast();
  const titleId = useId();
  const emailId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  const [phase, setPhase] = useState<Phase>('closed');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduceMotion(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (reduceMotion) setPhase('open');
  }, [reduceMotion]);

  useEffect(() => {
    if (phase !== 'open') return;
    const t = window.setTimeout(() => emailRef.current?.focus(), 420);
    return () => window.clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'open') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPhase('closed');
    };
    const onPointer = (e: MouseEvent) => {
      const el = rootRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) setPhase('closed');
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onPointer);
    };
  }, [phase]);

  const open = useCallback(() => setPhase('open'), []);

  const onHoverEnter = useCallback(() => {
    if (reduceMotion) return;
    setPhase((p) => (p === 'open' ? 'open' : 'peek'));
  }, [reduceMotion]);

  const onHoverLeave = useCallback(() => {
    if (reduceMotion) return;
    setPhase((p) => (p === 'open' ? 'open' : 'closed'));
  }, [reduceMotion]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    if (!EMAIL_RE.test(value)) {
      toast.error('Укажите корректный email');
      return;
    }
    setSubmitting(true);
    try {
      await new Promise((r) => window.setTimeout(r, 350));
      reachGoal(MetrikaGoal.newsletterSubscribe, { emailDomain: value.split('@')[1] });
      toast.success('Спасибо! Мы сохраним адрес, когда подключим рассылку.');
      setEmail('');
      setPhase('closed');
    } finally {
      setSubmitting(false);
    }
  }

  const openness: Phase = reduceMotion ? 'open' : phase;

  return (
    <HomeSection id="newsletter" anchor className={styles.section} aria-labelledby={titleId}>
      <h2 id={titleId} className={styles.title}>
        Письма от Miraflores
      </h2>
      <p className={styles.lead}>
        Наведите — клапан приоткроется. Нажмите — письмо выедет из конверта.
      </p>

      <div
        ref={rootRef}
        className={[
          styles.stage,
          openness === 'peek' ? styles.stagePeek : '',
          openness === 'open' ? styles.stageOpen : '',
        ]
          .filter(Boolean)
          .join(' ')}
        onMouseEnter={onHoverEnter}
        onMouseLeave={onHoverLeave}
      >
        <button
          type="button"
          className={styles.hit}
          aria-expanded={openness === 'open'}
          aria-controls={emailId}
          onClick={open}
        >
          <span className={styles.srOnly}>
            {openness === 'open' ? 'Форма подписки открыта' : 'Открыть конверт и подписаться'}
          </span>
        </button>

        <div className={styles.envelope}>
          {/* Корпус: clip — вкладыш не вылезает снизу/с боков */}
          <div className={styles.shell}>
            <div className={styles.back}>
              <div
                className={[
                  styles.interior,
                  openness !== 'closed' ? styles.interiorVisible : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              />
              {/* мягкие сгибы по бокам */}
              <span className={styles.foldLeft} />
              <span className={styles.foldRight} />
            </div>

            <div className={styles.letterSlot} aria-hidden={openness !== 'open'}>
              <div className={styles.letter}>
                <p className={styles.badge}>Ваш подарок почти здесь</p>
                <p className={styles.letterTitle}>Подпишитесь на новости</p>
                <p className={styles.letterSub}>
                  Анонсы ухода, акции и советы — без спама.
                </p>
                <form className={styles.form} onSubmit={(e) => void onSubmit(e)}>
                  <label className={styles.srOnly} htmlFor={emailId}>
                    Email
                  </label>
                  <div className={styles.inputRow}>
                    <input
                      ref={emailRef}
                      id={emailId}
                      type="email"
                      name="email"
                      autoComplete="email"
                      inputMode="email"
                      placeholder="Ваш email"
                      value={email}
                      disabled={submitting || openness !== 'open'}
                      onChange={(e) => setEmail(e.target.value)}
                      className={styles.input}
                    />
                    <button
                      type="submit"
                      className={styles.submit}
                      disabled={submitting || openness !== 'open'}
                    >
                      {submitting ? '…' : 'Подписаться'}
                    </button>
                  </div>
                </form>
                <p className={styles.micro}>Согласие на маркетинговые письма.</p>
              </div>
            </div>

            <div className={styles.pocket} />
          </div>

          {/* Клапан снаружи shell — rotateX вверх не режется */}
          <div className={styles.flapPivot}>
            <div
              className={[
                styles.flap,
                openness === 'peek' ? styles.flapPeek : '',
                openness === 'open' ? styles.flapOpen : '',
              ]
                .filter(Boolean)
                .join(' ')}
            />
          </div>
        </div>
      </div>
    </HomeSection>
  );
}

export default NewsletterEnvelope;
