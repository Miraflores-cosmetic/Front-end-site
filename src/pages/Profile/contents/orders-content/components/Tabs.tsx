import { TabType } from '@/pages/Profile/types';
import styles from '../OrdersContent.module.scss';

interface TabsProps {
  activeTab: TabType;
  onChange: (tab: TabType) => void;
}

const TABS: { id: TabType; label: string }[] = [
  { id: 'active', label: 'АКТИВНЫЕ ЗАКАЗЫ' },
  { id: 'all', label: 'ВСЕ ЗАКАЗЫ' }
];

export const Tabs: React.FC<TabsProps> = ({ activeTab, onChange }) => (
  <div className={styles.tabs}>
    {TABS.map(({ id, label }) => (
      <button
        key={id}
        className={`${styles.tab} ${activeTab === id ? styles.active : ''}`}
        onClick={() => onChange(id)}
      >
        {label}
      </button>
    ))}
  </div>
);
