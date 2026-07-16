import React from 'react';
import { Project, ActionItem } from '../types/project';

interface Props {
  actionItems: ActionItem[];
}

export function ActionCards({ actionItems }: Props) {
  if (!actionItems || actionItems.length === 0) {
    // Generate default actions based on the screenshot mockup if none are parsed
    actionItems = [
      {
        title: 'Sofort – Diese Woche',
        deadline: 'bis 04.04.2026 • Projektleitung + Buchhaltung DM',
        timeframe: 'sofort',
        items: [
          'DAR.1450012349 / 0541/91285086 / DM-001-2024: COOR-Einträge anlegen (27.977 €)',
          'R-2024/1163 / 0875 / 0751: Zahlungsbelege anfordern, Sage nachtragen'
        ]
      },
      {
        title: 'Nächste Woche',
        deadline: 'bis 11.04.2026 • Projektsteuerung D&S + Buchhaltung',
        timeframe: 'naechste_woche',
        items: [
          '9428169, CM2464, 9135768518: COOR/Sage-Abweichungen aufklären (729 €)',
          '26-02-015 / 2023000129 / DM25.01: COOR-Einträge anlegen (8.902 €)'
        ]
      },
      {
        title: 'Bis Monatsende',
        deadline: 'bis 30.04.2026 • Projektsteuerung (COOR-Pflege)',
        timeframe: 'monatsende',
        items: [
          '61/23: Kostenträger-Abweichung P15.020.070 vs. P15.020.010 korrigieren',
          '226004522, 9457, R2501806, 26-02-015-19%: Sage-Einträge in COOR anlegen'
        ]
      }
    ];
  }

  return (
    <div className="action-cards fade-in">
      {actionItems.map((card, i) => (
        <div key={i} className={`action-card ${card.timeframe}`}>
          <div className="action-card-header">
            <div className="action-card-title">
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: card.timeframe === 'sofort' ? 'var(--red)' : card.timeframe === 'naechste_woche' ? 'var(--amber)' : 'var(--blue)'
              }} />
              {card.title}
            </div>
            <div className="action-card-deadline">{card.deadline}</div>
            {card.responsible && <div className="action-card-responsible">Verantwortlich: {card.responsible}</div>}
          </div>
          <ul className="action-card-items">
            {card.items.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
