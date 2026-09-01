import React, { useEffect, useMemo, useState } from 'react';
import styles from './OrdersContent.module.scss';
import { useScreenMatch } from '@/hooks/useScreenMatch';
import { TabId } from '../../side-bar/SideBar';
import { getOrders } from '@/graphql/queries/orders.service';
import { useToast } from '@/components/toast/toast';
import { ReviewModal } from '@/components/review-modal/ReviewModal';
import {
  ProfileEmptyState,
  ProfileLoadingState,
  ProfileSection,
} from '@/pages/Profile/components/ProfileSection';
import {
  countOrdersByTab,
  orderMatchesTab,
  type OrderFilterTab,
} from '@/lib/orderStatusLabels';
import { OrderTabs } from './components/OrderTabs';
import { OrderGroup } from './components/OrderGroup';

function isReviewableOrder(order: { status?: string; statusDisplay?: string }): boolean {
  const raw = String(order.statusDisplay || order.status || '').toUpperCase();
  return raw === 'PAID' || raw === 'PACKING' || raw === 'SHIPPED' || raw === 'DELIVERED';
}

interface OrdersContentProps {
  setOpenAccordion?: React.Dispatch<React.SetStateAction<TabId | null>>;
}

const OrdersContent: React.FC<OrdersContentProps> = ({ setOpenAccordion }) => {
  const [activeTab, setActiveTab] = useState<OrderFilterTab>('all');
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedProductForReview, setSelectedProductForReview] = useState<{
    id: string;
    name: string;
    orderId: string;
  } | null>(null);
  const isMobile = useScreenMatch();
  const toast = useToast();

  useEffect(() => {
    async function loadOrders() {
      try {
        setLoading(true);
        const ordersData = await getOrders(50);
        const ordersList = ordersData.edges.map((edge: any) => edge.node);
        setOrders(ordersList);
      } catch (error: any) {
        console.error('Error loading orders:', error);
        const errorMessage = error?.message || '';
        if (
          errorMessage.includes('TokenExpired') ||
          errorMessage.includes('Signature has expired') ||
          errorMessage.includes('ExpiredSignatureError')
        ) {
          localStorage.removeItem('token');
          localStorage.removeItem('userId');
          window.location.href = '/sign-in';
          return;
        }
        toast.error('Ошибка при загрузке заказов');
      } finally {
        setLoading(false);
      }
    }
    void loadOrders();
  }, [toast]);

  const counts = useMemo(() => countOrdersByTab(orders), [orders]);

  const filteredOrders = useMemo(
    () =>
      orders.filter(order =>
        orderMatchesTab(order.statusDisplay || order.status, activeTab),
      ),
    [orders, activeTab],
  );

  const handleReviewClick = (productId: string, productName: string, orderId: string) => {
    setSelectedProductForReview({ id: productId, name: productName, orderId });
    setReviewModalOpen(true);
  };

  return (
    <ProfileSection
      title="Заказы"
      desktopTitle="Ваши заказы"
      isMobile={isMobile}
      onClose={setOpenAccordion ? () => setOpenAccordion(null) : undefined}
      className={styles.ourOrdersContent}
    >
      {loading ? (
        <ProfileLoadingState message="Загрузка заказов..." />
      ) : (
        <>
          <OrderTabs activeTab={activeTab} counts={counts} onChange={setActiveTab} />

          {filteredOrders.length === 0 ? (
            <ProfileEmptyState
              message={
                orders.length === 0
                  ? 'Заказов пока нет'
                  : 'Нет заказов в этом статусе'
              }
              actionLabel={orders.length === 0 ? 'Перейти в каталог' : undefined}
              actionHref={orders.length === 0 ? '/catalog' : undefined}
            />
          ) : (
            <div className={styles.ordersList}>
              {filteredOrders.map(order => (
                <OrderGroup
                  key={order.id}
                  order={order}
                  reviewable={isReviewableOrder(order)}
                  onReview={handleReviewClick}
                />
              ))}
            </div>
          )}
        </>
      )}

      {selectedProductForReview ? (
        <ReviewModal
          isOpen={reviewModalOpen}
          onClose={() => {
            setReviewModalOpen(false);
            setSelectedProductForReview(null);
          }}
          productId={selectedProductForReview.id}
          productName={selectedProductForReview.name}
          orderId={selectedProductForReview.orderId}
        />
      ) : null}
    </ProfileSection>
  );
};

export default OrdersContent;
