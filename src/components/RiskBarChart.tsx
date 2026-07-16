import React from 'react';
import { RiskItem } from '../types/project';

interface Props {
  risks: RiskItem[];
}

export function RiskBarChart({ risks }: Props) {
  if (!risks.length) return null;
  const maxAmount = Math.max(...risks.map((r) => r.amount));

  return (
    <div className="card">
      <div className="card-title">
        <span className="icon" style={{ background: '#ef4444' }} />
        Top {Math.min(risks.length, 10)} – Größte Risikobeträge (nach Priorität sortiert)
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {risks.slice(0, 10).map((risk, i) => (
          <div key={i} className="risk-bar-row">
            <div className="risk-bar-id">{risk.id}</div>
            <div className="risk-bar-track">
              <div
                className={`risk-bar-fill ${risk.priority}`}
                style={{ width: `${(risk.amount / maxAmount) * 100}%` }}
              >
                {risk.amount.toLocaleString('de-DE')} €
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 16, marginTop: 12, alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 12, height: 12, borderRadius: 3, background: '#ef4444' }} />
          <span style={{ fontSize: 11, color: '#94a3b8' }}>Kritisch (Prio 1)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 12, height: 12, borderRadius: 3, background: '#f97316' }} />
          <span style={{ fontSize: 11, color: '#94a3b8' }}>Hoch (Prio 2)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 12, height: 12, borderRadius: 3, background: '#f59e0b' }} />
          <span style={{ fontSize: 11, color: '#94a3b8' }}>Mittel (Prio 3)</span>
        </div>
      </div>
    </div>
  );
}
