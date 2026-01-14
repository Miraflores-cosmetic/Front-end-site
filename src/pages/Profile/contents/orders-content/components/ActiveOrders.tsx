import { ActiveOrder } from '@/pages/Profile/types';
import styles from '../OrdersContent.module.scss';
import OrderItem from './OrderItem';

interface ActiveOrdersProps {
  order: ActiveOrder;
}

export const ActiveOrders: React.FC<ActiveOrdersProps> = ({ order }) => {
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
