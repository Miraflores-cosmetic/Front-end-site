import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import styles from './ReferralContent.module.scss';
import { useToast } from '@/components/toast/toast';
import { Button } from '@/components/button/Button';
import { useScreenMatch } from '@/hooks/useScreenMatch';
import { TabId } from '@/pages/Profile/side-bar/SideBar';
import {
  ProfileLoadingState,
  ProfileSection,
} from '@/pages/Profile/components/ProfileSection';
import {
  ensureReferralCode,
  fetchReferralDashboard,
  fetchReferralLedger,
  quarantineHint,
  type ReferralDashboard,
  type ReferralLedgerFilter,
  type ReferralLedgerItem,
  type ReferralLedgerKind,
  type ReferralLedgerStatus,
} from '@/api/referralApi';
import {
  buildReferralShareUrl,
  fillReferralShareText,
} from '@/utils/referralShare';
import { setMfRefTtlDays } from '@/lib/mirafloresReferral';
import type { RootState } from '@/store/store';

/** Cap % из ReferralSettings (админка) — dashboard, иначе /me. */
function clampSpendCapPercent(raw: unknown): number {
  return Math.min(100, Math.max(0, Math.floor(Number(raw) || 0)));
}

type HistoryFilter = ReferralLedgerFilter;
type CopyAction = 'short' | 'utm' | 'share';

