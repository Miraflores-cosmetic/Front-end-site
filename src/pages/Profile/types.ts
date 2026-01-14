export interface ProfileCardItem {
  id: number;
  image: string;
  alt: string;
  name: string;
  size: string;
  count: string;
  isGift?: boolean;
}

export interface AllOrdersStats {
  totalOrders: number;
  totalAmount: string;
}

export interface ActiveOrder {
  id: string;
  date: string;
  amount: string;
  status: string;
}

export type TabType = 'active' | 'all';
