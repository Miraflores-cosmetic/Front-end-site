import React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VolumePickerModal, type VolumePickerOption } from './VolumePickerModal';

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

const options: VolumePickerOption[] = [
  {
    id: 'v50',
    label: '50 мл',
    price: 1000,
    quantityAvailable: 5,
    trackInventory: true,
  },
  {
    id: 'v100',
    label: '100 мл',
    price: 1800,
    oldPrice: 2000,
    quantityAvailable: 0,
    trackInventory: true,
  },
];

describe('VolumePickerModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('does not render when closed', () => {
    render(
      <VolumePickerModal
        open={false}
        options={options}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('lists volumes and disables OOS', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <VolumePickerModal
        open
        options={options}
        onSelect={onSelect}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText('50 мл')).toBeTruthy();
    expect(screen.getByText('100 мл')).toBeTruthy();
    expect(screen.getByText('нет в наличии')).toBeTruthy();

    const oosBtn = screen.getByRole('option', { name: /100 мл/i });
    expect(oosBtn).toHaveProperty('disabled', true);

    await user.click(screen.getByRole('option', { name: /50 мл/i }));
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'v50', label: '50 мл' }),
    );
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <VolumePickerModal
        open
        options={options}
        onSelect={vi.fn()}
        onClose={onClose}
      />,
    );
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });
});
