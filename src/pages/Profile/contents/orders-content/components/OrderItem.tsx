import styles from '../OrdersContent.module.scss';

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

export default OrderItem;
