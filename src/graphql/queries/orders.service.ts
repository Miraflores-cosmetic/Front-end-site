import { listOrders as apiListOrders } from '@/api/accountApi';
import type { OrdersData } from '../types/core.types';

export async function getOrders(_first = 20): Promise<OrdersData['orders']> {
  return apiListOrders();
}
