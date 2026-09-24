/** @vitest-environment jsdom */
import { describe, expect, it, beforeEach } from 'vitest';
import {
  consumePostAuthOpenChat,
  stashPostAuthOpenChat,
} from '@/lib/orderChat/postAuthOpenChat';

describe('postAuthOpenChat', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('stash then consume returns detail once', () => {
    stashPostAuthOpenChat({ selection: { kind: 'support' } });
    expect(consumePostAuthOpenChat()).toEqual({ selection: { kind: 'support' } });
    expect(consumePostAuthOpenChat()).toBeUndefined();
  });

  it('empty object means open widget without thread preselect', () => {
    stashPostAuthOpenChat({});
    expect(consumePostAuthOpenChat()).toEqual({});
  });
});
