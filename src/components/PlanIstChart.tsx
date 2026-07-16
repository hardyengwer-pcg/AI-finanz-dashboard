import React from 'react';
import { Project } from '../types/project';
import { OpenOrder } from '../types/openOrder';

interface Props {
  project: Project;
  openOrders: OpenOrder[];
}

interface BudgetRow {
  label: string;
  plan: number;
  ist: number;
}

export function PlanIstChart({ project, openOrders }: Props) {
  const openOrderTotal = openOrders
    .filter((o) => o.projectId === project.id || o.projectId === 'unbekannt')
    .reduce((s, o) => s + o.amount, 0);

  const rows: BudgetRow[] = [{ label: 'Gesamtlaufzeit', plan: project.budgetPlan, ist: project.budgetIst }];

  if (project.budgetYear) {
    for (const [year, vals] of Object.entries(project.budgetYear)) {
      rows.push({ label: `Jahr ${year}`, plan: vals.plan, ist: vals.ist });
    }
  }

  const maxVal = Math.max(...rows.flatMap((r) => [r.plan, r.ist, r.ist + openOrderTotal]));
  const fmt = (v: number) => v.toLocaleString('de-DE', { maximumFractionDigits: 0 }) + ' €';

  return (
    <div className="card">
      <div className="card-title">
        <span className="icon" style={{ background: '#3b82f6' }} />
        Plan vs. IST – Budgetvergleich
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: '#3b82f6' }} />
            <span style={{ fontSize: 10, color: '#94a3b8' }}>Plankosten</span>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: '#22c55e' }} />
            <span style={{ fontSize: 10, color: '#94a3b8' }}>Ist-Kosten</span>
          </div>
          {openOrderTotal > 0 && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: '#f59e0b' }} />
              <span style={{ fontSize: 10, color: '#94a3b8' }}>Offen Aufträge</span>
            </div>
          )}
        </div>
      </div>

      {rows.map((row, i) => {
        const delta = row.ist - row.plan;
        const deltaPct = row.plan > 0 ? ((delta / row.plan) * 100).toFixed(1) : '0';
        const planW = (row.plan / maxVal) * 100;
        const istW = (row.ist / maxVal) * 100;
        const openW = (openOrderTotal / maxVal) * 100;
        const isOver = row.ist > row.plan;

        return (
          <div key={i} className="budget-row" style={{ animationDelay: `${i * 0.1}s` }}>
            <div className="budget-row-header">
              <span className="budget-row-label">{row.label}</span>
              <span className={`budget-row-delta ${isOver ? 'negative' : 'positive'}`}>
                {delta >= 0 ? '+' : ''}{fmt(delta)} ({delta >= 0 ? '+' : ''}{deltaPct}%)
                {isOver ? ' 🔺' : ' ✅'}
              </span>
            </div>
            <div className="budget-bar-group">
              <div className="budget-bar-row">
                <span className="budget-bar-row-label">PLAN</span>
                <div className="budget-bar-container">
                  <div className="budget-bar-track">
                    <div className="budget-bar-fill plan" style={{ width: `${planW}%` }}>
                      {planW > 15 ? fmt(row.plan) : ''}
                    </div>
                  </div>
                  {planW <= 15 && <span style={{ fontSize: 10, color: '#94a3b8' }}>{fmt(row.plan)}</span>}
                </div>
              </div>
              <div className="budget-bar-row">
                <span className="budget-bar-row-label">IST</span>
                <div className="budget-bar-container">
                  <div className="budget-bar-track">
                    <div
                      className={`budget-bar-fill ist${isOver ? ' over' : ''}`}
                      style={{ width: `${istW}%` }}
                    >
                      {istW > 15 ? fmt(row.ist) : ''}
                    </div>
                  </div>
                  {istW <= 15 && <span style={{ fontSize: 10, color: '#94a3b8' }}>{fmt(row.ist)}</span>}
                </div>
              </div>
              {i === 0 && openOrderTotal > 0 && (
                <div className="budget-bar-row">
                  <span className="budget-bar-row-label" style={{ color: '#f59e0b' }}>OFFEN</span>
                  <div className="budget-bar-container">
                    <div className="budget-bar-track">
                      <div
                        className="budget-bar-fill"
                        style={{ width: `${openW}%`, background: '#f59e0b' }}
                      >
                        {openW > 15 ? fmt(openOrderTotal) : ''}
                      </div>
                    </div>
                    {openW <= 15 && <span style={{ fontSize: 10, color: '#f59e0b' }}>{fmt(openOrderTotal)}</span>}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