function formatRub(n: number): string {
  return `${Math.abs(n).toLocaleString('ru-RU')} ₽`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function kindLabel(kind: ReferralLedgerKind): string {
  switch (kind) {
    case 'EARN':
      return 'Начисление';
    case 'INVITEE_BONUS':
      return 'Бонус за заказ по ссылке';
    case 'SPEND_HOLD':
      return 'Списание';
    case 'SPEND_RELEASE':
      return 'Возврат списания';
    case 'CLAWBACK':
      return 'Списание начисления';
    case 'ADJUST':
      return 'Корректировка';
    case 'SPEND_CAPTURE':
      return 'Списание';
    default:
      return kind;
  }
}

/** Ссылка в «Мои заказы» только на свой spend; EARN/INVITEE/CLAWBACK — заказ друга → 404. */
function historyOrderLinkable(kind: ReferralLedgerKind): boolean {
  return kind === 'SPEND_HOLD' || kind === 'SPEND_RELEASE' || kind === 'SPEND_CAPTURE';
}

function statusChip(status: ReferralLedgerStatus): { label: string; className: string } | null {
  if (status === 'PENDING') return { label: 'Ожидает', className: styles.chipPending };
  if (status === 'VOIDED') return { label: 'Отменено', className: styles.chipVoided };
  return null;
}

interface ReferralContentProps {
  setOpenAccordion?: React.Dispatch<React.SetStateAction<TabId | null>>;
}

const ReferralContent: React.FC<ReferralContentProps> = ({ setOpenAccordion }) => {
  const toast = useToast();
  const isMobile = useScreenMatch();
  const cartCount = useSelector((state: RootState) =>
    state.checkout.lines.reduce((sum, line) => sum + (line.quantity ?? 0), 0),
  );
  const meSpendCapPercent = useSelector((state: RootState) =>
    clampSpendCapPercent(state.authSlice.me?.referralSpendCapPercent),
  );
  const [dash, setDash] = useState<ReferralDashboard | null>(null);
  const [items, setItems] = useState<ReferralLedgerItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ensuring, setEnsuring] = useState(false);
  const [copyBusy, setCopyBusy] = useState<CopyAction | null>(null);
  const [copyDone, setCopyDone] = useState<CopyAction | null>(null);
  const [liveMsg, setLiveMsg] = useState('');
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('all');
  const [canNativeShare, setCanNativeShare] = useState(false);
  const copyDoneTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const origin =
    typeof window !== 'undefined' ? window.location.origin : 'https://miraflores-shop.com';

  /** Абсолютный short URL без UTM: origin/?mf=CODE */
  const shortLink = useMemo(() => {
    if (!dash?.linkPath) return '';
    const path = dash.linkPath.startsWith('/') ? dash.linkPath : `/${dash.linkPath}`;
    return `${origin.replace(/\/+$/, '')}${path}`;
  }, [dash?.linkPath, origin]);

  const fullShareLink = useMemo(() => {
    if (!dash?.linkPath) return '';
    return buildReferralShareUrl({
      origin,
      linkPath: dash.linkPath,
      medium: 'copy',
    });
  }, [dash?.linkPath, origin]);

  const shareText = useMemo(() => {
    if (!dash?.code || !fullShareLink) return '';
    return fillReferralShareText(dash.shareTextTemplate, {
      code: dash.code,
      link: fullShareLink,
    });
  }, [dash, fullShareLink]);

  const load = useCallback(async (filter: HistoryFilter = 'all') => {
    setLoading(true);
    setError(null);
    setItems([]);
    setNextCursor(null);
    try {
      const [d, ledger] = await Promise.all([
        fetchReferralDashboard(),
        fetchReferralLedger({ limit: 20, filter }),
      ]);
      setDash(d);
      if (d.linkTtlDays != null) setMfRefTtlDays(d.linkTtlDays);
      setItems(ledger.items);
      setNextCursor(ledger.nextCursor);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(historyFilter);
  }, [load, historyFilter]);

  useEffect(() => {
    setCanNativeShare(
      typeof navigator !== 'undefined' && typeof navigator.share === 'function',
    );
  }, []);

  useEffect(() => {
    return () => {
      if (copyDoneTimer.current) clearTimeout(copyDoneTimer.current);
    };
  }, []);

  const announce = (msg: string) => {
    setLiveMsg('');
    requestAnimationFrame(() => setLiveMsg(msg));
  };

  const copyText = async (text: string, action: CopyAction, okMsg: string) => {
    if (copyBusy) return;
    setCopyBusy(action);
    try {
      await navigator.clipboard.writeText(text);
      toast.success(okMsg);
      announce(okMsg);
      setCopyDone(action);
      if (copyDoneTimer.current) clearTimeout(copyDoneTimer.current);
      copyDoneTimer.current = setTimeout(() => setCopyDone(null), 1600);
    } catch {
      toast.error('Не удалось скопировать');
      announce('Не удалось скопировать');
    } finally {
      setCopyBusy(null);
    }
  };

  const handleEnsure = async () => {
    if (ensuring) return;
    setEnsuring(true);
    try {
      await ensureReferralCode();
      await load(historyFilter);
      toast.success('Ссылка готова');
      announce('Ссылка готова');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setEnsuring(false);
    }
  };

  const handleLoadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const ledger = await fetchReferralLedger({
        limit: 20,
        cursor: nextCursor,
        filter: historyFilter,
      });
      setItems((prev) => [...prev, ...ledger.items]);
      setNextCursor(ledger.nextCursor);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoadingMore(false);
    }
  };

  const openTelegramShare = () => {
    if (!dash?.linkPath || !dash.code) return;
    const link = buildReferralShareUrl({
      origin,
      linkPath: dash.linkPath,
      medium: 'telegram',
    });
    const text = fillReferralShareText(dash.shareTextTemplate, {
      code: dash.code,
      link,
      omitLink: true,
    });
    const url = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleNativeShare = async () => {
    if (!fullShareLink || typeof navigator.share !== 'function') return;
    try {
      await navigator.share({
        title: 'Miraflores',
        text: shareText || undefined,
        url: fullShareLink,
      });
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return;
      toast.error('Не удалось поделиться');
    }
  };

  const copyLabel = (action: CopyAction, idle: string) => {
    if (copyBusy === action) return 'Копирование…';
    if (copyDone === action) return 'Скопировано';
    return idle;
  };

  const sectionProps = {
    title: 'Реферальная программа',
    isMobile,
    onClose: setOpenAccordion ? () => setOpenAccordion(null) : undefined,
    className: styles.referralContent,
  };

  if (loading && !dash) {
    return (
      <ProfileSection {...sectionProps}>
        <ProfileLoadingState message="Загрузка реферальной программы…" />
      </ProfileSection>
    );
  }

  if (error && !dash) {
    return (
      <ProfileSection {...sectionProps}>
        <p className={styles.error}>{error}</p>
        <div className={styles.retryRow}>
          <div className={styles.primaryAction}>
            <Button text="Повторить" onClick={() => void load(historyFilter)} />
          </div>
        </div>
      </ProfileSection>
    );
  }

  const available = dash?.available ?? 0;
  const pending = dash?.pending ?? 0;
  const enabled = dash?.enabled === true;
  const spendCapPercent =
    clampSpendCapPercent(dash?.spendCapPercent) || meSpendCapPercent;
  const historyEmpty = !loading && items.length === 0 && historyFilter === 'all';
  const filterEmpty = !loading && items.length === 0 && historyFilter !== 'all';
  const linkReady = Boolean(dash?.linkPath && dash.codeActive);
  /** Chips после первой загрузки с историей или при активном фильтре. */
  const showFilters =
    Boolean(dash) && (historyFilter !== 'all' || items.length > 0 || Boolean(nextCursor));

  return (
    <ProfileSection {...sectionProps}>
      <p className={styles.srLive} role="status" aria-live="polite" aria-atomic="true">
        {liveMsg}
      </p>

      {!enabled ? (
        <p className={styles.banner} role="status">
          Новые начисления временно не создаются. Уже накопленный баланс можно
          списать при оформлении заказа; история сохраняется.
        </p>
      ) : null}

      <p className={styles.lead}>
        Делитесь ссылкой — вам начисляется{' '}
        <strong>{dash?.earnPercent ?? '—'}%</strong> от суммы товаров друга (после скидок).
        Списать бонусы можно при оформлении вместо промокода или сертификата.
      </p>

      <section className={styles.heroBalance} aria-label="Баланс">
        {spendCapPercent > 0 ? (
          <p className={styles.spendCap}>
            <span className={styles.spendCapValue}>
              {spendCapPercent}
              <span className={styles.spendCapUnit}>%</span>
            </span>
            <span className={styles.spendCapText}>
              от суммы заказа можно оплатить бонусами
            </span>
          </p>
        ) : null}

        <dl className={styles.balances}>
          <div className={`${styles.balanceBlock} ${styles.balanceAvailable}`}>
            <dt className={styles.balanceLabel}>Доступно</dt>
            <dd className={styles.balanceValue}>
              <span className={styles.balanceAmount}>
                {available.toLocaleString('ru-RU')}
              </span>
              <span className={styles.balanceCurrency} aria-hidden>
                ₽
              </span>
            </dd>
          </div>
          <div className={`${styles.balanceBlock} ${styles.balancePendingBlock}`}>
            <dt className={styles.balanceLabel}>Ожидает начисления</dt>
            <dd className={`${styles.balanceValue} ${styles.balancePending}`}>
              <span className={styles.balanceAmount}>
                {pending.toLocaleString('ru-RU')}
              </span>
              <span className={styles.balanceCurrency} aria-hidden>
                ₽
              </span>
            </dd>
          </div>
        </dl>

        <p className={styles.capHint}>
          {quarantineHint(dash?.quarantineMode, dash?.quarantineDays)}
        </p>

        {(dash?.friendsInvited ?? 0) > 0 || (dash?.friendsWithEarn ?? 0) > 0 ? (
          <p className={styles.capHint}>
            Друзей по ссылке: {dash?.friendsInvited ?? 0}
            {(dash?.friendsWithEarn ?? 0) > 0
              ? ` · с начислением: ${dash?.friendsWithEarn}`
              : ''}
          </p>
        ) : null}

        {dash?.inviteeBonusEnabled && (dash.inviteeBonusRub ?? 0) > 0 ? (
          <p className={styles.capHint}>
            Друг по вашей ссылке получит бонус {formatRub(dash.inviteeBonusRub ?? 0)} за первый
            подходящий заказ — только если он авторизован.
          </p>
        ) : null}

        {available > 0 ? (
          <div className={styles.spendCta}>
            {cartCount > 0 ? (
              <Link to="/order" className={styles.secondaryBtn}>
                Оформить заказ
              </Link>
            ) : (
              <Link to="/catalog" className={styles.secondaryBtn}>
                В каталог
              </Link>
            )}
          </div>
        ) : null}
      </section>

      <section
        className={`${styles.linkCard} ${historyEmpty ? styles.linkCardAccent : ''}`}
        aria-label="Ссылка"
      >
        <h3 className={styles.cardTitle}>Ваша ссылка</h3>
        {dash?.code && !dash.codeActive ? (
          <p className={styles.cardHint}>
            Ссылка отключена. Начисления по ней не создаются. Обратитесь в поддержку, если
            нужна повторная активация.
          </p>
        ) : linkReady ? (
          <div className={styles.linkRow}>
            <input
              className={styles.linkInput}
              readOnly
              value={shortLink}
              aria-label="Реферальная ссылка"
              onFocus={(e) => e.currentTarget.select()}
            />
            <div className={styles.actions}>
              <div className={styles.primaryAction}>
                <Button
                  text={copyLabel('short', 'Скопировать')}
                  disabled={copyBusy !== null}
                  onClick={() => void copyText(shortLink, 'short', 'Ссылка скопирована')}
                />
              </div>
              <div className={styles.secondaryRow} role="group" aria-label="Дополнительно">
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  disabled={copyBusy !== null}
                  aria-busy={copyBusy === 'utm'}
                  onClick={() =>
                    void copyText(fullShareLink, 'utm', 'Полная ссылка с UTM скопирована')
                  }
                >
                  {copyLabel('utm', 'С UTM')}
                </button>
                {canNativeShare ? (
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    disabled={copyBusy !== null}
                    onClick={() => void handleNativeShare()}
                  >
                    Поделиться
                  </button>
                ) : (
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    disabled={copyBusy !== null}
                    onClick={openTelegramShare}
                  >
                    Telegram
                  </button>
                )}
                {shareText ? (
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    disabled={copyBusy !== null}
                    aria-busy={copyBusy === 'share'}
                    onClick={() =>
                      void copyText(shareText, 'share', 'Текст шаринга скопирован')
                    }
                  >
                    {copyLabel('share', 'Текст шаринга')}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.primaryAction}>
            <Button
              text={ensuring ? 'Получение…' : 'Получить ссылку'}
              disabled={ensuring}
              onClick={() => void handleEnsure()}
            />
          </div>
        )}
      </section>

      <section className={styles.historySection} aria-label="История">
        <div className={styles.historyHead}>
          <h3 className={styles.historyTitle}>История</h3>
          {showFilters ? (
            <div className={styles.filterRow} role="group" aria-label="Фильтр истории">
              <button
                type="button"
                className={`${styles.filterChip} ${historyFilter === 'all' ? styles.filterChipActive : ''}`}
                aria-pressed={historyFilter === 'all'}
                onClick={() => setHistoryFilter('all')}
              >
                Все
              </button>
              <button
                type="button"
                className={`${styles.filterChip} ${historyFilter === 'pending' ? styles.filterChipActive : ''}`}
                aria-pressed={historyFilter === 'pending'}
                onClick={() => setHistoryFilter('pending')}
              >
                Ожидает
              </button>
              <button
                type="button"
                className={`${styles.filterChip} ${historyFilter === 'spend' ? styles.filterChipActive : ''}`}
                aria-pressed={historyFilter === 'spend'}
                onClick={() => setHistoryFilter('spend')}
              >
                Списания
              </button>
            </div>
          ) : null}
        </div>

        {historyEmpty ? (
          <p className={styles.empty}>Поделитесь ссылкой — здесь появятся начисления</p>
        ) : filterEmpty ? (
          <p className={styles.empty}>Нет операций в этом фильтре</p>
        ) : items.length === 0 && loading ? null : (
          <ul className={styles.historyList}>
            {items.map((item) => {
              const positive = item.amount > 0;
              const chip = statusChip(item.status);
              return (
                <li key={item.id} className={styles.historyItem}>
                  <div className={styles.historyMeta}>
                    <p className={styles.historyKind}>
                      {kindLabel(item.kind)}
                      {item.orderNumber && historyOrderLinkable(item.kind) ? (
                        <>
                          {' · '}
                          <Link
                            to={`/profile?tab=orders&order=${encodeURIComponent(item.orderNumber)}`}
                            className={styles.orderLink}
                          >
                            заказ {item.orderNumber}
                          </Link>
                        </>
                      ) : null}
                    </p>
                    <p className={styles.historySub}>{formatDate(item.createdAt)}</p>
                  </div>
                  <div className={styles.historyRight}>
                    {chip ? (
                      <span className={`${styles.statusChip} ${chip.className}`}>
                        {chip.label}
                      </span>
                    ) : null}
                    <p
                      className={`${styles.historyAmount} ${
                        positive ? styles.amountPlus : styles.amountMinus
                      } ${chip ? styles.amountMuted : ''}`}
                    >
                      {positive ? '+' : '−'}
                      {formatRub(item.amount)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {nextCursor ? (
          <button
            type="button"
            className={styles.secondaryBtn}
            disabled={loadingMore}
            onClick={() => void handleLoadMore()}
          >
            {loadingMore ? 'Загрузка…' : 'Показать ещё'}
          </button>
        ) : null}
      </section>
    </ProfileSection>
  );
};

export default ReferralContent;
