import { describe, it, expect } from 'vitest';
import { dataUrlByteSize, fitWithin, isValidLogoDataUrl, LOGO_MAX_BYTES } from './logo';

describe('fitWithin', () => {
  it('scales the longest side down to max, preserving aspect ratio', () => {
    expect(fitWithin(512, 256, 128)).toEqual({ width: 128, height: 64 });
    expect(fitWithin(100, 400, 128)).toEqual({ width: 32, height: 128 });
  });
  it('never upscales', () => {
    expect(fitWithin(40, 20, 128)).toEqual({ width: 40, height: 20 });
  });
  it('handles empty dimensions', () => {
    expect(fitWithin(0, 10, 128)).toEqual({ width: 0, height: 0 });
  });
});

describe('dataUrlByteSize', () => {
  it('computes decoded byte length including padding', () => {
    expect(dataUrlByteSize('data:image/png;base64,' + btoa('abc'))).toBe(3);
    expect(dataUrlByteSize('data:image/png;base64,' + btoa('abcd'))).toBe(4);
    expect(dataUrlByteSize('data:image/png;base64,' + btoa('abcde'))).toBe(5);
  });
});

describe('isValidLogoDataUrl', () => {
  it('accepts small image data URLs', () => {
    expect(isValidLogoDataUrl('data:image/webp;base64,' + btoa('xyz'))).toBe(true);
  });
  it('rejects non-image or non-data URLs', () => {
    expect(isValidLogoDataUrl('https://example.com/a.png')).toBe(false);
    expect(isValidLogoDataUrl('data:text/html;base64,' + btoa('<b>'))).toBe(false);
    expect(isValidLogoDataUrl('data:image/svg+xml;base64,' + btoa('<svg/>'))).toBe(false);
    expect(isValidLogoDataUrl(null)).toBe(false);
  });
  it('rejects oversized data URLs', () => {
    const big = 'A'.repeat(Math.ceil(((LOGO_MAX_BYTES + 10) * 4) / 3));
    expect(isValidLogoDataUrl('data:image/png;base64,' + big)).toBe(false);
  });
});
