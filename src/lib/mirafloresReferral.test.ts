import { afterEach, describe, expect, it } from 'vitest';
import {
  MF_REF_TTL_MS,
  captureMfFromUrl,
  getMirafloresReferral,
  parseMfParam,
} from './mirafloresReferral';

afterEach(() => {
  localStorage.clear();
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
});
