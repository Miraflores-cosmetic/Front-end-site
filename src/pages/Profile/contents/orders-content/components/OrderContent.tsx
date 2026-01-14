import React, { useState } from 'react';
import styles from './OrdersContent.module.scss';

interface ActiveOrder {
  id: string;
  date: string;
  amount: string;
  status: string;
}

interface AllOrdersStats {
  totalOrders: number;
  totalAmount: string;
}

type TabType = 'active' | 'all';

const TABS: { id: TabType; label: string }[] = [
  { id: 'active', label: 'АКТИВНЫЕ ЗАКАЗЫ' },
  { id: 'all', label: 'ВСЕ ЗАКАЗЫ' }
];

const OrdersContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('active');

  const activeOrder: ActiveOrder = {
    id: '№5698LB',
    date: '08.09.2025',
    amount: '18.100₽',
    status: 'В пути'
  };

  const allOrders: AllOrdersStats = {
    totalOrders: 16,
    totalAmount: '156.590₽'
  };

  return (
    <article className={styles.ordersContent}>
      <header className={styles.ordersTitleWrapper}>
        <p className={styles.ordersTitle}>Ваши заказы</p>
      </header>

      <section className={styles.ordersWrapper}>
        <div className={styles.ordersContainer}>
          <Tabs activeTab={activeTab} onChange={setActiveTab} />

          {activeTab === 'active' ? (
            <ActiveOrders order={activeOrder} />
          ) : (
            <AllOrders stats={allOrders} />
          )}
        </div>
      </section>
    </article>
  );
};

interface TabsProps {
  activeTab: TabType;
  onChange: (tab: TabType) => void;
}

const Tabs: React.FC<TabsProps> = ({ activeTab, onChange }) => (
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

interface ActiveOrdersProps {
  order: ActiveOrder;
}

const ActiveOrders: React.FC<ActiveOrdersProps> = ({ order }) => {
  const fields = [
    { label: 'Номер заказа', value: order.id },
    { label: 'Дата заказа', value: order.date },
    { label: 'Сумма заказа', value: order.amount },
    { label: 'Статус заказа', value: order.status }
  ];

  return (
    <div className={styles.orderRow}>
      {fields.map(({ label, value }) => (
        <OrderItem key={label} label={label} value={value} />
      ))}
    </div>
  );
};

interface AllOrdersProps {
  stats: AllOrdersStats;
}

const AllOrders: React.FC<AllOrdersProps> = ({ stats }) => {
  const fields = [
    { label: 'Всего заказов', value: stats.totalOrders },
    { label: 'Общая сумма заказов', value: stats.totalAmount }
  ];

  return (
    <div className={styles.orderRow}>
      {fields.map(({ label, value }) => (
        <OrderItem key={label} label={label} value={value} />
      ))}
    </div>
  );
};

interface OrderItemProps {
  label: string;
  value: string | number;
}

const OrderItem: React.FC<OrderItemProps> = ({ label, value }) => (
  <div className={styles.order}>
    <p className={styles.label}>{label}</p>
    <p className={styles.value}>{value}</p>
  </div>
);

export default OrdersContent;
