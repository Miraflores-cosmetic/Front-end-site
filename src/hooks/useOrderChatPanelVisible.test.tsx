import { describe, expect, it } from 'vitest';
import { useOrderChatPanelVisible } from './useOrderChatPanelVisible';

describe('useOrderChatPanelVisible', () => {
  it('exports hook', () => {
    expect(typeof useOrderChatPanelVisible).toBe('function');
  });
});
