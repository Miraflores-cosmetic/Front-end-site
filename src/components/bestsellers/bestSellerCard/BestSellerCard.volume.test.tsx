import React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import { BestSellerProductCard } from './index';
import type { BestSellersProduct, ProductVariant } from '@/types/products';
import checkoutReducer from '@/store/slices/checkoutSlice';

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: React.forwardRef(function MotionDiv(
      props: React.HTMLAttributes<HTMLDivElement>,
      ref: React.Ref<HTMLDivElement>,
    ) {
      const { children, ...rest } = props;
      return (
        <div ref={ref} {...rest}>
          {children}
        </div>
      );
    }),
  },
}));

vi.mock('@/hooks/useScreenMatch', () => ({
  useScreenMatch: () => false,
}));

vi.mock('@/components/toast/toast', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }),
}));

vi.mock('@/components/favorite-button/FavoriteButton', () => ({
  FavoriteButton: () => null,
}));

vi.mock('@/components/image-with-fallback/ImageWithFallback', () => ({
  ImageWithFallback: (props: { alt?: string }) => (
    // eslint-disable-next-line jsx-a11y/alt-text
    <img alt={props.alt || ''} />
  ),
}));

vi.mock('@/lib/metrika', () => ({
  MetrikaGoal: { addToCart: 'addToCart' },
  reachGoal: vi.fn(),
  isFavoritesPathStrict: () => false,
  markCartFromFavorites: vi.fn(),
}));

function makeVariant(
  id: string,
  name: string,
  price: number,
  available: number,
  orderMinQty = 1,
): ProductVariant {
  return {
    node: {
      id,
      sku: id,
      name,
      orderMinQty,
      quantityAvailable: available,
      trackInventory: true,
      quantityLimitPerCustomer: available,
      attributes: [
        {
          attribute: { id: 'obem', name: 'Объём', slug: 'obem' },
          values: [{ name, plainText: name }],
        },
      ],
      pricing: {
        discount: { net: { amount: 0, currency: 'RUB' } },
        price: { gross: { amount: price, currency: 'RUB' } },
      },
    },
  };
}

function makeProduct(variants: ProductVariant[]): BestSellersProduct {
  const first = variants[0]!;
  return {
    id: first.node.id,
    productId: 'prod-1',
    size: first.node.name,
    title: 'Тестовый крем',
    description: 'Описание',
    slug: 'test-cream',
    price: first.node.pricing.price.gross.amount,
    images: ['https://example.com/a.jpg'],
    thumbnail: 'https://example.com/a.jpg',
    productVariants: variants,
    collections: { id: '', name: '', slug: '' },
    quantityAvailable: first.node.quantityAvailable,
    trackInventory: true,
  };
}

function renderCard(product: BestSellersProduct) {
  const store = configureStore({
    reducer: { checkout: checkoutReducer },
  });
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <BestSellerProductCard product={product} loading={false} />
      </MemoryRouter>
    </Provider>,
  );
}

describe('BestSellerProductCard volume UX', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('1 variant: no volume modal on ATC, adds directly', async () => {
    const user = userEvent.setup();
    renderCard(makeProduct([makeVariant('v50', '50 мл', 1000, 5)]));

    expect(screen.queryByRole('dialog')).toBeNull();
    const atc = screen.getByRole('button', { name: /в корзину/i });
    await user.click(atc);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('2 variants: ATC opens modal; OOS option disabled; select adds', async () => {
    const user = userEvent.setup();
    renderCard(
      makeProduct([
        makeVariant('v50', '50 мл', 1000, 5),
        makeVariant('v100', '100 мл', 1800, 0),
      ]),
    );

    expect(screen.queryByRole('dialog')).toBeNull();
    await user.click(screen.getByRole('button', { name: /в корзину/i }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Выберите объём')).toBeTruthy();
    expect(within(dialog).getByText('нет в наличии')).toBeTruthy();

    const oos = within(dialog).getByRole('option', { name: /100 мл/i });
    expect(oos).toHaveProperty('disabled', true);

    await user.click(within(dialog).getByRole('option', { name: /50 мл/i }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });

  it('2 variants: size pill opens the same modal', async () => {
    const user = userEvent.setup();
    const { container } = renderCard(
      makeProduct([
        makeVariant('v50', '50 мл', 1000, 5),
        makeVariant('v100', '100 мл', 1800, 5),
      ]),
    );

    const pill = within(container).getByRole('button', {
      name: 'Выбрать объём: 100 мл',
    });
    await user.click(pill);
    expect(await screen.findByRole('dialog')).toBeTruthy();
  });
});
