import React from 'react';
import { AnalyticsIcon, CheckIcon } from './Icons';

export default function Analytics({ stats }) {
  const total = stats?.total_tickets || 24;
  const compliance = stats?.sla_compliance_rate || 96;

  const kpis = [
    {
      label: 'Mean Time to Resolution (MTTR)',
      value: '2.4 hrs',
      delta: '-18.5%',
      isGood: true,
      sub: 'Target: < 4.0 hrs'
    },
    {
      label: 'First Contact Resolution (FCR)',
      value: '76.4%',
      delta: '+6.2%',
      isGood: true,
      sub: 'Aided by ITSM Copilot'
    },
    {
      label: 'AI Autonomous Deflection Rate',
      value: '48.2%',
      delta: '+12.0%',
      isGood: true,
      sub: 'Resolved via KB runbooks'
    },
    {
      label: 'Estimated Cost Savings',
      value: '$34,200',
      delta: '+24%',
      isGood: true,
      sub: 'Based on $45/ticket cost'
    }
  ];

  const hourlyTrends = [
    { hour: '08:00', total: 6, aiHandled: 3 },
    { hour: '10:00', total: 18, aiHandled: 9 },
    { hour: '12:00', total: 24, aiHandled: 14 },
    { hour: '14:00', total: 21, aiHandled: 11 },
    { hour: '16:00', total: 15, aiHandled: 8 },
    { hour: '18:00', total: 7, aiHandled: 4 }
  ];

  const teamPerformance = [
    { team: 'IT Service Desk', active: 8, resolved: 34, avgSLA: '1.8 hrs', status: 'Healthy' },
    { team: 'Network Engineering', active: 3, resolved: 16, avgSLA: '3.1 hrs', status: 'Healthy' },
    { team: 'Access & Security', active: 4, resolved: 28, avgSLA: '1.2 hrs', status: 'Optimal' },
    { team: 'End User Computing', active: 5, resolved: 22, avgSLA: '2.5 hrs', status: 'Healthy' }
  ];

  return (
    <div className="analytics-viewport">
      {/* KPI Cards */}
      <div className="analytics-kpi-grid">
        {kpis.map((kpi, idx) => (
          <div key={idx} className="glass-card kpi-card">
            <div className="kpi-header">
              <span className="kpi-label">{kpi.label}</span>
              <span className={`kpi-delta ${kpi.isGood ? 'positive' : 'negative'}`}>
                {kpi.delta}
              </span>
            </div>
            <div className="kpi-value">{kpi.value}</div>
            <div className="kpi-subtext">{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Middle Grid: Volume Velocity & SLA Health Breakdown */}
      <div className="analytics-grid-two">
        {/* Incident Volume vs AI Deflection Trend */}
        <div className="glass-card">
          <div className="card-header-row">
            <div>
              <h3 className="card-heading">Incident Velocity & AI Deflections</h3>
              <p className="card-subheading">Hourly ticket inflow compared to autonomous Copilot resolutions</p>
            </div>
            <div className="legend-pills">
              <span className="legend-item"><span className="dot dot-primary" /> Total Inflow</span>
              <span className="legend-item"><span className="dot dot-success" /> AI Remediated</span>
            </div>
          </div>

          <div className="bar-chart-container">
            {hourlyTrends.map((item, idx) => (
              <div key={idx} className="bar-group">
                <div className="bar-stack">
                  <div
                    className="bar bar-total"
                    style={{ height: `${(item.total / 25) * 140}px` }}
                    title={`${item.total} total tickets at ${item.hour}`}
                  />
                  <div
                    className="bar bar-ai"
                    style={{ height: `${(item.aiHandled / 25) * 140}px` }}
                    title={`${item.aiHandled} AI handled at ${item.hour}`}
                  />
                </div>
                <span className="bar-label">{item.hour}</span>
              </div>
            ))}
          </div>
        </div>

        {/* SLA & Deflection Efficiency */}
        <div className="glass-card">
          <div className="card-header-row">
            <div>
              <h3 className="card-heading">SLA Governance & Compliance</h3>
              <p className="card-subheading">Enterprise service-level agreement tracking across tiers</p>
            </div>
            <span className="badge badge-resolved">{compliance}% Compliant</span>
          </div>

          <div className="sla-metric-list">
            <div className="sla-metric-item">
              <div className="sla-metric-header">
                <span>P1 Critical Incidents (&lt; 4 Hours SLA)</span>
                <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>98.2%</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: '98.2%', background: '#10b981' }} />
              </div>
            </div>

            <div className="sla-metric-item">
              <div className="sla-metric-header">
                <span>P2 High Priority (&lt; 8 Hours SLA)</span>
                <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>96.5%</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: '96.5%', background: '#3b82f6' }} />
              </div>
            </div>

            <div className="sla-metric-item">
              <div className="sla-metric-header">
                <span>P3 Medium Priority (&lt; 24 Hours SLA)</span>
                <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>97.8%</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: '97.8%', background: '#6366f1' }} />
              </div>
            </div>

            <div className="sla-metric-item">
              <div className="sla-metric-header">
                <span>P4 Low Priority (&lt; 48 Hours SLA)</span>
                <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>99.1%</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: '99.1%', background: '#38bdf8' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Team Operational Velocity Table */}
      <div className="glass-card">
        <div className="card-header-row">
          <div>
            <h3 className="card-heading">Departmental Assignment & Velocity</h3>
            <p className="card-subheading">Workload distribution and average resolution times</p>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Support Team</th>
                <th>Active Queued</th>
                <th>Resolved (30d)</th>
                <th>Avg Resolution Time</th>
                <th>Operational Status</th>
              </tr>
            </thead>
            <tbody>
              {teamPerformance.map((team, idx) => (
                <tr key={idx}>
                  <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>{team.team}</td>
                  <td>{team.active} tickets</td>
                  <td>{team.resolved}</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{team.avgSLA}</td>
                  <td>
                    <span className="badge badge-resolved">
                      <CheckIcon size={12} /> {team.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
