import { afterEach, describe, expect, it } from 'vitest';
import {
  MF_REF_TTL_MS,
  captureMfFromUrl,
  getMfRefTtlMs,
  getMirafloresReferral,
  parseMfParam,
  setMfRefTtlDays,
} from './mirafloresReferral';

afterEach(() => {
  localStorage.clear();
  setMfRefTtlDays(60);
  window.history.replaceState({}, '', '/');
});

describe('parseMfParam', () => {
  it('читает mf из search', () => {
    expect(parseMfParam('?mf=anna1&x=1')).toBe('ANNA1');
  });

  it('игнорирует bare ?ref= (только namespaced ?mf=)', () => {
    expect(parseMfParam('?ref=bob2')).toBeNull();
    expect(parseMfParam('?ref=bob2&mf=anna1')).toBe('ANNA1');
  });

  it('читает mf из hash-query', () => {
    expect(parseMfParam('', '#/path?mf=hashCode')).toBe('HASHCODE');
  });

  it('отклоняет короткий код', () => {
    expect(parseMfParam('?mf=ab')).toBeNull();
  });
});

describe('captureMfFromUrl / getMirafloresReferral', () => {
  it('сохраняет ?mf= и отдаёт code', () => {
    window.history.replaceState({}, '', '/?mf=refFromUrl');
    expect(captureMfFromUrl()).toBe('REFFROMURL');
    expect(getMirafloresReferral()).toEqual({ code: 'REFFROMURL' });
  });

  it('истекает по TTL', () => {
    localStorage.setItem(
      'miraflores.mf.ref.v1',
      JSON.stringify({ value: 'OLDCODE', exp: Date.now() - 1000 }),
    );
    expect(getMirafloresReferral()).toBeNull();
  });

  it('живёт в пределах TTL', () => {
    localStorage.setItem(
      'miraflores.mf.ref.v1',
      JSON.stringify({
        value: 'LIVECODE',
        exp: Date.now() + MF_REF_TTL_MS,
      }),
    );
    expect(getMirafloresReferral()).toEqual({ code: 'LIVECODE' });
  });

  it('setMfRefTtlDays влияет на exp нового capture', () => {
    setMfRefTtlDays(7);
    expect(getMfRefTtlMs()).toBe(7 * 24 * 60 * 60 * 1000);
    const before = Date.now();
    window.history.replaceState({}, '', '/?mf=ttlcode1');
    captureMfFromUrl();
    const raw = JSON.parse(localStorage.getItem('miraflores.mf.ref.v1')!);
    expect(raw.exp).toBeGreaterThanOrEqual(before + 7 * 24 * 60 * 60 * 1000 - 50);
    expect(raw.exp).toBeLessThanOrEqual(Date.now() + 7 * 24 * 60 * 60 * 1000 + 50);
  });
});
