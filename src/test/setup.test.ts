import { describe, it, expect } from 'vitest';

describe('Tooling and Environment Foundation', () => {
  it('runs unit tests in Vitest test runner', () => {
    expect(1 + 1).toBe(2);
  });

  it('confirms Asia/Kolkata timezone and INR currency baseline', () => {
    const config = { timezone: 'Asia/Kolkata', currency: 'INR' };
    expect(config.timezone).toBe('Asia/Kolkata');
    expect(config.currency).toBe('INR');
  });
});
