import { describe, expect, it } from 'vitest';
import { countWords, greeting, readingMinutes } from '@/lib/format';

describe('reading time', () => {
  it('counts words and never reports zero minutes', () => {
    expect(countWords('')).toBe(0);
    expect(countWords('eins zwei  drei')).toBe(3);
    expect(readingMinutes(0)).toBe(1);
    expect(readingMinutes(450)).toBe(2);
  });
});

describe('greeting', () => {
  it('uses the first name and the Berlin clock', () => {
    expect(greeting('Mara Beispiel', new Date('2026-09-08T07:00:00+02:00'))).toBe(
      'Guten Morgen, Mara',
    );
    expect(greeting('', new Date('2026-09-08T20:00:00+02:00'))).toBe('Guten Abend');
  });
});
