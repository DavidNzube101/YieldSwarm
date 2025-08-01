import { RiskSeverity } from '../types';

export function calculateSeverity(affectedCount: number, totalCount: number): RiskSeverity {
  const percentage = affectedCount / totalCount;
  
  if (percentage > 0.5) return RiskSeverity.CRITICAL;
  if (percentage > 0.3) return RiskSeverity.HIGH;
  if (percentage > 0.1) return RiskSeverity.MEDIUM;
  return RiskSeverity.LOW;
}
