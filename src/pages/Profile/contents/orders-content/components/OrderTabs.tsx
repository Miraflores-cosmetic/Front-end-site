import type { OrderFilterTab } from '@/lib/orderStatusLabels';
import styles from '../OrdersContent.module.scss';

const TABS: { id: OrderFilterTab; label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: 'process', label: 'В обработке' },
  { id: 'delivered', label: 'Доставлен' },
  { id: 'cancelled', label: 'Отменённые' },
  { id: 'refunded', label: 'Возвраты' },
];

type OrderTabsProps = {
  activeTab: OrderFilterTab;
  counts: Record<OrderFilterTab, number>;
  onChange: (tab: OrderFilterTab) => void;
};

export function OrderTabs({ activeTab, counts, onChange }: OrderTabsProps) {
  return (
    <ul className={styles.statusTabs} role="tablist" aria-label="Статусы заказов">
      {TABS.map(({ id, label }) => (
        <li key={id} role="presentation">
          <button
            type="button"
            role="tab"
            id={`orders-tab-${id}`}
            aria-selected={activeTab === id}
            className={`${styles.statusTab} ${activeTab === id ? styles.statusTabActive : ''}`}
            onClick={() => onChange(id)}
          >
            {label}
            <span className={styles.tabCount}>{counts[id]}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
