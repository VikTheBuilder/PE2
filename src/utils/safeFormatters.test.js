import {
  formatStorageSize,
  formatCurrency,
  formatNumber,
  formatPercentage
} from './safeFormatters';

describe('Safe Formatters', () => {
  describe('formatStorageSize', () => {
    test('handles null and undefined values', () => {
      expect(formatStorageSize(null)).toBe('0.00 GB');
      expect(formatStorageSize(undefined)).toBe('0.00 GB');
    });

    test('handles non-numeric values', () => {
      expect(formatStorageSize('invalid')).toBe('0.00 GB');
      expect(formatStorageSize({})).toBe('0.00 GB');
      expect(formatStorageSize([])).toBe('0.00 GB');
      expect(formatStorageSize(NaN)).toBe('0.00 GB');
    });

    test('handles negative values', () => {
      expect(formatStorageSize(-1)).toBe('0.00 GB');
      expect(formatStorageSize(-0.5)).toBe('0.00 GB');
    });

    test('formats small sizes in KB', () => {
      expect(formatStorageSize(0.000000953674316)).toBe('1.00 KB'); // 1KB in GB
      expect(formatStorageSize(0.000000476837158)).toBe('0.50 KB'); // 0.5KB in GB
    });

    test('formats medium sizes in MB', () => {
      expect(formatStorageSize(0.001)).toBe('1.02 MB'); // 0.001 GB = 1.024 MB (due to 1024 conversion)
      expect(formatStorageSize(0.5)).toBe('512.00 MB'); // 0.5GB in MB
    });

    test('formats sizes in GB', () => {
      expect(formatStorageSize(1)).toBe('1.00 GB');
      expect(formatStorageSize(1.5)).toBe('1.50 GB');
      expect(formatStorageSize(999.99)).toBe('999.99 GB');
    });

    test('formats large sizes in TB', () => {
      expect(formatStorageSize(1024)).toBe('1.00 TB');
      expect(formatStorageSize(1536)).toBe('1.50 TB'); // 1.5TB
      expect(formatStorageSize(2048.5)).toBe('2.00 TB');
    });

    test('handles zero value', () => {
      expect(formatStorageSize(0)).toBe('0.00 GB');
    });

    test('handles very small values', () => {
      expect(formatStorageSize(0.0000001)).toBe('0.10 KB');
    });
  });

  describe('formatCurrency', () => {
    test('handles null and undefined values', () => {
      expect(formatCurrency(null)).toBe('$0.00');
      expect(formatCurrency(undefined)).toBe('$0.00');
    });

    test('handles non-numeric values', () => {
      expect(formatCurrency('invalid')).toBe('$0.00');
      expect(formatCurrency({})).toBe('$0.00');
      expect(formatCurrency([])).toBe('$0.00');
      expect(formatCurrency(NaN)).toBe('$0.00');
    });

    test('handles negative values', () => {
      expect(formatCurrency(-1)).toBe('$0.00');
      expect(formatCurrency(-0.5)).toBe('$0.00');
    });

    test('formats positive currency amounts', () => {
      expect(formatCurrency(0)).toBe('$0.00');
      expect(formatCurrency(1)).toBe('$1.00');
      expect(formatCurrency(1.5)).toBe('$1.50');
      expect(formatCurrency(1.234)).toBe('$1.23');
      expect(formatCurrency(1000.99)).toBe('$1000.99');
    });

    test('supports custom currency symbols', () => {
      expect(formatCurrency(1.5, '€')).toBe('€1.50');
      expect(formatCurrency(1.5, '£')).toBe('£1.50');
      expect(formatCurrency(1.5, '¥')).toBe('¥1.50');
    });

    test('handles very small amounts', () => {
      expect(formatCurrency(0.001)).toBe('$0.00');
      expect(formatCurrency(0.005)).toBe('$0.01');
    });
  });

  describe('formatNumber', () => {
    test('handles null and undefined values', () => {
      expect(formatNumber(null)).toBe('0');
      expect(formatNumber(undefined)).toBe('0');
    });

    test('handles non-numeric values', () => {
      expect(formatNumber('invalid')).toBe('0');
      expect(formatNumber({})).toBe('0');
      expect(formatNumber([])).toBe('0');
      expect(formatNumber(NaN)).toBe('0');
    });

    test('handles negative values', () => {
      expect(formatNumber(-1)).toBe('0');
      expect(formatNumber(-0.5)).toBe('0');
    });

    test('formats integers by default', () => {
      expect(formatNumber(0)).toBe('0');
      expect(formatNumber(1)).toBe('1');
      expect(formatNumber(1.9)).toBe('1');
      expect(formatNumber(100.99)).toBe('100');
    });

    test('formats with specified decimal places', () => {
      expect(formatNumber(1.234, 0)).toBe('1');
      expect(formatNumber(1.234, 1)).toBe('1.2');
      expect(formatNumber(1.234, 2)).toBe('1.23');
      expect(formatNumber(1.234, 3)).toBe('1.234');
    });

    test('handles invalid decimal parameter', () => {
      expect(formatNumber(1.234, -1)).toBe('1');
      expect(formatNumber(1.234, null)).toBe('1');
      expect(formatNumber(1.234, 'invalid')).toBe('1');
    });

    test('handles large numbers', () => {
      expect(formatNumber(1000000)).toBe('1000000');
      expect(formatNumber(1000000.789, 2)).toBe('1000000.79');
    });
  });

  describe('formatPercentage', () => {
    test('handles null and undefined values', () => {
      expect(formatPercentage(null)).toBe('0%');
      expect(formatPercentage(undefined)).toBe('0%');
    });

    test('handles non-numeric values', () => {
      expect(formatPercentage('invalid')).toBe('0%');
      expect(formatPercentage({})).toBe('0%');
      expect(formatPercentage([])).toBe('0%');
      expect(formatPercentage(NaN)).toBe('0%');
    });

    test('clamps values to 0-100 range', () => {
      expect(formatPercentage(-10)).toBe('0.0%');
      expect(formatPercentage(110)).toBe('100.0%');
    });

    test('formats valid percentage values', () => {
      expect(formatPercentage(0)).toBe('0.0%');
      expect(formatPercentage(25)).toBe('25.0%');
      expect(formatPercentage(50.5)).toBe('50.5%');
      expect(formatPercentage(75.75)).toBe('75.8%');
      expect(formatPercentage(100)).toBe('100.0%');
    });

    test('rounds to one decimal place', () => {
      expect(formatPercentage(33.333)).toBe('33.3%');
      expect(formatPercentage(66.666)).toBe('66.7%');
      expect(formatPercentage(99.999)).toBe('100.0%');
    });
  });
});