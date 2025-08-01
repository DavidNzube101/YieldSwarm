import { RiskSeverity } from '@src/types';
import { calculateSeverity } from '../../src/utils/riskCalculations';

describe('calculateSeverity', () => {
  it('should return CRITICAL when percentage is over 0.5', () => {
    const severity = calculateSeverity(6, 10);
    expect(severity).toBe(RiskSeverity.CRITICAL);
  });

  it('should return HIGH when percentage is over 0.3', () => {
    const severity = calculateSeverity(4, 10);
    expect(severity).toBe(RiskSeverity.HIGH);
  });

  it('should return MEDIUM when percentage is over 0.1', () => {
    const severity = calculateSeverity(2, 10);
    expect(severity).toBe(RiskSeverity.MEDIUM);
  });

  it('should return LOW when percentage is 0.1 or less', () => {
    const severity = calculateSeverity(1, 10);
    expect(severity).toBe(RiskSeverity.LOW);
  });

  it('should handle zero totalCount to avoid division by zero', () => {
    const severity = calculateSeverity(0, 0);
    expect(severity).toBe(RiskSeverity.LOW); // Or whatever is the expected fallback
  });
});
