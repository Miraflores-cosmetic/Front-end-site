import { describe, expect, it } from 'vitest';
import { formatVolumesSubtitle } from './cardVolumes';

describe('formatVolumesSubtitle', () => {
  it('joins up to 3 volumes', () => {
    expect(formatVolumesSubtitle(['50 мл'])).toBe('50 мл');
    expect(formatVolumesSubtitle(['50 мл', '100 мл'])).toBe('50 мл · 100 мл');
    expect(formatVolumesSubtitle(['50 мл', '100 мл', '200 мл'])).toBe(
      '50 мл · 100 мл · 200 мл',
    );
  });

  it('abbreviates 4+ as first 3 + remainder', () => {
    expect(
      formatVolumesSubtitle(['30 мл', '50 мл', '100 мл', '200 мл']),
    ).toBe('30 мл · 50 мл · 100 мл · +1');
    expect(
      formatVolumesSubtitle(['30 мл', '50 мл', '100 мл', '200 мл', '500 мл']),
    ).toBe('30 мл · 50 мл · 100 мл · +2');
  });

  it('returns empty for no volumes', () => {
    expect(formatVolumesSubtitle([])).toBe('');
  });
});
