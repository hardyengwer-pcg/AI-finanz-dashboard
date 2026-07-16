import React from 'react';
import { Uncertainty } from '../types/project';

interface Props {
  uncertainties: Uncertainty[];
}

export function UncertaintyList({ uncertainties }: Props) {
  if (!uncertainties || uncertainties.length === 0) {
    return (
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--green)', background: 'var(--green-bg)', borderColor: 'rgba(34,197,94,0.2)' }}>
        <span style={{ fontSize: '18px' }}>✅</span>
        <div style={{ fontSize: '12px', fontWeight: 600 }}>Keine Unsicherheiten oder Warnungen gemeldet. Die Daten wirken plausibel.</div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-title">
        <span className="icon" style={{ background: 'var(--amber)' }} />
        ⚠️ Erkannte Datenunsicherheiten & Klärungsbedarf ({uncertainties.length})
      </div>
      <div className="uncertainty-list">
        {uncertainties.map((item, idx) => (
          <div key={idx} className={`uncertainty-item ${item.severity}`}>
            <span className="uncertainty-icon">
              {item.severity === 'high' ? '🚨' : item.severity === 'medium' ? '⚠️' : 'ℹ️'}
            </span>
            <div className="uncertainty-text">
              <div className="uncertainty-field">{item.field}</div>
              <div className="uncertainty-message">{item.message}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
