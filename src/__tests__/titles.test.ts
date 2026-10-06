import { describe, it, expect } from 'vitest';
import { splitCamelCase, titleFromFilename } from '../catalog/titles';

describe('titleFromFilename', () => {
  it('strips the extension and title-cases snake_case words', () => {
    expect(titleFromFilename('sun_dried_tanuki.nsf')).toBe('Sun Dried Tanuki');
  });

  it('keeps existing capitals and digits', () => {
    expect(titleFromFilename('UN_squadron.nsf')).toBe('UN Squadron');
    expect(titleFromFilename('Hip_Hop_2.nsf')).toBe('Hip Hop 2');
    expect(titleFromFilename('intrigueX.nsf')).toBe('IntrigueX');
  });

  it('leaves punctuation inside words alone', () => {
    expect(titleFromFilename('peril+intro.nsf')).toBe('Peril+intro');
    expect(titleFromFilename('sybins-beans_of_future_past.nsf')).toBe(
      'Sybins-beans Of Future Past'
    );
  });

  it('handles spaces and files without an extension', () => {
    expect(titleFromFilename('Track 01 - Intro.nsf')).toBe('Track 01 - Intro');
    expect(titleFromFilename('encounter_with_the_khans')).toBe('Encounter With The Khans');
  });
});

describe('splitCamelCase', () => {
  it('splits folder names at lower-to-upper boundaries', () => {
    expect(splitCamelCase('MetallicWing')).toBe('Metallic Wing');
    expect(splitCamelCase('LilLoops')).toBe('Lil Loops');
    expect(splitCamelCase('UnfinishedBusiness')).toBe('Unfinished Business');
    expect(splitCamelCase('SuperFORE!')).toBe('Super FORE!');
    expect(splitCamelCase('Bazaar')).toBe('Bazaar');
  });
});
