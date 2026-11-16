import { describe, expect, it } from 'vitest';
import { LONGEST_EDGE, imageKey, scaleTo, UNDESCRIBED, wordsFor } from '../src/core/image';

/**
 * Decision 18: a picture is a highlight, not a new noun. What differs is
 * underneath, and these are the parts of that which are arithmetic rather
 * than a browser.
 */
describe('keeping a picture', () => {
  it('leaves a picture that is already small enough alone', () => {
    expect(scaleTo(800, 600)).toEqual({ width: 800, height: 600 });
    expect(scaleTo(0, 0)).toEqual({ width: 0, height: 0 });
  });

  it('caps the long edge, whichever edge that is', () => {
    // Nobody needs a twenty-megabyte hero image preserved, and images are the
    // one thing in Kona that could make sync expensive.
    expect(scaleTo(4000, 2000)).toEqual({ width: LONGEST_EDGE, height: LONGEST_EDGE / 2 });
    expect(scaleTo(2000, 4000)).toEqual({ width: LONGEST_EDGE / 2, height: LONGEST_EDGE });
  });

  it('keeps the shape it was', () => {
    const { width, height } = scaleTo(3000, 1000);
    expect(Math.round((width / height) * 100)).toBe(300);
  });

  it('files each picture under its own key, so reading a list stays small', () => {
    expect(imageKey('m1')).toBe('local:image:m1');
  });
});

describe('what makes a picture findable', () => {
  it('prefers what was written about the picture over what is near it', () => {
    // Search has nothing else to go on: an image carries no text of its own,
    // so whatever is nearest it is its searchable content.
    expect(
      wordsFor({
        caption: 'Figure 3: pseudopod extension over 40 seconds',
        alt: 'A diagram',
        nearby: 'The whole article about cells',
      }),
    ).toBe('Figure 3: pseudopod extension over 40 seconds');
    expect(wordsFor({ alt: 'A diagram', nearby: 'The whole article' })).toBe('A diagram');
    expect(wordsFor({ nearby: 'The whole article' })).toBe('The whole article');
  });

  it('tidies the whitespace a page happened to have in it', () => {
    expect(wordsFor({ alt: '  Figure   3 \n of 4 ' })).toBe('Figure 3 of 4');
  });

  it('passes over an empty or one-character description', () => {
    expect(wordsFor({ alt: '', caption: ' ', title: '-', nearby: 'The paragraph' })).toBe(
      'The paragraph',
    );
  });

  it('says so when a picture has nothing written anywhere near it', () => {
    // The one case that is genuinely hard to find again, and Kona says so
    // rather than pretending otherwise or leaving a blank row.
    expect(wordsFor({})).toBe('');
    expect(UNDESCRIBED).toMatch(/picture/i);
  });
});
