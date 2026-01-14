import React, { useState, useEffect } from 'react';
import styles from './OrdersContent.module.scss';
import { AllOrders } from './components/AllOrders';
import { ActiveOrders } from './components/ActiveOrders';
import { Tabs } from './components/Tabs';
import CardList from './components/card-list/CardList';
import { ActiveOrder, AllOrdersStats, ProfileCardItem, TabType } from '../../types';
import { useScreenMatch } from '@/hooks/useScreenMatch';
import { TabId } from '../../side-bar/SideBar';
import { getOrders } from '@/graphql/queries/orders.service';
import { useToast } from '@/components/toast/toast';
import { ReviewModal } from '@/components/review-modal/ReviewModal';

interface OrdersContentProps {
  setOpenAccordion?: React.Dispatch<React.SetStateAction<TabId | null>>;
}

const OrdersContent: React.FC<OrdersContentProps> = ({ setOpenAccordion }) => {
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedProductForReview, setSelectedProductForReview] = useState<{ id: string; name: string } | null>(null);
  const isMobile = useScreenMatch(450);
  const toast = useToast();

  useEffect(() => {
    async function loadOrders() {
      try {
        setLoading(true);
        const ordersData = await getOrders(50);
        const ordersList = ordersData.edges.map((edge: any) => edge.node);
        setOrders(ordersList);
        
        // Устанавливаем первый активный заказ по умолчанию
        const firstActive = ordersList.find((o: any) => 
          o.status === 'UNFULFILLED' || o.status === 'PARTIALLY_FULFILLED'
        );
        if (firstActive) {
          setSelectedOrder(firstActive);
        } else if (ordersList.length > 0) {
          setSelectedOrder(ordersList[0]);
        }
      } catch (error: any) {
        console.error('Error loading orders:', error);
        const errorMessage = error?.message || '';
        // Если токен истек, редирект на страницу входа
        if (
          errorMessage.includes('TokenExpired') ||
          errorMessage.includes('Signature has expired') ||
          errorMessage.includes('ExpiredSignatureError')
        ) {
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('userId');
          window.location.href = '/sign-in';
          return;
        }
        toast.error('Ошибка при загрузке заказов');
      } finally {
        setLoading(false);
      }
    }
    loadOrders();
  }, []);

  // Фильтруем заказы по статусу
  // Активные заказы - только невыполненные (не FULFILLED и не CANCELED)
  const activeOrders = orders.filter((o: any) => 
    o.status === 'UNFULFILLED' || o.status === 'PARTIALLY_FULFILLED'
  );
  
  // Все заказы - показываем все, включая выполненные
  // (используем все заказы напрямую, без фильтрации)

  // Вычисляем статистику
  // Всегда вычисляем из lines, так как total.gross.amount в БД может быть неправильным
  const totalAmount = orders.reduce((sum: number, o: any) => {
    // Если есть lines, вычисляем сумму из товаров
    if (o.lines && Array.isArray(o.lines) && o.lines.length > 0) {
      const linesSum = o.lines.reduce((lineSum: number, line: any) => {
        // Используем unitPrice * quantity для каждой строки
        const unitPrice = parseFloat(line.unitPrice?.gross?.amount || 0);
        const quantity = line.quantity || 0;
        return lineSum + (unitPrice * quantity);
      }, 0);
      // Используем вычисленную сумму, если она больше 0
      if (linesSum > 0) {
        return sum + linesSum;
      }
    }
    
    // Если нет lines или сумма равна 0, используем total.gross.amount
    const orderTotal = parseFloat(o.total?.gross?.amount || 0);
    return sum + orderTotal;
  }, 0);
  
  const allOrdersStats: AllOrdersStats = {
    totalOrders: orders.length,
    totalAmount: `${Math.round(totalAmount).toLocaleString('ru-RU')} ₽`
  };

  // Получаем данные для отображения
  const displayOrder = activeTab === 'active' && activeOrders.length > 0
    ? activeOrders[0]
    : selectedOrder;

  const activeOrder: ActiveOrder | null = displayOrder ? {
    id: `№${displayOrder.number}`,
    date: new Date(displayOrder.created).toLocaleDateString('ru-RU'),
    amount: `${parseFloat(displayOrder.total?.gross?.amount || 0).toLocaleString('ru-RU')} ₽`,
    status: displayOrder.statusDisplay || displayOrder.status
  } : null;

  // Преобразуем товары заказа в формат для CardList
  const cartData: ProfileCardItem[] = displayOrder?.lines?.map((line: any, index: number) => ({
    id: index + 1,
    image: line.thumbnail?.url || line.variant?.product?.thumbnail?.url || '',
    alt: line.productName || '',
    name: line.productName || '',
    size: line.variantName || '',
    count: `${line.quantity} шт.`,
    isGift: false
  })) || [];

  const handleAddComment = () => {
    // Открываем модалку отзыва для первого товара из заказа
    if (displayOrder && displayOrder.lines && displayOrder.lines.length > 0) {
      const firstLine = displayOrder.lines[0];
      // Получаем product ID из variant
      const productId = firstLine.variant?.product?.id;
      const productName = firstLine.productName || 'Товар';
      
      if (productId) {
        setSelectedProductForReview({ id: productId, name: productName });
        setReviewModalOpen(true);
      } else {
        console.error('Product ID not found in line:', firstLine);
        toast.error('Не удалось определить товар для отзыва. Попробуйте позже.');
      }
    } else {
      toast.error('Нет товаров в заказе для отзыва');
    }
  };

  const handleCloseAccordion = () => {
    if (setOpenAccordion) {
      setOpenAccordion(null);
    }
  };

  return (
    <article className={styles.ourOrdersContent}>
      <header className={styles.ordersTitleWrapper}>
        <p className={styles.ordersTitle}>{isMobile ? 'Заказы' : 'Ваши заказы'}</p>
      </header>

      {loading ? (
        <div className={styles.loading}>Загрузка заказов...</div>
      ) : (
        <>
          <section className={styles.tabsContainer}>
            <div className={styles.ordersContainer}>
              <Tabs activeTab={activeTab} onChange={setActiveTab} />

              {activeTab === 'active' ? (
                activeOrders.length > 0 && activeOrder ? (
                  <ActiveOrders order={activeOrder} />
                ) : (
                  <div className={styles.emptyState}>Нет активных заказов</div>
                )
              ) : (
                <AllOrders stats={allOrdersStats} />
              )}
            </div>
          </section>

          <article className={styles.listContainer}>
            {activeTab === 'active' ? (
              displayOrder ? (
                <>
                  <p className={styles.activeText}>
                    {displayOrder.lines?.length || 0} {displayOrder.lines?.length === 1 ? 'товар' : 'товаров'}
                  </p>
                  <CardList cartData={cartData} />
                </>
              ) : (
                <div className={styles.emptyState}>Нет товаров в заказе</div>
              )
            ) : (
              <>
                {orders.length > 0 ? (
                  orders.map((order: any) => (
                    <div key={order.id} className={styles.orderItem}>
                      <div className={styles.allText}>
                        <p>Заказ №{order.number}</p>
                        <p>{new Date(order.created).toLocaleDateString('ru-RU', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}</p>
                      </div>
                      <CardList cartData={order.lines?.map((line: any, idx: number) => ({
                        id: idx + 1,
                        image: line.thumbnail?.url || line.variant?.product?.thumbnail?.url || '',
                        alt: line.productName || '',
                        name: line.productName || '',
                        size: line.variantName || '',
                        count: `${line.quantity} шт.`,
                        isGift: false
                      })) || []} />
                    </div>
                  ))
                ) : (
                  <div className={styles.emptyState}>Нет заказов</div>
                )}
              </>
            )}
          </article>
        </>
      )}
      <div className={styles.addWrapper} onClick={handleAddComment}>
        <button className={styles.addComment}>Оставить отзыв</button>
      </div>

      {/* ✅ Close button */}
      {isMobile && (
        <p className={styles.closeBtn} onClick={handleCloseAccordion}>
          Закрыть
        </p>
      )}

      {selectedProductForReview && (
        <ReviewModal
          isOpen={reviewModalOpen}
          onClose={() => {
            setReviewModalOpen(false);
            setSelectedProductForReview(null);
          }}
          productId={selectedProductForReview.id}
          productName={selectedProductForReview.name}
        />
      )}
    </article>
  );
};

export default OrdersContent;
