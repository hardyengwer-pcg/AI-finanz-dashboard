import React from 'react';

interface Props {
  value: number;
  label: string;
  subLabel?: string;
  icon: string;
  color: 'green' | 'amber' | 'red' | 'gray' | 'purple' | 'blue';
  isCurrency?: boolean;
}

export function KPICard({ value, label, subLabel, icon, color, isCurrency }: Props) {
  const displayValue = isCurrency
    ? value.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' €'
    : value.toLocaleString('de-DE');

  return (
    <div className={`kpi-card ${color} fade-in`}>
      <div className="kpi-icon">{icon}</div>
      <div className="kpi-value">{displayValue}</div>
      <div className="kpi-label">{label}</div>
      {subLabel && <div className="kpi-sub">{subLabel}</div>}
    </div>
  );
}
