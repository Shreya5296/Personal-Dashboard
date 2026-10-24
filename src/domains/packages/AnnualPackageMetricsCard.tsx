import React from 'react';
import { AnnualPackageMetrics } from './packageCalculations';

export interface AnnualPackageMetricsCardProps {
  metrics: AnnualPackageMetrics;
  currency: string;
}

export const AnnualPackageMetricsCard: React.FC<AnnualPackageMetricsCardProps> = ({
  metrics,
  currency,
}) => {
  return (
    <div
      style={{
        padding: '8px 12px',
        backgroundColor: '#eff6ff',
        border: '1px solid #bfdbfe',
        borderRadius: 'var(--radius-md)',
        fontSize: 'var(--font-size-xs)',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '8px',
      }}
    >
      <div>
        <span style={{ color: '#1e40af', fontWeight: 600 }}>First Class Date:</span>
        <div>{metrics.firstScheduledDate}</div>
      </div>
      <div>
        <span style={{ color: '#1e40af', fontWeight: 600 }}>Projected Last Date:</span>
        <div>{metrics.projectedLastDate}</div>
      </div>
      <div>
        <span style={{ color: '#1e40af', fontWeight: 600 }}>Expected in Year:</span>
        <div><strong>{metrics.yearlyClassCount}</strong> classes</div>
      </div>
      <div>
        <span style={{ color: '#1e40af', fontWeight: 600 }}>Total Entitlement:</span>
        <div><strong>{metrics.totalClassesPurchased}</strong> classes</div>
      </div>
      <div>
        <span style={{ color: '#1e40af', fontWeight: 600 }}>Effective Rate:</span>
        <div>{currency} {metrics.effectivePerClassRate}/class</div>
      </div>
    </div>
  );
};
