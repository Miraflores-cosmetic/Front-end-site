import { describe, expect, it } from 'vitest';
import { buildReferralShareUrl, fillReferralShareText } from './referralShare';

describe('referralShare', () => {
  it('adds UTM to linkPath', () => {
    const url = buildReferralShareUrl({
      origin: 'https://miraflores-shop.com',
      linkPath: '/?mf=ABCD2345',
      medium: 'telegram',
    });
    expect(url).toContain('mf=ABCD2345');
    expect(url).toContain('utm_source=referral');
    expect(url).toContain('utm_medium=telegram');
    expect(url).toContain('utm_campaign=mf_wallet');
  });

  it('stories medium', () => {
    expect(
      buildReferralShareUrl({
        origin: 'https://miraflores-shop.com',
        linkPath: '/?mf=ABCD',
        medium: 'stories',
      }),
    ).toContain('utm_medium=stories');
  });

  it('fills {link} and {code}', () => {
    expect(
      fillReferralShareText('Код {code}: {link}', {
        code: 'ABCD',
        link: 'https://x/?mf=ABCD',
      }),
    ).toBe('Код ABCD: https://x/?mf=ABCD');
  });

  it('omitLink — без дубля URL в text', () => {
    expect(
      fillReferralShareText('Закажи в Miraflores по моей ссылке: {link}', {
        code: 'ABCD',
        link: 'https://x/?mf=ABCD',
        omitLink: true,
      }),
    ).toBe('Закажи в Miraflores по моей ссылке');
  });
});
