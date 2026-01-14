import { AllOrdersStats } from '@/pages/Profile/types';
import styles from '../OrdersContent.module.scss';
import OrderItem from './OrderItem';

interface AllOrdersProps {
  stats: AllOrdersStats;
}

export const AllOrders: React.FC<AllOrdersProps> = ({ stats }) => {
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
