import { describe, expect, it } from 'vitest';
import {
  addAmounts,
  calcProgress,
  formatAmount,
  fromStroops,
  isValidAmount,
  toStroops,
} from '@/server/lib/money';

describe('money helpers', () => {
  describe('toStroops / fromStroops', () => {
    it('converts whole numbers', () => {
      expect(toStroops('100')).toBe(1_000_000_000n);
      expect(fromStroops(1_000_000_000n)).toBe('100');
    });
    it('handles 7 decimals', () => {
      expect(toStroops('1.2345678')).toBe(12_345_678n);
      expect(fromStroops(12_345_678n)).toBe('1.2345678');
    });
    it('trims trailing zeros', () => {
      expect(fromStroops(15_000_000n)).toBe('1.5');
    });
  });

  describe('addAmounts', () => {
    it('adds decimal amounts without float drift', () => {
      expect(addAmounts('0.1', '0.2')).toBe('0.3');
      expect(addAmounts('1000', '250.5')).toBe('1250.5');
    });
  });

  describe('formatAmount', () => {
    it('groups thousands', () => {
      expect(formatAmount('1000000')).toBe('1,000,000');
      expect(formatAmount('2500.5')).toBe('2,500.5');
    });
  });

  describe('calcProgress', () => {
    it('returns 0 when goal is 0', () => {
      expect(calcProgress('10', '0')).toBe(0);
    });
    it('caps at 100', () => {
      expect(calcProgress('200', '100')).toBe(100);
    });
    it('computes a partial percentage', () => {
      expect(calcProgress('25', '100')).toBe(25);
    });
  });

  describe('isValidAmount', () => {
    it('accepts positive decimals', () => {
      expect(isValidAmount('1')).toBe(true);
      expect(isValidAmount('0.0000001')).toBe(true);
    });
    it('rejects zero, negatives, junk and >7dp', () => {
      expect(isValidAmount('0')).toBe(false);
      expect(isValidAmount('-5')).toBe(false);
      expect(isValidAmount('abc')).toBe(false);
      expect(isValidAmount('1.123456789')).toBe(false);
    });
  });
});
