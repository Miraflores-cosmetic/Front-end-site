import { afterEach, describe, expect, it } from 'vitest';
import {
  YOURICH_REF_TTL_MS,
  captureYrFromUrl,
  getYourichAffiliate,
  parseYrParam,
} from './yourichAffiliate';

afterEach(() => {
  document.cookie.split(';').forEach((c) => {
    const name = c.split('=')[0]?.trim();
    if (name) document.cookie = `${name}=; path=/; max-age=0`;
  });
  localStorage.clear();
  window.history.replaceState({}, '', '/');
});

describe('parseYrParam', () => {
  it('читает yr из search', () => {
    expect(parseYrParam('?yr=abc123&x=1')).toBe('abc123');
  });

  it('читает yr из hash-query', () => {
    expect(parseYrParam('', '#/path?yr=hashFromHash')).toBe('hashFromHash');
  });
});

describe('captureYrFromUrl / getYourichAffiliate', () => {
  it('сохраняет ?yr= и отдаёт как refHash', () => {
    window.history.replaceState({}, '', '/?yr=refFromUrl');
    expect(captureYrFromUrl()).toBe('refFromUrl');
    expect(getYourichAffiliate()).toEqual({ refHash: 'refFromUrl' });
  });

  it('предпочитает cookie _yr_rlh нашему store', () => {
    window.history.replaceState({}, '', '/?yr=fromUrl');
    captureYrFromUrl();
    document.cookie = '_yr_rlh=fromCookie; path=/';
    document.cookie = '_yr_uid=uidCookie; path=/';
    expect(getYourichAffiliate()).toEqual({
      refHash: 'fromCookie',
      extUserId: 'uidCookie',
    });
  });

  it('читает yr_fallback_* если cookie нет', () => {
    localStorage.setItem(
      'yr_fallback__yr_rlh',
      JSON.stringify({ value: 'fbHash', exp: Date.now() + YOURICH_REF_TTL_MS }),
    );
    localStorage.setItem(
      'yr_fallback__yr_uid',
      JSON.stringify({ value: 'fbUid', exp: Date.now() + YOURICH_REF_TTL_MS }),
    );
    expect(getYourichAffiliate()).toEqual({
      refHash: 'fbHash',
      extUserId: 'fbUid',
    });
  });

  it('игнорирует просроченный наш store', () => {
    localStorage.setItem(
      'miraflores.yr.ref.v1',
      JSON.stringify({ value: 'old', exp: Date.now() - 1 }),
    );
    expect(getYourichAffiliate()).toBeNull();
  });
});
