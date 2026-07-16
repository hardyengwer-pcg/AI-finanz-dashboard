import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { BookingMatch } from '../types/project';

interface Props {
  match: BookingMatch;
}

const SEGMENTS = [
  { key: 'vollMatch', label: 'Vollst. Match', color: '#22c55e', icon: '✅' },
  { key: 'teilMatch', label: 'Teilmatch', color: '#f59e0b', icon: '⚠️' },
  { key: 'klaerungsbedarf', label: 'Klärungsbedarf', color: '#ef4444', icon: '❌' },
  { key: 'nurSage', label: 'Nur Sage (erwartet)', color: '#6b7280', icon: '💾' },
];

export function StatusDonut({ match }: Props) {
  const data = SEGMENTS.map((s) => ({
    name: s.label,
    value: match[s.key as keyof BookingMatch] as number,
    color: s.color,
  })).filter((d) => d.value > 0);

  return (
    <div className="card">
      <div className="card-title">
        <span className="icon" style={{ background: '#3b82f6' }} />
        Statusverteilung Gesamtdatensatz ({match.totalPositions} Positionen)
      </div>
      <div className="donut-container">
        <ResponsiveContainer width={160} height={160}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={75}
              paddingAngle={2}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: any, name: any) => [value + ' Pos.', name]}
              contentStyle={{
                background: '#1a2332',
                border: '1px solid #1e3a5f',
                borderRadius: 8,
                fontSize: 12,
                color: '#f1f5f9',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div style={{ position: 'absolute', width: 160, textAlign: 'center', pointerEvents: 'none' }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9' }}>{match.totalPositions}</div>
          <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Positionen</div>
        </div>
        <div className="donut-legend">
          {SEGMENTS.map((s) => {
            const val = match[s.key as keyof BookingMatch] as number;
            const pct = match.totalPositions > 0 ? ((val / match.totalPositions) * 100).toFixed(1) : '0.0';
            return (
              <div className="donut-legend-row" key={s.key}>
                <div className="donut-legend-dot" style={{ background: s.color }} />
                <span className="donut-legend-label">{s.icon} {s.label}</span>
                <span className="donut-legend-value">{val} – {pct}%</span>
              </div>
            );
          })}
          <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: 11, color: '#64748b' }}>
            Gesamt: {match.totalPositions} Pos.
          </div>
        </div>
      </div>
    </div>
  );
}
