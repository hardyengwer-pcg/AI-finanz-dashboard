import React from 'react';
import { useDashboardStore } from '../store/dashboardStore';
import { KPICard } from './KPICard';
import { StatusDonut } from './StatusDonut';
import { RiskBarChart } from './RiskBarChart';
import { ActionCards } from './ActionCards';

export function OverviewDashboard() {
  const { projects } = useDashboardStore();

  // Aggregate metrics from all projects
  const totalPositions = projects.reduce((sum, p) => sum + (p.bookingMatches?.totalPositions || 0), 0);
  const totalVollMatch = projects.reduce((sum, p) => sum + (p.bookingMatches?.vollMatch || 0), 0);
  const totalTeilMatch = projects.reduce((sum, p) => sum + (p.bookingMatches?.teilMatch || 0), 0);
  const totalKlaerungsbedarf = projects.reduce((sum, p) => sum + (p.bookingMatches?.klaerungsbedarf || 0), 0);
  const totalNurSage = projects.reduce((sum, p) => sum + (p.bookingMatches?.nurSage || 0), 0);
  const totalRisikovolumen = projects.reduce((sum, p) => sum + (p.bookingMatches?.risikovolumen || 0), 0);

  // Combine top risks
  const combinedRisks = projects
    .flatMap((p) => p.bookingMatches?.topRisks || [])
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);

  const mockBookingMatch = {
    totalPositions,
    vollMatch: totalVollMatch,
    teilMatch: totalTeilMatch,
    klaerungsbedarf: totalKlaerungsbedarf,
    nurSage: totalNurSage,
    risikovolumen: totalRisikovolumen,
    topRisks: combinedRisks,
    actionItems: [],
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="kpi-grid">
        <KPICard
          value={totalVollMatch}
          label="Vollständige Matches"
          subLabel={`${projects.length} Projekte analysiert`}
          icon="✅"
          color="green"
        />
        <KPICard
          value={totalTeilMatch}
          label="Teilmatches"
          subLabel="inkl. COOR-Zahlung offen"
          icon="⚠️"
          color="amber"
        />
        <KPICard
          value={totalKlaerungsbedarf}
          label="Aktiver Klärungsbedarf"
          subLabel={`${totalRisikovolumen.toLocaleString('de-DE')} € Risiko`}
          icon="🔴"
          color="red"
        />
        <KPICard
          value={totalNurSage}
          label="Nur Sage – erwartet"
          subLabel="Barbelege, Reisen, Umlagen"
          icon="ℹ️"
          color="gray"
        />
        <KPICard
          value={totalRisikovolumen}
          label="Aktives Risikovolumen"
          subLabel="Kritisch & Hohe Priorität"
          icon="💰"
          color="purple"
          isCurrency
        />
      </div>

      <div className="charts-row">
        <StatusDonut match={mockBookingMatch} />
        <RiskBarChart risks={combinedRisks} />
      </div>

      <ActionCards actionItems={[]} />
    </div>
  );
}
